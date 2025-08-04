// JavaScript port of gclib GCM and DOL classes
// Based on LagoLunatic/gclib Python implementation

// Helper functions for binary data operations
class FSHelpers {
    static readU32(data, offset) {
        const view = new DataView(data.buffer || data, offset, 4);
        return view.getUint32(0, false); // false = big-endian
    }

    static writeU32(data, offset, value) {
        const view = new DataView(data.buffer || data, offset, 4);
        view.setUint32(0, value, false); // false = big-endian
    }

    static readBytes(data, offset, length) {
        if (data.buffer) {
            return new Uint8Array(data.buffer, offset, length);
        }
        return new Uint8Array(data, offset, length);
    }

    static writeBytes(data, offset, bytes) {
        const target = new Uint8Array(data.buffer || data, offset, bytes.length);
        target.set(bytes);
    }

    static readStrUntilNull(data, offset) {
        const bytes = new Uint8Array(data.buffer || data, offset);
        let length = 0;
        while (bytes[length] !== 0 && length < bytes.length) {
            length++;
        }
        return new TextDecoder('utf-8').decode(bytes.slice(0, length));
    }

    static writeStrWithNull(data, offset, str) {
        const bytes = new TextEncoder().encode(str + '\0');
        this.writeBytes(data, offset, bytes);
    }

    static dataLen(data) {
        return data.byteLength || data.length;
    }
}

// DOL Section class
class DOLSection {
    constructor(offset, address, size) {
        this.offset = offset;
        this.address = address;
        this.size = size;
    }

    containsAddress(address) {
        return this.address <= address && address < this.address + this.size;
    }

    containsOffset(offset) {
        return this.offset <= offset && offset < this.offset + this.size;
    }
}

// DOL class - GameCube executable format
class DOL {
    static TEXT_SECTION_COUNT = 7;
    static DATA_SECTION_COUNT = 11;

    constructor() {
        this.data = null;
        this.sections = [];
        this.bssAddress = 0;
        this.bssSize = 0;
        this.entryPointAddress = 0;
    }

    read(data) {
        this.data = data;

        this.sections = [];
        const totalSections = DOL.TEXT_SECTION_COUNT + DOL.DATA_SECTION_COUNT;

        for (let sectionIndex = 0; sectionIndex < totalSections; sectionIndex++) {
            const sectionOffset = FSHelpers.readU32(data, 0x00 + sectionIndex * 4);
            const sectionAddress = FSHelpers.readU32(data, 0x48 + sectionIndex * 4);
            const sectionSize = FSHelpers.readU32(data, 0x90 + sectionIndex * 4);

            const section = new DOLSection(sectionOffset, sectionAddress, sectionSize);
            this.sections.push(section);
        }

        this.bssAddress = FSHelpers.readU32(data, 0xD8);
        this.bssSize = FSHelpers.readU32(data, 0xDC);
        this.entryPointAddress = FSHelpers.readU32(data, 0xE0);

        // Verify padding bytes are zero
        for (let i = 0; i < 7; i++) {
            const paddingValue = FSHelpers.readU32(data, 0xE4 + i * 4);
            if (paddingValue !== 0) {
                console.warn(`DOL padding byte at 0x${(0xE4 + i * 4).toString(16)} is not zero: ${paddingValue}`);
            }
        }
    }

    convertAddressToOffset(address) {
        for (const section of this.sections) {
            if (section.containsAddress(address)) {
                return address - section.address + section.offset;
            }
        }
        return null;
    }

    convertOffsetToAddress(offset) {
        for (const section of this.sections) {
            if (section.containsOffset(offset)) {
                return offset - section.offset + section.address;
            }
        }
        return null;
    }

    convertOffsetToSectionIndex(offset) {
        for (let sectionIndex = 0; sectionIndex < this.sections.length; sectionIndex++) {
            if (this.sections[sectionIndex].containsOffset(offset)) {
                return sectionIndex;
            }
        }
        return null;
    }

