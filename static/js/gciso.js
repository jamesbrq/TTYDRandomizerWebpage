// gciso.js - GameCube ISO backend
// Preserves original offsets, allows new files to be appended

function alignUp(x, a) {
    return (x + (a - 1)) & ~(a - 1);
}

function readU32BE(view, off) {
    return view.getUint32(off, false);
}

function writeU32BE(view, off, val) {
    view.setUint32(off, val >>> 0, false);
}

// ------------------ Helpers ------------------
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
        if (!cur.children.has(p)) {
            cur.children.set(p, {
                type: 'dir',
                name: p,
                children: new Map()
            });
        }

        cur = cur.children.get(p);
        if (cur.type !== 'dir') throw new Error(`Path conflict at ${p}`);
    }

    return cur;
}

function debugLog(...args) {
    if (typeof console !== 'undefined') console.log(...args);
}

// ------------------ parseISO ------------------
function parseISO(isoBuf) {
    const view = new DataView(isoBuf);
    const dolOffset = readU32BE(view, 0x0420);
    const fstOffset = readU32BE(view, 0x0424);
    const fstSize = readU32BE(view, 0x0428);

    // Safeguard: if fstOffset/size bogus, throw
    if (!fstOffset || fstOffset + fstSize > isoBuf.byteLength) {
        debugLog('Warning: FST offset/size appear invalid. fstOffset:', fstOffset, 'fstSize:', fstSize);
    }

    // Read FST buffer
    const fstBuf = isoBuf.slice(fstOffset, fstOffset + fstSize);
    const fstView = new DataView(fstBuf);
    const entryCount = readU32BE(fstView, 8);

    // Load entries
    const entries = [];
    for (let i = 0; i < entryCount; i++) {
        const base = i * 12;
        const typeName = readU32BE(fstView, base);
        const second = readU32BE(fstView, base + 4);
        const third = readU32BE(fstView, base + 8);
        const type = (typeName >>> 24) & 0xFF;
        const nameOffset = typeName & 0x00FFFFFF;

        entries.push({
            index: i,
            type,
            nameOffset,
            second,
            third
        });
    }

    const namesStart = entryCount * 12;
    const nameBytes = new Uint8Array(fstBuf, namesStart);
    const decoder = new TextDecoder();

    function readName(off) {
        if (off < 0 || off >= nameBytes.length) return '';

        let i = off;
        const s = [];

        while (i < nameBytes.length && nameBytes[i] !== 0) {
            s.push(nameBytes[i]);
            i++;
        }

        return decoder.decode(new Uint8Array(s));
    }

    const nodes = entries.map(e => ({
        ...e,
        name: e.index === 0 ? '' : readName(e.nameOffset)
    }));

    // Build pathByIndex (standard FST stack method)
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

            if (n.type === 1) {
                stack.push({ idx: i, end: n.third });
            }
        }
    })();

    function getFileSlice(idx) {
        const n = nodes[idx];
        if (!n || n.type !== 0) return null;

        // second = file offset, third = size
        return new Uint8Array(isoBuf, n.second >>> 0, n.third >>> 0);
    }

    // Build mutable tree
    function buildMutableTree() {
        const root = {
            type: 'dir',
            name: '',
            children: new Map()
        };

        function mkdirp(path) {
            const parts = path.split('/').filter(Boolean);
            let cur = root;

            for (const p of parts) {
                if (!cur.children.has(p)) {
                    cur.children.set(p, {
                        type: 'dir',
                        name: p,
                        children: new Map()
                    });
                }

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
                // Store original metadata on src
                dir.children.set(fileName, {
                    type: 'file',
                    name: fileName,
                    src
                });
            } else {
                dir.children.set(fileName, {
                    type: 'file',
                    name: fileName,
                    src,
                    offset: null,
                    size: null
                });
            }
        }

        for (const e of nodes) {
            if (e.index === 0) continue;

            const path = pathByIndex.get(e.index);

            if (e.type === 1) {
                mkdirp(path);

                // Mark directory with original FST index
                const parts = path.split('/').filter(Boolean);
                let cur = root;

                for (const p of parts) {
                    cur = cur.children.get(p);
                    if (cur) cur.originalFstIndex = e.index;
                }
            } else {
                putFile(path, {
                    kind: 'orig',
                    offset: e.second >>> 0,
                    size: e.third >>> 0,
                    modified: false,
                    originalFstIndex: e.index
                });
            }
        }

        return { root, mkdirp, putFile };
    }

    const tree = buildMutableTree();

    // Add system files under sys/ with original offset/size if possible
    function addSystemFile(name, offset, size) {
        tree.putFile(name, {
            kind: 'orig',
            offset,
            size,
            modified: false,
            system: true
        });
    }

    // Mark the sys directory itself as a system directory to exclude it from FST
    function markSysDirectoryAsSystem() {
        const sysDir = tree.root.children.get('sys');
        if (sysDir) {
            sysDir.system = true;
        }
    }

    // boot.bin (0x000, size 0x440)
    addSystemFile("sys/boot.bin", 0, 0x440);

    // bi2.bin (0x0440, size 0x2000)
    addSystemFile("sys/bi2.bin", 0x0440, 0x2000);

    // apploader (usually at 0x2440)
    const apploaderOffset = 0x2440;
    let apploaderSize = 0;

    try {
        apploaderSize = readU32BE(view, apploaderOffset + 0x14) + 0x20;
        if (!apploaderSize || apploaderSize <= 0 || apploaderSize > isoBuf.byteLength) {
            apploaderSize = 0;
        }
    } catch (e) {
        apploaderSize = 0;
    }

    addSystemFile("sys/apploader.img", apploaderOffset, apploaderSize);

    // main.dol - calculate size via DOL header if dolOffset valid
    let dolSize = 0;

    try {
        if (dolOffset && dolOffset + 0x100 < isoBuf.byteLength) {
            const dolView = new DataView(isoBuf, dolOffset);
            debugLog(`DOL header at 0x${dolOffset.toString(16)}`);

            // Text sections (7 max)
            for (let i = 0; i < 7; i++) {
                const fileOff = dolView.getUint32(0x00 + i*4, false); // File offset
                const size = dolView.getUint32(0x90 + i*4, false); // Size

                if (size && fileOff) {
                    const sectionEnd = fileOff + size;
                    dolSize = Math.max(dolSize, sectionEnd);
                    debugLog(`DOL text section ${i}: fileOff=0x${fileOff.toString(16)}, size=0x${size.toString(16)}, end=0x${sectionEnd.toString(16)}`);
                }
            }

            // Data sections (11 max)
            for (let i = 0; i < 11; i++) {
                const fileOff = dolView.getUint32(0x1C + i*4, false); // File offset
                const size = dolView.getUint32(0xAC + i*4, false); // Size

                if (size && fileOff) {
                    const sectionEnd = fileOff + size;
                    dolSize = Math.max(dolSize, sectionEnd);
                    debugLog(`DOL data section ${i}: fileOff=0x${fileOff.toString(16)}, size=0x${size.toString(16)}, end=0x${sectionEnd.toString(16)}`);
                }
            }

            // If we still don't have a size, use a reasonable default
            if (dolSize === 0) {
                dolSize = 0x400000; // 4MB default
                debugLog(`DOL size calculation failed, using default size: 0x${dolSize.toString(16)}`);
            } else {
                debugLog(`Calculated DOL size: 0x${dolSize.toString(16)} (${dolSize} bytes)`);
            }
        } else {
            // Invalid DOL offset, use default
            dolSize = 0x400000; // 4MB default
            debugLog(`Invalid DOL offset 0x${dolOffset.toString(16)}, using default size: 0x${dolSize.toString(16)}`);
        }
    } catch (e) {
        dolSize = 0x400000; // 4MB default
        debugLog(`DOL size calculation error: ${e.message}, using default size: 0x${dolSize.toString(16)}`);
    }

    addSystemFile("sys/main.dol", dolOffset, dolSize);

    // Mark the sys directory as system to exclude from FST
    markSysDirectoryAsSystem();

    return {
        isoBuf,
        parsedNodes: nodes,
        tree,
        getFileSlice,
        pathByIndex,
        header: { dolOffset, fstOffset, fstSize },
        originalNodes: nodes
    };
}

