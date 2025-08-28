function toggleSwitch(switchElement) {
    switchElement.classList.toggle('active');
}

function switchTab(clickedTab, targetContentId) {
    // Remove active class from all tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Hide all panel content
    document.querySelectorAll('.panel-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activate clicked tab
    clickedTab.classList.add('active');
    
    // Show target content
    document.getElementById(targetContentId).classList.add('active');
}

function getSettingsString() {
    const settings = {};
    
    // Get all toggle switches
    document.querySelectorAll('.toggle-switch').forEach((toggle, index) => {
        const label = toggle.parentElement.querySelector('.toggle-label').textContent;
        settings[label] = toggle.classList.contains('active');
    });
    
    // Get all number inputs
    document.querySelectorAll('.number-input').forEach((input) => {
        const label = input.parentElement.querySelector('.number-label').textContent;
        settings[label] = parseInt(input.value);
    });
    
    // Convert to base64 encoded JSON string
    return btoa(JSON.stringify(settings));
}

function loadSettingsFromString(settingsString) {
    try {
        // Decode base64 and parse JSON
        const settings = JSON.parse(atob(settingsString));
        
        // Apply toggle switch settings
        document.querySelectorAll('.toggle-switch').forEach((toggle) => {
            const label = toggle.parentElement.querySelector('.toggle-label').textContent;
            if (settings.hasOwnProperty(label)) {
                if (settings[label]) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            }
        });
        
        // Apply number input settings
        document.querySelectorAll('.number-input').forEach((input) => {
            const label = input.parentElement.querySelector('.number-label').textContent;
            if (settings.hasOwnProperty(label)) {
                input.value = settings[label];
            }
        });
        
        return true;
    } catch (error) {
        console.error('Error loading settings:', error);
        return false;
    }
}

function saveSettings() {
    const settingsString = getSettingsString();
    
    // Copy to clipboard silently
    navigator.clipboard.writeText(settingsString).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = settingsString;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

function loadSettings() {
    customPrompt('Paste your settings string:', 'Load Settings', '', (settingsString) => {
        if (settingsString && settingsString.trim()) {
            loadSettingsFromString(settingsString.trim());
        }
    });
}

function exportToField() {
    const settingsString = getSettingsString();
    const inputField = document.getElementById('settingsStringInput');
    inputField.value = settingsString;
    
    // Select the text for easy copying
    inputField.select();
    inputField.setSelectionRange(0, 99999); // For mobile devices
    
    // Copy to clipboard silently
    navigator.clipboard.writeText(settingsString).catch(() => {
        // Fallback for older browsers
        try {
            document.execCommand('copy');
        } catch (err) {
            console.log('Could not copy to clipboard');
        }
    });
}

function importFromField() {
    const inputField = document.getElementById('settingsStringInput');
    const settingsString = inputField.value.trim();
    
    if (settingsString) {
        loadSettingsFromString(settingsString);
    }
}

function loadPreset() {
    const dropdown = document.querySelector('.preset-dropdown');
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const deleteButton = document.getElementById('deletePresetBtn');
    
    // Show/hide delete button based on whether it's a user preset
    if (selectedOption.dataset.userPreset === 'true') {
        deleteButton.style.display = 'inline-block';
    } else {
        deleteButton.style.display = 'none';
    }
    
    if (selectedOption.dataset.settings) {
        loadSettingsFromString(selectedOption.dataset.settings);
        // Also update the input field
        const inputField = document.getElementById('settingsStringInput');
        inputField.value = selectedOption.dataset.settings;
    }
}

function deleteCurrentPreset() {
    const dropdown = document.querySelector('.preset-dropdown');
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    
    if (selectedOption.dataset.userPreset === 'true') {
        const presetName = selectedOption.text;
        customConfirm(
            `Are you sure you want to delete the preset "${presetName}"?`,
            'Delete Preset',
            () => {
                deleteUserPreset(presetName);
                dropdown.selectedIndex = 0; // Reset to "Select Preset..."
                document.getElementById('deletePresetBtn').style.display = 'none';
                // Clear the input field
                document.getElementById('settingsStringInput').value = '';
            }
        );
    }
}

function savePreset() {
    customPrompt(
        'Enter a name for this preset:',
        'Save Preset',
        '',
        (presetName) => {
            if (!presetName || presetName.trim() === '') {
                return;
            }
            
            const settingsString = getSettingsString();
            
            // Save to cookie
            const userPresets = getUserPresets();
            userPresets[presetName.trim()] = settingsString;
            saveUserPresets(userPresets);
            
            // Add to dropdown
            addPresetToDropdown(presetName.trim(), settingsString);
            
            // Update input field
            const inputField = document.getElementById('settingsStringInput');
            inputField.value = settingsString;
            
            // Show delete button since we just saved a user preset
            document.getElementById('deletePresetBtn').style.display = 'inline-block';
        }
    );
}

function getUserPresets() {
    const cookieValue = getCookie('ttydPresets');
    try {
        return cookieValue ? JSON.parse(cookieValue) : {};
    } catch (e) {
        return {};
    }
}

function saveUserPresets(presets) {
    setCookie('ttydPresets', JSON.stringify(presets), 365); // Save for 1 year
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function addPresetToDropdown(name, settingsString) {
    const dropdown = document.querySelector('.preset-dropdown');
    
    // Check if preset already exists
    for (let i = 0; i < dropdown.options.length; i++) {
        if (dropdown.options[i].text === name) {
            // Update existing preset
            dropdown.options[i].dataset.settings = settingsString;
            dropdown.selectedIndex = i;
            return;
        }
    }
    
    // Add new preset
    const option = document.createElement('option');
    option.text = name;
    option.dataset.settings = settingsString;
    option.dataset.userPreset = 'true';
    dropdown.add(option);
    dropdown.selectedIndex = dropdown.options.length - 1;
}

function loadUserPresets() {
    const userPresets = getUserPresets();
    const dropdown = document.querySelector('.preset-dropdown');
    
    // Add user presets to dropdown
    Object.keys(userPresets).forEach(presetName => {
        const option = document.createElement('option');
        option.text = presetName;
        option.dataset.settings = userPresets[presetName];
        option.dataset.userPreset = 'true';
        dropdown.add(option);
    });
}

function deleteUserPreset(presetName) {
    const userPresets = getUserPresets();
    delete userPresets[presetName];
    saveUserPresets(userPresets);
    
    // Remove from dropdown
    const dropdown = document.querySelector('.preset-dropdown');
    for (let i = 0; i < dropdown.options.length; i++) {
        if (dropdown.options[i].text === presetName && dropdown.options[i].dataset.userPreset === 'true') {
            dropdown.remove(i);
            break;
        }
    }
}

// Modal System
function showModal(title, message, buttons, inputOptions = null) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const messageEl = document.getElementById('modalMessage');
    const inputEl = document.getElementById('modalInput');
    const buttonsEl = document.getElementById('modalButtons');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Handle input field
    if (inputOptions) {
        inputEl.style.display = 'block';
        inputEl.value = inputOptions.defaultValue || '';
        inputEl.placeholder = inputOptions.placeholder || '';
        inputEl.focus();
    } else {
        inputEl.style.display = 'none';
    }
    
    // Clear and add buttons
    buttonsEl.innerHTML = '';
    buttons.forEach(button => {
        const btnEl = document.createElement('button');
        btnEl.className = `modal-button ${button.type || 'secondary'}`;
        btnEl.textContent = button.text;
        btnEl.onclick = () => {
            hideModal();
            const inputValue = inputOptions ? inputEl.value : null;
            button.action(inputValue);
        };
        buttonsEl.appendChild(btnEl);
    });
    
    overlay.classList.add('show');
    
    // Handle Enter key for input
    if (inputOptions) {
        inputEl.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const primaryBtn = buttons.find(b => b.type === 'primary');
                if (primaryBtn) {
                    hideModal();
                    primaryBtn.action(inputEl.value);
                }
            }
        };
    }
}

function hideModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// Custom alert replacement
function customAlert(message, title = 'Notice') {
    showModal(title, message, [
        { text: 'OK', type: 'primary', action: () => {} }
    ]);
}

// Custom confirm replacement
function customConfirm(message, title = 'Confirm', onConfirm, onCancel = () => {}) {
    showModal(title, message, [
        { text: 'Cancel', type: 'secondary', action: onCancel },
        { text: 'Confirm', type: 'primary', action: onConfirm }
    ]);
}

// Custom prompt replacement
function customPrompt(message, title = 'Input Required', defaultValue = '', onConfirm, onCancel = () => {}) {
    showModal(title, message, [
        { text: 'Cancel', type: 'secondary', action: onCancel },
        { text: 'OK', type: 'primary', action: onConfirm }
    ], { defaultValue, placeholder: 'Enter value...' });
}

// ROM file handling (COMMENTED OUT FOR TESTING)
/*
let selectedROMFile = null;

// Global variables for extracted files
let extractedDOL = null;
let extractedRELFiles = {};
*/

// REL file definitions
const REL_FILES = {
    aaa: "aaa",
    aji: "aji", 
    bom: "bom",
    dmo: "dmo",
    dou: "dou",
    eki: "eki",
    end: "end",
    gon: "gon",
    gor: "gor",
    gra: "gra",
    hei: "hei",
    hom: "hom",
    jin: "jin",
    jon: "jon",
    kpa: "kpa",
    las: "las",
    moo: "moo",
    mri: "mri",
    muj: "muj",
    nok: "nok",
    pik: "pik",
    rsh: "rsh",
    sys: "sys",
    tik: "tik",
    tou: "tou",
    tou2: "tou2",
    usu: "usu",
    win: "win",
    yuu: "yuu"
};

// Handle ROM file selection (COMMENTED OUT FOR TESTING)
/*
function handleROMSelection(event) {
    const file = event.target.files[0];
    if (file) {
        selectedROMFile = file;
        console.log(`Selected ROM: ${file.name} (${file.size} bytes)`);
        
        // Update UI to show selected file
        const fileNameElement = document.getElementById('selectedROMName');
        if (fileNameElement) {
            fileNameElement.textContent = file.name;
        }
        
        // Enable generate button if it exists
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.disabled = false;
        }
    }
}
*/

