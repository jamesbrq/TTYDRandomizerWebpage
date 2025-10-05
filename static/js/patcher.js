// ==================== SHARED PATCHING LOGIC ====================
// This file contains all ROM patching logic shared between result.html and patch.html

// Global variables
let seedData = null;
let romFile = null;

// Shop items location IDs from Data.py
const SHOP_ITEM_LOCATION_IDS = [
    78780030, 78780023, 78780053, 78780003, 78780041, 78780019,
    78780096, 78780102, 78780073, 78780080, 78780072, 78780098,
    78780125, 78780112, 78780131, 78780118, 78780110, 78780111,
    78780173, 78780177, 78780172, 78780175, 78780174, 78780176,
    78780247, 78780248, 78780251, 78780249, 78780246, 78780250,
    78780268, 78780284, 78780273, 78780274, 78780271, 78780283,
    78780317, 78780313, 78780315, 78780312, 78780316, 78780310,
    78780465, 78780462, 78780466, 78780463, 78780464, 78780469,
    78780531, 78780526, 78780524, 78780530, 78780525, 78780529,
    78780569, 78780564, 78780567, 78780573, 78780566, 78780574
];

// Tattle location ID to unit ID mapping from Data.py
const LOCATION_TO_UNIT = {
    78780850: [0x01, 0x24], 78780851: [0x02], 78780852: [0x03], 78780853: [0x42], 78780854: [0x43],
    78780855: [0x44], 78780856: [0x99], 78780857: [0x9a], 78780858: [0x9b], 78780859: [0x0e],
    78780860: [0x0f], 78780861: [0x25], 78780862: [0x26], 78780863: [0x2f], 78780864: [0x30],
    78780865: [0x9c], 78780866: [0x9d], 78780867: [0x0b], 78780868: [0x3c], 78780869: [0x11],
    78780870: [0x16], 78780871: [0x82], 78780872: [0x83], 78780873: [0x38], 78780874: [0x39],
    78780875: [0x3a], 78780876: [0x28], 78780877: [0x9f], 78780878: [0x29], 78780879: [0xa0],
    78780880: [0x48], 78780881: [0x49], 78780882: [0x59], 78780883: [0x69], 78780884: [0x2e],
    78780885: [0x0C, 0x0D], 78780886: [0x31, 0x32], 78780887: [0x33, 0x34], 78780888: [0x35, 0x36],
    78780889: [0x91], 78780890: [0x90, 0x3F], 78780891: [0x07], 78780892: [0x37], 78780893: [0x2c],
    78780894: [0x2d], 78780895: [0x9e], 78780896: [0x04], 78780897: [0x05], 78780898: [0xa3],
    78780899: [0x10, 0x15], 78780900: [0x14], 78780901: [0x56], 78780902: [0x57], 78780903: [0x27],
    78780904: [0x68], 78780905: [0x19], 78780906: [0x58], 78780907: [0x71], 78780908: [0xa2],
    78780909: [0x45], 78780910: [0x46], 78780911: [0x1b], 78780912: [0xa4], 78780913: [0x4a],
    78780914: [0x7b], 78780915: [0xa7], 78780916: [0x18], 78780917: [0x67], 78780918: [0x70],
    78780919: [0xa6], 78780920: [0x4b], 78780921: [0x4c], 78780922: [0x6a], 78780923: [0x54],
    78780924: [0x55], 78780925: [0x7c], 78780926: [0x12], 78780927: [0x2a], 78780928: [0x1a],
    78780929: [0x3D, 0x3E], 78780931: [0x47], 78780932: [0x72], 78780933: [0x13], 78780934: [0xa5],
    78780935: [0x2b], 78780936: [0x5c], 78780937: [0xa8], 78780938: [0x7f], 78780939: [0x3b],
    78780940: [0x5a], 78780941: [0x5b], 78780942: [0x7d], 78780943: [0x7e], 78780944: [0x80, 0x81],
    78780945: [0xa1], 78780946: [0xA9, 0xAA], 78780947: [0x08, 0x09, 0x0A], 78780948: [0x17],
    78780949: [0x84], 78780950: [0xab], 78780951: [0x40], 78780952: [0x41], 78780953: [0x4D, 0x4E, 0x4F],
    78780954: [0x5D, 0x5E, 0x5F, 0x60, 0x61, 0x62], 78780955: [0x6b, 0x6E, 0x6D, 0x6C, 0x6F],
    78780956: [0x1c, 0x64, 0x65, 0x66], 78780957: [0x77], 78780958: [0x78], 78780959: [0x1d],
    78780960: [0x1e], 78780961: [0x73], 78780962: [0x74], 78780963: [0x75], 78780964: [0x76],
    78780965: [0x93], 78780966: [0x22, 0x23], 78780967: [0x79, 0x7A], 78780968: [0x06],
    78780969: [0x92], 78780970: [0x1f, 0xBD, 0xC0, 0x85], 78780971: [0x20, 0xBE, 0xC1, 0x86],
    78780972: [0x21, 0xBF], 78780973: [0x94, 0x96, 0x97, 0x98, 0x95]
};

// ==================== MAIN PATCHING FUNCTION ====================

