// gciso.js - Fixed GameCube ISO backend for browser
// Now supports sys files (boot.bin, bi2.bin, apploader.img, main.dol)
// Parses, adds/removes files, and rebuilds without bloating

function alignUp(x, a) { return (x + (a - 1)) & ~(a - 1); }
function readU32BE(view, off) { return view.getUint32(off, false); }
function writeU32BE(view, off, val) { view.setUint32(off, val >>> 0, false); }

function getNodeAtPath(root, path) {
    const parts = path.split('/').filter(Boolean);
    let cur = root;
    for (const p of parts) {
        if (!cur?.children?.has(p)) return null;
        cur = cur.children.get(p);
    }
    return cur;
}
function mkdirpNode(root, path) {
    const parts = path.split('/').filter(Boolean);
    let cur = root;
    for (const p of parts) {
        if (!cur.children.has(p)) cur.children.set(p, { type:'dir', name:p, children:new Map() });
        cur = cur.children.get(p);
        if (cur.type !== 'dir') throw new Error(`Path conflict at ${p}`);
    }
    return cur;
}

// --- Parse ISO and FST ---
function parseISO(isoBuf) {
    const view = new DataView(isoBuf);

    const dolOffset = readU32BE(view, 0x0420);
    const fstOffset = readU32BE(view, 0x0424);
    const fstSize   = readU32BE(view, 0x0428);

    const fstBuf = isoBuf.slice(fstOffset, fstOffset + fstSize);
    const fstView = new DataView(fstBuf);

    const entryCount = readU32BE(fstView, 8);
    const entries = [];
    for (let i = 0; i < entryCount; i++) {
        const base = i * 12;
        const typeName = readU32BE(fstView, base);
        const second = readU32BE(fstView, base + 4);
        const third = readU32BE(fstView, base + 8);
        const type = (typeName >>> 24) & 0xFF;
        const nameOffset = typeName & 0x00FFFFFF;
        entries.push({ index: i, type, nameOffset, second, third });
    }

    const namesStart = entryCount * 12;
    const nameBytes = new Uint8Array(fstBuf, namesStart);
    const decoder = new TextDecoder();
    function readName(off) {
        let i = off;
        let s = [];
        while (i >= 0 && i < nameBytes.length && nameBytes[i] !== 0) s.push(nameBytes[i]), i++;
        return decoder.decode(new Uint8Array(s));
    }

    const nodes = entries.map(e => ({ ...e, name: e.index === 0 ? '' : readName(e.nameOffset) }));

    const pathByIndex = new Map();
    pathByIndex.set(0, '');
    (function buildPaths() {
        const stack = [{ idx: 0, end: nodes[0].third }];
        for (let i = 1; i < nodes.length; i++) {
            while (stack.length && i >= stack[stack.length-1].end) stack.pop();
            const parentPath = stack.length ? pathByIndex.get(stack[stack.length-1].idx) : '';
            const n = nodes[i];
            const full = parentPath ? `${parentPath}/${n.name}` : n.name;
            pathByIndex.set(i, full);
            if (n.type === 1) stack.push({ idx: i, end: n.third });
        }
    })();

    function getFileSlice(idx) {
        const n = nodes[idx];
        if (n.type !== 0) return null;
        return new Uint8Array(isoBuf, n.second >>> 0, n.third >>> 0);
    }

    function buildMutableTree() {
        const root = { type: 'dir', name: '', children: new Map() };
        function mkdirp(path) {
            const parts = path.split('/').filter(Boolean);
            let cur = root;
            for (const p of parts) {
                if (!cur.children.has(p)) cur.children.set(p, { type: 'dir', name: p, children: new Map() });
                cur = cur.children.get(p);
                if (cur.type !== 'dir') throw new Error(`Path conflict at ${p}`);
            }
            return cur;
        }
        function putFile(fullPath, src) {
            const parts = fullPath.split('/').filter(Boolean);
            const fileName = parts.pop();
            const dir = mkdirp(parts.join('/'));
            if (src?.kind === 'orig') {
                dir.children.set(fileName, { type: 'file', name: fileName, src });
            } else {
                dir.children.set(fileName, { type: 'file', name: fileName, src, offset: null, size: null });
            }
        }
        for (const e of nodes) {
            if (e.index === 0) continue;
            const path = pathByIndex.get(e.index);
            if (e.type === 1) mkdirp(path);
            else putFile(path, { kind: 'orig', offset: e.second >>> 0, size: e.third >>> 0, modified: false });
        }
        return { root, mkdirp, putFile };
    }

    const tree = buildMutableTree();

    // --- Add system files ---
    function addSystemFile(name, offset, size) {
        tree.putFile(name, { kind: 'orig', offset, size, modified: false, system: true });
    }

    // boot.bin (header, usually 0x440 bytes)
    addSystemFile("sys/boot.bin", 0, 0x440);

    // bi2.bin (always 0x2000)
    addSystemFile("sys/bi2.bin", 0x0440, 0x2000);

    // apploader.img (size from its own header)
    const apploaderOffset = 0x2440;
    const apploaderSize   = readU32BE(view, apploaderOffset + 0x14) + 0x20;
    addSystemFile("sys/apploader.img", apploaderOffset, apploaderSize);

    // main.dol (size from DOL header)
    const dolView = new DataView(isoBuf, dolOffset);
    let dolSize = 0;
    for (let i = 0; i < 7; i++) {
        const off = dolView.getUint32(0x00 + i*4, false);
        const size = dolView.getUint32(0x90 + i*4, false);
        if (size) dolSize = Math.max(dolSize, off + size);
    }
    for (let i = 0; i < 11; i++) {
        const off = dolView.getUint32(0x1C + i*4, false);
        const size = dolView.getUint32(0xAC + i*4, false);
        if (size) dolSize = Math.max(dolSize, off + size);
    }
    addSystemFile("sys/main.dol", dolOffset, dolSize);

    return { isoBuf, parsedNodes: nodes, tree, getFileSlice, pathByIndex };
}