// ROM processing functions (COMMENTED OUT FOR TESTING)
/*
async function extractAndPatchFiles(isoData, locationData, settings) {
    console.log('Extracting and patching files...');
    const { addOrReplace } = await import('./gciso.js');
    
    // Extract DOL
    const sysDir = isoData.tree.root.children.get('sys');
    if (sysDir && sysDir.children.has('main.dol')) {
        const dolNode = sysDir.children.get('main.dol');
        if (dolNode.src && dolNode.src.kind === 'orig') {
            extractedDOL = new Uint8Array(isoData.isoBuf.slice(dolNode.src.offset, dolNode.src.offset + dolNode.src.size));
        }
    }
    
    // Extract REL files
    extractedRELFiles = {};
    Object.values(REL_FILES).forEach(relName => {
        const relIndex = isoData.parsedNodes.findIndex((node, i) => {
            const path = isoData.pathByIndex.get(i);
            return path === `rel/${relName}.rel` && node.type === 0;
        });
        if (relIndex !== -1) {
            extractedRELFiles[relName] = isoData.getFileSlice(relIndex);
        }
    });
    
    // Apply location patches to REL files
    Object.entries(extractedRELFiles).forEach(([relName, relData]) => {
        if (relData) {
            const locationsToProcess = getLocationsToPatch(relName, locationData);
            if (locationsToProcess.length > 0) {
                console.log(`Patching ${locationsToProcess.length} locations in ${relName}`);
                extractedRELFiles[relName] = applyLocationPatches(relName, relData, locationsToProcess);
            }
        }
    });
    
    // Patch DOL locations and settings
    if (extractedDOL) {
        const dolLocations = getLocationsToPatch('dol', locationData);
        if (dolLocations.length > 0) {
            console.log(`Patching ${dolLocations.length} locations in DOL`);
            const view = new DataView(extractedDOL.buffer);
            dolLocations.forEach(location => {
                const itemToPlace = location.getEffectiveItem();
                const romId = convertToRomId(itemToPlace);
                location.getAllOffsets().forEach(offset => {
                    if (offset + 4 <= extractedDOL.length) {
                        view.setUint32(offset, romId, false); // false = big-endian
                        console.log(`  DOL Location "${location.name}" at offset 0x${offset.toString(16)}: ${location.vanillaItem} -> ${romId}`);
                    }
                });
            });
        }
        await patchDOL();
    }
    
    // Patch icons
    await patchIcons(isoData);
    
    // Add mod files
    const relFilepaths = ['aaa', 'aji', 'bom', 'dou', 'eki', 'end', 'gon', 'gor', 'gra', 'hei', 'hom', 'init', 'jin', 'kpa', 'las', 'moo', 'mri', 'muj', 'nok', 'pik', 'rsh', 'tik', 'tou', 'tou2', 'usu', 'win'];
    for (const file of relFilepaths) {
        try {
            const response = await fetch(`data/${file}.rel`);
            if (response.ok) {
                const fileData = new Uint8Array(await response.arrayBuffer());
                addOrReplace(isoData.tree, `mod/subrels/${file}.rel`, fileData);
            }
        } catch (error) {}
    }
    
    const modFiles = [{ filename: "boot.dol", source: "data/boot.dol" }, { filename: "mod.rel", source: "data/mod.rel" }, { filename: "pit_00.txt", source: "data/pit_00.txt" }];
    for (const modFile of modFiles) {
        try {
            const response = await fetch(modFile.source);
            if (response.ok) {
                const fileData = new Uint8Array(await response.arrayBuffer());
                addOrReplace(isoData.tree, `mod/${modFile.filename}`, fileData);
            }
        } catch (error) {}
    }
    
    // Replace files in ISO
    if (extractedDOL) {
        addOrReplace(isoData.tree, "sys/main.dol", extractedDOL);
    }
    Object.entries(extractedRELFiles).forEach(([relName, relData]) => {
        if (relData) {
            addOrReplace(isoData.tree, `rel/${relName}.rel`, relData);
        }
    });
}
*/

// DOL patching functions (COMMENTED OUT FOR TESTING)
/*
async function patchDOL() {
    if (!extractedDOL) {
        console.warn('No DOL file extracted to patch');
        return;
    }
    
    try {
        // Get settings from UI
        const settings = getSettingsFromUI();
        
        // Load US.bin data from data folder
        const response = await fetch('data/US.bin');
        if (!response.ok) {
            console.warn('Could not load US.bin for DOL patching');
            return;
        }
        
        const usBinData = new Uint8Array(await response.arrayBuffer());
        const view = new DataView(extractedDOL.buffer);

        // Apply settings patches to DOL
        patchDOLSettings(view, settings);

        // Apply US.bin patch at 0x1888
        if (0x1888 + usBinData.length > extractedDOL.length) {
            console.error(`DOL too small for US.bin patch: need ${0x1888 + usBinData.length}, have ${extractedDOL.length}`);
            return;
        }
        
        extractedDOL.set(usBinData, 0x1888);
        console.log(`Patched DOL at 0x1888 with ${usBinData.length} bytes from US.bin`);

        // Apply final patch at 0x6CE38
        const patchValue = 0x4BF94A50;
        
        if (0x6CE38 + 4 > extractedDOL.length) {
            console.error(`DOL too small for 32-bit patch: need ${0x6CE38 + 4}, have ${extractedDOL.length}`);
            return;
        }
        
        view.setUint32(0x6CE38, patchValue, false); // false = big endian
        console.log(`Patched DOL at 0x6CE38 with value 0x${patchValue.toString(16)}`);
        
        console.log('DOL patching completed successfully');
        
    } catch (error) {
        console.error('Error patching DOL:', error);
    }
}
*/

// Function to get settings from the UI
function getSettingsFromUI() {
    const settings = {
        seed: generateRandomSeed(),
        chapter_clears: 7, // Default value
        starting_partner: 1, // Default Goombella
        yoshi_color: 0, // Default green
        yoshi_name: "Yoshi",
        starting_coins: 10,
        palace_skip: null,
        westside: null,
        peekaboo: null,
        intermissions: null,
        starting_hp: 10,
        starting_fp: 5,
        starting_bp: 3,
        full_run_bar: null,
        required_chapters: null,
        tattlesanity: null,
        fast_travel: null,
        succeed_conditions: null,
        cutscene_skip: null
    };

    // Get all toggle switches and map them to settings
    document.querySelectorAll('.toggle-switch').forEach((toggle) => {
        const label = toggle.parentElement.querySelector('.toggle-label').textContent;
        const isActive = toggle.classList.contains('active');
        
        // Map UI labels to settings keys
        switch (label) {
            case 'Palace Skip':
                settings.palace_skip = isActive ? 1 : 0;
                break;
            case 'Open West Side':
                settings.westside = isActive ? 1 : 0;
                break;
            case 'Permanent Peekaboo':
                settings.peekaboo = isActive ? 1 : 0;
                break;
            case 'Disable Intermissions':
                settings.intermissions = isActive ? 1 : 0;
                break;
            case 'Full Run Bar':
                settings.full_run_bar = isActive ? 1 : 0;
                break;
            case 'Tattlesanity':
                settings.tattlesanity = isActive ? 1 : 0;
                break;
            case 'Fast Travel':
                settings.fast_travel = isActive ? 1 : 0;
                break;
            case 'Skip Cutscenes':
                settings.cutscene_skip = isActive ? 1 : 0;
                break;
            case 'Always Succeed Conditions':
                settings.succeed_conditions = isActive ? 1 : 0;
                break;
        }
    });

    // Get all number inputs
    document.querySelectorAll('.number-input').forEach((input) => {
        const label = input.parentElement.querySelector('.number-label').textContent;
        const value = parseInt(input.value) || 0;
        
        switch (label) {
            case 'Starting HP':
                settings.starting_hp = value;
                break;
            case 'Starting FP':
                settings.starting_fp = value;
                break;
            case 'Starting BP':
                settings.starting_bp = value;
                break;
            case 'Starting Coins':
                settings.starting_coins = value;
                break;
        }
    });

    // Get all dropdown selections
    document.querySelectorAll('.dropdown-select').forEach((dropdown) => {
        const label = dropdown.parentElement.querySelector('.dropdown-label').textContent;
        const value = parseInt(dropdown.value) || 1;
        
        switch (label) {
            case 'Starting Partner':
                settings.starting_partner = value;
                break;
        }
    });

    return settings;
}

// Function to generate a random seed
function generateRandomSeed() {
    return Math.random().toString(36).substring(2, 18).toUpperCase();
}

/*
// Function to patch DOL with settings (COMMENTED OUT FOR TESTING)
function patchDOLSettings(view, settings) {
    // Helper function to write string at offset
    function writeString(offset, str, maxLength) {
        const bytes = new TextEncoder().encode(str.substring(0, maxLength));
        for (let i = 0; i < bytes.length; i++) {
            view.setUint8(offset + i, bytes[i]);
        }
        // Null terminate if there's space
        if (bytes.length < maxLength) {
            view.setUint8(offset + bytes.length, 0);
        }
    }

    // Write seed (16 bytes at 0x210)
    writeString(0x210, settings.seed, 16);
    
    // Write chapter clears (1 byte at 0x220)
    view.setUint8(0x220, settings.chapter_clears);
    
    // Write starting partner (1 byte at 0x221)
    view.setUint8(0x221, settings.starting_partner);
    
    // Write yoshi color (1 byte at 0x222)
    view.setUint8(0x222, settings.yoshi_color);
    
    // Write flag (1 byte at 0x223)
    view.setUint8(0x223, 1);
    
    // Write pointer (4 bytes at 0x224)
    view.setUint32(0x224, 0x80003240, false); // big endian

    // Write optional settings
    if (settings.palace_skip !== null) {
        view.setUint8(0x229, settings.palace_skip);
    }
    if (settings.westside !== null) {
        view.setUint8(0x22A, settings.westside);
    }
    if (settings.peekaboo !== null) {
        view.setUint8(0x22B, settings.peekaboo);
    }
    if (settings.intermissions !== null) {
        view.setUint8(0x22C, settings.intermissions);
    }
    if (settings.starting_hp !== null) {
        view.setUint8(0x22D, settings.starting_hp);
    }
    if (settings.starting_fp !== null) {
        view.setUint8(0x22E, settings.starting_fp);
    }
    if (settings.starting_bp !== null) {
        view.setUint8(0x22F, settings.starting_bp);
    }
    if (settings.full_run_bar !== null) {
        view.setUint8(0x230, settings.full_run_bar);
    }
    if (settings.required_chapters !== null) {
        // Write required chapters array (7 bytes starting at 0x231)
        for (let i = 0; i < settings.required_chapters.length && i < 7; i++) {
            view.setUint8(0x231 + i, settings.required_chapters[i]);
        }
    }
    if (settings.tattlesanity !== null) {
        view.setUint8(0x238, settings.tattlesanity);
    }
    if (settings.fast_travel !== null) {
        view.setUint8(0x239, settings.fast_travel);
    }
    if (settings.succeed_conditions !== null) {
        view.setUint8(0x23A, settings.succeed_conditions);
    }
    if (settings.cutscene_skip !== null) {
        view.setUint8(0x23C, settings.cutscene_skip);
    }
    
    // Write yoshi name (9 bytes at 0x240, null terminated)
    writeString(0x240, settings.yoshi_name, 8);
    
    // Write starting coins (2 bytes at 0xEB6B6)
    view.setUint16(0xEB6B6, settings.starting_coins, false); // big endian

    console.log('Applied DOL settings patches');
}
*/

