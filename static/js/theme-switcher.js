// ==================== THEME SWITCHER ====================
// Handles theme switching and persistence

// Available themes with critical CSS for flash prevention
const THEMES = {
    default: {
        name: 'Default',
        character: 'Mario',
        description: 'Classic TTYD colors'
    },
    goombella: {
        name: 'Goombella',
        character: 'Goombella',
        description: 'Pink and coral with blonde accents',
        criticalCSS: `
            html, body { background: linear-gradient(135deg, #FFE5E0 0%, #FFD4C8 50%, #FFF5DC 100%) !important; margin: 0; padding: 0; }
            .header { background: linear-gradient(180deg, #FF9BB0 0%, #FF8BA0 50%, #FF7A95 100%) !important; border-bottom: 3px solid #FFD4A3 !important; box-shadow: 0 2px 8px rgba(255, 212, 163, 0.4) !important; }
            .pages-link { background: linear-gradient(135deg, #FF8BA0 0%, #FF7A95 100%) !important; border: 2px solid #FFD4A3 !important; color: #FFF !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important; }
            .info-panel, .generate-panel { background-color: rgba(255, 155, 176, 0.85) !important; border: 3px solid #FFD4A3 !important; }
            .preset-section { background-color: rgba(255, 212, 200, 0.6) !important; border: 2px solid #FFD4A3 !important; }
            .preset-button, .info-link { background: linear-gradient(135deg, #FF8BA0 0%, #FF7A95 100%) !important; border: 2px solid #FFD4A3 !important; color: #FFF !important; }
            .page-wrapper { background-color: rgba(255, 229, 224, 0.15) !important; }
            .footer { background: linear-gradient(180deg, rgba(255, 139, 160, 0.9) 0%, rgba(255, 155, 176, 0.95) 100%) !important; border-top: 2px solid #FFD4A3 !important; }
            .footer-link { background-color: #FF8BA0 !important; color: #FFF !important; border: 2px solid #FFD4A3 !important; }
            .settings-string-input, .dropdown-select, .number-input, .text-input, .preset-dropdown { background-color: rgba(255, 255, 255, 0.95) !important; border: 2px solid #FF8BA0 !important; color: #5D3A3A !important; }
            .panel-tab { background-color: rgba(255, 212, 200, 0.6) !important; border: 2px solid #FF8BA0 !important; color: #5D3A3A !important; }
            .panel-tab.active { background-color: #FFBD6E !important; border-color: #FFA347 !important; color: #FFF !important; }
        `
    },
    yoshi: {
        name: 'Yoshi',
        character: 'Yoshi',
        description: 'Fresh green with orange accents',
        criticalCSS: `
            html, body { background: linear-gradient(135deg, #D4F1C5 0%, #B8E994 50%, #FFE8D8 100%) !important; margin: 0; padding: 0; }
            .header { background: linear-gradient(180deg, #8FDB5C 0%, #7FD14C 50%, #6BC13D 100%) !important; border-bottom: 3px solid #FF8C42 !important; box-shadow: 0 2px 8px rgba(255, 140, 66, 0.3) !important; }
            .pages-link { background: linear-gradient(135deg, #7FD14C 0%, #6BC13D 100%) !important; border: 2px solid #FF8C42 !important; color: #FFF !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important; }
            .info-panel, .generate-panel { background-color: rgba(143, 219, 92, 0.85) !important; border: 3px solid #FF8C42 !important; }
            .preset-section { background-color: rgba(184, 233, 148, 0.6) !important; border: 2px solid #FFB374 !important; }
            .preset-button, .info-link { background: linear-gradient(135deg, #7FD14C 0%, #6BC13D 100%) !important; border: 2px solid #FF8C42 !important; color: #FFF !important; }
            .page-wrapper { background-color: rgba(139, 195, 74, 0.1) !important; }
            .footer { background: linear-gradient(180deg, rgba(127, 209, 76, 0.9) 0%, rgba(143, 219, 92, 0.95) 100%) !important; border-top: 2px solid #FF8C42 !important; }
            .footer-link { background-color: #7FD14C !important; color: #FFF !important; border: 2px solid #FF8C42 !important; }
            .settings-string-input, .dropdown-select, .number-input, .text-input, .preset-dropdown { background-color: rgba(255, 255, 255, 0.95) !important; border: 2px solid #7FD14C !important; color: #2B5A1E !important; }
            .panel-tab { background-color: rgba(184, 233, 148, 0.6) !important; border: 2px solid #7FD14C !important; color: #2B5A1E !important; }
            .panel-tab.active { background-color: #FF8C42 !important; border-color: #E84A3F !important; color: #FFF !important; }
        `
    },
    vivian: {
        name: 'Vivian',
        character: 'Vivian',
        description: 'Shadow Siren purple and pink',
        criticalCSS: `
            html, body { background: linear-gradient(135deg, #1A0F1F 0%, #2D1B3D 50%, #1A0F1F 100%) !important; margin: 0; padding: 0; }
            .header { background: linear-gradient(180deg, #9D6BB3 0%, #8B5A9F 50%, #6B4C7A 100%) !important; border-bottom: 3px solid #D97FB8 !important; box-shadow: 0 2px 8px rgba(217, 127, 184, 0.3) !important; }
            .pages-link { background: linear-gradient(135deg, #8B5A9F 0%, #7A4F8E 100%) !important; border: 2px solid #D97FB8 !important; color: #E8D5F0 !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important; }
            .info-panel, .generate-panel { background-color: rgba(139, 90, 159, 0.85) !important; border: 3px solid #D97FB8 !important; }
            .preset-section { background-color: rgba(107, 76, 122, 0.6) !important; border: 2px solid #D97FB8 !important; }
            .preset-button, .info-link { background: linear-gradient(135deg, #8B5A9F 0%, #6B4C7A 100%) !important; border: 2px solid #D97FB8 !important; color: #FFF !important; }
            .page-wrapper { background-color: rgba(107, 76, 122, 0.15) !important; }
            .footer { background: linear-gradient(180deg, rgba(107, 76, 122, 0.9) 0%, rgba(139, 90, 159, 0.95) 100%) !important; border-top: 2px solid #D97FB8 !important; }
            .footer-link { background-color: #8B5A9F !important; color: #E8D5F0 !important; border: 2px solid #D97FB8 !important; }
            .settings-string-input, .dropdown-select, .number-input, .text-input, .preset-dropdown { background-color: rgba(26, 15, 31, 0.8) !important; border: 2px solid #8B5A9F !important; color: #E8D5F0 !important; }
            .panel-tab { background-color: rgba(107, 76, 122, 0.6) !important; border: 2px solid #8B5A9F !important; color: #E8D5F0 !important; }
            .panel-tab.active { background-color: #8B5A9F !important; border-color: #F0A8D8 !important; color: #FFF !important; }
        `
    },
    msmowz: {
        name: 'Ms. Mowz',
        character: 'Ms. Mowz',
        description: 'Bright white and red',
        criticalCSS: `
            html, body { background: linear-gradient(135deg, #FFFFFF 0%, #FFF5F5 50%, #FFEBEE 100%) !important; margin: 0; padding: 0; }
            .header { background: linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 50%, #EEEEEE 100%) !important; border-bottom: 3px solid #E53935 !important; box-shadow: 0 2px 8px rgba(229, 57, 53, 0.3) !important; }
            .pages-link { background: linear-gradient(135deg, #E53935 0%, #C62828 100%) !important; border: 2px solid #FFFFFF !important; color: #FFF !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important; }
            .info-panel, .generate-panel { background-color: rgba(255, 255, 255, 0.95) !important; border: 3px solid #E53935 !important; }
            .preset-section { background-color: rgba(255, 235, 238, 0.8) !important; border: 2px solid #E53935 !important; }
            .preset-button, .info-link { background: linear-gradient(135deg, #E53935 0%, #C62828 100%) !important; border: 2px solid #FFFFFF !important; color: #FFF !important; }
            .page-wrapper { background-color: rgba(255, 255, 255, 0.3) !important; }
            .footer { background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 245, 245, 0.98) 100%) !important; border-top: 2px solid #E53935 !important; }
            .footer-link { background-color: #E53935 !important; color: #FFF !important; border: 2px solid #FFFFFF !important; }
            .settings-string-input, .dropdown-select, .number-input, .text-input, .preset-dropdown { background-color: #FFFFFF !important; border: 2px solid #E53935 !important; color: #2C2C2C !important; }
            .panel-tab { background-color: rgba(255, 235, 238, 0.8) !important; border: 2px solid #E53935 !important; color: #2C2C2C !important; }
            .panel-tab.active { background-color: #E53935 !important; border-color: #C62828 !important; color: #FFF !important; }
        `
    },
    rawkhawk: {
        name: 'Rawk Hawk',
        character: 'Rawk Hawk',
        description: 'Champion gold and red',
        criticalCSS: `
            html, body { background: linear-gradient(135deg, #FFE87C 0%, #FFD700 50%, #FFAA00 100%) !important; margin: 0; padding: 0; }
            .header { background: linear-gradient(180deg, #FFD700 0%, #FFC700 50%, #FFB700 100%) !important; border-bottom: 3px solid #FF4500 !important; box-shadow: 0 2px 8px rgba(255, 69, 0, 0.4) !important; }
            .pages-link { background: linear-gradient(135deg, #FF4500 0%, #FF6347 100%) !important; border: 2px solid #FFD700 !important; color: #FFF !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important; }
            .info-panel, .generate-panel { background-color: rgba(255, 215, 0, 0.9) !important; border: 3px solid #FF4500 !important; }
            .preset-section { background-color: rgba(255, 200, 100, 0.7) !important; border: 2px solid #FF6347 !important; }
            .preset-button, .info-link { background: linear-gradient(135deg, #FF4500 0%, #FF6347 100%) !important; border: 2px solid #FFD700 !important; color: #FFF !important; }
            .page-wrapper { background-color: rgba(255, 232, 124, 0.2) !important; }
            .footer { background: linear-gradient(180deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 200, 100, 0.98) 100%) !important; border-top: 2px solid #FF4500 !important; }
            .footer-link { background-color: #FF4500 !important; color: #FFF !important; border: 2px solid #FFD700 !important; }
            .settings-string-input, .dropdown-select, .number-input, .text-input, .preset-dropdown { background-color: #FFFAF0 !important; border: 2px solid #FF4500 !important; color: #2C1810 !important; }
            .panel-tab { background-color: rgba(255, 200, 100, 0.7) !important; border: 2px solid #FF4500 !important; color: #2C1810 !important; }
            .panel-tab.active { background-color: #FF4500 !important; border-color: #FFD700 !important; color: #FFF !important; }
        `
    },
    doopliss: {
        name: 'Doopliss',
        character: 'Doopliss',
        description: 'Darker white with blue accents',
        criticalCSS: `
            html, body { background: linear-gradient(135deg, #D0D0D0 0%, #E8E8E8 50%, #C0C0C0 100%) !important; margin: 0; padding: 0; }
            .header { background: linear-gradient(180deg, #5C7CBA 0%, #4A6FA5 50%, #3A5A8A 100%) !important; border-bottom: 3px solid #3A5A8A !important; box-shadow: 0 2px 8px rgba(92, 124, 186, 0.3) !important; }
            .pages-link { background: linear-gradient(135deg, #D0D0D0 0%, #C0C0C0 100%) !important; border: 2px solid #A8A8A8 !important; color: #2C2C2C !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; }
            .info-panel, .generate-panel { background-color: #FFFFFF !important; border: 3px solid #5C7CBA !important; }
            .preset-section { background-color: #E8E8E8 !important; border: 2px solid #C0C0C0 !important; }
            .preset-button, .info-link { background: linear-gradient(135deg, #5C7CBA 0%, #4A6FA5 100%) !important; border: 2px solid #3A5A8A !important; color: #FFF !important; }
            .page-wrapper { background-color: transparent !important; }
            .footer { background: linear-gradient(180deg, rgba(92, 124, 186, 0.95) 0%, rgba(74, 111, 165, 0.98) 100%) !important; border-top: 2px solid #3A5A8A !important; }
            .footer-link { background-color: #D0D0D0 !important; color: #2C2C2C !important; border: 2px solid #A8A8A8 !important; }
            .settings-string-input, .dropdown-select, .number-input, .text-input, .preset-dropdown { background-color: #F8F8F8 !important; border: 2px solid #C0C0C0 !important; color: #2C2C2C !important; }
            .panel-tab { background-color: rgba(208, 208, 208, 0.8) !important; border: 2px solid #A8A8A8 !important; color: #2C2C2C !important; }
            .panel-tab.active { background-color: #5C7CBA !important; border-color: #3A5A8A !important; color: #FFF !important; }
        `
    }
};

