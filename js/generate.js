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

// ROM file handling
let selectedROMFile = null;

// Global variables for extracted files
let extractedDOL = null;
let extractedRELFiles = {};

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

// Handle ROM file selection
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

// Function to patch the extracted DOL file directly
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

// Function to patch DOL with settings
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

// Function to patch the icon files using IPS
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


// Main function for generating randomized ROM
async function generateRandomizedROM() {
    if (!selectedROMFile) {
        console.error('No ROM file selected');
        return;
    }
    
    if (!allLocations) {
        console.error('Locations not initialized');
        return;
    }
    
    try {
        console.log('Starting ROM generation...');
        
        // Get settings from UI
        const settings = getSettingsFromUI();
        
        // Prepare json for randomization based on settings
        console.log('Preparing json for randomization...');
        const locationData = prepareLocationsForRandomization(settings);
        
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
        
        console.log(`ROM generation completed! Processed ${locationData.total} locations.`);
        
    } catch (error) {
        console.error('Error generating randomized ROM:', error);
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
let itemIdToRomId = new Map();

// Define progression items that affect accessibility
const progressionItems = [
    'Progressive Hammer', 'Progressive Boots', 'Paper Curse', 'Plane Curse', 
    'Tube Curse', 'Boat Curse', 'Goombella', 'Koops', 'Flurrie', 'Yoshi', 
    'Vivian', 'Bobbery', 'Ms. Mowz', 'Blimp Ticket', 'Train Ticket', 
    'Contact Lens', 'Sun Stone', 'Moon Stone', 'Necklace', 'Diamond Star',
    'Emerald Star', 'Gold Star', 'Ruby Star', 'Sapphire Star', 'Garnet Star', 
    'Crystal Star'
];

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
        
        console.log(`Loaded ${allItems.length} items`);
        return allItems;
        
    } catch (error) {
        console.error('Error loading item data:', error);
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

// Function to prepare json for randomization based on settings
function prepareLocationsForRandomization(settings) {
    if (!allLocations) {
        throw new Error('Locations not initialized. Call initializeLocations() first.');
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

// Logical item placement test function
async function performLogicalItemPlacement(locations, settings) {
    console.log('=== LOGICAL ITEM PLACEMENT TEST ===');
    
    const startTime = Date.now();
    
    try {
        // Load region logic
        const regionLogic = await loadRegionLogic();
        
        // Initialize spoiler generator
        const spoilerGen = new SpoilerGenerator();
        const seed = settings.seed || generateRandomSeed();
        const settingsString = getSettingsString();
        spoilerGen.initialize(seed, settings, settingsString);
        spoilerGen.addProgressionLog('Starting randomization', '', '', null);
        
        // Create starting game state
        const gameState = GameState.createStartingState();
        console.log('Starting game state:', gameState.getStats());
        spoilerGen.addProgressionLog('Created starting game state', '', '', gameState);
        
        // Create item pool for all locations
        const itemPool = createFullItemPool(locations.length);
        console.log(`Created item pool with ${itemPool.length} items for ${locations.length} locations`);
        
        // Shuffle the item pool
        shuffleArray(itemPool);
        
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
        shuffleArray(progressionPool);
        shuffleArray(fillerPool);
        
        // Forward-fill algorithm for 100% accessibility
        let remainingProgressionItems = [...progressionPool];
        let remainingFillerItems = [...fillerPool];
        
        while (placedItems < locations.length) {
            // Get currently accessible empty locations
            const accessibleLocations = locations.filter(location => {
                accessibilityChecks++;
                return location.isEmpty() && 
                       location.isAvailable() && 
                       location.isAccessible(gameState, regionLogic);
            });
            
            if (accessibleLocations.length === 0) {
                console.error('No accessible locations remaining - randomization failed!');
                break;
            }
            
            console.log(`Sphere ${currentSphere}: ${accessibleLocations.length} accessible locations, ${remainingProgressionItems.length} progression items left`);
            
            let spherePlacementCount = 0;
            let placedProgressionInSphere = false;
            
            // Place progression items in accessible locations until we run out or fill all accessible locations
            for (const targetLocation of accessibleLocations) {
                if (remainingProgressionItems.length === 0) break;
                
                const itemToPlace = remainingProgressionItems.shift();
                const itemId = getItemIdByName(itemToPlace) || 77772177;
                
                // Place the item
                targetLocation.placeItem(itemId);
                placedItems++;
                spherePlacementCount++;
                placedProgressionInSphere = true;
                
                // Update game state immediately
                gameState.addItem(itemToPlace, 1);
                
                // Add to spoiler data
                spoilerGen.addLocationItemPair(targetLocation, itemToPlace, itemId, currentSphere.toString());
                spoilerGen.addProgressionLog(`Placed progression item`, itemToPlace, targetLocation.name, gameState);
                
                // Add to current sphere
                sphereItems.push({
                    itemName: itemToPlace,
                    location: targetLocation
                });
                
                console.log(`Placed progression "${itemToPlace}" at "${targetLocation.name}"`);
            }
            
            // After placing progression items, perform a region sweep
            if (placedProgressionInSphere) {
                const newRegions = performRegionSweep(gameState, regionLogic);
                if (newRegions.length > 0) {
                    console.log(`Region sweep unlocked: ${newRegions.join(', ')}`);
                    spoilerGen.addProgressionLog(`Unlocked regions`, newRegions.join(', '), '', gameState);
                }
            }
            
            // Fill any remaining accessible locations in this sphere with filler items
            const stillAccessible = locations.filter(location => {
                return location.isEmpty() && 
                       location.isAvailable() && 
                       location.isAccessible(gameState, regionLogic);
            });
            
            for (const targetLocation of stillAccessible) {
                if (remainingFillerItems.length === 0) {
                    // Generate more filler if needed
                    remainingFillerItems.push('Star Piece', '10 Coins', 'Mushroom', 'Honey Syrup', 'Super Shroom', 'Shine Sprite');
                }
                
                const itemToPlace = remainingFillerItems.shift();
                const itemId = getItemIdByName(itemToPlace) || 77772177;
                
                targetLocation.placeItem(itemId);
                placedItems++;
                spherePlacementCount++;
                
                spoilerGen.addLocationItemPair(targetLocation, itemToPlace, itemId, currentSphere.toString());
                
                sphereItems.push({
                    itemName: itemToPlace,
                    location: targetLocation
                });
                
                console.log(`Placed filler "${itemToPlace}" at "${targetLocation.name}"`);
            }
            
            // Finalize current sphere
            if (sphereItems.length > 0) {
                spoilerGen.addItemSphere(currentSphere, sphereItems, gameState);
                console.log(`Completed sphere ${currentSphere} with ${spherePlacementCount} items`);
                sphereItems = [];
                currentSphere++;
            }
            
            // Safety check to prevent infinite loops
            placementAttempts++;
            if (placementAttempts > 50) {
                console.error('Maximum placement attempts reached - stopping randomization');
                break;
            }
        }
        
        // Finalize any remaining sphere items
        if (sphereItems.length > 0) {
            spoilerGen.addItemSphere(currentSphere, sphereItems, gameState);
        }
        
        // Statistics
        const totalLocations = locations.length;
        const accessibleCount = locations.filter(loc => loc.isAccessible(gameState, regionLogic)).length;
        const filledCount = locations.filter(loc => loc.hasPlacedItem()).length;
        const generationTime = Date.now() - startTime;
        
        const stats = {
            totalLocations,
            accessibleCount,
            filledCount,
            accessibilityChecks,
            placementAttempts,
            generationTime
        };
        
        spoilerGen.setStatistics(stats);
        spoilerGen.addProgressionLog('Randomization completed', '', '', gameState);
        
        console.log('=== PLACEMENT RESULTS ===');
        console.log(`Total locations: ${totalLocations}`);
        console.log(`Currently accessible: ${accessibleCount}`);
        console.log(`Items placed: ${filledCount}`);
        console.log(`Accessibility checks performed: ${accessibilityChecks}`);
        console.log(`Generation time: ${generationTime}ms`);
        console.log(`Final game state:`, gameState.getStats());
        
        // Show sample placed items
        const placedLocations = locations.filter(loc => loc.hasPlacedItem()).slice(0, 10);
        console.log('Sample placed items:');
        placedLocations.forEach(loc => {
            console.log(`  ${loc.name}: Item ID ${loc.placed_item} (Region: ${loc.getRegionTag() || 'unknown'})`);
        });
        
        // Generate and download spoiler file
        console.log('Generating spoiler file...');
        spoilerGen.downloadSpoiler(`ttyd_spoiler_${seed}.txt`, 'txt');
        console.log('Spoiler file generated!');
        
    } catch (error) {
        console.error('Error during logical item placement:', error);
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
    
    const item = allItems.find(i => i.name === itemName);
    return item ? item.id : null;
}

// Comprehensive region sweep function using regions.json and parser
function performRegionSweep(gameState, regionLogic) {
    const newlyAccessibleRegions = [];
    
    // Check all regions in the region logic from regions.json
    for (const [regionName, logicExpression] of Object.entries(regionLogic)) {
        // Skip if we already have this region
        if (gameState.regions.has(regionName)) {
            continue;
        }
        
        // Parse and evaluate the logic expression using the parser system
        try {
            // Use the parser to convert the JSON expression to a function
            if (typeof parseExpression === 'undefined') {
                console.warn('parseExpression not available, falling back to simple region update');
                updateAccessibleRegions(gameState, regionLogic);
                return [];
            }
            
            // Parse the logic expression and evaluate it
            const logicFunc = parseExpression(logicExpression);
            if (logicFunc && logicFunc(gameState)) {
                gameState.addRegion(regionName);
                newlyAccessibleRegions.push(regionName);
            }
        } catch (error) {
            console.warn(`Error evaluating logic for region ${regionName}:`, error);
        }
    }
    
    return newlyAccessibleRegions;
}

// Fallback simple region accessibility update
function updateAccessibleRegions(gameState, regionLogic) {
    // Simple region accessibility update based on items
    if (gameState.has('Progressive Hammer', 1)) {
        gameState.addRegion('petal_right');
    }
    if (gameState.has('Progressive Hammer', 1) && gameState.has('Progressive Boots', 1)) {
        gameState.addRegion('hooktails_castle');
    }
    if (gameState.has('Paper Curse')) {
        gameState.addRegion('boggly_woods');
    }
    if (gameState.has('Flurrie')) {
        gameState.addRegion('great_tree');
    }
    if (gameState.has('Blimp Ticket')) {
        gameState.addRegion('glitzville');
    }
    if (gameState.has('Tube Curse')) {
        gameState.addRegion('twilight_trail');
    }
}

// Function to get json that need to be patched in specific REL files
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

// Create a full item pool to fill all locations
function createFullItemPool(locationCount) {
    console.log(`Creating item pool for ${locationCount} locations`);
    
    // Get all available items from ITEM_FREQUENCIES
    const allItems = [];
    
    // Add items based on their frequencies
    for (const [itemName, frequency] of Object.entries(ITEM_FREQUENCIES)) {
        if (frequency > 0) {
            for (let i = 0; i < frequency; i++) {
                allItems.push(itemName);
            }
        }
    }
    
    console.log(`Base item pool has ${allItems.length} items from frequencies`);
    
    // If we need more items to fill all locations, add filler items
    while (allItems.length < locationCount) {
        // Add common filler items in order of preference
        const fillerItems = [
            "10 Coins",
            "Star Piece", 
            "Mushroom",
            "Super Shroom",
            "Honey Syrup",
            "Shine Sprite"
        ];
        
        for (const filler of fillerItems) {
            if (allItems.length < locationCount) {
                allItems.push(filler);
            }
        }
    }
    
    // If we have too many items, trim to exact count needed
    if (allItems.length > locationCount) {
        allItems.splice(locationCount);
    }
    
    console.log(`Final item pool has ${allItems.length} items for ${locationCount} locations`);
    return allItems;
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
    
    // Set up ROM file input handler
    const romInput = document.getElementById('romFileInput');
    if (romInput) {
        romInput.addEventListener('change', handleROMSelection);
    }
    
    // Initialize tooltip system
    initializeTooltips();
    
    // Initialize item and location data
    Promise.all([
        initializeItems().catch(error => {
            console.error('Failed to initialize items:', error);
        }),
        initializeLocations().catch(error => {
            console.error('Failed to initialize locations:', error);
        })
    ]).then(() => {
        console.log('All data initialization complete');
    });
});