/*
// Function to patch the icon files using IPS (COMMENTED OUT FOR TESTING)
async function patchIcons(isoData) {
    try {
        // Import the IPS function
        const { applyIPS } = await import('./ips.js');
        
        // Load icon.ips data from data folder
        const iconPatchResponse = await fetch('data/icon.ips');
        if (!iconPatchResponse.ok) {
            console.warn('Could not load icon.ips');
            return;
        }
        const iconPatchData = new Uint8Array(await iconPatchResponse.arrayBuffer());

        // Load icon_bin.ips data from data folder  
        const iconBinPatchResponse = await fetch('data/icon_bin.ips');
        if (!iconBinPatchResponse.ok) {
            console.warn('Could not load icon_bin.ips');
            return;
        }
        const iconBinPatchData = new Uint8Array(await iconBinPatchResponse.arrayBuffer());

        // Find and extract original icon.tpl from ISO
        const iconTplIndex = isoData.parsedNodes.findIndex((node, i) => {
            const path = isoData.pathByIndex.get(i);
            return path === 'icon.tpl' && node.type === 0;
        });
        
        if (iconTplIndex !== -1) {
            const originalIconTpl = isoData.getFileSlice(iconTplIndex);
            const patchedIconTpl = applyIPS(originalIconTpl, iconPatchData);
            
            // Import functions from gciso.js
            const { addOrReplace, removePath } = await import('./gciso.js');
            
            // Remove the original file first since the patched version is larger
            removePath(isoData.tree, 'icon.tpl');
            
            // Add the patched version
            addOrReplace(isoData.tree, 'icon.tpl', patchedIconTpl);
            console.log(`Patched icon.tpl: ${originalIconTpl.length} -> ${patchedIconTpl.length} bytes`);
        } else {
            console.warn('icon.tpl not found in ISO');
        }

        // Find and extract original icon.bin from ISO
        const iconBinIndex = isoData.parsedNodes.findIndex((node, i) => {
            const path = isoData.pathByIndex.get(i);
            return path === 'icon.bin' && node.type === 0;
        });
        
        if (iconBinIndex !== -1) {
            const originalIconBin = isoData.getFileSlice(iconBinIndex);
            const patchedIconBin = applyIPS(originalIconBin, iconBinPatchData);
            
            // Import functions from gciso.js
            const { addOrReplace, removePath } = await import('./gciso.js');
            
            // Remove the original file first since the patched version is larger
            removePath(isoData.tree, 'icon.bin');
            
            // Add the patched version
            addOrReplace(isoData.tree, 'icon.bin', patchedIconBin);
            console.log(`Patched icon.bin: ${originalIconBin.length} -> ${patchedIconBin.length} bytes`);
        } else {
            console.warn('icon.bin not found in ISO');
        }
        
        console.log('Icon patching completed successfully');
        
    } catch (error) {
        console.error('Error patching icons:', error);
    }
}
*/


// Main function for generating test randomization (ROM features commented out)
async function generateRandomizedROM() {
    // Skip ROM file check for testing
    /*
    if (!selectedROMFile) {
        console.error('No ROM file selected');
        return;
    }
    */
    
    if (!allLocations) {
        console.error('Locations not initialized');
        return;
    }
    
    try {
        console.log('Starting test randomization generation...');
        
        // Get settings from UI
        const settings = getSettingsFromUI();
        
        // Prepare locations for randomization based on settings
        console.log('Preparing locations for randomization...');
        const locationData = prepareLocationsForRandomization(settings);
        
        // Skip ROM processing for testing
        /*
        // Read the ROM file
        const romBuffer = await selectedROMFile.arrayBuffer();
        console.log(`ROM loaded: ${romBuffer.byteLength} bytes`);
        
        // Import and use gciso.js to parse the ROM
        const { parseISO, rebuildISO } = await import('./gciso.js');
        const isoData = parseISO(romBuffer);
        
        console.log('ROM parsed successfully with gciso.js');
        console.log(`Found ${isoData.parsedNodes.length} files in ROM`);
        
        // Extract and patch files
        await extractAndPatchFiles(isoData, locationData, settings);
        
        // Rebuild the ROM
        console.log('Rebuilding ROM...');
        const newRomBuffer = rebuildISO(romBuffer, isoData.tree.root);
        console.log(`ROM rebuilt: ${newRomBuffer.byteLength} bytes`);
        
        // Create and download the new ROM
        const blob = new Blob([newRomBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        // Generate filename based on original file
        const originalName = selectedROMFile.name;
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        const downloadName = `${nameWithoutExt}_randomized.iso`;
        
        // Create and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        */
        
        console.log(`Test randomization completed! Processed ${locationData.total} locations.`);
        console.log('Spoiler file should have been generated and downloaded.');
        
    } catch (error) {
        console.error('Error generating test randomization:', error);
    }
}

// Tooltip system
const settingsDescriptions = {
    'Palace Skip': 'Entering the Thousand-Year door will take you straight to Grodus.',
    'Open West Side': 'Rogueport Westside is open from the start.',
    'Permanent Peekaboo': 'The Peekaboo badge is always active, even when not equipped.',
    'Disable Intermissions': 'After obtaining a crystal star, mario will stay in the boss\' room, and the sequence will be updated past the intermission.',
    'Full Run Bar': 'The run bar in battle always starts at 100 percent.',
    'Tattlesanity': 'Creates a location for every enemy being tattled. All key items can possibly be placed in these json.',
    'Fast Travel': 'Enable this to gain the ability to warp to any area you have visited from the map screen in the main menu. Press A on the destination to open the warp confirmation dialog.',
    'Skip Cutscenes': 'Skips some of the longer cutscenes in the game, such as the Shadow Queen cutscene, Fahr Outpost Cannon etc.',
    'Always Succeed Conditions': 'Enable this to make it so the battle condition in fights in the Glitz Pit will always be fulfilled, regardless of their actual fulfillment.',
    'Starting HP': 'How much health you start with.',
    'Starting FP': 'How much flower points you start with.',
    'Starting BP': 'How many badge points you start with.',
    'Starting Coins': 'How many coins you start with.',
    'Starting Partner': 'Choose the partner that you start with.'
};

let tooltipElement = null;
let tooltipTimeout = null;

function createTooltip() {
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'tooltip';
        document.body.appendChild(tooltipElement);
    }
    return tooltipElement;
}

function showTooltip(event, text) {
    clearTimeout(tooltipTimeout);
    
    const tooltip = createTooltip();
    tooltip.textContent = text;
    tooltip.classList.add('show');
    
    // Position tooltip near mouse
    const updatePosition = (e) => {
        const x = e.clientX;
        const y = e.clientY;
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate position with offset
        let left = x + 10;
        let top = y - tooltipRect.height - 10;
        
        // Keep tooltip within viewport bounds
        if (left + tooltipRect.width > viewportWidth) {
            left = x - tooltipRect.width - 10;
        }
        if (top < 0) {
            top = y + 10;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    };
    
    updatePosition(event);
}

function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.classList.remove('show');
    }
}

function initializeTooltips() {
    // Add tooltips to toggle labels
    document.querySelectorAll('.toggle-label').forEach(label => {
        const text = label.textContent;
        if (settingsDescriptions[text]) {
            label.classList.add('has-tooltip');
            
            label.addEventListener('mouseenter', (e) => {
                tooltipTimeout = setTimeout(() => {
                    showTooltip(e, settingsDescriptions[text]);
                }, 500); // 500ms delay
            });
            
            label.addEventListener('mousemove', (e) => {
                if (tooltipElement && tooltipElement.classList.contains('show')) {
                    showTooltip(e, settingsDescriptions[text]);
                }
            });
            
            label.addEventListener('mouseleave', () => {
                clearTimeout(tooltipTimeout);
                hideTooltip();
            });
        }
    });
    
    // Add tooltips to number labels
    document.querySelectorAll('.number-label').forEach(label => {
        const text = label.textContent;
        if (settingsDescriptions[text]) {
            label.classList.add('has-tooltip');
            
            label.addEventListener('mouseenter', (e) => {
                tooltipTimeout = setTimeout(() => {
                    showTooltip(e, settingsDescriptions[text]);
                }, 500);
            });
            
            label.addEventListener('mousemove', (e) => {
                if (tooltipElement && tooltipElement.classList.contains('show')) {
                    showTooltip(e, settingsDescriptions[text]);
                }
            });
            
            label.addEventListener('mouseleave', () => {
                clearTimeout(tooltipTimeout);
                hideTooltip();
            });
        }
    });
    
    // Add tooltips to dropdown labels
    document.querySelectorAll('.dropdown-label').forEach(label => {
        const text = label.textContent;
        if (settingsDescriptions[text]) {
            label.classList.add('has-tooltip');
            
            label.addEventListener('mouseenter', (e) => {
                tooltipTimeout = setTimeout(() => {
                    showTooltip(e, settingsDescriptions[text]);
                }, 500);
            });
            
            label.addEventListener('mousemove', (e) => {
                if (tooltipElement && tooltipElement.classList.contains('show')) {
                    showTooltip(e, settingsDescriptions[text]);
                }
            });
            
            label.addEventListener('mouseleave', () => {
                clearTimeout(tooltipTimeout);
                hideTooltip();
            });
        }
    });
}

let allLocations = null;
let allItems = null;
let allRules = null;
let itemIdToRomId = new Map();

// Progression items will be loaded dynamically from items.json
let progressionItems = [];

// Function to initialize items from JSON file
async function initializeItems() {
    try {
        console.log('Loading item data...');
        
        const itemsResponse = await fetch('json/items.json');
        if (!itemsResponse.ok) {
            throw new Error('Failed to load items.json');
        }
        allItems = await itemsResponse.json();
        
        // Create mapping from vanilla item IDs to ROM IDs
        allItems.forEach(item => {
            itemIdToRomId.set(item.id, item.rom_id);
        });
        
        // Build progression items list from items.json
        progressionItems = allItems
            .filter(item => item.progression === 'progression')
            .map(item => item.itemName);
        
        console.log(`Loaded ${allItems.length} items`);
        console.log(`Found ${progressionItems.length} progression items:`, progressionItems);
        return allItems;
        
    } catch (error) {
        console.error('Error loading item data:', error);
        throw error;
    }
}

// Function to initialize rules from JSON file
async function initializeRules() {
    try {
        console.log('Loading rules data...');
        
        const rulesResponse = await fetch('json/rules.json');
        if (!rulesResponse.ok) {
            throw new Error('Failed to load rules.json');
        }
        allRules = await rulesResponse.json();
        
        console.log(`Loaded ${Object.keys(allRules).length} location rules`);
        return allRules;
        
    } catch (error) {
        console.error('Error loading rules data:', error);
        throw error;
    }
}

// Function to initialize json from JSON files
async function initializeLocations() {
    try {
        console.log('Loading location data...');
        
        // Load main json
        const locationsResponse = await fetch('json/locations.json');
        if (!locationsResponse.ok) {
            throw new Error('Failed to load locations.json');
        }
        const locationsData = await locationsResponse.json();
        
        // Load tattle json
        const tattlesResponse = await fetch('json/tattles.json');
        if (!tattlesResponse.ok) {
            throw new Error('Failed to load tattles.json');
        }
        const tattlesData = await tattlesResponse.json();
        
        // Create combined location collection
        allLocations = new LocationCollection();
        allLocations.loadFromJSON([...locationsData, ...tattlesData]);
        
        console.log(`Loaded ${locationsData.length} main locations`);
        console.log(`Loaded ${tattlesData.length} tattle locations`);
        console.log(`Total locations: ${allLocations.size()}`);
        
        return allLocations;
        
    } catch (error) {
        console.error('Error loading location data:', error);
        throw error;
    }
}

// Function to evaluate accessibility rules from rules.json
function evaluateAccessibilityRule(rule, gameState) {
    if (!rule) return true;
    
    if (rule.has) {
        if (typeof rule.has === 'string') {
            return gameState.has(rule.has, rule.count || 1);
        } else if (rule.has.item) {
            // Special case for stars - use the stars function instead
            if (rule.has.item === 'stars') {
                const starsCount = gameState.getStarsCount ? gameState.getStarsCount() : 0;
                return starsCount >= (rule.has.count || 1);
            }
            return gameState.has(rule.has.item, rule.has.count || 1);
        }
    }
    
    if (rule.function) {
        return evaluateFunction(rule.function, gameState);
    }
    
    if (rule.can_reach) {
        return isLocationAccessible(rule.can_reach, gameState);
    }
    
    if (rule.and) {
        return rule.and.every(subrule => evaluateAccessibilityRule(subrule, gameState));
    }
    
    if (rule.or) {
        return rule.or.some(subrule => evaluateAccessibilityRule(subrule, gameState));
    }
    
    return true;
}

