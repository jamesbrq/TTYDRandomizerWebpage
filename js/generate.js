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
        }
    );
}

function getUserPresets() {
    const cookieValue = getCookie('ttydPresets');
    if (cookieValue) {
        try {
            return JSON.parse(cookieValue);
        } catch (e) {
            return {};
        }
    }
    return {};
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

// Function to extract REL files and DOL from the ISO
function extractFilesFromISO(isoData) {
    console.log('Extracting files from ISO...');
    
    // Extract main.dol from tree (system file)
    const sysDir = isoData.tree.root.children.get('sys');
    if (sysDir && sysDir.children.has('main.dol')) {
        const dolNode = sysDir.children.get('main.dol');
        if (dolNode.src && dolNode.src.kind === 'orig') {
            extractedDOL = new Uint8Array(isoData.isoBuf.slice(dolNode.src.offset, dolNode.src.offset + dolNode.src.size));
            console.log(`Extracted DOL file: ${extractedDOL.length} bytes`);
        } else {
            console.warn('DOL file source not available');
            extractedDOL = null;
        }
    } else {
        console.warn('DOL file not found in ISO tree');
        extractedDOL = null;
    }
    
    // Extract all REL files from rel/
    extractedRELFiles = {};
    
    Object.values(REL_FILES).forEach(relName => {
        const relIndex = isoData.parsedNodes.findIndex((node, i) => {
            const path = isoData.pathByIndex.get(i);
            return path === `rel/${relName}.rel` && node.type === 0;
        });
        
        if (relIndex !== -1) {
            extractedRELFiles[relName] = isoData.getFileSlice(relIndex);
            console.log(`Extracted REL file ${relName}: ${extractedRELFiles[relName].length} bytes`);
        } else {
            console.warn(`REL file ${relName}.rel not found in ISO`);
            extractedRELFiles[relName] = null;
        }
    });
    
    console.log(`Extracted ${Object.keys(extractedRELFiles).filter(key => extractedRELFiles[key] !== null).length} REL files`);
}

// Function to patch the extracted DOL file directly
async function patchDOL() {
    if (!extractedDOL) {
        console.warn('No DOL file extracted to patch');
        return;
    }
    
    try {
        // Load US.bin data from data folder
        const response = await fetch('data/US.bin');
        if (!response.ok) {
            console.warn('Could not load US.bin for DOL patching');
            return;
        }
        
        const usBinData = new Uint8Array(await response.arrayBuffer());

        // Apply patches directly to extractedDOL:
        // caller.patcher.dol.data.seek(0x1888)
        // caller.patcher.dol.data.write(pkgutil.get_data(__name__, "data/US.bin"))

        // Verify we have enough space
        if (0x1888 + usBinData.length > extractedDOL.length) {
            console.error(`DOL too small for US.bin patch: need ${0x1888 + usBinData.length}, have ${extractedDOL.length}`);
            return;
        }
        
        extractedDOL.set(usBinData, 0x1888);
        console.log(`Patched DOL at 0x1888 with ${usBinData.length} bytes from US.bin`);

        // caller.patcher.dol.data.seek(0x6CE38)
        // caller.patcher.dol.data.write(int.to_bytes(0x4BF94A50, 4, "big"))
        const patchValue = 0x4BF94A50;
        
        // Verify we have enough space for the 32-bit patch
        if (0x6CE38 + 4 > extractedDOL.length) {
            console.error(`DOL too small for 32-bit patch: need ${0x6CE38 + 4}, have ${extractedDOL.length}`);
            return;
        }
        
        const view = new DataView(extractedDOL.buffer);
        view.setUint32(0x6CE38, patchValue, false); // false = big endian
        console.log(`Patched DOL at 0x6CE38 with value 0x${patchValue.toString(16)}`);
        
        console.log('DOL patching completed successfully');
        
    } catch (error) {
        console.error('Error patching DOL:', error);
    }
}

// Function to replace all REL files and DOL in the ISO with extracted versions
async function replaceExtractedFiles(isoData) {
    console.log('Replacing extracted files in ISO...');
    
    // Import addOrReplace function
    const { addOrReplace } = await import('./gciso.js');
    
    // Replace the DOL file using addOrReplace
    if (extractedDOL) {
        addOrReplace(isoData.tree, "sys/main.dol", extractedDOL);
        console.log(`Replaced DOL file: ${extractedDOL.length} bytes`);
    } else {
        console.warn('No extracted DOL to replace');
    }
    
    // Replace all REL files
    let replacedCount = 0;
    Object.entries(extractedRELFiles).forEach(([relName, relData]) => {
        if (relData) {
            addOrReplace(isoData.tree, `rel/${relName}.rel`, relData);
            console.log(`Replaced REL file ${relName}: ${relData.length} bytes`);
            replacedCount++;
        }
    });
    
    console.log(`Replaced ${replacedCount} REL files and DOL in ISO`);
}

// Function to add REL mod files to the ISO
async function addRelFilesToISO(isoData) {
    // List of all REL files in the data folder
    const relFilepaths = [
        'aaa', 'aji', 'bom', 'dou', 'eki', 'end', 'gon', 'gor', 'gra', 'hei',
        'hom', 'init', 'jin', 'kpa', 'las', 'moo', 'mri', 'muj', 'nok', 'pik',
        'rsh', 'tik', 'tou', 'tou2', 'usu', 'win', 'mod'
    ];
    
    // Filter out "mod" from filepaths (equivalent to Python: [file for file in rel_filepaths if file != "mod"])
    const filteredFiles = relFilepaths.filter(file => file !== "mod");
    
    // Add subrel files to files/mod/subrels/
    for (const file of filteredFiles) {
        try {
            const response = await fetch(`data/${file}.rel`);
            if (response.ok) {
                const fileData = new Uint8Array(await response.arrayBuffer());
                isoData.tree.putFile(`files/mod/subrels/${file}.rel`, fileData);
                console.log(`Added ${file}.rel to files/mod/subrels/`);
            } else {
                console.warn(`Could not load ${file}.rel`);
            }
        } catch (error) {
            console.error(`Error loading ${file}.rel:`, error);
        }
    }
    
    // Add main mod.rel file to files/mod/
    try {
        const response = await fetch(`data/mod.rel`);
        if (response.ok) {
            const modFileData = new Uint8Array(await response.arrayBuffer());
            isoData.tree.putFile(`files/mod/mod.rel`, modFileData);
            console.log('Added mod.rel to files/mod/');
        } else {
            console.warn('Could not load mod.rel');
        }
    } catch (error) {
        console.error('Error loading mod.rel:', error);
    }
}

// Main function for generating randomized ROM
async function generateRandomizedROM() {
    if (!selectedROMFile) {
        console.error('No ROM file selected');
        return;
    }
    
    try {
        console.log('Starting ROM generation...');
        
        // Read the ROM file
        const romBuffer = await selectedROMFile.arrayBuffer();
        console.log(`ROM loaded: ${romBuffer.byteLength} bytes`);
        
        // Import and use gciso.js to parse the ROM
        const { parseISO, rebuildISO } = await import('./gciso.js');
        const isoData = parseISO(romBuffer);
        
        console.log('ROM parsed successfully with gciso.js');
        console.log(`Found ${isoData.parsedNodes.length} files in ROM`);
        
        // Extract files from the ISO
        extractFilesFromISO(isoData);
        
        // Patch the extracted DOL file
        console.log('Patching DOL file...');
        await patchDOL();
        
        // Add REL mod files to the ISO
        console.log('Adding REL mod files...');
        await addRelFilesToISO(isoData);
        
        // Replace all extracted files in the ISO (this puts our modified DOL and any randomized RELs back)
        console.log('Replacing extracted files in ISO...');
        await replaceExtractedFiles(isoData);
        
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
        
        console.log('Download started!');
        
    } catch (error) {
        console.error('Error generating randomized ROM:', error);
    }
}

// Load user presets when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadUserPresets();
    
    // Set up ROM file input handler
    const romInput = document.getElementById('romFileInput');
    if (romInput) {
        romInput.addEventListener('change', handleROMSelection);
    }
});