async function patchROM() {
    if (!romFile || !seedData) {
        alert('Please select a ROM file first.');
        return;
    }

    const patchBtn = document.getElementById('patchBtn');
    patchBtn.disabled = true;
    patchBtn.textContent = 'Patching...';

    const progressSection = document.getElementById('progressSection');
    progressSection.style.display = 'block';

    try {
        updateProgress(0, 'Reading ROM file...');

        // Read ROM file
        const romBuffer = await readFileAsArrayBuffer(romFile);
        console.log('ROM file loaded, size:', romBuffer.byteLength);

        updateProgress(10, 'Parsing ISO structure...');

        // Parse ISO using gciso.js
        const iso = window.parseISO(romBuffer);
        console.log('ISO parsed successfully');

        updateProgress(20, 'Loading data files...');

        // Load locations.json to get offset information
        const locationsResponse = await fetch('/static/json/locations.json');
        const locationsData = await locationsResponse.json();

        // Load tattles.json to get tattle location information
        console.log('Fetching tattles.json...');
        const tattlesResponse = await fetch('/static/json/tattles.json');
        console.log('tattles.json response status:', tattlesResponse.status);
        const tattlesData = await tattlesResponse.json();
        console.log('tattles.json loaded, entries:', tattlesData.length);
        if (tattlesData.length > 0) {
            console.log('First tattle entry:', tattlesData[0]);
        }

        // Load items.json to get rom_id mapping
        const itemsResponse = await fetch('/static/json/items.json');
        const itemsData = await itemsResponse.json();

        // Create location name to location data mapping
        const locationMap = new Map();
        locationsData.forEach(loc => {
            if (loc.name) {
                locationMap.set(loc.name, loc);
            }
        });

        // Add tattle locations to the map
        console.log('Adding tattles to locationMap...');
        let tattlesAdded = 0;
        tattlesData.forEach(loc => {
            if (loc.name) {
                locationMap.set(loc.name, loc);
                tattlesAdded++;
            }
        });
        console.log(`Added ${tattlesAdded} tattle locations to locationMap`);
        console.log('Total locationMap size:', locationMap.size);

        // Create item code to rom_id mapping
        const itemCodeToRomId = new Map();
        itemsData.forEach(item => {
            if (item.id !== undefined && item.rom_id !== undefined) {
                itemCodeToRomId.set(item.id, item.rom_id);
            }
        });

        // ==================== STEP 1: patch_mod ====================
        updateProgress(25, 'Step 1/4: Patching mod and game options...')

        await patchMod(iso, romBuffer, seedData.settings);

        // ==================== STEP 2: patch_icon ====================
        updateProgress(40, 'Step 2/4: Patching icon files...')

        await patchIcon(iso, romBuffer);

        // ==================== STEP 3: patch_items ====================
        updateProgress(55, 'Step 3/4: Patching item locations...')

        await patchItems(iso, romBuffer, seedData.locations, locationMap, itemCodeToRomId);

        // ==================== STEP 4: close_iso ====================
        updateProgress(80, 'Rebuilding ISO...');

        // Rebuild ISO with patched files
        const patchedISO = window.rebuildISO(romBuffer, iso.tree.root);
        console.log('ISO rebuilt, size:', patchedISO.byteLength);

        // DEBUG: Verify final ISO has the patched data
        const finalCheck = new Uint8Array(patchedISO);
        const dolOffsetInISO = 0x20300;
        console.log('=== FINAL ISO VERIFICATION ===');
        console.log(`Final ISO US.bin at 0x${(dolOffsetInISO + 0x1888).toString(16)}: ${finalCheck[dolOffsetInISO + 0x1888].toString(16).padStart(2, '0')} ${finalCheck[dolOffsetInISO + 0x1889].toString(16).padStart(2, '0')} ${finalCheck[dolOffsetInISO + 0x188A].toString(16).padStart(2, '0')} ${finalCheck[dolOffsetInISO + 0x188B].toString(16).padStart(2, '0')}`);
        const finalView = new DataView(patchedISO);
        console.log(`Final ISO hook at 0x${(dolOffsetInISO + 0x6CE38).toString(16)}: ${finalView.getUint32(dolOffsetInISO + 0x6CE38, false).toString(16).padStart(8, '0')}`);
        console.log(`Final ISO player name at 0x${(dolOffsetInISO + 0x200).toString(16)}: ${String.fromCharCode(...finalCheck.slice(dolOffsetInISO + 0x200, dolOffsetInISO + 0x20F))}`);

        updateProgress(100, 'Complete!');

        // Create download for patched ROM
        const blob = new Blob([patchedISO], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const downloadsSection = document.getElementById('downloadsSection');
        const downloadLinks = document.getElementById('downloadLinks');

        downloadLinks.innerHTML = `
            <a href="${url}" download="TTYD_Randomized_Seed_${seedData.seed || 'Unknown'}.iso" class="preset-button" style="display: inline-block; margin: 5px; text-decoration: none;">
                Download Patched ROM
            </a>
        `;

        downloadsSection.style.display = 'block';

        patchBtn.textContent = 'Patch Another ROM';
        patchBtn.disabled = false;

    } catch (error) {
        console.error('Patching failed:', error);
        alert(`Patching failed: ${error.message}`);
        patchBtn.textContent = 'Patch ROM';
        patchBtn.disabled = false;
        progressSection.style.display = 'none';
    }
}

// ==================== ROM PATCHING PROCEDURE (Matches Rom.py) ====================

/**
 * STEP 1: patch_mod - Patch DOL with game options and add mod files
 * (Corresponds to patch_mod in Rom.py lines 24-130)
 */
async function patchMod(iso, romBuffer, settings) {
    console.log('=== STEP 1: patch_mod ===');

    // Patch DOL with game options
    await patchDOLWithOptions(iso, romBuffer, settings);

    // Add mod files to ISO
    await addModFilesToISO(iso);
}

/**
 * STEP 2: patch_icon - Patch icon files with IPS patches
 * (Corresponds to patch_icon in Rom.py lines 142-156)
 */
async function patchIcon(iso, romBuffer) {
    console.log('=== STEP 2: patch_icon ===');
    await patchIconFiles(iso, romBuffer);
}

/**
 * STEP 3: patch_items - Patch all item locations in REL files and DOL
 * (Corresponds to patch_items in Rom.py lines 160-197)
 */
async function patchItems(iso, romBuffer, locations, locationMap, itemCodeToRomId) {
    console.log('=== STEP 3: patch_items ===');

    // Debug: Check if any tattles in locations
    const tattleLocationNames = Object.keys(locations).filter(name => name.includes('Tattle'));
    console.log(`Found ${tattleLocationNames.length} tattle locations in seed data`);
    if (tattleLocationNames.length > 0) {
        console.log('First 5 tattle locations:', tattleLocationNames.slice(0, 5));
    }

    // Group patches by REL file
    const patchesByRel = new Map();
    const tattlePatches = [];

    Object.entries(locations).forEach(([locationName, locationData_tuple]) => {
        // Handle both 2-tuple (old format) and 3-tuple (new format with shop price)
        const itemCode = locationData_tuple[0];
        const playerNum = locationData_tuple[1];
        const shopPrice = locationData_tuple[2] || 0;

        const locationData = locationMap.get(locationName);
        if (!locationData) {
            if (locationName.includes('Tattle')) {
                console.error(`TATTLE NOT FOUND IN MAP: ${locationName}`);
            } else {
                console.warn(`No location data for: ${locationName}`);
            }
            return;
        }

        // Determine rom_id to write
        let romId;
        let actualShopPrice = shopPrice;

        if (playerNum !== 1) {
            // Item from another player - use "Nothing" item (0x71)
            romId = 0x71;
            actualShopPrice = 20; // Special price for "Nothing" items in shops
        } else {
            // Get rom_id from items.json
            romId = itemCodeToRomId.get(itemCode);
            if (romId === undefined) {
                console.warn(`No rom_id for item code ${itemCode}, defaulting to 0x0`);
                romId = 0x0;
            }
        }

        // Handle tattle locations specially
        if (locationName.includes('Tattle')) {
            console.log(`Processing tattle: ${locationName}, locationId: ${locationData.id}, itemCode: ${itemCode}, romId: ${romId}`);

            // Get unit IDs from location_to_unit mapping
            const unitIds = LOCATION_TO_UNIT[locationData.id];
            if (unitIds && unitIds.length > 0) {
                console.log(`  Found ${unitIds.length} unit IDs: ${unitIds.map(u => '0x' + u.toString(16)).join(', ')}`);
                // Some tattles map to multiple units
                unitIds.forEach(unitId => {
                    tattlePatches.push({
                        unitId: unitId,
                        romId: romId,
                        locationName: locationName
                    });
                    console.log(`  Added tattle patch: unit=0x${unitId.toString(16)}, romId=0x${romId.toString(16)}`);
                });
            } else {
                console.warn(`No unit_id mapping for tattle location: ${locationName} (id: ${locationData.id})`);
            }
            return;
        }

        // Skip if no offsets
        if (!locationData.offsets || locationData.offsets.length === 0) {
            console.warn(`No offset data for location: ${locationName}`);
            return;
        }

        const rel = locationData.rel || 'dol';
        if (!patchesByRel.has(rel)) {
            patchesByRel.set(rel, []);
        }

        // Determine if this is a shop item by checking location ID
        const isShopItem = SHOP_ITEM_LOCATION_IDS.includes(locationData.id);

        // Add patch for each offset
        locationData.offsets.forEach(offsetHex => {
            const offset = parseInt(offsetHex, 16);
            patchesByRel.get(rel).push({
                offset: offset,
                romId: romId,
                locationName: locationName,
                isShopItem: isShopItem,
                shopPrice: actualShopPrice
            });
        });
    });

    console.log('Patches grouped by REL:', patchesByRel);
    console.log('Tattle patches:', tattlePatches);

    // Apply patches to each REL file (not DOL in this loop per Rom.py)
    for (const [relName, patches] of patchesByRel) {
        if (relName === 'dol') continue; // Skip DOL, it's handled separately

        console.log(`Patching ${relName} with ${patches.length} patches`);

        // Try both rel/ (root level) and files/rel/ directory locations
        let filePath = `rel/${relName}.rel`;
        let fileNode = getNodeFromTree(iso.tree.root, filePath);

        // If not found at root level, try files/rel/
        if (!fileNode) {
            filePath = `files/rel/${relName}.rel`;
            fileNode = getNodeFromTree(iso.tree.root, filePath);
        }

        if (!fileNode) {
            console.warn(`File not found in ISO: ${filePath}`);
            continue;
        }

        // Read file data
        let fileData;
        if (fileNode.src.kind === 'orig') {
            fileData = new Uint8Array(romBuffer.slice(fileNode.src.offset, fileNode.src.offset + fileNode.src.size));
        } else if (fileNode.src.kind === 'mod') {
            fileData = new Uint8Array(fileNode.src.data);
        } else {
            console.warn(`Unknown src kind for ${filePath}:`, fileNode.src.kind);
            continue;
        }

        // Apply patches to file
        const patchedData = applyPatchesToFile(fileData, patches);

        // CRITICAL: Save the patched REL back to ISO tree
        window.addOrReplace(iso.tree, filePath, patchedData);
        console.log(`Saved patched ${relName} back to ISO`);
    }

    // Apply tattle patches to DOL
    if (tattlePatches.length > 0) {
        console.log(`Patching DOL with ${tattlePatches.length} tattle patches`);
        console.log('Tattle patches to apply:', tattlePatches);

        const dolPath = 'sys/main.dol';
        const dolNode = getNodeFromTree(iso.tree.root, dolPath);
        if (dolNode) {
            console.log('Found DOL node, src.kind:', dolNode.src.kind);

            // Read DOL data
            let dolData;
            if (dolNode.src.kind === 'orig') {
                dolData = new Uint8Array(romBuffer.slice(dolNode.src.offset, dolNode.src.offset + dolNode.src.size));
                console.log('Read DOL from original ROM, size:', dolData.length);
            } else if (dolNode.src.kind === 'mod') {
                dolData = new Uint8Array(dolNode.src.data);
                console.log('Read DOL from modified data, size:', dolData.length);
            } else {
                console.warn('Unknown DOL src kind for tattles:', dolNode.src.kind);
                dolData = null;
            }

            if (dolData) {
                console.log('Applying tattle patches to DOL...');
                // Apply tattle patches
                const patchedDolData = applyTattlePatchesToDOL(dolData, tattlePatches);

                // CRITICAL: Save the patched DOL back to ISO tree
                window.addOrReplace(iso.tree, dolPath, patchedDolData);
                console.log('Saved patched DOL with tattles back to ISO');
            }
        } else {
            console.warn('DOL file not found in ISO');
        }
    } else {
        console.log('No tattle patches to apply');
    }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Patch DOL with game options (similar to patch_mod in Rom.py)
 */
async function patchDOLWithOptions(iso, romBuffer, settings) {
    const dolPath = 'sys/main.dol';
    const dolNode = getNodeFromTree(iso.tree.root, dolPath);
    if (!dolNode) {
        console.warn('DOL file not found for options patching');
        return;
    }

    console.log(`DOL node:`, dolNode);
    console.log(`DOL src:`, dolNode.src);

    // Read DOL data - handle both original and modified files
    // IMPORTANT: Must create a COPY with .slice() so DataView offsets start at 0
    let dolData;
    if (dolNode.src.kind === 'orig') {
        // Extract DOL into a NEW ArrayBuffer
        dolData = new Uint8Array(romBuffer.slice(dolNode.src.offset, dolNode.src.offset + dolNode.src.size));
    } else if (dolNode.src.kind === 'mod') {
        // Copy the modified data to ensure it's a standalone buffer
        const tempBuffer = new ArrayBuffer(dolNode.src.data.byteLength);
        dolData = new Uint8Array(tempBuffer);
        dolData.set(new Uint8Array(dolNode.src.data));
    } else {
        console.error('Unknown DOL src kind:', dolNode.src.kind);
        return;
    }

    // Create DataView from the Uint8Array's buffer
    // Since dolData is created from .slice(), it's a NEW buffer starting at offset 0
    const view = new DataView(dolData.buffer);

    console.log(`DOL size: ${dolData.length} bytes (0x${dolData.length.toString(16)})`);

    // Validate we have enough space for the largest offset we'll write to
    const maxOffset = 0xEB6B6 + 2; // starting_coins offset + 2 bytes
    if (dolData.length < maxOffset) {
        console.error(`DOL too small: ${dolData.length} bytes, need at least ${maxOffset} bytes`);
        return;
    }

    // Safety check for each write
    const safeWrite8 = (offset, value) => {
        if (offset < dolData.length) {
            view.setUint8(offset, value);
        } else {
            console.warn(`Skipping write at 0x${offset.toString(16)} (out of bounds)`);
        }
    };

    const safeWrite16 = (offset, value, littleEndian = false) => {
        if (offset + 1 < dolData.length) {
            view.setUint16(offset, value, littleEndian);
        } else {
            console.warn(`Skipping write at 0x${offset.toString(16)} (out of bounds)`);
        }
    };

    const safeWrite32 = (offset, value, littleEndian = false) => {
        if (offset + 3 < dolData.length) {
            view.setUint32(offset, value, littleEndian);
        } else {
            console.warn(`Skipping write at 0x${offset.toString(16)} (out of bounds)`);
        }
    };

    // Get settings from seedData
    const gameSettings = settings['Paper Mario: The Thousand-Year Door'] || {};

    // Write player name length and name (offset 0x1FF and 0x200)
    const playerName = settings.name || 'Player';
    const nameLength = Math.min(playerName.length, 0x10);
    safeWrite8(0x1FF, nameLength);
    const nameBytes = new TextEncoder().encode(playerName.substring(0, nameLength));
    if (0x200 + nameBytes.length <= dolData.length) {
        dolData.set(nameBytes, 0x200);
    }

    // Write seed name (offset 0x210)
    const seedName = seedData.seed?.toString() || 'Unknown';
    const seedNameBytes = new TextEncoder().encode(seedName.substring(0, 16));
    if (0x210 + seedNameBytes.length <= dolData.length) {
        dolData.set(seedNameBytes, 0x210);
    }

    // Write palace_stars (chapter_clears) (offset 0x220)
    const palaceStars = gameSettings.palace_stars !== undefined ? gameSettings.palace_stars : 7;
    safeWrite8(0x220, palaceStars);

    // Write starting_partner (offset 0x221) - convert string to number
    const partnerMap = {'goombella': 1, 'koops': 2, 'bobbery': 3, 'yoshi': 4, 'flurrie': 5, 'vivian': 6, 'ms_mowz': 7, 'random': 0};
    const startingPartner = partnerMap[gameSettings.starting_partner] || 1;
    safeWrite8(0x221, startingPartner);

    // Write yoshi_color (offset 0x222) - convert string to number
    const yoshiColorMap = {'green': 0, 'red': 1, 'blue': 2, 'orange': 3, 'pink': 4, 'black': 5, 'white': 6};
    const yoshiColor = yoshiColorMap[gameSettings.yoshi_color] !== undefined ? yoshiColorMap[gameSettings.yoshi_color] : 0;
    safeWrite8(0x222, yoshiColor);

    // Write flag at 0x223 (always 1)
    safeWrite8(0x223, 1);

    // Write address at 0x224 (always 0x80003260)
    safeWrite32(0x224, 0x80003260, false);

    // Write various settings to DOL
    if (gameSettings.palace_skip !== undefined) safeWrite8(0x229, gameSettings.palace_skip ? 1 : 0);
    if (gameSettings.open_westside !== undefined) safeWrite8(0x22A, gameSettings.open_westside ? 1 : 0);
    if (gameSettings.permanent_peekaboo !== undefined) safeWrite8(0x22B, gameSettings.permanent_peekaboo ? 1 : 0);
    if (gameSettings.disable_intermissions !== undefined) safeWrite8(0x22C, gameSettings.disable_intermissions ? 1 : 0);
    if (gameSettings.starting_hp !== undefined) safeWrite8(0x22D, gameSettings.starting_hp);
    if (gameSettings.starting_fp !== undefined) safeWrite8(0x22E, gameSettings.starting_fp);
    if (gameSettings.starting_bp !== undefined) safeWrite8(0x22F, gameSettings.starting_bp);
    if (gameSettings.full_run_bar !== undefined) safeWrite8(0x230, gameSettings.full_run_bar ? 1 : 0);

    // Write required_chapters array (offset 0x231, 7 bytes)
    // Use the required_chapters from seed data
    console.log('Required chapters from seed:', seedData.required_chapters);
    if (seedData.required_chapters && Array.isArray(seedData.required_chapters)) {
        for (let i = 0; i < Math.min(seedData.required_chapters.length, 7); i++) {
            safeWrite8(0x231 + i, seedData.required_chapters[i]);
            console.log(`Wrote required chapter ${seedData.required_chapters[i]} at offset 0x${(0x231 + i).toString(16)}`);
        }
    } else {
        console.warn('No required_chapters in seed data!');
    }

    if (gameSettings.tattlesanity !== undefined) safeWrite8(0x238, gameSettings.tattlesanity ? 1 : 0);
    if (gameSettings.fast_travel !== undefined) safeWrite8(0x239, gameSettings.fast_travel ? 1 : 0);
    if (gameSettings.succeed_conditions !== undefined) safeWrite8(0x23A, gameSettings.succeed_conditions ? 1 : 0);
    if (gameSettings.cutscene_skip !== undefined) safeWrite8(0x23C, gameSettings.cutscene_skip ? 1 : 0);
    if (gameSettings.experience_multiplier !== undefined) safeWrite8(0x23D, gameSettings.experience_multiplier);
    if (gameSettings.starting_level !== undefined) safeWrite8(0x23E, gameSettings.starting_level);

    // Convert music_settings string to number
    const musicMap = {'normal': 0, 'silent': 1, 'randomized': 2};
    const music = musicMap[gameSettings.music_settings] !== undefined ? musicMap[gameSettings.music_settings] : 0;
    safeWrite8(0x241, music);

    // Convert block_visibility string to number
    const blockVisMap = {'normal': 0, 'all_visible': 1};
    const blockVis = blockVisMap[gameSettings.block_visibility] !== undefined ? blockVisMap[gameSettings.block_visibility] : 0;
    safeWrite8(0x242, blockVis);
    if (gameSettings.first_attack !== undefined) safeWrite8(0x243, gameSettings.first_attack);

    // Write random 4 bytes at 0x244
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    if (0x244 + 4 <= dolData.length) {
        dolData.set(randomBytes, 0x244);
    }

    // Write yoshi_name (offset 0x260, 8 bytes + null terminator)
    const yoshiName = gameSettings.yoshi_name || 'Yoshi';
    const yoshiNameBytes = new TextEncoder().encode(yoshiName.substring(0, 8));
    if (0x260 + 9 <= dolData.length) {
        dolData.set(yoshiNameBytes, 0x260);
        dolData[0x260 + yoshiNameBytes.length] = 0; // null terminator
    }

    // Write starting coins (offset 0xEB6B6)
    if (gameSettings.starting_coins !== undefined) {
        safeWrite16(0xEB6B6, gameSettings.starting_coins, false);
    }

    // Load and write US.bin data at offset 0x1888
    try {
        const usBinResponse = await fetch('/static/data/US.bin');
        const usBinData = new Uint8Array(await usBinResponse.arrayBuffer());
        if (0x1888 + usBinData.length <= dolData.length) {
            dolData.set(usBinData, 0x1888);
            console.log(`Wrote US.bin (${usBinData.length} bytes) at 0x1888`);
        } else {
            console.warn(`US.bin too large: ${usBinData.length} bytes, space available: ${dolData.length - 0x1888}`);
        }
    } catch (error) {
        console.warn('Failed to load US.bin:', error);
    }

    // Write hook address at 0x6CE38
    safeWrite32(0x6CE38, 0x4BF94A50, false);

    // DEBUG: Verify the data was written before saving
    console.log('=== PRE-SAVE VERIFICATION ===');
    console.log(`US.bin check at 0x1888: ${dolData[0x1888].toString(16).padStart(2, '0')} ${dolData[0x1889].toString(16).padStart(2, '0')} ${dolData[0x188A].toString(16).padStart(2, '0')} ${dolData[0x188B].toString(16).padStart(2, '0')}`);
    console.log(`Hook check at 0x6CE38: ${view.getUint32(0x6CE38, false).toString(16).padStart(8, '0')}`);
    console.log(`dolData is instance of Uint8Array: ${dolData instanceof Uint8Array}`);
    console.log(`dolData.buffer is instance of ArrayBuffer: ${dolData.buffer instanceof ArrayBuffer}`);
    console.log(`dolData.byteOffset: ${dolData.byteOffset}`);
    console.log(`dolData.length: ${dolData.length}`);

    // Replace DOL in ISO
    window.addOrReplace(iso.tree, dolPath, dolData);

    // DEBUG: Verify the DOL node was updated
    const updatedDolNode = getNodeFromTree(iso.tree.root, dolPath);
    console.log('=== POST-SAVE VERIFICATION ===');
    console.log(`Updated DOL node src.kind: ${updatedDolNode.src.kind}`);
    console.log(`Updated DOL node src.modified: ${updatedDolNode.src.modified}`);
    if (updatedDolNode.src.kind === 'mod') {
        const savedData = updatedDolNode.src.data;
        console.log(`Saved data US.bin check at 0x1888: ${savedData[0x1888].toString(16).padStart(2, '0')} ${savedData[0x1889].toString(16).padStart(2, '0')} ${savedData[0x188A].toString(16).padStart(2, '0')} ${savedData[0x188B].toString(16).padStart(2, '0')}`);
        const savedView = new DataView(savedData.buffer);
        console.log(`Saved data hook at 0x6CE38: ${savedView.getUint32(0x6CE38, false).toString(16).padStart(8, '0')}`);
    }

    console.log('DOL patched with game options');
}

/**
 * Add mod files from static/data to the ISO
 */
async function addModFilesToISO(iso) {
    const modFiles = [
        'aaa.rel', 'aji.rel', 'bom.rel', 'dou.rel', 'eki.rel', 'end.rel',
        'gon.rel', 'gor.rel', 'gra.rel', 'hei.rel', 'hom.rel', 'init.rel',
        'jin.rel', 'kpa.rel', 'las.rel', 'moo.rel', 'mri.rel', 'muj.rel',
        'nok.rel', 'pik.rel', 'rsh.rel', 'tik.rel', 'tou.rel', 'tou2.rel',
        'usu.rel', 'win.rel', 'mod.rel'
    ];

    // Create directories if they don't exist
    // Note: gciso.js addOrReplace should handle directory creation

    // Add subrels at ROOT (mod/subrels/, not files/mod/subrels/)
    for (const relFile of modFiles.filter(f => f !== 'mod.rel')) {
        try {
            const response = await fetch(`/static/data/${relFile}`);
            const data = new Uint8Array(await response.arrayBuffer());
            window.addOrReplace(iso.tree, `mod/subrels/${relFile}`, data);
            console.log(`Added mod file: mod/subrels/${relFile}`);
        } catch (error) {
            console.warn(`Failed to load mod file ${relFile}:`, error);
        }
    }

    // Add mod.rel at ROOT (mod/mod.rel, not files/mod/mod.rel)
    try {
        const modRelResponse = await fetch('/static/data/mod.rel');
        const modRelData = new Uint8Array(await modRelResponse.arrayBuffer());
        window.addOrReplace(iso.tree, 'mod/mod.rel', modRelData);
        console.log('Added mod.rel at mod/mod.rel');
    } catch (error) {
        console.warn('Failed to load mod.rel:', error);
    }

    // Add mod.txt at ROOT (msg/US/mod.txt, not files/msg/US/mod.txt)
    try {
        const modTxtResponse = await fetch('/static/data/mod.txt');
        const modTxtData = new Uint8Array(await modTxtResponse.arrayBuffer());
        window.addOrReplace(iso.tree, 'msg/US/mod.txt', modTxtData);
        console.log('Added mod.txt at msg/US/mod.txt');
    } catch (error) {
        console.warn('Failed to load mod.txt:', error);
    }

    // Add desc.txt to msg/US - just 2 null terminators
    const descTxtData = new Uint8Array([0x00, 0x00]);
    window.addOrReplace(iso.tree, 'msg/US/desc.txt', descTxtData);
    console.log('Added desc.txt at msg/US/desc.txt');
}

/**
 * Patch icon files using IPS patches
 */
async function patchIconFiles(iso, romBuffer) {
    try {
        // Load IPS patches
        const iconIpsResponse = await fetch('/static/data/icon.ips');
        const iconIpsData = await iconIpsResponse.arrayBuffer();

        const iconBinIpsResponse = await fetch('/static/data/icon_bin.ips');
        const iconBinIpsData = await iconBinIpsResponse.arrayBuffer();

        // Get original icon files from ISO at ROOT (not in files/)
        const iconNode = getNodeFromTree(iso.tree.root, 'icon.tpl');
        const iconBinNode = getNodeFromTree(iso.tree.root, 'icon.bin');

        if (!iconNode || !iconBinNode) {
            console.warn('Icon files not found in ISO root');
            return;
        }

        // Read original data - handle both original and modified files
        let originalIconData, originalIconBinData;

        if (iconNode.src.kind === 'orig') {
            originalIconData = new Uint8Array(romBuffer.slice(iconNode.src.offset, iconNode.src.offset + iconNode.src.size));
        } else if (iconNode.src.kind === 'mod') {
            originalIconData = new Uint8Array(iconNode.src.data);
        }

        if (iconBinNode.src.kind === 'orig') {
            originalIconBinData = new Uint8Array(romBuffer.slice(iconBinNode.src.offset, iconBinNode.src.offset + iconBinNode.src.size));
        } else if (iconBinNode.src.kind === 'mod') {
            originalIconBinData = new Uint8Array(iconBinNode.src.data);
        }

        // Apply IPS patches using ips.js
        const patchedIconData = window.applyIPS(originalIconData, new Uint8Array(iconIpsData));
        const patchedIconBinData = window.applyIPS(originalIconBinData, new Uint8Array(iconBinIpsData));

        // Remove original files first since patched files are always larger
        // This allows the files to be relocated to the appended area
        iso.tree.root.children.delete('icon.tpl');
        iso.tree.root.children.delete('icon.bin');

        // Add patched files at ROOT
        window.addOrReplace(iso.tree, 'icon.tpl', new Uint8Array(patchedIconData));
        window.addOrReplace(iso.tree, 'icon.bin', new Uint8Array(patchedIconBinData));

        console.log('Icon files patched successfully');
    } catch (error) {
        console.warn('Failed to patch icon files:', error);
    }
}

/**
 * Get a node from the ISO tree by path
 */
function getNodeFromTree(root, path) {
    const parts = path.split('/').filter(Boolean);
    let current = root;

    for (const part of parts) {
        if (!current.children || !current.children.has(part)) {
            return null;
        }
        current = current.children.get(part);
    }

    return current;
}

/**
 * Apply patches to a file buffer (REL or DOL)
 */
function applyPatchesToFile(fileData, patches) {
    // Create a copy of the file data
    const patchedData = new Uint8Array(fileData);
    const view = new DataView(patchedData.buffer);

    // Sort patches by offset to apply in order
    patches.sort((a, b) => a.offset - b.offset);

    // Apply each patch
    patches.forEach(patch => {
        // Write the rom_id as a 32-bit big-endian integer
        if (patch.offset + 4 <= patchedData.length) {
            view.setUint32(patch.offset, patch.romId, false); // false = big-endian

            // If this is a shop item, write the price after the item code
            if (patch.isShopItem && patch.offset + 8 <= patchedData.length) {
                view.setUint32(patch.offset + 4, patch.shopPrice, false);
            }
        } else {
            console.warn(`Offset 0x${patch.offset.toString(16)} out of bounds for ${patch.locationName}`);
        }
    });

    return patchedData;
}

/**
 * Apply tattle patches to DOL file
 * Tattles are written as 2-byte values at specific unit-based offsets
 */
function applyTattlePatchesToDOL(dolData, tattlePatches) {
    // Create a copy of the DOL data
    const patchedData = new Uint8Array(dolData);
    const view = new DataView(patchedData.buffer);

    console.log(`applyTattlePatchesToDOL: Processing ${tattlePatches.length} patches, DOL size: ${patchedData.length}`);

    // Apply each tattle patch
    tattlePatches.forEach((patch, index) => {
        // Calculate offset: 0xB00 + ((unit_id - 1) * 2)
        const offset = 0xB00 + ((patch.unitId - 1) * 2);

        console.log(`Patch ${index + 1}/${tattlePatches.length}: ${patch.locationName}`);
        console.log(`  unit_id: 0x${patch.unitId.toString(16)}, rom_id: 0x${patch.romId.toString(16)}`);
        console.log(`  calculated offset: 0x${offset.toString(16)} (0xB00 + ((0x${patch.unitId.toString(16)} - 1) * 2))`);

        if (offset + 2 <= patchedData.length) {
            const oldValue = view.getUint16(offset, false);
            view.setUint16(offset, patch.romId, false); // false = big-endian, 2 bytes
            const newValue = view.getUint16(offset, false);
            console.log(`  OLD value at 0x${offset.toString(16)}: 0x${oldValue.toString(16)}`);
            console.log(`  NEW value at 0x${offset.toString(16)}: 0x${newValue.toString(16)}`);
        } else {
            console.warn(`  ERROR: Tattle offset 0x${offset.toString(16)} out of bounds (DOL size: ${patchedData.length})`);
        }
    });

    return patchedData;
}

function updateProgress(percent, status) {
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').textContent = Math.round(percent) + '%';
    document.getElementById('progressStatus').textContent = status;
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ==================== PATCH FILE FUNCTIONS ====================

/**
 * Download seed data as a distributable patch file (.ttydp)
 * Format: Obfuscated binary format with magic header
 */
async function downloadPatch() {
    if (!seedData) {
        alert('No seed data available.');
        return;
    }

    try {
        // Create patch data structure (without spoiler information)
        const patchData = {
            version: 1,
            seed: seedData.seed,
            locations: seedData.locations,
            required_chapters: seedData.required_chapters,
            settings: seedData.settings,
            timestamp: seedData.timestamp
        };

        // Convert to JSON string
        const jsonStr = JSON.stringify(patchData);

        // Create binary format with magic header
        // Magic: "TTYDPATCH" (9 bytes) + version byte (1 byte) + data
        const encoder = new TextEncoder();
        const magic = encoder.encode('TTYDPATCH');
        const versionByte = new Uint8Array([1]);

        // Compress and obfuscate the JSON data
        const jsonBytes = encoder.encode(jsonStr);
        const obfuscatedData = obfuscateData(jsonBytes);

        // Combine into final binary format
        const patchFile = new Uint8Array(magic.length + versionByte.length + obfuscatedData.length);
        patchFile.set(magic, 0);
        patchFile.set(versionByte, magic.length);
        patchFile.set(obfuscatedData, magic.length + versionByte.length);

        // Create and download the file
        const blob = new Blob([patchFile], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TTYD_Seed_${seedData.seed || 'Unknown'}.ttydp`;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`Downloaded patch file: ${link.download}`);
    } catch (error) {
        console.error('Error generating patch file:', error);
        alert('Failed to generate patch file: ' + error.message);
    }
}

/**
 * Simple XOR obfuscation to prevent casual parsing
 * Uses a key derived from the magic header
 */
function obfuscateData(data) {
    const key = new Uint8Array([0x54, 0x54, 0x59, 0x44, 0x50, 0x41, 0x54, 0x43, 0x48]); // "TTYDPATCH"
    const obfuscated = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
        obfuscated[i] = data[i] ^ key[i % key.length];
    }

    return obfuscated;
}

/**
 * Deobfuscate data (same as obfuscate for XOR)
 */
function deobfuscateData(data) {
    return obfuscateData(data); // XOR is reversible
}

/**
 * Deobfuscate patch data (alias for compatibility)
 */
function deobfuscatePatchData(data) {
    return deobfuscateData(data);
}

async function downloadSpoiler() {
    if (!seedData) {
        alert('No seed data available.');
        return;
    }

    try {
        // Load items.json to map item codes to names
        const itemsResponse = await fetch('/static/json/items.json');
        const itemsData = await itemsResponse.json();

        // Create item code to name mapping and progression info
        const itemCodeToName = new Map();
        const itemCodeToProgression = new Map();
        itemsData.forEach(item => {
            if (item.id) {
                itemCodeToName.set(item.id, item.item_name);
                itemCodeToProgression.set(item.id, item.progression);
            }
        });

        // Generate spoiler log text
        let spoilerText = '===============================================\n';
        spoilerText += '    TTYD Randomizer - Spoiler Log\n';
        spoilerText += '===============================================\n\n';

        // Basic Info
        spoilerText += `Seed: ${seedData.seed || 'Unknown'}\n`;
        spoilerText += `Generated: ${new Date(seedData.timestamp).toLocaleString()}\n\n`;

        // Settings (excluding death_link)
        if (seedData.settings) {
            spoilerText += 'SETTINGS:\n';
            spoilerText += '---------\n';
            const gameSettings = seedData.settings['Paper Mario: The Thousand-Year Door'];
            if (gameSettings) {
                Object.entries(gameSettings)
                    .filter(([key]) => key !== 'death_link') // Exclude death_link
                    .forEach(([key, value]) => {
                        spoilerText += `  ${key}: ${value}\n`;
                    });
            }
            spoilerText += '\n';
        }

        // All Locations
        spoilerText += '='.repeat(60) + '\n';
        spoilerText += 'ITEM LOCATIONS\n';
        spoilerText += '='.repeat(60) + '\n\n';

        // Sort locations alphabetically
        const sortedLocations = Object.entries(seedData.locations).sort((a, b) => a[0].localeCompare(b[0]));

        sortedLocations.forEach(([locationName, [itemCode, playerNum]]) => {
            const itemName = itemCodeToName.get(itemCode) || `Unknown Item (${itemCode})`;
            spoilerText += `${locationName}: ${itemName}\n`;
        });

        // Statistics
        spoilerText += '='.repeat(60) + '\n';
        spoilerText += 'STATISTICS\n';
        spoilerText += '='.repeat(60) + '\n';
        spoilerText += `Total Locations: ${Object.keys(seedData.locations).length}\n`;

        // Count progression items
        let progressionItemCount = 0;
        Object.values(seedData.locations).forEach(([itemCode]) => {
            if (itemCodeToProgression.get(itemCode) === 'progression') {
                progressionItemCount++;
            }
        });
        spoilerText += `Progression Items: ${progressionItemCount}\n`;

        // Create and download the file
        const blob = new Blob([spoilerText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TTYD_Spoiler_Seed_${seedData.seed || 'Unknown'}.txt`;
        link.click();
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error generating spoiler:', error);
        alert('Failed to generate spoiler log: ' + error.message);
    }
}

function handleROMSelection(event) {
    const file = event.target.files[0];
    if (file) {
        romFile = file;
        document.getElementById('selectedROMName').textContent = file.name;
        document.getElementById('patchBtn').disabled = false;
        console.log('ROM file selected:', file.name);
    }
}