// -- UPDATED: addOrReplace --
function addOrReplace(tree, path, bytes) {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    const parentPath = parts.join('/');

    // If user targets sys/*, we must update the existing system node (never create files/sys)
    if (parts[0] === 'sys') {
        const sysDir = tree.root.children.get('sys');
        if (!sysDir || sysDir.type !== 'dir') {
            throw new Error('sys dir missing in tree');
        }
        
        const existing = sysDir.children.get(fileName);
        if (!existing || existing.type !== 'file') {
            throw new Error(`System file not found: ${path}`);
        }
        
        // Update the existing system file in place
        existing.src = { kind:'mod', data:new Uint8Array(bytes), system:true, modified:true };
        existing.offset = null;  // force rebuild to reassign if needed
        existing.size = existing.src.data.length;
        return;
    }

    // Normal FST file - preserve original location info when possible
    const dir = mkdirpNode(tree.root, parentPath);
    const existing = dir.children.get(fileName);
    
    // If replacing an existing file, preserve original location info for rebuild optimization
    if (existing && existing.src?.kind === 'orig') {
        dir.children.set(fileName, {
            type: 'file',
            name: fileName,
            src: { 
                kind:'mod', 
                data:new Uint8Array(bytes), 
                modified:true,
                // Preserve original location info for rebuild optimization
                offset: existing.src.offset,
                size: existing.src.size
            },
            offset: null,
            size: bytes.length
        });
    } else {
        // New file or no original info
        dir.children.set(fileName, {
            type: 'file',
            name: fileName,
            src: { kind:'mod', data:new Uint8Array(bytes), modified:true },
            offset: null,
            size: bytes.length
        });
    }
}

function removePath(tree, path) {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop();
    let cur = tree.root;
    for (const p of parts) {
        if (!cur.children.has(p)) throw new Error('Directory not found: ' + p);
        cur = cur.children.get(p);
        if (cur.type !== 'dir') throw new Error('Path conflict at ' + p);
    }
    cur.children.delete(name);
}