    readData(readCallback, address, ...args) {
        const offset = this.convertAddressToOffset(address);
        if (offset === null) {
            throw new Error(`Address 0x${address.toString(16).padStart(8, '0')} is not in the data for any of the DOL sections`);
        }
        return readCallback(this.data, offset, ...args);
    }

    writeData(writeCallback, address, ...args) {
        const offset = this.convertAddressToOffset(address);
        if (offset === null) {
            throw new Error(`Address 0x${address.toString(16).padStart(8, '0')} is not in the data for any of the DOL sections`);
        }
        writeCallback(this.data, offset, ...args);
    }

    // Convenience methods for common operations
    seek(offset) {
        this.currentOffset = offset;
    }

    write(data) {
        if (typeof data === 'number') {
            // Single byte
            const view = new DataView(this.data.buffer || this.data, this.currentOffset, 1);
            view.setUint8(0, data);
        } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
            const bytes = new Uint8Array(data);
            FSHelpers.writeBytes(this.data, this.currentOffset, bytes);
        }
    }

    saveChanges() {
        const data = this.data;

        for (let sectionIndex = 0; sectionIndex < this.sections.length; sectionIndex++) {
            const section = this.sections[sectionIndex];
            FSHelpers.writeU32(data, 0x00 + sectionIndex * 4, section.offset);
            FSHelpers.writeU32(data, 0x48 + sectionIndex * 4, section.address);
            FSHelpers.writeU32(data, 0x90 + sectionIndex * 4, section.size);
        }

        FSHelpers.writeU32(data, 0xD8, this.bssAddress);
        FSHelpers.writeU32(data, 0xDC, this.bssSize);
        FSHelpers.writeU32(data, 0xE0, this.entryPointAddress);
    }
}

// GCM Base File class
class GCMBaseFile {
    constructor() {
        this.fileIndex = null;
        this.fileDataOffset = null;
        this.fileSize = null;
        this.name = null;
        this.filePath = null;
        this.isDir = false;
        this.isSystemFile = false;
    }
}

// GCM File Entry class
class GCMFileEntry extends GCMBaseFile {
    constructor() {
        super();
        this.children = [];
        this.parent = null;
        this.nameOffset = 0;
        this.parentFstIndex = 0;
        this.nextFstIndex = 0;
    }

    read(fileIndex, isoData, fileEntryOffset, fntOffset) {
        this.fileIndex = fileIndex;

        const isDirAndNameOffset = FSHelpers.readU32(isoData, fileEntryOffset);
        const fileDataOffsetOrParentFstIndex = FSHelpers.readU32(isoData, fileEntryOffset + 4);
        const fileSizeOrNextFstIndex = FSHelpers.readU32(isoData, fileEntryOffset + 8);

        this.isDir = (isDirAndNameOffset & 0xFF000000) !== 0;
        this.nameOffset = isDirAndNameOffset & 0x00FFFFFF;

        if (this.isDir) {
            this.parentFstIndex = fileDataOffsetOrParentFstIndex;
            this.nextFstIndex = fileSizeOrNextFstIndex;
            this.children = [];
        } else {
            this.fileDataOffset = fileDataOffsetOrParentFstIndex;
            this.fileSize = fileSizeOrNextFstIndex;
        }

        if (fileIndex === 0) {
            this.name = ""; // Root
        } else {
            this.name = FSHelpers.readStrUntilNull(isoData, fntOffset + this.nameOffset);
        }
    }
}

// GCM System File class
class GCMSystemFile extends GCMBaseFile {
    constructor(fileDataOffset, fileSize, name) {
        super();
        this.fileDataOffset = fileDataOffset;
        this.fileSize = fileSize;
        this.name = name;
        this.filePath = "sys/" + name;
        this.isSystemFile = true;
    }
}