// Function to evaluate function-based rules
function evaluateFunction(funcName, gameState) {
    let result = false;
    let debugInfo = '';
    
    switch (funcName) {
        case 'super_boots':
            result = gameState.has('Progressive Boots', 1);
            debugInfo = `Progressive Boots count: ${gameState.getItemCount('Progressive Boots')}`;
            break;
        case 'ultra_boots':
            result = gameState.has('Progressive Boots', 2);
            debugInfo = `Progressive Boots count: ${gameState.getItemCount('Progressive Boots')}`;
            break;
        case 'super_hammer':
            result = gameState.has('Progressive Hammer', 1);
            debugInfo = `Progressive Hammer count: ${gameState.getItemCount('Progressive Hammer')}`;
            break;
        case 'ultra_hammer':
            result = gameState.has('Progressive Hammer', 2);
            debugInfo = `Progressive Hammer count: ${gameState.getItemCount('Progressive Hammer')}`;
            break;
        case 'tube_curse':
            result = gameState.has('Tube Curse');
            debugInfo = `Tube Curse count: ${gameState.getItemCount('Tube Curse')}`;
            break;
        case 'key_any':
            result = gameState.has('Red Key') || gameState.has('Blue Key');
            debugInfo = `Red Key: ${gameState.getItemCount('Red Key')}, Blue Key: ${gameState.getItemCount('Blue Key')}`;
            break;
        case 'ttyd':
            // ttyd logic from parser.js: (Plane Curse OR super_hammer OR (Flurrie AND (Bobbery OR tube_curse OR (Contact Lens AND Paper Curse))))
            const hasPlane = gameState.has('Plane Curse');
            const hasSuperHammer = gameState.has('Progressive Hammer', 1);
            const hasFlurrie = gameState.has('Flurrie');
            const hasBobbery = gameState.has('Bobbery');
            const hasTubeCurse = gameState.has('Paper Curse') && gameState.has('Tube Curse');
            const hasContactLensPaper = gameState.has('Contact Lens') && gameState.has('Paper Curse');
            result = hasPlane || hasSuperHammer || (hasFlurrie && (hasBobbery || hasTubeCurse || hasContactLensPaper));
            debugInfo = `Plane: ${hasPlane}, SuperHammer: ${hasSuperHammer}, Flurrie: ${hasFlurrie}, Bobbery: ${hasBobbery}, TubeCurse: ${hasTubeCurse}, ContactLensPaper: ${hasContactLensPaper}`;
            break;
        case 'pit':
            // pit logic from parser.js: Paper Curse AND Plane Curse
            const hasPaperCurse = gameState.has('Paper Curse');
            const hasPlaneCurse = gameState.has('Plane Curse');
            result = hasPaperCurse && hasPlaneCurse;
            debugInfo = `Paper Curse: ${hasPaperCurse}, Plane Curse: ${hasPlaneCurse}`;
            break;
        case 'riverside':
            // riverside logic from parser.js: complex requirements with multiple items
            const hasVivian = gameState.has('Vivian');
            const hasAutograph = gameState.has('Autograph');
            const hasRaggedDiary = gameState.has('Ragged Diary');
            const hasBlanket = gameState.has('Blanket');
            const hasVitalPaper = gameState.has('Vital Paper');
            const hasTrainTicket = gameState.has('Train Ticket');
            result = hasVivian && hasAutograph && hasRaggedDiary && hasBlanket && hasVitalPaper && hasTrainTicket;
            debugInfo = `Vivian: ${hasVivian}, Autograph: ${hasAutograph}, RaggedDiary: ${hasRaggedDiary}, Blanket: ${hasBlanket}, VitalPaper: ${hasVitalPaper}, TrainTicket: ${hasTrainTicket}`;
            break;
        case 'keelhaul_key':
            result = gameState.regions.has('keelhaul_key');
            debugInfo = `Has keelhaul_key region: ${gameState.regions.has('keelhaul_key')}`;
            break;
        case 'fahr_outpost':
            // fahr_outpost logic from parser.js: ultra_hammer AND ((canReach westside ground AND ultra_boots) OR (canReach westside AND Yoshi))
            const hasUltraHammerFO = gameState.has('Progressive Hammer', 2);
            const canReachWestsideGround = gameState.canReach('sewers_westside_ground', 'Region');
            const hasUltraBootsFO = gameState.has('Progressive Boots', 2);
            const canReachWestside = gameState.canReach('sewers_westside', 'Region');
            const hasYoshiFO = gameState.has('Yoshi');
            result = hasUltraHammerFO && ((canReachWestsideGround && hasUltraBootsFO) || (canReachWestside && hasYoshiFO));
            debugInfo = `Ultra Hammer: ${hasUltraHammerFO}, Westside Ground: ${canReachWestsideGround}, Ultra Boots: ${hasUltraBootsFO}, Westside: ${canReachWestside}, Yoshi: ${hasYoshiFO}`;
            break;
        case 'poshley_heights':
            // poshley_heights logic from parser.js: Station Key 1 AND Elevator Key (Riverside) AND super_hammer AND ultra_boots
            const hasStationKey1 = gameState.has('Station Key 1');
            const hasElevatorKey = gameState.has('Elevator Key (Riverside)');
            const hasSuperHammerPH = gameState.has('Progressive Hammer', 1);
            const hasUltraBootsPH = gameState.has('Progressive Boots', 2);
            result = hasStationKey1 && hasElevatorKey && hasSuperHammerPH && hasUltraBootsPH;
            debugInfo = `Station Key 1: ${hasStationKey1}, Elevator Key: ${hasElevatorKey}, Super Hammer: ${hasSuperHammerPH}, Ultra Boots: ${hasUltraBootsPH}`;
            break;
        case 'moon':
            // moon logic from parser.js: Bobbery AND Goldbob Guide
            const hasBobberryMoon = gameState.has('Bobbery');
            const hasGoldbobGuide = gameState.has('Goldbob Guide');
            result = hasBobberryMoon && hasGoldbobGuide;
            debugInfo = `Bobbery: ${hasBobberryMoon}, Goldbob Guide: ${hasGoldbobGuide}`;
            break;
        case 'palace':
            // palace logic from parser.js: ttyd(state) AND required_stars
            // Note: The chapters parameter isn't available in this context, so we'll use a reasonable default
            const hasTtydAccess = evaluateFunction('ttyd', gameState);
            const starsCount = gameState.getStarsCount ? gameState.getStarsCount() : 0;
            const requiredStars = starsCount >= 7; // Need 7 Crystal Stars for palace access
            result = hasTtydAccess && requiredStars;
            debugInfo = `TTYD access: ${hasTtydAccess}, Stars count: ${starsCount}, Required stars (7): ${requiredStars}`;
            break;
        case 'riddle_tower':
            // riddle_tower logic from parser.js: tube_curse AND Palace Key AND Bobbery AND Boat Curse AND Star Key AND Palace Key (Riddle Tower) x8
            const hasTubeCurseRT = gameState.has('Paper Curse') && gameState.has('Tube Curse');
            const hasPalaceKey = gameState.has('Palace Key');
            const hasBobberryRT = gameState.has('Bobbery');
            const hasBoatCurse = gameState.has('Boat Curse');
            const hasStarKey = gameState.has('Star Key');
            const hasPalaceKeyRT = gameState.has('Palace Key (Riddle Tower)', 8);
            result = hasTubeCurseRT && hasPalaceKey && hasBobberryRT && hasBoatCurse && hasStarKey && hasPalaceKeyRT;
            debugInfo = `Tube Curse: ${hasTubeCurseRT}, Palace Key: ${hasPalaceKey}, Bobbery: ${hasBobberryRT}, Boat Curse: ${hasBoatCurse}, Star Key: ${hasStarKey}, Palace Key RT (8): ${hasPalaceKeyRT}`;
            break;
        default:
            console.warn(`Unknown function: ${funcName}`);
            return false;
    }
    
    if (!result && ['super_boots', 'ultra_boots', 'super_hammer', 'ultra_hammer', 'tube_curse', 'fahr_outpost', 'palace', 'moon'].includes(funcName)) {
        console.log(`Function ${funcName} FAILED: ${debugInfo}`);
    }
    
    return result;
}

// Function to check if a specific location is accessible
function isLocationAccessible(locationName, gameState) {
    if (!allRules || !allRules[locationName]) {
        console.warn(`No rule found for location: ${locationName}`);
        return true;
    }
    
    return evaluateAccessibilityRule(allRules[locationName], gameState);
}

// Function to prepare json for randomization based on settings
function prepareLocationsForRandomization(settings) {
    if (!allLocations) {
        throw new Error('Locations not initialized. Call initializeLocations() first.');
    }
    
    if (!allRules) {
        throw new Error('Rules not initialized. Call initializeRules() first.');
    }
    
    console.log('Starting logical item placement test...');
    
    // Clone the locations for modification
    const locationCollection = allLocations.clone();
    const availableLocations = [];
    const excludedLocations = [];
    
    // Get all non-tattle json (always available)
    const mainLocations = locationCollection.locations.filter(location => !location.isTattle());
    availableLocations.push(...mainLocations);
    
    console.log(`Added ${mainLocations.length} main locations`);
    
    // Add tattle json if Tattlesanity is enabled
    if (settings.tattlesanity) {
        const tattles = locationCollection.getTattleLocations();
        availableLocations.push(...tattles);
        console.log(`Added ${tattles.length} tattle locations (Tattlesanity enabled)`);
    } else {
        const tattles = locationCollection.getTattleLocations();
        excludedLocations.push(...tattles);
        console.log(`Excluded ${tattles.length} tattle locations (Tattlesanity disabled)`);
    }
    
    // Perform logical item placement test
    performLogicalItemPlacement(availableLocations, settings);
    
    // Filter json by REL file if needed (for debugging or specific builds)
    const locationsByRel = {};
    availableLocations.forEach(location => {
        if (!locationsByRel[location.rel]) {
            locationsByRel[location.rel] = [];
        }
        locationsByRel[location.rel].push(location);
    });
    
    console.log('Locations by REL file:');
    Object.keys(locationsByRel).sort().forEach(rel => {
        console.log(`  ${rel}: ${locationsByRel[rel].length} locations`);
    });
    
    return {
        available: availableLocations,
        excluded: excludedLocations,
        byRel: locationsByRel,
        total: availableLocations.length
    };
}

