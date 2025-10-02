/**
 * Debug logger for detailed randomizer debugging
 * Logs item placement, sphere sweeping, and location accessibility
 */
class DebugLogger {
    constructor() {
        this.logs = [];
        this.sessionId = Date.now();
        this.enabled = true;
    }
    
    log(category, message, data = {}) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            category,
            message,
            data,
            sessionId: this.sessionId
        };
        
        this.logs.push(logEntry);
        
        // Also log to console with formatting
        const prefix = `[${category.toUpperCase()}]`;
        console.log(`${prefix} ${message}`, data);
    }
    
    logItemPlacement(itemName, accessibleCount, chosenLocation, attemptNumber, assumedInventory = null) {
        this.log('ITEM_PLACEMENT', `Placing ${itemName}`, {
            itemName,
            accessibleLocationsCount: accessibleCount,
            chosenLocation: chosenLocation ? chosenLocation.name : null,
            attemptNumber,
            assumedInventoryStats: assumedInventory ? {
                totalItems: assumedInventory.getStats().totalItems,
                crystalStars: assumedInventory.getStarsCount(),
                sampleItems: this.getTopItems(assumedInventory, 10)
            } : null
        });
    }
    
    logSphere(sphereNumber, accessibleLocations, collectedItems, gameState) {
        this.log('SPHERE', `Sphere ${sphereNumber}`, {
            sphereNumber,
            accessibleLocationsCount: accessibleLocations.length,
            collectedItemsCount: collectedItems.length,
            locations: accessibleLocations.map(loc => ({
                name: loc.name,
                itemName: collectedItems.find(item => item.location === loc)?.itemName || 'Unknown'
            })),
            playerStats: {
                totalItems: gameState.getStats().totalItems,
                crystalStars: gameState.getStarsCount()
            }
        });
    }
    
    logAccessibility(locationName, isAccessible, rules, gameState) {
        this.log('ACCESSIBILITY', `${locationName}: ${isAccessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`, {
            locationName,
            isAccessible,
            rulesCount: rules ? rules.length : 0,
            playerStats: {
                totalItems: gameState.getStats().totalItems,
                crystalStars: gameState.getStarsCount(),
                sampleItems: this.getTopItems(gameState, 5)
            }
        });
    }
    
    logAssumedFillStart(progressionItemsCount, fillerItemsCount, availableLocationsCount) {
        this.log('ASSUMED_FILL', 'Starting assumed fill', {
            progressionItemsCount,
            fillerItemsCount,
            availableLocationsCount,
            totalItemsToPlace: progressionItemsCount + fillerItemsCount
        });
    }
    
    logAssumedFillComplete(success, placedCount, attempts, unplacedItems = []) {
        this.log('ASSUMED_FILL', `Assumed fill ${success ? 'COMPLETED' : 'FAILED'}`, {
            success,
            placedCount,
            attempts,
            unplacedItemsCount: unplacedItems.length,
            unplacedItems: unplacedItems.slice(0, 10).map(item => item.name)
        });
    }
    
    logAssumedInventoryAnalysis(itemName, assumedInventory, candidateLocations, itemCounts = null, placedItemsCount = 0, shuffledItemsCount = 0) {
        this.log('ASSUMED_INVENTORY', `Analysis for ${itemName}`, {
            itemName,
            placedItemsCount,
            shuffledItemsCount,
            totalProgressionItems: placedItemsCount + shuffledItemsCount,
            assumedInventoryStats: {
                totalItems: assumedInventory.getStats().totalItems,
                crystalStars: assumedInventory.getStarsCount(),
                topItems: this.getTopItems(assumedInventory, 15),
                allItems: this.getAllItems(assumedInventory)
            },
            itemCounts: itemCounts ? Object.fromEntries(itemCounts) : null,
            candidateLocationsCount: candidateLocations.length,
            candidateLocationNames: candidateLocations.slice(0, 10).map(loc => loc.name)
        });
    }
    
    getAllItems(gameState) {
        try {
            const allItems = gameState.getAllItems();
            const result = {};
            for (const [itemName, count] of allItems.entries()) {
                if (count > 0) {
                    result[itemName] = count;
                }
            }
            return result;
        } catch (error) {
            return { error: error.message };
        }
    }
    
    logSphereIteration(iterationNumber, accessibleCount, newItemsCollected, gameState) {
        this.log('SPHERE_ITERATION', `Iteration ${iterationNumber}`, {
            iterationNumber,
            accessibleLocationsCount: accessibleCount,
            newItemsCollected,
            totalItemsInState: gameState.getStats().totalItems,
            crystalStarsInState: gameState.getStarsCount()
        });
    }
    
    getTopItems(gameState, limit = 10) {
        try {
            const allItems = gameState.getAllItems();
            const itemArray = [];
            for (const [itemName, count] of allItems.entries()) {
                if (count > 0) {
                    itemArray.push(`${itemName}(${count})`);
                }
            }
            return itemArray.slice(0, limit);
        } catch (error) {
            return ['Error getting items'];
        }
    }
    
    saveToFile(filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `ttyd-randomizer-debug-${timestamp}.txt`;
        }
        
        const content = this.generateLogContent();
        this.downloadTextFile(content, filename);
    }
    
    generateLogContent() {
        let content = `TTYD Randomizer Debug Log\n`;
        content += `Session ID: ${this.sessionId}\n`;
        content += `Generated: ${new Date().toISOString()}\n`;
        content += `Total Log Entries: ${this.logs.length}\n`;
        content += `${'='.repeat(80)}\n\n`;
        
        // Group logs by category
        const categories = ['ASSUMED_FILL', 'ITEM_PLACEMENT', 'ASSUMED_INVENTORY', 'SPHERE', 'SPHERE_ITERATION', 'ACCESSIBILITY'];
        
        categories.forEach(category => {
            const categoryLogs = this.logs.filter(log => log.category === category);
            if (categoryLogs.length === 0) return;
            
            content += `${category} LOGS (${categoryLogs.length} entries)\n`;
            content += `${'-'.repeat(40)}\n`;
            
            categoryLogs.forEach(log => {
                content += `[${log.timestamp}] ${log.message}\n`;
                if (log.data && Object.keys(log.data).length > 0) {
                    content += `  Data: ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n  ')}\n`;
                }
                content += '\n';
            });
            
            content += '\n';
        });
        
        return content;
    }
    
    downloadTextFile(content, filename) {
        try {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log(`Debug log saved as: ${filename}`);
        } catch (error) {
            console.error('Failed to download debug log:', error);
        }
    }
    
    clear() {
        this.logs = [];
    }
    
    enable() {
        this.enabled = true;
    }
    
    disable() {
        this.enabled = false;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DebugLogger };
} else if (typeof window !== 'undefined') {
    window.DebugLogger = DebugLogger;
}