/**
 * Get the current theme from localStorage or default
 */
function getCurrentTheme() {
    return localStorage.getItem('ttyd_theme') || 'default';
}

/**
 * Apply a theme to the page
 * @param {string} themeName - The theme to apply (e.g., 'vivian', 'default')
 */
function applyTheme(themeName) {
    const body = document.body;

    // Remove all theme attributes
    body.removeAttribute('data-theme');

    // Apply new theme if not default
    if (themeName !== 'default') {
        body.setAttribute('data-theme', themeName);
    }

    // Save to localStorage
    localStorage.setItem('ttyd_theme', themeName);

    // Update active state in theme selector if it exists
    updateThemeSelector(themeName);
}

/**
 * Update the theme selector UI to show active theme
 * @param {string} themeName - The active theme
 */
function updateThemeSelector(themeName) {
    const selector = document.getElementById('themeSelector');
    if (!selector) return;

    // Update all theme buttons
    const buttons = selector.querySelectorAll('.theme-option');
    buttons.forEach(button => {
        const buttonTheme = button.getAttribute('data-theme');
        if (buttonTheme === themeName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

/**
 * Initialize theme system on page load
 */
function initThemeSystem() {
    // Apply saved theme
    const currentTheme = getCurrentTheme();
    applyTheme(currentTheme);

    // Remove critical CSS now that full CSS is loaded
    const criticalCSS = document.getElementById('critical-theme-css');
    if (criticalCSS) {
        criticalCSS.remove();
    }

    console.log(`Theme system initialized. Current theme: ${currentTheme}`);
}

/**
 * Create theme selector UI
 * @returns {HTMLElement} The theme selector element
 */
function createThemeSelector() {
    const selector = document.createElement('div');
    selector.id = 'themeSelector';
    selector.className = 'theme-selector';

    // Create header
    const header = document.createElement('div');
    header.className = 'theme-selector-header';
    header.innerHTML = '<span class="theme-icon">🎨</span><span class="theme-label"> Themes</span>';
    header.onclick = () => toggleThemeSelector();
    selector.appendChild(header);

    // Create options container
    const options = document.createElement('div');
    options.className = 'theme-selector-options';

    // Add theme options
    Object.entries(THEMES).forEach(([themeKey, themeData]) => {
        const option = document.createElement('button');
        option.className = 'theme-option';
        option.setAttribute('data-theme', themeKey);
        option.innerHTML = `
            <span class="theme-name">${themeData.name}</span>
            <span class="theme-description">${themeData.description}</span>
        `;
        option.onclick = () => {
            applyTheme(themeKey);
            // Close selector after selection
            selector.classList.remove('expanded');
        };
        options.appendChild(option);
    });

    selector.appendChild(options);

    return selector;
}

/**
 * Toggle theme selector dropdown
 */
function toggleThemeSelector() {
    const selector = document.getElementById('themeSelector');
    if (selector) {
        selector.classList.toggle('expanded');
    }
}

/**
 * Add theme selector to page
 */
function addThemeSelectorToPage() {
    // Check if selector already exists
    if (document.getElementById('themeSelector')) {
        return;
    }

    const selector = createThemeSelector();
    document.body.appendChild(selector);

    // Update active state
    const currentTheme = getCurrentTheme();
    updateThemeSelector(currentTheme);
}

// Apply theme IMMEDIATELY to prevent flicker (before DOM is ready)
(function() {
    const savedTheme = localStorage.getItem('ttyd_theme') || 'default';

    // Inject critical theme CSS immediately to prevent flash
    if (savedTheme !== 'default' && THEMES[savedTheme] && THEMES[savedTheme].criticalCSS) {
        const style = document.createElement('style');
        style.id = 'critical-theme-css';
        style.textContent = THEMES[savedTheme].criticalCSS;
        document.head.appendChild(style);
    }

    if (savedTheme !== 'default') {
        document.documentElement.setAttribute('data-theme', savedTheme);
        // Also set on body for immediate effect
        if (document.body) {
            document.body.setAttribute('data-theme', savedTheme);
        }
    }
})();

// Auto-initialize theme system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initThemeSystem();
        addThemeSelectorToPage();
    });
} else {
    initThemeSystem();
    addThemeSelectorToPage();
}

// Close theme selector when clicking outside
document.addEventListener('click', (e) => {
    const selector = document.getElementById('themeSelector');
    if (selector && !selector.contains(e.target)) {
        selector.classList.remove('expanded');
    }
});
