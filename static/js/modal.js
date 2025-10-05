// ==================== SHARED MODAL SYSTEM ====================
// This file contains modal dialog functionality shared across all pages

/**
 * Show a modal dialog with custom title, message, and buttons
 * @param {string} title - The modal title
 * @param {string} message - The modal message
 * @param {Array} buttons - Array of button objects with {text, action} properties
 */
function showModal(title, message, buttons = [{ text: 'OK', action: () => hideModal() }]) {
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalButtons = document.getElementById('modalButtons');
    const modalOverlay = document.getElementById('modalOverlay');

    if (!modalTitle || !modalMessage || !modalButtons || !modalOverlay) {
        console.error('Modal elements not found in DOM');
        // Fallback to alert if modal not available
        alert(`${title}\n\n${message}`);
        return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalButtons.innerHTML = '';

    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.textContent = button.text;
        btn.className = 'modal-button';
        btn.onclick = button.action;
        modalButtons.appendChild(btn);
    });

    // First set display to flex, then trigger fade-in animation
    modalOverlay.style.display = 'flex';

    // Use requestAnimationFrame to ensure the display change is applied before adding 'show' class
    // This allows the CSS transition to work properly
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            modalOverlay.classList.add('show');
        });
    });
}

/**
 * Hide the modal dialog
 */
function hideModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        // Remove 'show' class to trigger fade-out animation
        modalOverlay.classList.remove('show');

        // After animation completes, set display to none
        setTimeout(() => {
            modalOverlay.style.display = 'none';
        }, 300); // Match the CSS transition duration
    }

    // Hide input field when closing modal
    const modalInput = document.getElementById('modalInput');
    if (modalInput) {
        modalInput.style.display = 'none';
    }
}

/**
 * Initialize modal system (call this on page load)
 */
function initModalSystem() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        // Close modal when clicking overlay
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal();
            }
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalSystem);
} else {
    initModalSystem();
}