// ------------------ addOrReplace ------------------
// Replacements for original files must be <= original size. New files are allowed (appended later).
function addOrReplace(tree, path, bytes) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) throw new Error('Invalid path');

    const fileName = parts.pop();
    const parentPath = parts.join('/');

    // Resolve parent
    const dir = mkdirpNode(tree.root, parentPath);
    const existing = dir.children.get(fileName);
    const newBytes = new Uint8Array(bytes);

    if (existing && existing.src?.kind === 'orig') {
        const origSize = existing.src.size >>> 0;

        if (newBytes.length > origSize) {
            throw new Error(`Replacement too large for ${path}: ${newBytes.length} > original ${origSize}. To add a larger file, remove original first or accept relocation mode.`);
        }

        // mark mod but preserve original slot info on src.origSize
        existing.src = {
            kind: 'mod',
            data: newBytes,
            modified: true,
            origOffset: existing.src.offset,
            origSize: existing.src.size,
            system: !!existing.src.system
        };

        existing.offset = existing.src.origOffset;
        existing.size = newBytes.length;
        return;
    }

    if (existing && existing.src?.kind === 'mod') {
        // already modded, allow resizing if we have origSize or it's a new mod (no orig)
        const origSize = existing.src.origSize || null;

        if (origSize && newBytes.length > origSize) {
            throw new Error(`Replacement too large for ${path}: ${newBytes.length} > original slot ${origSize}.`);
        }

        existing.src.data = newBytes;
        existing.size = newBytes.length;
        existing.src.modified = true;
        return;
    }

    // No existing entry -> create new mod file (this will be placed in appended area during rebuild)
    dir.children.set(fileName, {
        type: 'file',
        name: fileName,
        src: {
            kind: 'mod',
            data: newBytes,
            modified: true,
            new: true
        },
        offset: null,
        size: newBytes.length
    });
}