// Main GCM class - GameCube disc format
class GCM {
    static MAX_DATA_SIZE_TO_READ_AT_ONCE = 64 * 1024 * 1024; // 64MB

    constructor(isoData) {
        this.isoData = new Uint8Array(isoData);
        this.filesByPath = new Map();
        this.filesByPathLowercase = new Map();
        this.dirsByPath = new Map();
        this.dirsByPathLowercase = new Map();
        this.changedFiles = new Map();
        this.fileEntries = [];
        this.fstOffset = 0;
        this.fstSize = 0;
        this.fntOffset = 0;
    }

    readEntireDisc() {
        this.fstOffset = FSHelpers.readU32(this.isoData, 0x424);
        this.fstSize = FSHelpers.readU32(this.isoData, 0x428);
        this.readFilesystem();
        this.readSystemData();

        // Create lowercase lookup maps
        for (const [filePath, fileEntry] of this.filesByPath) {
            this.filesByPathLowercase.set(filePath.toLowerCase(), fileEntry);
        }
        for (const [dirPath, fileEntry] of this.dirsByPath) {
            this.dirsByPathLowercase.set(dirPath.toLowerCase(), fileEntry);
        }
    }

    readFilesystem() {
        this.fileEntries = [];
        const numFileEntries = FSHelpers.readU32(this.isoData, this.fstOffset + 8);
        this.fntOffset = this.fstOffset + numFileEntries * 0xC;

        for (let fileIndex = 0; fileIndex < numFileEntries; fileIndex++) {
            const fileEntryOffset = this.fstOffset + fileIndex * 0xC;
            const fileEntry = new GCMFileEntry();
            fileEntry.read(fileIndex, this.isoData, fileEntryOffset, this.fntOffset);
            this.fileEntries.push(fileEntry);
        }

        const rootFileEntry = this.fileEntries[0];
        rootFileEntry.filePath = "files";
        this.readDirectory(rootFileEntry, "files");
    }

    readDirectory(directoryFileEntry, dirPath) {
        if (!directoryFileEntry.isDir) {
            throw new Error("Expected directory file entry");
        }

        this.dirsByPath.set(dirPath, directoryFileEntry);

        let i = directoryFileEntry.fileIndex + 1;
        while (i < directoryFileEntry.nextFstIndex) {
            const fileEntry = this.fileEntries[i];

            // Set parent/children relationships
            fileEntry.parent = directoryFileEntry;
            directoryFileEntry.children.push(fileEntry);

            if (fileEntry.isDir) {
                if (directoryFileEntry.fileIndex !== fileEntry.parentFstIndex) {
                    throw new Error("Directory parent index mismatch");
                }
                const subdirPath = dirPath + "/" + fileEntry.name;
                fileEntry.filePath = subdirPath;
                this.readDirectory(fileEntry, subdirPath);
                i = fileEntry.nextFstIndex;
            } else {
                const filePath = dirPath + "/" + fileEntry.name;
                this.filesByPath.set(filePath, fileEntry);
                fileEntry.filePath = filePath;
                i++;
            }
        }
    }