// Function to apply item locks - ensuring specific items are placed at specific locations
function applyItemLocks(locations, settings, spoilerGen) {
    console.log('=== APPLYING ITEM LOCKS ===');
    
    // Define starting partners mapping
    const startingPartners = [
        "Goombella", // 1
        "Koops",     // 2
        "Bobbery",   // 3
        "Yoshi",     // 4
        "Flurrie",   // 5
        "Vivian",    // 6
        "Ms. Mowz"   // 7
    ];
    
    // Define item locks - location name -> item name
    const itemLocks = {
        "Rogueport Center: Goombella": startingPartners[settings.starting_partner - 1],
        "Hooktail's Castle Hooktail's Room: Diamond Star": "Diamond Star",
        "Great Tree Entrance: Emerald Star": "Emerald Star", 
        "Glitzville Arena: Gold Star": "Gold Star",
        "Creepy Steeple Upper Room: Ruby Star": "Ruby Star",
        "Pirate's Grotto Cortez' Hoard: Sapphire Star": "Sapphire Star",
        "Poshley Heights Sanctum Altar: Garnet Star": "Garnet Star",
        "X-Naut Fortress Boss Room: Crystal Star": "Crystal Star"
    };
    
    let locksApplied = 0;
    
    // Apply each lock
    Object.entries(itemLocks).forEach(([locationName, itemName]) => {
        // Find the location
        const targetLocation = locations.find(loc => loc.name === locationName);
        
        if (targetLocation) {
            // Get the item ID
            const itemId = getItemIdByName(itemName);
            if (itemId) {
                // Lock the item to this location
                targetLocation.placeItem(itemId);
                targetLocation.locked = true; // Mark as locked
                locksApplied++;
                
                console.log(`Locked "${itemName}" (ID: ${itemId}) to "${locationName}"`);
                
                // Add to spoiler log
                if (spoilerGen) {
                    spoilerGen.addProgressionLog(`Applied item lock`, itemName, locationName, null);
                }
            } else {
                console.warn(`Could not find item ID for "${itemName}" - lock skipped`);
            }
        } else {
            console.warn(`Could not find location "${locationName}" - lock skipped`);
        }
    });
    
    console.log(`Applied ${locksApplied} item locks out of ${Object.keys(itemLocks).length} total locks`);
    return locksApplied;
}

// Logical item placement test function
async function performLogicalItemPlacement(locations, settings) {
    console.log('=== LOGICAL ITEM PLACEMENT TEST ===');

    const startTime = Date.now();
    
    // Validate all required StateLogic functions exist
    console.log('=== VALIDATING STATELOGIC FUNCTIONS ===');
    await validateStateLogicFunctions();

    try {
        // Ensure items and rules are loaded before starting
        if (!allItems) {
            console.log('Items not loaded, initializing...');
            await initializeItems();
        }
        if (!allRules) {
            console.log('Rules not loaded, initializing...');
            await initializeRules();
        }

        console.log(`Using ${allItems ? allItems.length : 0} items and ${allRules ? Object.keys(allRules).length : 0} rules`);

        // Debug: Check if items are actually loaded
        if (allItems && allItems.length > 0) {
            console.log(`First few items:`, allItems.slice(0, 5));
            // Test getItemIdByName function
            const testId = getItemIdByName('Progressive Hammer');
            console.log(`Test: Progressive Hammer ID = ${testId}`);
        } else {
            console.error('allItems is null or empty!');
        }

        // Load region logic
        const regionLogic = await loadRegionLogic();

        // Initialize spoiler generator
        const spoilerGen = new SpoilerGenerator();
        const seed = settings.seed || generateRandomSeed();
        const settingsString = getSettingsString();
        spoilerGen.initialize(seed, settings, settingsString);
        spoilerGen.addProgressionLog('Starting randomization', '', '', null);

        // Create starting game state
        let gameState = GameState.createStartingState();
        console.log('Starting game state:', gameState.getStats());
        spoilerGen.addProgressionLog('Created starting game state', '', '', gameState);

        // Create item pool for all locations, excluding locked items
        const startingPartnerName = settings.starting_partner === 1 ? "Goombella" :
                                   settings.starting_partner === 2 ? "Koops" :
                                   settings.starting_partner === 3 ? "Bobbery" :
                                   settings.starting_partner === 4 ? "Yoshi" :
                                   settings.starting_partner === 5 ? "Flurrie" :
                                   settings.starting_partner === 6 ? "Vivian" : "Ms. Mowz";

        const lockedItems = [
            startingPartnerName,
            "Diamond Star", "Emerald Star", "Gold Star", "Ruby Star",
            "Sapphire Star", "Garnet Star", "Crystal Star"
        ];

        console.log(`Excluding locked items: ${lockedItems.join(', ')}`);

        // Define critical items for debugging
        const criticalItems = ['Progressive Boots', 'Progressive Hammer', 'Tube Curse', 'Yoshi', 'Vivian', 'Wedding Ring'];

        // Create item pool for unlocked locations only (total locations - locked locations)
        const unlockedLocationCount = locations.length - lockedItems.length;
        const itemPool = createFullItemPool(unlockedLocationCount, lockedItems, progressionItems);
        console.log(`Created item pool with ${itemPool.length} items for ${unlockedLocationCount} unlocked locations (${locations.length} total - ${lockedItems.length} locked)`);

        // Debug: Check critical items in full item pool BEFORE any processing
        console.log('\n=== FULL ITEM POOL VERIFICATION ===');
        criticalItems.forEach(item => {
            const count = itemPool.filter(i => i === item).length;
            console.log(`${item}: ${count} copies in full item pool`);
        });

        // Shuffle the item pool
        shuffleArray(itemPool);
        console.log('Item pool shuffled');

        // Apply item locks to ensure important items are placed correctly
        applyItemLocks(locations, settings, spoilerGen);

        // Goal: Ensure we can reach "Palace of Shadow Final Staircase: Ultra Shroom"
        const goalLocation = locations.find(loc => loc.name === "Palace of Shadow Final Staircase: Ultra Shroom");
        if (goalLocation) {
            console.log(`Goal location found: ${goalLocation.name} in region ${goalLocation.getRegionTag()}`);
        } else {
            console.warn('Goal location "Palace of Shadow Final Staircase: Ultra Shroom" not found!');
        }

        let placedItems = 0;
        let accessibilityChecks = 0;
        let placementAttempts = 0;
        let currentSphere = 1;
        let itemPoolIndex = 0;

        // Track items placed in current sphere
        let sphereItems = [];

        // Separate progression items from filler items
        const progressionPool = itemPool.filter(item => progressionItems.includes(item));
        const fillerPool = itemPool.filter(item => !progressionItems.includes(item));

        console.log(`Split item pool: ${progressionPool.length} progression, ${fillerPool.length} filler`);
        console.log(`Progression items available:`, progressionPool);

        // Critical check: Verify key items are actually in progression pool
        console.log('\n=== CRITICAL ITEM VERIFICATION ===');
        criticalItems.forEach(item => {
            const inPool = progressionPool.includes(item);
            const count = progressionPool.filter(i => i === item).length;
            console.log(`${item}: in pool = ${inPool}, count = ${count}`);

            // If not found, check if it was excluded
            if (!inPool) {
                const wasLocked = lockedItems.includes(item);
                const inFullPool = itemPool.includes(item);
                console.log(`  ❌ ${item} missing! locked=${wasLocked}, inFullPool=${inFullPool}`);
            }
        });

        // Debug: Check for specific missing items
        const missingItems = ['Yoshi', 'Tube Curse', 'Progressive Hammer', 'Progressive Boots', 'Vivian'];
        console.log('Checking for missing items:');
        missingItems.forEach(item => {
            const inProgressionList = progressionItems.includes(item);
            const inProgressionPool = progressionPool.includes(item);
            const inLockedItems = lockedItems.includes(item);
            const inFullItemPool = itemPool.includes(item);
            console.log(`  ${item}: progression=${inProgressionList}, pool=${inProgressionPool}, locked=${inLockedItems}, fullPool=${inFullItemPool}`);
        });

        // Enhanced debug: Show progression item stats
        console.log(`\nProgression items summary:`);
        console.log(`  Total from items.json: ${progressionItems.length}`);
        console.log(`  In progression pool: ${progressionPool.length}`);
        console.log(`  Locked items: ${lockedItems.join(', ')}`);

        // Show sample of progression items that ARE in the pool
        const availableProgressionSample = progressionPool.slice(0, 10);
        console.log(`  Sample available progression: ${availableProgressionSample.join(', ')}`);

        // Check if Progressive items are being excluded by item frequencies
        console.log(`\nItem frequency check:`);
        missingItems.forEach(item => {
            const frequency = ITEM_FREQUENCIES[item];
            if (frequency !== undefined) {
                console.log(`  ${item}: frequency override = ${frequency}`);
            } else {
                console.log(`  ${item}: using default frequency (1)`);
            }
        });
        shuffleArray(progressionPool);
        shuffleArray(fillerPool);

        // Variables for clean logical placement

        // Try new logical placement algorithm with retry logic
        let newAlgorithmSucceeded = false;
        let placementAttempt = 1;
        const maxPlacementAttempts = 5;
        
        // Debug: Check if LogicalItemPlacer is available
        console.log('=== CHECKING NEW ALGORITHM AVAILABILITY ===');
        console.log('LogicalItemPlacer type:', typeof LogicalItemPlacer);
        console.log('LogicalItemPlacer available:', typeof LogicalItemPlacer !== 'undefined');
        console.log('Window LogicalItemPlacer:', typeof window.LogicalItemPlacer);
        
        if (typeof LogicalItemPlacer === 'undefined') {
            throw new Error('LogicalItemPlacer class not found! Make sure logicalPlacement.js is loaded.');
        } else {
            while (!newAlgorithmSucceeded && placementAttempt <= maxPlacementAttempts) {
                console.log(`=== LOGICAL PLACEMENT ATTEMPT ${placementAttempt}/${maxPlacementAttempts} ===`);
                console.log('Settings:', settings);
                console.log('Items in pool:', itemPool.length);
                console.log('Rules loaded:', Object.keys(allRules).length);
            
            // Reset locations for retry
            if (placementAttempt > 1) {
                locations.forEach(loc => {
                    if (!loc.locked) {
                        loc.placed_item = null;
                    }
                });
                gameState = GameState.createStartingState();
                console.log(`🔄 Retry ${placementAttempt}: Reset locations and game state`);
            }

            try {
                console.log('Creating LogicalItemPlacer...');
                const placer = new LogicalItemPlacer(locations, itemPool, allRules, regionLogic, settings);
                console.log('Placer created, calling place()...');

                const placementResult = await placer.place();

                console.log('✅ New logical placement completed successfully');
                console.log(`Placed items in ${placementResult.size} locations`);
                gameState = placer.gameState.clone();
                
                // Validate the placement immediately
                console.log('🔍 Validating logical progression...');
                const sphereValidation = validateSphereProgression(locations, gameState, allRules, regionLogic);
                
                if (sphereValidation.isValid) {
                    console.log(`✅ Sphere validation passed: ${sphereValidation.totalProgressionFound} progression items in ${sphereValidation.spheres} spheres`);
                    newAlgorithmSucceeded = true;
                } else {
                    console.warn(`❌ Sphere validation failed: ${sphereValidation.reason}`);
                    if (placementAttempt < maxPlacementAttempts) {
                        console.warn('🔄 Retrying generation...');
                        throw new Error(`Validation failed: ${sphereValidation.reason}`);
                    } else {
                        console.error('Max placement attempts reached, generation failed');
                        break;
                    }
                }

            } catch (error) {
                console.error(`❌ Logical placement attempt ${placementAttempt} failed:`, error);
                if (placementAttempt < maxPlacementAttempts && error.message && error.message.includes('Validation failed')) {
                    console.log('Retrying generation due to validation failure...');
                } else if (placementAttempt >= maxPlacementAttempts) {
                    console.error('Max placement attempts reached, generation failed');
                    console.error('Error stack:', error.stack);
                    break;
                } else {
                    console.error('Error stack:', error.stack);
                    console.log('Generation failed with error');
                    break;
                }
            }
            
            placementAttempt++;
        }
        } // Close the else block

        // If the new algorithm failed completely, throw error
        if (!newAlgorithmSucceeded) {
            throw new Error('LogicalItemPlacer failed to generate a valid seed after all attempts');
        }

        console.log('✅ Generation completed successfully using LogicalItemPlacer');
        let generationSuccessful = true;

        // Calculate logical spheres for spoiler generation
        console.log(`=== BASIC PLACEMENT COMPLETE - CALCULATING SPHERES ===`);
        let totalSpheres = 0;
        try {
            totalSpheres = calculateAndAssignSpheres(locations, spoilerGen, gameState, regionLogic);
            console.log(`Sphere calculation completed: ${totalSpheres} spheres calculated`);
        } catch (error) {
            console.error('Sphere calculation failed:', error);
            totalSpheres = 0;
        }

        // Final validation and statistics
        const totalLocations = locations.length;
        const filledCount = locations.filter(loc => loc.hasPlacedItem()).length;
        const lockedCount = locations.filter(loc => loc.locked).length;

        // Perform final region sweep to get all accessible regions
        performRegionSweep(gameState, regionLogic);

        const accessibleCount = locations.filter(loc => {
            const locationRule = allRules[loc.name];
            if (locationRule) {
                return evaluateAccessibilityRule(locationRule, gameState);
            } else {
                return loc.isAccessible ? loc.isAccessible(gameState, regionLogic) : true;
            }
        }).length;

        const generationTime = Date.now() - startTime;

        // Verify 100% completion (sphere validation already done during placement)
        generationSuccessful = (filledCount === totalLocations) && (accessibleCount === totalLocations);
        
        // LogicalItemPlacer already validated the seed, so it's guaranteed to be logically sound
        let sphereValidation = { isValid: true, totalProgressionFound: 'validated during placement' };

        const stats = {
            totalLocations,
            accessibleCount,
            filledCount,
            lockedCount,
            accessibilityChecks: 0, // Not used in new algorithm
            placementAttempts: placementAttempt,
            generationTime,
            generationSuccessful,
            totalAttempts: placementAttempt,
            finalRegionCount: gameState.regions.size,
            finalItemCount: gameState.items.size
        };

        spoilerGen.setStatistics(stats);
        spoilerGen.addProgressionLog('Randomization completed', '', '', gameState);

        // Log final validation results
        if (generationSuccessful) {
            console.log(`✅ RANDOMIZATION FULLY SUCCESSFUL!`);
            console.log(`✅ All ${totalLocations} locations filled and accessible`);
            console.log(`✅ Sphere progression validation: ${sphereValidation.totalProgressionFound || 'N/A'} progression items found`);
        } else {
            console.warn(`⚠️  RANDOMIZATION FAILED:`);
            console.warn(`⚠️  ${filledCount}/${totalLocations} locations filled`);
            console.warn(`⚠️  ${accessibleCount}/${totalLocations} locations accessible`);
            if (!sphereValidation.isValid) {
                console.warn(`⚠️  Sphere validation failed: ${sphereValidation.reason}`);
            }
        }

        console.log('=== PLACEMENT RESULTS ===');
        console.log(`Total locations: ${totalLocations}`);
        console.log(`Currently accessible: ${accessibleCount}`);
        console.log(`Items placed: ${filledCount}`);
        console.log(`Logical spheres calculated: ${totalSpheres}`);
        console.log(`Placement attempts: ${placementAttempt}`);
        console.log(`Generation time: ${generationTime}ms`);
        console.log(`Final game state:`, gameState.getStats());

        // Show sample placed items
        const placedLocations = locations.filter(loc => loc.hasPlacedItem()).slice(0, 10);
        console.log('Sample placed items:');
        placedLocations.forEach(loc => {
            console.log(`  ${loc.name}: Item ID ${loc.placed_item} (Region: ${loc.getRegionTag() || 'unknown'})`);
        });

        // Show inaccessible locations for debugging
        if (!generationSuccessful) {
            console.log('\n=== DEBUGGING INACCESSIBLE LOCATIONS ===');
            const inaccessibleLocations = locations.filter(loc => !loc.isAccessible(gameState, regionLogic));
            console.log(`Found ${inaccessibleLocations.length} inaccessible locations:`);

            // Group by region for easier analysis
            const regionGroups = {};
            inaccessibleLocations.forEach(loc => {
                const region = loc.getRegionTag() || 'unknown';
                if (!regionGroups[region]) regionGroups[region] = [];
                regionGroups[region].push(loc);
            });

            Object.entries(regionGroups).forEach(([region, locs]) => {
                console.log(`\n  Region: ${region} (${locs.length} locations)`);
                locs.slice(0, 5).forEach(loc => { // Show first 5 locations per region
                    console.log(`    ${loc.name}`);
                    const regionTag = loc.getRegionTag();
                    if (regionTag && regionLogic[regionTag]) {
                        console.log(`      Region logic: ${JSON.stringify(regionLogic[regionTag])}`);
                        // Check if we can determine accessibility using the region logic evaluation we have
                        if (regionLogic[regionTag].function) {
                            const funcResult = evaluateFunction(regionLogic[regionTag].function, gameState);
                            console.log(`      Function '${regionLogic[regionTag].function}' result: ${funcResult}`);
                        }
                    } else {
                        console.log(`      No region logic found for: ${regionTag}`);
                    }
                });
                if (locs.length > 5) {
                    console.log(`    ... and ${locs.length - 5} more locations`);
                }
            });
        }

        // Generate and download spoiler file
        console.log('Generating spoiler file...');
        spoilerGen.downloadSpoiler(`ttyd_spoiler_${seed}.txt`, 'txt');
        console.log('Spoiler file generated!');

    } catch (error) {
        console.error('Error during logical item placement:', error);
        throw error; // Re-throw to let caller handle
    }
}