// ------------------ removePath ------------------
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

// ------------------ buildFST_fromTree ------------------
// This builds FST binary using entries' node.offset/node.size for files
function buildFST_fromTree(treeRoot) {
    // We'll do a DFS producing the linear FST order required by GameCube
    const encoder = new TextEncoder();
    const entries = []; // will be objects { node, isDir, name, parentIdx, nextIdx, offset, size, fstIdx }

    // Helper: DFS that records nodes in order and parent-child relations
    function dfs(node) {
        const idx = entries.length;

        entries.push({
            node,
            isDir: node.type === 'dir',
            name: node.name,
            children: [],
            fstIdx: null,
            parent: null
        });

        if (node.type === 'dir') {
            const kids = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));

            for (const child of kids) {
                if (child.src?.system || child.system) {
                    debugLog(`Excluding system node from FST: ${child.name} (src.system=${child.src?.system}, node.system=${child.system})`);
                    continue; // system files and directories are not part of FST
                }

                //debugLog(`Including in FST: ${child.name} (src.system=${child.src?.system || 'undefined'}, node.system=${child.system || 'undefined'})`);
                const childIdx = dfs(child);
                entries[idx].children.push(childIdx);
                entries[childIdx].parent = idx;
            }
        }

        return idx;
    }

    const rootIdx = dfs(treeRoot);

    // Now calculate fst indices and next indexes (we already have entries in DFS order)
    for (let i = 0; i < entries.length; i++) entries[i].fstIdx = i;

    function computeNextIndices(i) {
        const e = entries[i];

        if (!e.isDir) {
            e.nextIndex = e.fstIdx + 1;
            // set file offset/size from node metadata
            e.offset = e.node.offset >>> 0;
            e.size = e.node.size >>> 0;
            return e.nextIndex;
        } else {
            // directory: next index is index after all its subtree entries
            let next = e.fstIdx + 1;

            for (const childIdx of e.children) {
                next = computeNextIndices(childIdx);
            }

            e.nextIndex = next;
            return next;
        }
    }

    computeNextIndices(rootIdx);

    // Build name table (concatenate names for entries with idx != 0)
    const nameTableParts = [];
    const nameOffsets = new Map();

    function addName(name) {
        if (name === '') return 0;
        if (nameOffsets.has(name)) return nameOffsets.get(name);

        const offset = nameTableParts.reduce((acc, b) => acc + b.length + 1, 0);
        nameTableParts.push(encoder.encode(name));
        nameOffsets.set(name, offset);

        return offset;
    }

    for (let i = 0; i < entries.length; i++) {
        if (i !== 0) addName(entries[i].name || '');
    }

    const nameTableSize = nameTableParts.reduce((acc, b) => acc + b.length + 1, 0);
    const fstSize = entries.length * 12 + nameTableSize;
    const buf = new ArrayBuffer(fstSize);
    const view = new DataView(buf);
    const out = new Uint8Array(buf);
    let ptr = 0;

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const nameOff = i === 0 ? 0 : (nameOffsets.get(e.name) || 0);

        if (e.isDir) {
            const typeAndName = (0x01 << 24) | (nameOff & 0x00FFFFFF);
            view.setUint32(ptr + 0, typeAndName, false);

            // parent index (for direct parent; root parent = 0)
            const parentIndex = (e.parent !== null && !entries[e.parent].node.src?.system) ? entries[e.parent].fstIdx : 0;
            view.setUint32(ptr + 4, parentIndex, false);
            view.setUint32(ptr + 8, e.nextIndex, false);
        } else {
            const typeAndName = (nameOff & 0x00FFFFFF);
            view.setUint32(ptr + 0, typeAndName, false);
            view.setUint32(ptr + 4, e.offset >>> 0, false);
            view.setUint32(ptr + 8, e.size >>> 0, false);
        }

        ptr += 12;
    }

    // append name table
    let namePtr = entries.length * 12;

    for (const b of nameTableParts) {
        out.set(b, namePtr);
        namePtr += b.length;
        out[namePtr++] = 0;
    }

    return buf;
}

