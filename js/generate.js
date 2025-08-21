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

// Load user presets when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadUserPresets();
});