// Helper function to load region logic
async function loadRegionLogic() {
    try {
        const response = await fetch('json/regions.json');
        if (!response.ok) {
            throw new Error('Failed to load regions.json');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading region logic:', error);
        return {}; // Return empty object as fallback
    }
}

// Helper function to create item pool
async function createItemPool() {
    try {
        // Import ItemPool if available
        if (typeof ItemPool !== 'undefined') {
            const pool = new ItemPool();
            const itemNames = [
                'Progressive Hammer', 'Progressive Boots', 'Paper Curse', 'Plane Curse',
                'Tube Curse', 'Boat Curse', 'Goombella', 'Koops', 'Flurrie', 'Yoshi',
                'Vivian', 'Bobbery', 'Star Piece', '10 Coins', 'Mushroom', 'Honey Syrup'
            ];
            pool.populatePool(itemNames);
            return pool;
        }
    } catch (error) {
        console.error('Error creating item pool:', error);
    }
    return null;
}

// Helper function to get item ID by name
function getItemIdByName(itemName) {
    if (!allItems) return null;
    
    const item = allItems.find(i => i.itemName === itemName);
    return item ? item.id : null;
}

// Helper function to get item name by ID (reverse lookup)
function getItemNameById(itemId) {
    if (!allItems) return null;
    
    const item = allItems.find(i => i.id === itemId);
    return item ? item.itemName : null;
}

// Comprehensive function to get accessible empty locations with both region and location logic
function getAccessibleEmptyLocations(locations, gameState, regionLogic) {
    const accessibleLocations = [];
    
    for (const location of locations) {
        // Skip filled or locked locations
        if (!location.isEmpty() || !location.isAvailable() || location.locked) {
            continue;
        }
        
        // ALWAYS apply access rules - no exceptions
        let isAccessible = false;
        const locationRule = allRules[location.name];
        
        if (locationRule) {
            try {
                isAccessible = evaluateAccessibilityRule(locationRule, gameState);
            } catch (error) {
                console.error(`Error evaluating rule for ${location.name}:`, error);
                isAccessible = false; // Default to NOT accessible if rule fails
            }
        } else {
            // No rule means always accessible (like starting area locations)
            isAccessible = true;
        }
        
        if (isAccessible) {
            accessibleLocations.push(location);
        }
    }
    
    return accessibleLocations;
}

// Function to find valid locations for a specific item (prevents self-locking)
function findValidLocationsForItem(itemName, accessibleLocations, gameState, regionLogic) {
    return accessibleLocations.filter(location => {
        // Basic safety checks first
        if (!location.isEmpty() || !location.isAvailable() || location.locked) {
            return false;
        }
        
        // Check if this location would become inaccessible if we placed the item here
        const locationRule = allRules[location.name];
        if (locationRule) {
            // Test accessibility without the item we're trying to place
            const gameStateWithoutItem = gameState.clone();
            const canAccessWithoutItem = evaluateAccessibilityRule(locationRule, gameStateWithoutItem);
            
            if (!canAccessWithoutItem) {
                // Location requires this item to access - this would be self-locking
                console.warn(`Preventing self-lock: "${itemName}" cannot be placed at "${location.name}"`);
                return false;
            }
        }
        
        // Simple circular dependency check (more lenient)
        if (wouldCreateSimpleCircularDependency(itemName, location.name)) {
            console.warn(`Preventing simple circular dependency: "${itemName}" at "${location.name}"`);
            return false;
        }
        
        return true;
    });
}

// Simplified circular dependency check (less restrictive)
function wouldCreateSimpleCircularDependency(itemName, locationName) {
    const locationRule = allRules[locationName];
    if (!locationRule) return false;
    
    // Only check direct requirements, not nested ones
    if (locationRule.has) {
        if (typeof locationRule.has === 'string' && locationRule.has === itemName) {
            return true;
        } else if (locationRule.has.item && locationRule.has.item === itemName) {
            return true;
        }
    }
    
    // Check function-based rules
    if (locationRule.function) {
        const functionRequirements = getFunctionRequirements(locationRule.function);
        if (functionRequirements.includes(itemName)) {
            return true;
        }
    }
    
    return false;
}

// Function to choose the optimal location from valid options
function chooseOptimalLocation(validLocations, itemName, gameState) {
    // Prioritize locations that are less likely to cause issues
    // For now, just return the first valid location, but this could be enhanced
    // to prefer locations in earlier regions or with simpler requirements
    
    // Sort by preference: simpler requirements first
    validLocations.sort((a, b) => {
        const aRule = allRules[a.name];
        const bRule = allRules[b.name];
        
        // Prefer locations with no specific rules (simpler)
        if (!aRule && bRule) return -1;
        if (aRule && !bRule) return 1;
        
        // Both have rules or both don't - use first available
        return 0;
    });
    
    return validLocations[0];
}

// Function to check if placing an item would create circular dependency
function wouldCreateCircularDependency(itemName, locationName, gameState) {
    // Check if the location rule directly or indirectly requires this item
    const locationRule = allRules[locationName];
    if (!locationRule) return false;
    
    // Create a set to track items we've checked to prevent infinite recursion
    const checkedItems = new Set();
    
    function checkRuleForItem(rule, targetItem) {
        if (!rule || checkedItems.has(targetItem)) return false;
        checkedItems.add(targetItem);
        
        // Direct item requirement
        if (rule.has) {
            if (typeof rule.has === 'string' && rule.has === targetItem) {
                return true;
            } else if (rule.has.item && rule.has.item === targetItem) {
                return true;
            }
        }
        
        // Check nested rules
        if (rule.and && rule.and.some(subrule => checkRuleForItem(subrule, targetItem))) {
            return true;
        }
        if (rule.or && rule.or.every(subrule => checkRuleForItem(subrule, targetItem))) {
            return true; // All OR conditions require the item
        }
        
        // Check function-based rules
        if (rule.function) {
            const functionRequirements = getFunctionRequirements(rule.function);
            if (functionRequirements.includes(targetItem)) {
                return true;
            }
        }
        
        // Check can_reach rules recursively
        if (rule.can_reach) {
            const reachRule = allRules[rule.can_reach];
            if (reachRule && checkRuleForItem(reachRule, targetItem)) {
                return true;
            }
        }
        
        return false;
    }
    
    return checkRuleForItem(locationRule, itemName);
}

// Helper function to get requirements from function names
function getFunctionRequirements(funcName) {
    switch (funcName) {
        case 'super_boots':
        case 'ultra_boots':
            return ['Progressive Boots'];
        case 'super_hammer':
        case 'ultra_hammer':
            return ['Progressive Hammer'];
        case 'tube_curse':
            return ['Tube Curse'];
        case 'key_any':
            return ['Red Key', 'Blue Key']; // Either one
        default:
            return [];
    }
}

// Simple region accessibility check (fallback)
function isRegionAccessible(regionName, gameState) {
    // Use proper StateLogic functions from parser.js
    if (typeof StateLogic !== 'undefined' && StateLogic[regionName]) {
        try {
            const result = StateLogic[regionName](gameState);
            console.log(`🌍 Region ${regionName}: ${result} (using StateLogic)`);
            return result;
        } catch (error) {
            console.error(`❌ Error evaluating StateLogic.${regionName}:`, error);
            throw new Error(`StateLogic function for ${regionName} failed: ${error.message}`);
        }
    }
    
    // CRITICAL ERROR: StateLogic function missing
    console.error(`❌ MISSING StateLogic function: ${regionName}`);
    throw new Error(`Required StateLogic function '${regionName}' is missing. All regions must have StateLogic functions for proper randomization.`);
}

// Validate that all required StateLogic functions exist before starting randomization
async function validateStateLogicFunctions() {
    console.log('Checking StateLogic availability...');
    
    if (typeof StateLogic === 'undefined') {
        throw new Error('StateLogic is not defined! Make sure parser.js is loaded properly.');
    }
    
    // List of all regions that need StateLogic functions based on the codebase
    const requiredStateLogicFunctions = [
        'sewers_westside', 'sewers_westside_ground', 'petal_left', 'petal_right', 
        'hooktails_castle', 'twilight_town', 'twilight_trail', 'fahr_outpost', 
        'boggly_woods', 'great_tree', 'glitzville', 'creepy_steeple', 'keelhaul_key',
        'pirates_grotto', 'excess_express', 'riverside', 'poshley_heights', 
        'palace', 'riddle_tower', 'pit', 'ttyd',
        // Movement ability functions
        'super_hammer', 'ultra_hammer', 'super_boots', 'ultra_boots',
        'tube_curse'
        // Note: paper_curse, plane_curse, boat_curse are checked via state.has() not StateLogic functions
    ];
    
    const missingFunctions = [];
    
    console.log(`Validating ${requiredStateLogicFunctions.length} required StateLogic functions...`);
    
    for (const functionName of requiredStateLogicFunctions) {
        if (typeof StateLogic[functionName] !== 'function') {
            missingFunctions.push(functionName);
        }
    }
    
    if (missingFunctions.length > 0) {
        console.error(`❌ MISSING StateLogic functions: ${missingFunctions.join(', ')}`);
        throw new Error(`Missing required StateLogic functions: ${missingFunctions.join(', ')}. All regions and movement abilities must have StateLogic functions for proper randomization.`);
    }
    
    console.log('✅ All required StateLogic functions found');
}

// Validate sphere progression to ensure seed is logically beatable
function validateSphereProgression(locations, finalGameState, allRules, regionLogic) {
    console.log('=== VALIDATING SPHERE PROGRESSION ===');
    
    // Create a fresh game state with only the starting partner
    const validationState = GameState.createStartingState();
    
    // Add starting partner
    const startingPartnerLocation = locations.find(loc => loc.name === "Rogueport Center: Goombella");
    if (startingPartnerLocation && startingPartnerLocation.hasPlacedItem()) {
        const startingPartnerItem = getItemNameById(startingPartnerLocation.placed_item);
        validationState.addItem(startingPartnerItem, 1);
    }
    
    let sphere = 1;
    let totalProgressionFound = 0;
    let totalLocationsProcessed = 0;
    const maxSpheres = 15;
    const minProgressionRequirement = {
        1: 2,  // Must have at least 2 progression items in first 2 spheres
        2: 5,  // Must have at least 5 progression items in first 3 spheres  
        3: 8   // Must have at least 8 progression items in first 4 spheres
    };
    
    const processedLocations = new Set();
    
    while (sphere <= maxSpheres) {
        // Find accessible locations in this sphere
        const accessibleLocations = locations.filter(loc => {
            if (!loc.hasPlacedItem() || processedLocations.has(loc.name)) return false;
            
            const locationRule = allRules[loc.name];
            if (locationRule) {
                return evaluateAccessibilityRule(locationRule, validationState);
            }
            return true; // Default accessible
        });
        
        if (accessibleLocations.length === 0) {
            console.warn(`⚠️ Validation Sphere ${sphere}: No accessible locations found with ${totalLocationsProcessed}/${locations.length} processed`);
            if (totalLocationsProcessed < locations.length * 0.8) {
                return { 
                    isValid: false, 
                    reason: `Stuck at sphere ${sphere} with only ${totalLocationsProcessed}/${locations.length} locations accessible`
                };
            }
            break;
        }
        
        // Process accessible locations and add their items to game state
        let progressionInSphere = 0;
        for (const location of accessibleLocations) {
            if (processedLocations.has(location.name)) continue;
            
            processedLocations.add(location.name);
            totalLocationsProcessed++;
            
            const itemName = getItemNameById(location.placed_item);
            if (itemName && !itemName.includes('Crystal Star')) { // Don't add Crystal Stars to validation state
                validationState.addItem(itemName, 1);
                
                // Check if this is a progression item
                if (isProgressionItem(itemName)) {
                    progressionInSphere++;
                    totalProgressionFound++;
                }
            }
        }
        
        console.log(`Validation Sphere ${sphere}: ${accessibleLocations.length} locations, ${progressionInSphere} progression items`);
        
        // Check minimum progression requirements for early spheres
        if (minProgressionRequirement[sphere] && totalProgressionFound < minProgressionRequirement[sphere]) {
            return { 
                isValid: false, 
                reason: `Insufficient progression by sphere ${sphere}: ${totalProgressionFound} < ${minProgressionRequirement[sphere]} required`
            };
        }
        
        // Update accessible regions after adding items
        performRegionSweep(validationState, regionLogic);
        sphere++;
    }
    
    console.log(`✅ Validation complete: ${totalLocationsProcessed}/${locations.length} locations processed, ${totalProgressionFound} progression items found`);
    
    // Final check - ensure we processed most locations
    if (totalLocationsProcessed < locations.length * 0.95) {
        return { 
            isValid: false, 
            reason: `Only ${totalLocationsProcessed}/${locations.length} locations accessible during validation`
        };
    }
    
    return { isValid: true, totalProgressionFound, spheres: sphere - 1 };
}

// Helper function to check if item is progression
function isProgressionItem(itemName) {
    // Check if item has progression flag in allItems
    if (typeof allItems !== 'undefined' && allItems) {
        const itemData = allItems.find(item => item.itemName === itemName);
        return itemData?.progression === 'progression';
    }
    
    // Fallback: hardcoded list of known progression items
    const knownProgressionItems = [
        'Progressive Hammer', 'Progressive Boots', 'Tube Curse', 'Paper Curse', 'Plane Curse', 'Boat Curse',
        'Goombella', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz',
        'Blimp Ticket', 'Train Ticket', 'Contact Lens', 'Sun Stone', 'Moon Stone', 'Necklace',
        'Station Key 1', 'Station Key 2', 'Elevator Key 1', 'Elevator Key 2', 'Elevator Key (Riverside)',
        'Palace Key', 'Palace Key (Riddle Tower)', 'Star Key', 'Castle Key', 'Steeple Key',
        'Black Key (Paper Curse)', 'Black Key (Tube Curse)', 'Black Key (Plane Curse)', 'Black Key (Boat Curse)',
        'Red Key', 'Blue Key', 'Shop Key', 'Storage Key 1', 'Storage Key 2', 'Grotto Key',
        'Old Letter', 'Autograph', 'Ragged Diary', 'Blanket', 'Vital Paper', 'Wedding Ring',
        'Skull Gem', 'Goldbob Guide', 'Shell Earrings', 'Puni Orb', 'Superbombomb', 'Gate Handle',
        'Briefcase', 'Gold Ring', 'Chuckola Cola', 'Coconut', 'Galley Pot', 'Cog'
    ];
    return knownProgressionItems.includes(itemName);
}

// Calculate proper spheres after all items have been placed
function calculateAndAssignSpheres(locations, spoilerGen, finalGameState, regionLogic) {
    console.log(`Calculating logical spheres for ${locations.length} locations...`);
    
    // Start with empty game state (just like the player would)
    let simulatedGameState = GameState.createStartingState();
    let currentSphere = 1;
    let sphereItems = [];
    let processedLocations = new Set();
    
    console.log(`Starting sphere calculation with empty game state:`, simulatedGameState.getStats());
    
    // Add locked items to starting state (these are sphere 0/starting items)
    // BUT exclude Crystal Stars - they should be earned, not starting items
    const crystalStars = ["Diamond Star", "Emerald Star", "Gold Star", "Ruby Star", "Sapphire Star", "Garnet Star", "Crystal Star"];
    
    locations.forEach(location => {
        if (location.locked && location.hasPlacedItem()) {
            const itemName = getItemNameById(location.placed_item);
            if (itemName && !crystalStars.includes(itemName)) {
                simulatedGameState.addItem(itemName, 1);
                processedLocations.add(location.name);
                console.log(`Starting item: ${itemName} at ${location.name}`);
            } else if (itemName && crystalStars.includes(itemName)) {
                console.log(`Excluding Crystal Star from starting items: ${itemName} at ${location.name}`);
            }
        }
    });
    
    console.log(`After adding starting items:`, simulatedGameState.getStats());
    console.log(`Starting items processed: ${processedLocations.size} locations`);
    
    // Perform initial region sweep with starting items
    const initialRegions = performRegionSweep(simulatedGameState, regionLogic);
    console.log(`Initial region sweep completed. Regions accessible:`, Array.from(simulatedGameState.regions));
    
    let foundNewLocations = true;
    
    while (foundNewLocations && processedLocations.size < locations.length) {
        foundNewLocations = false;
        sphereItems = [];
        
        console.log(`=== CALCULATING SPHERE ${currentSphere} ===`);
        console.log(`Current game state:`, simulatedGameState.getStats());
        
        // Find all locations accessible with current game state
        const accessibleLocations = locations.filter(location => {
            // Skip if already processed or not filled
            if (processedLocations.has(location.name) || !location.hasPlacedItem()) {
                return false;
            }
            
            // Check if location is accessible with current game state
            const locationRule = allRules[location.name];
            if (locationRule) {
                return evaluateAccessibilityRule(locationRule, simulatedGameState);
            } else {
                // Fallback to original accessibility check
                return location.isAccessible ? location.isAccessible(simulatedGameState, regionLogic) : true;
            }
        });
        
        console.log(`Found ${accessibleLocations.length} accessible locations in sphere ${currentSphere}`);
        
        // Process each accessible location
        accessibleLocations.forEach(location => {
            const itemName = getItemNameById(location.placed_item);
            if (itemName) {
                // Add item to simulated game state (ALL items affect logic)
                simulatedGameState.addItem(itemName, 1);
                
                // Check if this is a progression item
                const itemData = allItems.find(item => item.itemName === itemName);
                const isProgressionItem = itemData && itemData.progression === 'progression';
                
                // Only add progression items to spheres
                if (isProgressionItem) {
                    sphereItems.push({
                        itemName: itemName,
                        location: location
                    });
                    console.log(`Sphere ${currentSphere}: ${itemName} at ${location.name}`);
                }
                
                // Mark as processed and continue search
                processedLocations.add(location.name);
                foundNewLocations = true;
                
                // Update spoiler data with correct sphere (all items get sphere numbers)
                spoilerGen.addLocationItemPair(location, itemName, location.placed_item, currentSphere.toString());
            }
        });
        
        // Perform region sweep after adding all items from this sphere
        if (foundNewLocations) {
            const newRegions = performRegionSweep(simulatedGameState, regionLogic);
            if (newRegions.length > 0) {
                console.log(`Sphere ${currentSphere} unlocked regions: ${newRegions.join(', ')}`);
            }
            
            // Add sphere to spoiler generator (only if we found progression items)
            if (sphereItems.length > 0) {
                spoilerGen.addItemSphere(currentSphere, sphereItems, simulatedGameState.clone());
                console.log(`Completed sphere ${currentSphere} with ${sphereItems.length} progression items`);
            } else {
                console.log(`Sphere ${currentSphere}: No progression items found, but ${accessibleLocations.length} locations processed`);
            }
            
            currentSphere++;
        } else if (processedLocations.size < locations.length) {
            // No accessible locations found, but we have unprocessed locations
            // This might indicate a problem with the randomization
            const unprocessedLocations = locations.filter(loc => !processedLocations.has(loc.name) && loc.hasPlacedItem());
            console.warn(`No accessible locations found, but ${unprocessedLocations.length} locations remain unprocessed:`);
            unprocessedLocations.slice(0, 5).forEach(loc => {
                console.warn(`  - ${loc.name}: ${getItemNameById(loc.placed_item)}`);
            });
            break;
        }
    }
    
    console.log(`=== SPHERE CALCULATION COMPLETE ===`);
    console.log(`Processed ${processedLocations.size}/${locations.length} locations across ${currentSphere - 1} spheres`);
    
    return currentSphere - 1;
}

// Comprehensive region sweep function using regions.json and parser
function performRegionSweep(gameState, regionLogic) {
    const newlyAccessibleRegions = [];
    
    let foundNewRegions = true;
    let sweepAttempts = 0;
    const maxSweepAttempts = 10; // Prevent infinite loops
    
    // Keep sweeping until no new regions are found (handle chain dependencies)  
    while (foundNewRegions && sweepAttempts < maxSweepAttempts) {
        foundNewRegions = false;
        sweepAttempts++;
        
        // Check all regions in the region logic from regions.json
        for (const [regionName, logicExpression] of Object.entries(regionLogic)) {
            // Skip if we already have this region
            if (gameState.regions.has(regionName)) {
                continue;
            }
            
            let regionAccessible = false;
            
            // Parse and evaluate the logic expression using the parser system
            try {
                // Use the parser to convert the JSON expression to a function
                if (typeof parseExpression !== 'undefined') {
                    const logicFunc = parseExpression(logicExpression);
                    regionAccessible = logicFunc && logicFunc(gameState);
                } else {
                    // Fallback to simple region check
                    regionAccessible = isRegionAccessible(regionName, gameState);
                }
            } catch (error) {
                console.warn(`Error evaluating logic for region ${regionName}:`, error);
                // Try fallback check
                regionAccessible = isRegionAccessible(regionName, gameState);
            }
            
            if (regionAccessible) {
                gameState.addRegion(regionName);
                newlyAccessibleRegions.push(regionName);
                foundNewRegions = true;
            }
        }
    }
    
    if (sweepAttempts >= maxSweepAttempts) {
        console.warn(`Region sweep stopped after ${maxSweepAttempts} attempts to prevent infinite loop`);
    }
    
    return newlyAccessibleRegions;
}

/*
// ROM patching functions (COMMENTED OUT FOR TESTING)
// Function to get locations that need to be patched in specific REL files
function getLocationsToPatch(relName, locationData) {
    if (!locationData || !locationData.available) {
        return [];
    }
    
    return locationData.available.filter(location => location.isInRel(relName));
}

// Function to apply location modifications to extracted REL data
function applyLocationPatches(relName, relData, locationPatches) {
    if (!relData || !locationPatches || locationPatches.length === 0) {
        return relData;
    }
    
    console.log(`Applying ${locationPatches.length} location patches to ${relName}`);
    
    // Create a modifiable copy of the REL data
    const modifiedRelData = new Uint8Array(relData);
    const view = new DataView(modifiedRelData.buffer);
    
    let patchedCount = 0;
    
    locationPatches.forEach(location => {
        // Get the item to place (placed item or vanilla item)
        const itemToPlace = location.getEffectiveItem();
        const romId = convertToRomId(itemToPlace);
        
        // Apply patches for each offset in the location
        location.getAllOffsets().forEach(offset => {
            if (offset + 4 <= modifiedRelData.length) {
                // Write the ROM ID at this location offset
                view.setUint32(offset, romId, false); // false = big-endian
                const itemDescription = location.hasPlacedItem() ? 
                    `placed item (${itemToPlace} -> ROM ID ${romId})` : 
                    `vanilla item (${itemToPlace} -> ROM ID ${romId})`;
                console.log(`  Location "${location.name}" at offset 0x${offset.toString(16)}: ${location.vanillaItem} -> ${itemDescription}`);
                patchedCount++;
            } else {
                console.warn(`  Offset 0x${offset.toString(16)} out of bounds for ${relName} (size: ${modifiedRelData.length})`);
            }
        });
    });
    
    console.log(`Successfully patched ${patchedCount} locations in ${relName}`);
    return modifiedRelData;
}

// Helper function to convert item ID to ROM ID
function convertToRomId(itemId) {
    // Try to use the mapping if available
    if (itemIdToRomId && itemIdToRomId.has(itemId)) {
        return itemIdToRomId.get(itemId);
    }
    
    // Fallback: assume itemId is already a ROM ID
    return itemId;
}
*/

// Create a full item pool to fill all locations
function createFullItemPool(locationCount, excludedItems = [], progressionItems = []) {
    console.log(`Creating item pool for ${locationCount} locations, excluding ${excludedItems.length} locked items`);
    
    if (!allItems) {
        throw new Error('allItems not loaded - cannot create item pool');
    }
    
    const itemPool = [];
    
    // Process every item from items.json
    console.log(`Processing ${allItems.length} items from items.json`);
    
    for (const item of allItems) {
        const itemName = item.itemName;
        
        // Skip excluded/locked items
        if (excludedItems.includes(itemName)) {
            console.log(`Skipping locked item: ${itemName}`);
            continue;
        }
        
        // Check if item has a specific frequency override
        let frequency = 1; // Default frequency
        if (itemName in ITEM_FREQUENCIES) {
            frequency = ITEM_FREQUENCIES[itemName];
        }
        
        // Add the item the specified number of times (0 = skip, 1+ = add that many)
        for (let i = 0; i < frequency; i++) {
            itemPool.push(itemName);
        }
        
        if (frequency > 0) {
            console.log(`Added ${itemName} x${frequency} to item pool`);
        } else {
            console.log(`Skipped ${itemName} (frequency 0)`);
        }
    }
    
    console.log(`Base item pool has ${itemPool.length} items from all items`);
    
    // If we need more items to fill all locations, add filler items
    while (itemPool.length < locationCount) {
        const fillerItems = [
            "10 Coins",
            "Star Piece", 
            "Mushroom",
            "Super Shroom",
            "Honey Syrup",
            "Shine Sprite"
        ];
        
        for (const filler of fillerItems) {
            if (itemPool.length < locationCount) {
                itemPool.push(filler);
            }
        }
    }
    
    // If we have too many items, trim to exact count needed
    if (itemPool.length > locationCount) {
        console.log(`Trimming item pool from ${itemPool.length} to ${locationCount} items`);
        
        // Before trimming, ensure ALL progression items are preserved (no exceptions!)
        const allProgressionItemsInPool = [];
        
        // Extract ALL progression items from the pool first
        progressionItems.forEach(progressionItem => {
            let index = itemPool.indexOf(progressionItem);
            while (index !== -1) {
                allProgressionItemsInPool.push(itemPool.splice(index, 1)[0]);
                console.log(`Preserved progression item: ${progressionItem}`);
                index = itemPool.indexOf(progressionItem);
            }
        });
        
        console.log(`Preserved ${allProgressionItemsInPool.length} total progression items`);
        
        // Verify no progression items were missed
        const remainingProgressionInPool = itemPool.filter(item => progressionItems.includes(item));
        if (remainingProgressionInPool.length > 0) {
            console.warn(`WARNING: ${remainingProgressionInPool.length} progression items still in filler pool:`, remainingProgressionInPool);
        }
        
        // Calculate how many filler items we need to remove
        const itemsToRemove = itemPool.length + allProgressionItemsInPool.length - locationCount;
        if (itemsToRemove > 0) {
            // Remove filler items from the end (least important)
            itemPool.splice(itemPool.length - itemsToRemove);
            console.log(`Removed ${itemsToRemove} filler items during trim`);
        }
        
        // Add ALL progression items back to the pool
        itemPool.push(...allProgressionItemsInPool);
        console.log(`Final pool has ${itemPool.length} items with ALL ${allProgressionItemsInPool.length} progression items preserved`);
        
        // Final verification: count progression items in final pool
        const finalProgressionCount = itemPool.filter(item => progressionItems.includes(item)).length;
        const expectedProgressionCount = progressionItems.filter(item => !excludedItems.includes(item)).length;
        console.log(`Final verification: ${finalProgressionCount}/${expectedProgressionCount} non-excluded progression items in pool`);
        
        if (finalProgressionCount !== expectedProgressionCount) {
            console.error(`❌ PROGRESSION ITEM MISMATCH! Expected ${expectedProgressionCount}, got ${finalProgressionCount}`);
            
            // Show which progression items are missing
            const missingProgression = progressionItems.filter(item => 
                !excludedItems.includes(item) && !itemPool.includes(item)
            );
            if (missingProgression.length > 0) {
                console.error(`Missing progression items:`, missingProgression);
            }
        } else {
            console.log(`✅ All non-excluded progression items preserved in pool`);
        }
    }
    
    console.log(`Final item pool has ${itemPool.length} items for ${locationCount} locations`);
    return itemPool;
}

// Utility function to shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Load user presets when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadUserPresets();
    
    // Set up ROM file input handler (COMMENTED OUT FOR TESTING)
    /*
    const romInput = document.getElementById('romFileInput');
    if (romInput) {
        romInput.addEventListener('change', handleROMSelection);
    }
    */
    
    // Initialize tooltip system
    initializeTooltips();
    
    // Initialize item, location, and rules data
    Promise.all([
        initializeItems().catch(error => {
            console.error('Failed to initialize items:', error);
        }),
        initializeLocations().catch(error => {
            console.error('Failed to initialize locations:', error);
        }),
        initializeRules().catch(error => {
            console.error('Failed to initialize rules:', error);
        })
    ]).then(() => {
        console.log('All data initialization complete');
    });
});