// ------------------ verifyOffsets_preserve ------------------
function verifyOffsets_preserve(outBuf, treeRoot, originalBuf) {
    const used = []; // list of {start,end,desc}

    function collect(node, path = '') {
        if (node.type === 'dir') {
            for (const child of node.children.values()) {
                collect(child, path ? `${path}/${child.name}` : child.name);
            }
            return;
        }

        if (!node.src) return;

        const off = (node.offset !== undefined && node.offset !== null) ? node.offset >>> 0 : node.src.offset >>> 0;
        const size = (node.size !== undefined && node.size !== null) ? node.size >>> 0 : node.src.size >>> 0;

        used.push({
            start: off,
            end: off + size,
            desc: path || node.name
        });
    }

    collect(treeRoot);
    used.sort((a, b) => a.start - b.start);

    for (let i = 1; i < used.length; i++) {
        if (used[i].start < used[i-1].end) {
            throw new Error(`verifyOffsets_preserve: overlap detected between ${used[i-1].desc} and ${used[i].desc}`);
        }
    }

    const viewOrig = new DataView(originalBuf);
    const origFstOffset = viewOrig.getUint32(0x424, false);

    const viewOut = new DataView(outBuf);
    const newFstOffset = viewOut.getUint32(0x424, false);

    if (origFstOffset !== newFstOffset) {
        throw new Error(`FST relocated: original 0x${origFstOffset.toString(16)} new 0x${newFstOffset.toString(16)} — relocation disallowed.`);
    }

    const origDolOffset = viewOrig.getUint32(0x420, false);
    const newDolOffset = viewOut.getUint32(0x420, false);

    if (origDolOffset !== newDolOffset) {
        throw new Error(`DOL relocated: original 0x${origDolOffset.toString(16)} new 0x${newDolOffset.toString(16)} — relocation disallowed.`);
    }

    debugLog('verifyOffsets_preserve: OK — no overlaps, header pointers unchanged.');
}