    readSystemData() {
        this.filesByPath.set("sys/boot.bin", new GCMSystemFile(0, 0x440, "boot.bin"));
        this.filesByPath.set("sys/bi2.bin", new GCMSystemFile(0x440, 0x2000, "bi2.bin"));

        const apploaderHeaderSize = 0x20;
        const apploaderSize = FSHelpers.readU32(this.isoData, 0x2440 + 0x14);
        const apploaderTrailerSize = FSHelpers.readU32(this.isoData, 0x2440 + 0x18);
        const apploaderFullSize = apploaderHeaderSize + apploaderSize + apploaderTrailerSize;
        this.filesByPath.set("sys/apploader.img", new GCMSystemFile(0x2440, apploaderFullSize, "apploader.img"));

        const dolOffset = FSHelpers.readU32(this.isoData, 0x420);
        let mainDolSize = 0;

        // Calculate DOL size from text sections
        for (let i = 0; i < 7; i++) {
            const sectionOffset = FSHelpers.readU32(this.isoData, dolOffset + 0x00 + i * 4);
            const sectionSize = FSHelpers.readU32(this.isoData, dolOffset + 0x90 + i * 4);
            const sectionEndOffset = sectionOffset + sectionSize;
            if (sectionEndOffset > mainDolSize) {
                mainDolSize = sectionEndOffset;
            }
        }

        // Calculate DOL size from data sections
        for (let i = 0; i < 11; i++) {
            const sectionOffset = FSHelpers.readU32(this.isoData, dolOffset + 0x1C + i * 4);
            const sectionSize = FSHelpers.readU32(this.isoData, dolOffset + 0xAC + i * 4);
            const sectionEndOffset = sectionOffset + sectionSize;
            if (sectionEndOffset > mainDolSize) {
                mainDolSize = sectionEndOffset;
            }
        }

        this.filesByPath.set("sys/main.dol", new GCMSystemFile(dolOffset, mainDolSize, "main.dol"));
        this.filesByPath.set("sys/fst.bin", new GCMSystemFile(this.fstOffset, this.fstSize, "fst.bin"));
    }

    readFileData(filePath) {
        const fileEntry = this.filesByPathLowercase.get(filePath.toLowerCase());
        if (!fileEntry) {
            throw new Error(`Could not find file: ${filePath}`);
        }

        if (fileEntry.fileSize > GCM.MAX_DATA_SIZE_TO_READ_AT_ONCE) {
            throw new Error("Tried to read a very large file all at once");
        }

        const data = FSHelpers.readBytes(this.isoData, fileEntry.fileDataOffset, fileEntry.fileSize);
        return data;
    }

    getChangedFileData(filePath) {
        if (this.changedFiles.has(filePath)) {
            return this.changedFiles.get(filePath);
        } else {
            return this.readFileData(filePath);
        }
    }

    addNewDirectory(dirPath) {
        if (this.dirsByPathLowercase.has(dirPath.toLowerCase())) {
            throw new Error(`Directory already exists: ${dirPath}`);
        }

        const parentDirName = dirPath.substring(0, dirPath.lastIndexOf('/'));
        const newDirName = dirPath.substring(dirPath.lastIndexOf('/') + 1);

        if (parentDirName === "sys") {
            throw new Error(`Cannot add a new directory to the system directory: ${dirPath}`);
        }
        if (!parentDirName) {
            throw new Error(`Cannot add a new directory to the root directory: ${dirPath}`);
        }

        const newDir = new GCMFileEntry();
        newDir.isDir = true;
        newDir.name = newDirName;
        newDir.filePath = dirPath;
        newDir.children = [];

        const parentDir = this.getOrCreateDirFileEntry(parentDirName);
        parentDir.children.push(newDir);
        newDir.parent = parentDir;

        this.dirsByPath.set(dirPath, newDir);
        this.dirsByPathLowercase.set(dirPath.toLowerCase(), newDir);

        return newDir;
    }

    getOrCreateDirFileEntry(dirPath) {
        const existing = this.dirsByPathLowercase.get(dirPath.toLowerCase());
        if (existing) {
            return existing;
        } else {
            return this.addNewDirectory(dirPath);
        }
    }

    addNewFile(filePath, fileData = null) {
        if (this.filesByPathLowercase.has(filePath.toLowerCase())) {
            throw new Error(`File already exists: ${filePath}`);
        }

        const dirname = filePath.substring(0, filePath.lastIndexOf('/'));
        const basename = filePath.substring(filePath.lastIndexOf('/') + 1);

        const newFile = new GCMFileEntry();
        newFile.name = basename;
        newFile.filePath = filePath;
        newFile.fileDataOffset = (1 << 32); // Large value for ordering
        newFile.fileSize = null;

        const parentDir = this.getOrCreateDirFileEntry(dirname);
        parentDir.children.push(newFile);
        newFile.parent = parentDir;

        if (fileData !== null) {
            this.changedFiles.set(filePath, fileData);
        }

        this.filesByPath.set(filePath, newFile);
        this.filesByPathLowercase.set(filePath.toLowerCase(), newFile);

        return newFile;
    }
}