function rebuildISO(isoBuf, treeRoot, alignment = 2048) {
    console.log('rebuildISO: start');
    let out = new Uint8Array(isoBuf.slice(0));
    let view = new DataView(out.buffer);

    const read32 = (o)=>readU32BE(view,o);
    const write32 = (o,v)=>writeU32BE(view,o,v>>>0);

    // --- locate header fields ---
    const origDolOffset = read32(0x420);
    const fstOffset     = read32(0x424);
    const fstSizeOrig   = read32(0x428);

    // --- collect entries (FST tree only, skip system files) ---
    const all = [];
    (function walk(node, parent=null, path='') {
        const p = path ? `${path}/${node.name}` : node.name;
        
        // Skip the entire sys directory and its contents
        if (p === 'sys') {
            return null;
        }
        
        const entry = { node, path:p, parent, children:[] };
        all.push(entry);
        
        if (node.type === 'dir') {
            const kids = Array.from(node.children.values())
                .sort((a,b)=>a.name.localeCompare(b.name));
            for (const k of kids) {
                const childEntry = walk(k, entry, p);
                if (childEntry) { // Only add non-null children
                    entry.children.push(childEntry);
                }
            }
        }
        return entry;
    })(treeRoot, null, '');

    const fileEntries = all.filter(e=>e.node.type==='file');

    // ---------- SYSTEM FILES ----------
    const sysDir = treeRoot.children.get('sys');
    const sys = {
        boot: sysDir?.children?.get('boot.bin') || null,
        bi2:  sysDir?.children?.get('bi2.bin')  || null,
        apl:  sysDir?.children?.get('apploader.img') || null,
        dol:  sysDir?.children?.get('main.dol') || null,
    };

    // ensure buffer big enough
    function ensureSize(min) {
        if (min <= out.length) return;
        const newSize = alignUp(min, 0x8000);
        const n = new Uint8Array(newSize);
        n.set(out);
        out = n;
        view = new DataView(out.buffer);
    }

    // write a system file blob at offset; returns size written
    function writeSystemBlob(node, offset, fixedSize = null) {
        if (!node?.src) return 0;
        let data;
        if (node.src.kind === 'mod') data = node.src.data;
        else if (node.src.kind === 'orig') {
            // copy from original ISO
            data = new Uint8Array(isoBuf, node.src.offset, node.src.size);
        } else if (node.src instanceof Uint8Array) {
            data = node.src; // safety
        }
        if (!data) return 0;

        let sizeToWrite = fixedSize ?? data.length;
        ensureSize(offset + sizeToWrite);
        // If fixed size is longer, pad with zeros; if shorter, truncate.
        out.set(data.subarray(0, sizeToWrite), offset);
        if (fixedSize && data.length < fixedSize) {
            out.fill(0, offset + data.length, offset + fixedSize);
        }
        node.offset = offset;
        node.size = sizeToWrite;
        return sizeToWrite;
    }

    // boot.bin @ 0x000 (0x440) and bi2.bin @ 0x440 (0x2000) are fixed-size
    writeSystemBlob(sys.boot, 0x000, 0x440);
    writeSystemBlob(sys.bi2,  0x440, 0x2000);

    // Place apploader + dol after bi2.bin
    let sysCursor = 0x2440;                   // immediately after bi2
    const align32 = (x)=>alignUp(x, 0x20);

    // apploader.img (align 0x20). If not modified, keep original bytes in place.
    let aplOffset = sys.apl?.src?.kind === 'mod' ? align32(sysCursor) : (sys.apl?.src?.offset ?? sysCursor);
    if (sys.apl?.src?.kind === 'mod') {
        sysCursor = aplOffset;
        const aplSize = writeSystemBlob(sys.apl, aplOffset, null);
        sysCursor = align32(aplOffset + aplSize);
    } else {
        // use original size to advance cursor
        if (sys.apl?.src) {
            sysCursor = align32(sys.apl.src.offset + sys.apl.src.size);
        }
    }

    // main.dol (align 0x20). Write new one if provided and update 0x420.
    let dolOffset = sys.dol?.src?.kind === 'mod' ? align32(sysCursor) : origDolOffset;
    if (sys.dol?.src?.kind === 'mod') {
        sysCursor = dolOffset;
        const dolSize = writeSystemBlob(sys.dol, dolOffset, null);
        sysCursor = align32(dolOffset + dolSize);
        write32(0x420, dolOffset);            // update header pointer
    } else {
        // leave pointer as-is
        write32(0x420, origDolOffset);
    }

    // ---------- FST FILES ----------
    // Only entries NOT under sys/ participate in FST.
    const fstCandidates = all.filter(e => !e.node.src?.system);

    // Dense FST indices (root must be index 0)
    fstCandidates.forEach((e,i)=>e.fstIndex=i);

    // Assign data offsets for normal files (preserve originals; place new ones after current free)
    let nextFree = alignUp(Math.max(0x10000, fstOffset + Math.max(fstSizeOrig, 0x10000)), alignment);

    const normalFiles = fstCandidates.filter(e=>e.node.type==='file');
    
    // Process ALL files and try to use original locations when possible
    for (const e of normalFiles) {
        if (e.node.src?.kind === 'orig' && !e.node.src?.modified) {
            // Unchanged original file - keep original location
            e.node.offset = e.node.src.offset;
            e.node.size   = e.node.src.size;
        } else {
            // Modified or new file - try to use original location if it exists and fits
            const srcBytes = e.node.src?.data instanceof Uint8Array
                ? e.node.src.data
                : (e.node.src instanceof Uint8Array ? e.node.src : new Uint8Array(e.node.src || []));
            
            // If there's an original location and the new file fits, use it
            if (e.node.src?.offset !== undefined && srcBytes.length <= (e.node.src?.size || 0)) {
                e.node.offset = e.node.src.offset;
                e.node.size = srcBytes.length;
                console.log(`Using original location for modified file: ${e.path} (${srcBytes.length} bytes at 0x${e.node.offset.toString(16)})`);
            } else {
                // File doesn't fit in original location, place at end
                e.node.offset = nextFree;
                e.node.size = srcBytes.length;
                nextFree = alignUp(e.node.offset + e.node.size, alignment);
                console.log(`Placing at end for file that doesn't fit: ${e.path} (${srcBytes.length} bytes at 0x${e.node.offset.toString(16)})`);
            }
            
            // Write the file data
            const need = e.node.offset + srcBytes.length;
            ensureSize(need);
            out.set(srcBytes, e.node.offset);
        }
        
        // Update nextFree to account for this file
        nextFree = Math.max(nextFree, alignUp(e.node.offset + e.node.size, alignment));
    }

    // ---------- Build and write FST ----------
    const encoder = new TextEncoder();
    const nameOffsets = new Map();
    const nameTable = [];
    let nameTableByteSize = 0;
    
    function addName(name) {
        if (name === '') return 0;
        if (nameOffsets.has(name)) return nameOffsets.get(name);
        
        const offset = nameTableByteSize;
        nameOffsets.set(name, offset);
        nameTable.push(name);
        nameTableByteSize += encoder.encode(name).length + 1; // +1 for null terminator
        return offset;
    }

    // Calculate next_fst_index for directories
    function calculateNextFstIndexes(entry) {
        if (entry.node.type !== 'dir') {
            return entry.fstIndex + 1;
        }
        
        let nextIndex = entry.fstIndex + 1;
        for (const child of entry.children) {
            if (!child.node.src?.system) { // Skip system files
                nextIndex = calculateNextFstIndexes(child);
            }
        }
        entry.next_fst_index = nextIndex;
        return nextIndex;
    }

    // Find the FST root (should be the entry with empty path)
    const fstRoot = fstCandidates.find(e => e.path === '' || e.path === '/') || fstCandidates[0];
    calculateNextFstIndexes(fstRoot);

    // Build name table for all non-root entries
    for (const e of fstCandidates) {
        if (e.fstIndex !== 0) {
            addName(e.node.name);
        }
    }
    
    const fstEntryCount = fstCandidates.length;
    const newFstSize = fstEntryCount * 12 + nameTableByteSize;

    // ensure FST region exists
    ensureSize(fstOffset + newFstSize);

    // write FST entries
    let ptr = fstOffset;
    for (const e of fstCandidates) {
        const nameOff = e.fstIndex === 0 ? 0 : addName(e.node.name);
        if (e.node.type === 'dir') {
            const typeAndName = (0x01 << 24) | (nameOff & 0x00FFFFFF);
            const parentIndex = e.parent && !e.parent.node.src?.system ? e.parent.fstIndex : 0;
            write32(ptr, typeAndName);
            write32(ptr+4, parentIndex);
            write32(ptr+8, e.next_fst_index);
        } else {
            const typeAndName = nameOff & 0x00FFFFFF;
            write32(ptr, typeAndName);
            write32(ptr+4, e.node.offset);
            write32(ptr+8, e.node.size);
        }
        ptr += 12;
    }

    // write name table
    let nptr = fstOffset + fstEntryCount * 12;
    for (const n of nameTable) {
        const bytes = encoder.encode(n);
        out.set(bytes, nptr);
        nptr += bytes.length;
        out[nptr++] = 0;
    }

    // update header pointers (FST)
    write32(0x424, fstOffset);
    write32(0x428, newFstSize);
    write32(0x42C, newFstSize);

    // ---------- finalize size ----------
    let maxEnd = nextFree;
    for (const e of fileEntries) {
        if (e.node.offset != null && e.node.size != null) {
            maxEnd = Math.max(maxEnd, e.node.offset + e.node.size);
        }
    }
    // include system writes
    if (sys.dol?.offset && sys.dol?.size) maxEnd = Math.max(maxEnd, sys.dol.offset + sys.dol.size);
    if (sys.apl?.offset && sys.apl?.size) maxEnd = Math.max(maxEnd, sys.apl.offset + sys.apl.size);

    const finalSize = alignUp(maxEnd, 0x8000);
    ensureSize(finalSize);

    console.log('rebuildISO: done');
    return out.slice(0, finalSize).buffer;
}

export { parseISO, addOrReplace, removePath, rebuildISO };