// ------------------ rebuildISO ------------------
// preserve originals, append new files
function rebuildISO(isoBuf, treeRoot, opts = {}) {
    const alignment = opts.alignment || 2048; // file alignment
    debugLog('rebuildISO: start (preserve original offsets, append new files)');

    // Calculate actual data size by finding the highest used offset in the FST
    const tempView = new DataView(isoBuf);
    const origDolOffset = tempView.getUint32(0x420, false);
    const origFstOffset = tempView.getUint32(0x424, false);
    const origFstSize = tempView.getUint32(0x428, false);
    
    // Parse FST to find the highest file offset + size
    let maxDataEnd = Math.max(0x440, origFstOffset + origFstSize); // At minimum, include header and FST
    
    if (origFstOffset && origFstSize && origFstOffset + origFstSize <= isoBuf.byteLength) {
        const fstBuf = isoBuf.slice(origFstOffset, origFstOffset + origFstSize);
        const fstView = new DataView(fstBuf);
        const entryCount = fstView.getUint32(8, false);
        
        // Scan all FST entries to find highest file end
        for (let i = 0; i < entryCount; i++) {
            const base = i * 12;
            const typeName = fstView.getUint32(base, false);
            const fileOffset = fstView.getUint32(base + 4, false);
            const fileSize = fstView.getUint32(base + 8, false);
            const type = (typeName >>> 24) & 0xFF;
            
            // Only process files (type 0), not directories (type 1)
            if (type === 0 && fileOffset && fileSize) {
                maxDataEnd = Math.max(maxDataEnd, fileOffset + fileSize);
            }
        }
    }
    
    // Add DOL size if valid
    if (origDolOffset && origDolOffset < isoBuf.byteLength) {
        try {
            const dolView = new DataView(isoBuf, origDolOffset);
            let dolEnd = origDolOffset;
            
            // Check text sections (7 max)
            for (let i = 0; i < 7; i++) {
                const fileOff = dolView.getUint32(0x00 + i*4, false);
                const size = dolView.getUint32(0x90 + i*4, false);
                if (size && fileOff) dolEnd = Math.max(dolEnd, fileOff + size);
            }
            
            // Check data sections (11 max)
            for (let i = 0; i < 11; i++) {
                const fileOff = dolView.getUint32(0x1C + i*4, false);
                const size = dolView.getUint32(0xAC + i*4, false);
                if (size && fileOff) dolEnd = Math.max(dolEnd, fileOff + size);
            }
            
            maxDataEnd = Math.max(maxDataEnd, dolEnd);
        } catch (e) {
            // If DOL parsing fails, use a reasonable estimate
            maxDataEnd = Math.max(maxDataEnd, origDolOffset + 0x400000);
        }
    }
    
    // Round up to next 32KB boundary for safety
    const actualSize = Math.min(isoBuf.byteLength, ((maxDataEnd + 0x7FFF) & ~0x7FFF));
    
    debugLog(`rebuildISO: found data end at ${maxDataEnd}, copying ${actualSize} bytes instead of full ${isoBuf.byteLength} bytes`);
    
    // mutable copy of only the needed portion
    let out = new Uint8Array(isoBuf.slice(0, actualSize));
    let view = new DataView(out.buffer);

    const read32 = (o) => view.getUint32(o, false);
    const write32 = (o, v) => view.setUint32(o, v >>> 0, false);

    // header values (reuse the calculated values from above)
    const finalDolOffset = origDolOffset;
    const finalFstOffset = origFstOffset;
    const finalFstSize = origFstSize;
    const origFstMax = read32(0x42C);

    // helper to ensure buffer is big enough
    function ensureSize(min) {
        if (min <= out.length) return;

        const newSize = alignUp(min, 0x8000);
        const n = new Uint8Array(newSize);
        n.set(out);
        out = n;
        view = new DataView(out.buffer);
    }

    // ---------------- Write system files ----------------
    const sysDir = treeRoot.children.get('sys');
    const sys = {
        boot: sysDir?.children?.get('boot.bin') || null,
        bi2: sysDir?.children?.get('bi2.bin') || null,
        apl: sysDir?.children?.get('apploader.img') || null,
        dol: sysDir?.children?.get('main.dol') || null
    };

    function writeSystem(node, defaultOffset, defaultSize, name) {
        if (!node || !node.src) return;

        const origOff = (node.src.offset !== undefined && node.src.offset !== null) ? node.src.offset >>> 0 : defaultOffset;
        const origSize = (node.src.size !== undefined && node.src.size !== null) ? node.src.size >>> 0 : defaultSize;

        let data;
        if (node.src.kind === 'mod') data = node.src.data;
        else if (node.src.kind === 'orig') data = new Uint8Array(isoBuf, origOff, origSize);

        if (!data) return;

        if (data.length > origSize) throw new Error(`Sys file ${name} too large (${data.length} > ${origSize})`);

        ensureSize(origOff + origSize);
        out.set(data, origOff);

        node.offset = origOff;
        node.size = data.length;

        debugLog(`Wrote sys ${name} @0x${origOff.toString(16)} size ${data.length}`);

        // DEBUG: Verify written data for main.dol
        if (name === 'main.dol' && node.src.kind === 'mod') {
            debugLog(`DEBUG: main.dol US.bin at 0x1888: ${data[0x1888].toString(16)} ${data[0x1889].toString(16)} ${data[0x188A].toString(16)} ${data[0x188B].toString(16)}`);
            const testView = new DataView(data.buffer, data.byteOffset, data.byteLength);
            debugLog(`DEBUG: main.dol hook at 0x6CE38: ${testView.getUint32(0x6CE38, false).toString(16)}`);
            debugLog(`DEBUG: Written to output at offset 0x${origOff.toString(16)}, checking output buffer...`);
            debugLog(`DEBUG: Output buffer US.bin at 0x${(origOff + 0x1888).toString(16)}: ${out[origOff + 0x1888].toString(16)} ${out[origOff + 0x1889].toString(16)} ${out[origOff + 0x188A].toString(16)} ${out[origOff + 0x188B].toString(16)}`);
        }
    }

    writeSystem(sys.boot, 0x000, 0x440, 'boot.bin');
    writeSystem(sys.bi2, 0x0440, 0x2000, 'bi2.bin');
    writeSystem(sys.apl, 0x2440, sys.apl?.src?.size || 0x1000, 'apploader.img');
    writeSystem(sys.dol, finalDolOffset, sys.dol?.src?.size || 0x400000, 'main.dol');

    // ---------------- Gather FST files ----------------
    function walkFstFiles(node, parentPath = '') {
        const p = parentPath ? `${parentPath}/${node.name}` : node.name;
        let list = [];

        if (node.type === 'dir') {
            for (const child of node.children.values()) {
                if (child.src?.system || child.system) continue;
                list.push(...walkFstFiles(child, p));
            }
        } else if (node.type === 'file') {
            list.push({ node, path: p });
        }

        return list;
    }

    const fstList = walkFstFiles(treeRoot);

    // Compute original highest used offset
    let highestOriginalEnd = 0;

    function collectOriginalRegions(node) {
        if (node.type === 'dir') {
            for (const c of node.children.values()) collectOriginalRegions(c);
            return;
        }

        if (!node.src) return;

        if (node.src.kind === 'orig') {
            const off = node.src.offset >>> 0;
            const size = node.src.size >>> 0;
            highestOriginalEnd = Math.max(highestOriginalEnd, off + size);
        }
    }

    collectOriginalRegions(treeRoot);
    highestOriginalEnd = Math.max(highestOriginalEnd, finalFstOffset + (finalFstSize || 0));

    let appendCursor = alignUp(Math.max(0x10000, highestOriginalEnd), alignment);

    // ---------------- Assign offsets ----------------
    for (const entry of fstList) {
        const node = entry.node;

        if (node.src?.kind === 'orig') {
            node.offset = node.src.offset >>> 0;
            node.size = node.src.size >>> 0;
        } else if (node.src?.kind === 'mod' && node.src.origOffset !== undefined) {
            if (node.src.data.length > node.src.origSize) {
                throw new Error(`Replacement too large for ${entry.path}`);
            }

            node.offset = node.src.origOffset >>> 0;
            node.size = node.src.data.length;
        } else if (node.src?.kind === 'mod' && node.src.new) {
            node.offset = alignUp(appendCursor, alignment);
            node.size = node.src.data.length;
            appendCursor = alignUp(node.offset + node.size, alignment);
        } else {
            throw new Error(`Node with no source info: ${entry.path}`);
        }
    }

    // ---------------- Write FST files ----------------
    for (const entry of fstList) {
        const node = entry.node;
        if (!node.src) continue;

        let data = null;
        if (node.src.kind === 'mod') data = node.src.data;
        else if (node.src.kind === 'orig') data = new Uint8Array(isoBuf, node.offset, node.size);

        if (!data) data = new Uint8Array(0);

        ensureSize(node.offset + node.size);
        out.set(data, node.offset);

        //debugLog(`Wrote file ${entry.path} @0x${node.offset.toString(16)} size ${data.length}`);
    }

    // ---------------- Rebuild FST ----------------
    const fstBuf = buildFST_fromTree(treeRoot);

    if (origFstMax && fstBuf.byteLength > origFstMax) {
        throw new Error(`Rebuilt FST (${fstBuf.byteLength}) exceeds original max (${origFstMax})`);
    }

    ensureSize(origFstOffset + fstBuf.byteLength);
    out.set(new Uint8Array(fstBuf), origFstOffset);

    write32(0x424, origFstOffset);
    write32(0x428, fstBuf.byteLength);
    write32(0x42C, origFstMax);

    // DOL header pointer: preserve original
    write32(0x420, origDolOffset);

    // ---------------- Final verify ----------------
    verifyOffsets_preserve(out.buffer, treeRoot, isoBuf);

    // ---------------- Trim/align ----------------
    let maxEnd = 0;

    function collectMax(node) {
        if (node.type === 'dir') {
            for (const c of node.children.values()) collectMax(c);
            return;
        }

        if (node.offset !== undefined && node.size !== undefined) {
            maxEnd = Math.max(maxEnd, node.offset + node.size);
        } else if (node.src && node.src.offset !== undefined) {
            maxEnd = Math.max(maxEnd, node.src.offset + (node.src.size || 0));
        }
    }

    collectMax(treeRoot);
    maxEnd = Math.max(maxEnd, origFstOffset + (origFstSize || 0));

    const finalSize = alignUp(Math.max(maxEnd, out.length), 0x8000);
    ensureSize(finalSize);

    debugLog('rebuildISO: done finalSize', finalSize);
    return out.slice(0, finalSize).buffer;
}

// ------------------ exports ------------------
export { parseISO, addOrReplace, removePath, rebuildISO };