// TTYD REL files enum equivalent
class Rels {
    static aaa = "aaa";
    static aji = "aji";
    static bom = "bom";
    static dmo = "dmo";
    static dol = "dol";
    static dou = "dou";
    static eki = "eki";
    static end = "end";
    static gon = "gon";
    static gor = "gor";
    static gra = "gra";
    static hei = "hei";
    static hom = "hom";
    static jin = "jin";
    static jon = "jon";
    static kpa = "kpa";
    static las = "las";
    static moo = "moo";
    static mri = "mri";
    static muj = "muj";
    static nok = "nok";
    static pik = "pik";
    static rsh = "rsh";
    static sys = "sys";
    static tik = "tik";
    static tou = "tou";
    static tou2 = "tou2";
    static usu = "usu";
    static win = "win";
    static yuu = "yuu";
}

const relFilepaths = [
    "aaa", "aji", "bom", "dou", "eki", "end", "gon", "gor", "gra", "hei",
    "hom", "init", "jin", "kpa", "las", "mod", "moo", "mri", "muj", "nok",
    "pik", "rsh", "tik", "tou", "tou2", "usu", "win"
];

function getRelPath(rel) {
    return `files/rel/${rel}.rel`;
}

// TTYD Patcher class - equivalent to your Python implementation
class TTYDPatcher {
    constructor(romFileData) {
        this.iso = new GCM(romFileData);
        this.iso.readEntireDisc();
        this.dol = new DOL();
        this.dol.read(this.iso.readFileData("sys/main.dol"));
        this.rels = new Map();

        // Load all REL files
        for (const rel of Object.values(Rels)) {
            if (rel === Rels.dol) continue; // Skip DOL, it's handled separately

            const path = getRelPath(rel);
            try {
                const relData = this.iso.readFileData(path);
                this.rels.set(rel, relData);
            } catch (error) {
                console.warn(`Could not load REL file: ${path}`);
            }
        }
    }

