// Spoiler file generator for TTYD Randomizer
class SpoilerGenerator {
    constructor() {
        this.spoilerData = {
            seed: '',
            timestamp: '',
            version: '1.0.0',
            settingsString: '',
            settings: {},
            statistics: {},
            locationItemPairs: [],
            itemSpheres: [],
            progressionLog: []
        };
    }

    /**
     * Initializes spoiler data with basic information
     * @param {string} seed - The randomizer seed
     * @param {Object} settings - Settings object from UI
     * @param {string} settingsString - Base64 encoded settings string
     */
    initialize(seed, settings, settingsString) {
        this.spoilerData.seed = seed;
        this.spoilerData.timestamp = new Date().toISOString();
        this.spoilerData.settingsString = settingsString;
        this.spoilerData.settings = { ...settings };
        this.spoilerData.locationItemPairs = [];
        this.spoilerData.itemSpheres = [];
        this.spoilerData.progressionLog = [];
    }

    /**
     * Adds a location-item pair to the spoiler
     * @param {Location} location - The location object
     * @param {string} itemName - Name of the item placed
     * @param {number} itemId - ID of the item placed
     * @param {string} sphere - Which sphere this item was placed in
     */
    addLocationItemPair(location, itemName, itemId, sphere = 'unknown') {
        this.spoilerData.locationItemPairs.push({
            locationName: location.name,
            locationId: location.id,
            relFile: location.rel,
            itemName: itemName,
            itemId: itemId,
            sphere: sphere,
            vanillaItem: location.vanillaItem,
            offsets: location.offsets
        });
    }

    /**
     * Adds an item sphere to the spoiler
     * @param {number} sphereNumber - The sphere number
     * @param {Array<Object>} items - Array of items in this sphere
     * @param {Object} gameState - Game state when this sphere was accessible
     */
    addItemSphere(sphereNumber, items, gameState) {
        this.spoilerData.itemSpheres.push({
            sphere: sphereNumber,
            itemCount: items.length,
            items: items.map(item => ({
                itemName: item.itemName,
                locationName: item.location.name
            })),
            gameStateSnapshot: {
                totalItems: gameState.getAllItems().size,
                keyItems: this._getKeyItemsFromState(gameState)
            }
        });
    }

    /**
     * Adds a progression log entry
     * @param {string} action - Description of the action
     * @param {string} itemName - Item involved
     * @param {string} locationName - Location involved
     * @param {Object} gameState - Current game state
     */
    addProgressionLog(action, itemName = '', locationName = '', gameState = null) {
        const entry = {
            timestamp: Date.now(),
            action: action,
            itemName: itemName,
            locationName: locationName
        };

        if (gameState) {
            entry.gameState = {
                itemCount: gameState.getAllItems().size
            };
        }

        this.spoilerData.progressionLog.push(entry);
    }

    /**
     * Sets final statistics for the spoiler
     * @param {Object} stats - Statistics object
     */
    setStatistics(stats) {
        this.spoilerData.statistics = {
            totalLocations: stats.totalLocations || 0,
            accessibleLocations: stats.accessibleCount || 0,
            itemsPlaced: stats.filledCount || 0,
            accessibilityChecks: stats.accessibilityChecks || 0,
            sphereCount: this.spoilerData.itemSpheres.length,
            placementAttempts: stats.placementAttempts || 0,
            generationTime: stats.generationTime || 0
        };
    }

    /**
     * Generates the spoiler file content
     * @param {string} format - Format to generate ('json', 'txt', 'html')
     * @returns {string} Spoiler file content
     */
    generateSpoilerContent(format = 'txt') {
        switch (format.toLowerCase()) {
            case 'json':
                return this._generateJSONSpoiler();
            case 'html':
                return this._generateHTMLSpoiler();
            case 'txt':
            default:
                return this._generateTextSpoiler();
        }
    }

