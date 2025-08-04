let patcher = null;
let originalFileName = '';

// File upload handling
document.getElementById('romFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const fileStatus = document.getElementById('fileStatus');
    const optionsSection = document.getElementById('optionsSection');
    const patchButton = document.getElementById('patchButton');

    if (!file) {
        fileStatus.textContent = 'No file selected';
        optionsSection.style.display = 'none';
        patchButton.style.display = 'none';
        return;
    }

    originalFileName = file.name;
    fileStatus.textContent = `Loading ${file.name}...`;

    try {
        const arrayBuffer = await file.arrayBuffer();

        // Verify it's a TTYD ISO (basic check)
        const view = new DataView(arrayBuffer, 0, 6);
        const gameId = new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, 6));

        if (gameId !== 'G8ME01') {
            throw new Error('This does not appear to be a TTYD (US) ISO. Expected game ID: G8ME01, found: ' + gameId);
        }

        // Initialize patcher
        patcher = new TTYDPatcher(arrayBuffer);

        fileStatus.textContent = `✓ Loaded ${file.name} successfully`;
        fileStatus.style.color = '#27ae60';
        optionsSection.style.display = 'block';
        patchButton.style.display = 'block';

        showStatus('ISO loaded successfully! Configure your options below.', 'success');

    } catch (error) {
        console.error('Error loading ISO:', error);
        fileStatus.textContent = `✗ Error loading ${file.name}`;
        fileStatus.style.color = '#e74c3c';
        showStatus('Error loading ISO: ' + error.message, 'error');
        optionsSection.style.display = 'none';
        patchButton.style.display = 'none';
    }
});

// Patch button handling
document.getElementById('patchButton').addEventListener('click', async () => {
    if (!patcher) {
        showStatus('No ISO loaded!', 'error');
        return;
    }

    const button = document.getElementById('patchButton');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');

    button.disabled = true;
    button.textContent = 'Patching...';
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';

    try {
        // Collect options from form
        const options = {
            player_name: document.getElementById('playerName').value || 'Mario',
            yoshi_name: document.getElementById('yoshiName').value || 'Yoshi',
            yoshi_color: parseInt(document.getElementById('yoshiColor').value) || 0,
            starting_hp: parseInt(document.getElementById('startingHp').value) || 10,
            starting_fp: parseInt(document.getElementById('startingFp').value) || 5,
            starting_bp: parseInt(document.getElementById('startingBp').value) || 3,
            starting_coins: parseInt(document.getElementById('startingCoins').value) || 0,
            palace_skip: document.getElementById('palaceSkip').checked,
            westside: document.getElementById('openWestside').checked,
            peekaboo: document.getElementById('permanentPeekaboo').checked,
            fast_travel: document.getElementById('fastTravel').checked,
            tattlesanity: document.getElementById('tattlesanity').checked,
            intermissions: document.getElementById('disableIntermissions').checked,
            full_run_bar: document.getElementById('fullRunBar').checked,
            seed: 'WebPatch_' + Date.now(),
            chapter_clears: 0,
            starting_partner: 0,
            required_chapters: []
        };

        showStatus('Applying patches...', 'info');
        progressFill.style.width = '25%';

        // Apply patches
        patcher.patchOptions(options);
        progressFill.style.width = '50%';

        showStatus('Exporting patched ISO...', 'info');
        progressFill.style.width = '75%';

        // Export patched ISO (simplified - in reality this would be much more complex)
        const patchedData = patcher.exportPatchedISO();
        progressFill.style.width = '100%';

        // Create download
        const blob = new Blob([patchedData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalFileName.replace('.iso', '_patched.iso');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showStatus('✓ Patched ISO generated successfully!', 'success');

    } catch (error) {
        console.error('Patching error:', error);
        showStatus('Error during patching: ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Generate Patched ISO';
        setTimeout(() => {
            progressBar.style.display = 'none';
        }, 2000);
    }
});

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }
}