    // Patch game options similar to your Python implementation
    patchOptions(options) {
        const seedOptions = options;

        // Write player name
        const nameLength = Math.min(seedOptions.player_name.length, 0x10);
        const nameBytes = new TextEncoder().encode(seedOptions.player_name);

        // Seek and write to DOL data
        const dolView = new DataView(this.dol.data.buffer || this.dol.data);

        // Player name length
        dolView.setUint8(0x1FF, nameLength);

        // Player name
        const nameArray = new Uint8Array(this.dol.data.buffer || this.dol.data, 0x200, 0x10);
        nameArray.fill(0); // Clear existing data
        nameArray.set(nameBytes.slice(0, nameLength));

        // Seed name
        const seedBytes = new TextEncoder().encode(seedOptions.seed);
        const seedArray = new Uint8Array(this.dol.data.buffer || this.dol.data, 0x210, 16);
        seedArray.fill(0);
        seedArray.set(seedBytes.slice(0, 16));

        // Game options
        dolView.setUint8(0x220, seedOptions.chapter_clears || 0);
        dolView.setUint8(0x221, seedOptions.starting_partner || 0);
        dolView.setUint8(0x222, seedOptions.yoshi_color || 0);
        dolView.setUint8(0x223, 1); // Some flag
        dolView.setUint32(0x224, 0x80003240, false); // Big-endian

        // Optional settings
        if (seedOptions.palace_skip !== undefined) {
            dolView.setUint8(0x229, seedOptions.palace_skip ? 1 : 0);
        }
        if (seedOptions.westside !== undefined) {
            dolView.setUint8(0x22A, seedOptions.westside ? 1 : 0);
        }
        if (seedOptions.peekaboo !== undefined) {
            dolView.setUint8(0x22B, seedOptions.peekaboo ? 1 : 0);
        }
        if (seedOptions.intermissions !== undefined) {
            dolView.setUint8(0x22C, seedOptions.intermissions ? 1 : 0);
        }
        if (seedOptions.starting_hp !== undefined) {
            dolView.setUint8(0x22D, seedOptions.starting_hp);
        }
        if (seedOptions.starting_fp !== undefined) {
            dolView.setUint8(0x22E, seedOptions.starting_fp);
        }
        if (seedOptions.starting_bp !== undefined) {
            dolView.setUint8(0x22F, seedOptions.starting_bp);
        }
        if (seedOptions.full_run_bar !== undefined) {
            dolView.setUint8(0x230, seedOptions.full_run_bar ? 1 : 0);
        }
        if (seedOptions.required_chapters && Array.isArray(seedOptions.required_chapters)) {
            for (let i = 0; i < seedOptions.required_chapters.length && i < 7; i++) {
                dolView.setUint8(0x231 + i, seedOptions.required_chapters[i]);
            }
        }
        if (seedOptions.tattlesanity !== undefined) {
            dolView.setUint8(0x238, seedOptions.tattlesanity ? 1 : 0);
        }
        if (seedOptions.fast_travel !== undefined) {
            dolView.setUint8(0x239, seedOptions.fast_travel ? 1 : 0);
        }
        if (seedOptions.succeed_conditions !== undefined) {
            dolView.setUint8(0x23A, seedOptions.succeed_conditions ? 1 : 0);
        }

        // Yoshi name
        const yoshiNameBytes = new TextEncoder().encode(seedOptions.yoshi_name || "Yoshi");
        const yoshiArray = new Uint8Array(this.dol.data.buffer || this.dol.data, 0x240, 9);
        yoshiArray.fill(0);
        yoshiArray.set(yoshiNameBytes.slice(0, 8));

        // Starting coins
        if (seedOptions.starting_coins !== undefined) {
            dolView.setUint16(0xEB6B6, seedOptions.starting_coins, false); // Big-endian
        }

        // Write some assembly code or data at 0x1888 (you'd need the actual binary data)
        // dolView.setUint32(0x1888, someData, false);

        // More patching at 0x6CE38
        dolView.setUint32(0x6CE38, 0x4BF94A50, false); // Big-endian
    }

    // Add directories and files to ISO
    addModFiles(modData) {
        // Add mod directories
        this.iso.addNewDirectory("files/mod");
        this.iso.addNewDirectory("files/mod/subrels");

        // Add REL files from modData
        for (const filename of relFilepaths) {
            if (filename === "mod") continue;
            if (modData[`${filename}.rel`]) {
                this.iso.addNewFile(`files/mod/subrels/${filename}.rel`, modData[`${filename}.rel`]);
            }
        }

        // Add main mod file
        if (modData["mod.rel"]) {
            this.iso.addNewFile("files/mod/mod.rel", modData["mod.rel"]);
        }
    }

    // Export the patched ISO
    exportPatchedISO() {
        // Update changed files in ISO
        for (const [rel, data] of this.rels) {
            this.iso.changedFiles.set(getRelPath(rel), data);
        }
        this.iso.changedFiles.set("sys/main.dol", this.dol.data);

        // You would implement ISO export here
        // This is a simplified version - the full implementation would be much more complex
        return this.iso.isoData; // Return modified data
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GCM, DOL, TTYDPatcher, FSHelpers, Rels, relFilepaths, getRelPath };
} else {
    window.GCM = GCM;
    window.DOL = DOL;
    window.TTYDPatcher = TTYDPatcher;
    window.FSHelpers = FSHelpers;
    window.Rels = Rels;
    window.relFilepaths = relFilepaths;
    window.getRelPath = getRelPath;
}