    /**
     * Downloads the spoiler file
     * @param {string} filename - Name of the file
     * @param {string} format - Format of the file
     */
    downloadSpoiler(filename = null, format = 'txt') {
        if (!filename) {
            filename = `ttyd_spoiler_${this.spoilerData.seed}_${Date.now()}.${format}`;
        }

        const content = this.generateSpoilerContent(format);
        const mimeType = format === 'json' ? 'application/json' : 
                        format === 'html' ? 'text/html' : 'text/plain';
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Generates text format spoiler
     * @returns {string} Text spoiler content
     * @private
     */
    _generateTextSpoiler() {
        const lines = [];
        
        // Header
        lines.push('===============================================');
        lines.push('    TTYD Randomizer - Spoiler Log');
        lines.push('===============================================');
        lines.push('');
        
        // Basic Info
        lines.push(`Seed: ${this.spoilerData.seed}`);
        lines.push(`Generated: ${this.spoilerData.timestamp}`);
        lines.push(`Version: ${this.spoilerData.version}`);
        lines.push('');
        
        // Settings
        lines.push('SETTINGS:');
        lines.push('---------');
        Object.entries(this.spoilerData.settings).forEach(([key, value]) => {
            lines.push(`  ${key}: ${value}`);
        });
        lines.push('');
        lines.push(`Settings String: ${this.spoilerData.settingsString}`);
        lines.push('');
        
        // Statistics
        if (this.spoilerData.statistics) {
            lines.push('STATISTICS:');
            lines.push('-----------');
            Object.entries(this.spoilerData.statistics).forEach(([key, value]) => {
                lines.push(`  ${key}: ${value}`);
            });
            lines.push('');
        }
        
        // Item Spheres
        if (this.spoilerData.itemSpheres.length > 0) {
            lines.push('ITEM SPHERES:');
            lines.push('-------------');
            this.spoilerData.itemSpheres.forEach(sphere => {
                lines.push(`\nSphere ${sphere.sphere} (${sphere.itemCount} items):`);
                sphere.items.forEach(item => {
                    lines.push(`  ${item.itemName} @ ${item.locationName}`);
                });
                lines.push(`  Game State: ${sphere.gameStateSnapshot.totalItems} items`);
            });
            lines.push('');
        }
        
        // Location-Item Pairs
        lines.push('LOCATION-ITEM PAIRS:');
        lines.push('--------------------');
        
        // Sort by location name
        const sortedPairs = this.spoilerData.locationItemPairs.sort((a, b) => a.locationName.localeCompare(b.locationName));
        
        sortedPairs.forEach(pair => {
            const sphereInfo = pair.sphere !== 'unknown' ? ` [Sphere ${pair.sphere}]` : '';
            lines.push(`  ${pair.locationName}: ${pair.itemName}${sphereInfo}`);
        });
        
        // Progression Log
        if (this.spoilerData.progressionLog.length > 0) {
            lines.push('\n\nPROGRESSION LOG:');
            lines.push('----------------');
            this.spoilerData.progressionLog.forEach((entry, index) => {
                const time = new Date(entry.timestamp).toLocaleTimeString();
                lines.push(`${index + 1}. [${time}] ${entry.action}`);
                if (entry.itemName || entry.locationName) {
                    lines.push(`   Item: ${entry.itemName} @ ${entry.locationName}`);
                }
            });
        }
        
        return lines.join('\n');
    }

    /**
     * Generates JSON format spoiler
     * @returns {string} JSON spoiler content
     * @private
     */
    _generateJSONSpoiler() {
        return JSON.stringify(this.spoilerData, null, 2);
    }

    /**
     * Generates HTML format spoiler
     * @returns {string} HTML spoiler content
     * @private
     */
    _generateHTMLSpoiler() {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TTYD Randomizer Spoiler - ${this.spoilerData.seed}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .info-box { background: #ecf0f1; padding: 15px; border-radius: 5px; }
        .info-box h3 { margin-top: 0; color: #2c3e50; }
        .location-item { margin-bottom: 5px; padding: 5px; background: #f8f9fa; border-left: 3px solid #3498db; }
        .region-group { margin-bottom: 20px; }
        .region-title { font-weight: bold; color: #2c3e50; font-size: 1.1em; margin-bottom: 10px; }
        .sphere { background: #e8f5e8; padding: 10px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #27ae60; }
        .progression-entry { background: #fff3cd; padding: 8px; margin: 5px 0; border-radius: 3px; border-left: 3px solid #ffc107; }
        .stats-table { width: 100%; border-collapse: collapse; }
        .stats-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .stats-table td:first-child { font-weight: bold; width: 30%; }
    </style>
</head>
<body>
    <div class="container">
        <h1>TTYD Randomizer - Spoiler Log</h1>
        
        <div class="info-grid">
            <div class="info-box">
                <h3>Basic Information</h3>
                <table class="stats-table">
                    <tr><td>Seed:</td><td>${this.spoilerData.seed}</td></tr>
                    <tr><td>Generated:</td><td>${new Date(this.spoilerData.timestamp).toLocaleString()}</td></tr>
                    <tr><td>Version:</td><td>${this.spoilerData.version}</td></tr>
                </table>
            </div>
            
            <div class="info-box">
                <h3>Statistics</h3>
                <table class="stats-table">
                    ${Object.entries(this.spoilerData.statistics).map(([key, value]) => 
                        `<tr><td>${key}:</td><td>${value}</td></tr>`
                    ).join('')}
                </table>
            </div>
        </div>

        <div class="info-box">
            <h3>Settings</h3>
            <p><strong>Settings String:</strong> <code>${this.spoilerData.settingsString}</code></p>
            <table class="stats-table">
                ${Object.entries(this.spoilerData.settings).map(([key, value]) => 
                    `<tr><td>${key}:</td><td>${value}</td></tr>`
                ).join('')}
            </table>
        </div>

        ${this.spoilerData.itemSpheres.length > 0 ? `
        <h2>Item Spheres</h2>
        ${this.spoilerData.itemSpheres.map(sphere => `
            <div class="sphere">
                <h3>Sphere ${sphere.sphere} (${sphere.itemCount} items)</h3>
                ${sphere.items.map(item => `
                    <div class="location-item">
                        <strong>${item.itemName}</strong> @ ${item.locationName}
                    </div>
                `).join('')}
                <p><small>Game State: ${sphere.gameStateSnapshot.totalItems} items</small></p>
            </div>
        `).join('')}
        ` : ''}

        <h2>Location-Item Pairs</h2>
        <div class="region-group">
            ${this.spoilerData.locationItemPairs.sort((a, b) => a.locationName.localeCompare(b.locationName)).map(pair => `
                <div class="location-item">
                    <strong>${pair.locationName}:</strong> ${pair.itemName}
                    ${pair.sphere !== 'unknown' ? `<em>[Sphere ${pair.sphere}]</em>` : ''}
                </div>
            `).join('')}
        </div>

        ${this.spoilerData.progressionLog.length > 0 ? `
        <h2>Progression Log</h2>
        ${this.spoilerData.progressionLog.map((entry, index) => `
            <div class="progression-entry">
                <strong>${index + 1}.</strong> ${entry.action}
                ${entry.itemName || entry.locationName ? `<br><small>${entry.itemName} @ ${entry.locationName}</small>` : ''}
            </div>
        `).join('')}
        ` : ''}
    </div>
</body>
</html>`;
        return html;
    }


    /**
     * Extracts key items from game state
     * @param {GameState} gameState - Current game state
     * @returns {Array<string>} Array of key item names
     * @private
     */
    _getKeyItemsFromState(gameState) {
        const keyItems = [
            'Progressive Hammer', 'Progressive Boots', 'Paper Curse', 'Plane Curse', 
            'Tube Curse', 'Boat Curse', 'Goombella', 'Koops', 'Flurrie', 'Yoshi', 
            'Vivian', 'Bobbery', 'Sun Stone', 'Moon Stone', 'Necklace', 
            'Blimp Ticket', 'Train Ticket'
        ];
        
        return keyItems.filter(item => gameState.has(item));
    }

    /**
     * Calculates item spheres based on accessibility progression
     * @param {Array<Location>} locations - All locations
     * @param {Object} regionLogic - Region logic map
     * @returns {Array<Object>} Array of sphere data
     */
    static calculateItemSpheres(locations, regionLogic) {
        const spheres = [];
        const gameState = GameState.createStartingState();
        const placedItems = locations.filter(loc => loc.hasPlacedItem());
        const processedLocations = new Set();
        
        let sphereNumber = 1;
        
        while (processedLocations.size < placedItems.length) {
            const sphereItems = [];
            
            // Find all currently accessible locations with placed items
            placedItems.forEach(location => {
                if (!processedLocations.has(location.id) && 
                    location.isAccessible(gameState, regionLogic)) {
                    
                    sphereItems.push({
                        location: location,
                        itemName: this._getItemNameById(location.placed_item)
                    });
                    processedLocations.add(location.id);
                }
            });
            
            if (sphereItems.length === 0) {
                break; // No more accessible items
            }
            
            spheres.push({
                sphere: sphereNumber,
                items: sphereItems,
                gameState: gameState.clone()
            });
            
            // Add sphere items to game state
            sphereItems.forEach(item => {
                const itemName = item.itemName;
                if (itemName) {
                    gameState.addItem(itemName, 1);
                }
            });
            
            // Update accessible regions
            this._updateAccessibleRegions(gameState, regionLogic);
            
            sphereNumber++;
        }
        
        return spheres;
    }

    /**
     * Gets item name by ID (helper function)
     * @param {number} itemId - Item ID
     * @returns {string} Item name
     * @private
     */
    static _getItemNameById(itemId) {
        if (typeof allItems !== 'undefined' && allItems) {
            const item = allItems.find(i => i.id === itemId);
            return item ? item.name : `Unknown Item (${itemId})`;
        }
        return `Item ${itemId}`;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpoilerGenerator };
} else if (typeof window !== 'undefined') {
    window.SpoilerGenerator = SpoilerGenerator;
}