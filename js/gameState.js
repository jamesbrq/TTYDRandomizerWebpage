// GameState class for tracking player progress in TTYD Randomizer
class GameState {
    constructor() {
        this.items = new Map(); // item name -> count
        this.regions = new Set(); // accessible regions
        this.stars = 0; // Count of Crystal Stars obtained
    }

    /**
     * Adds an item to the player's inventory
     * @param {string} itemName - The name of the item
     * @param {number} count - Number of items to add (default 1)
     */
    addItem(itemName, count = 1) {
        const currentCount = this.items.get(itemName) || 0;
        this.items.set(itemName, currentCount + count);
        
        // Track Crystal Stars for stars progression
        if (this._isCrystalStar(itemName)) {
            this.stars += count;
        }
    }

    /**
     * Removes an item from the player's inventory
     * @param {string} itemName - The name of the item
     * @param {number} count - Number of items to remove (default 1)
     */
    removeItem(itemName, count = 1) {
        const currentCount = this.items.get(itemName) || 0;
        const actualRemoveCount = Math.min(count, currentCount);
        const newCount = Math.max(0, currentCount - count);
        
        if (newCount === 0) {
            this.items.delete(itemName);
        } else {
            this.items.set(itemName, newCount);
        }
        
        // Update Crystal Stars count
        if (this._isCrystalStar(itemName)) {
            this.stars = Math.max(0, this.stars - actualRemoveCount);
        }
    }

    /**
     * Checks if the player has a specific item
     * @param {string} itemName - The name of the item
     * @param {number} requiredCount - Minimum count required (default 1)
     * @returns {boolean} True if the player has the required count of the item
     */
    has(itemName, requiredCount = 1) {
        const count = this.items.get(itemName) || 0;
        return count >= requiredCount;
    }

    /**
     * Gets the count of a specific item
     * @param {string} itemName - The name of the item
     * @returns {number} The count of the item
     */
    getItemCount(itemName) {
        return this.items.get(itemName) || 0;
    }

    /**
     * Gets the current Crystal Stars count
     * @returns {number} Number of Crystal Stars obtained
     */
    getStarsCount() {
        return this.stars;
    }

    /**
     * Checks if an item name is a Crystal Star
     * @private
     * @param {string} itemName - The name of the item
     * @returns {boolean} True if the item is a Crystal Star
     */
    _isCrystalStar(itemName) {
        const crystalStars = [
            "Diamond Star",
            "Emerald Star", 
            "Gold Star",
            "Ruby Star",
            "Sapphire Star",
            "Garnet Star",
            "Crystal Star"
        ];
        return crystalStars.includes(itemName);
    }

    /**
     * Adds a region to the accessible regions set
     * @param {string} regionName - The name of the region
     */
    addRegion(regionName) {
        this.regions.add(regionName);
    }

    /**
     * Removes a region from the accessible regions set
     * @param {string} regionName - The name of the region
     */
    removeRegion(regionName) {
        this.regions.delete(regionName);
    }

    /**
     * Checks if a region is reachable
     * @param {string} target - The target location/region name
     * @param {string} type - The type (usually "Region")
     * @returns {boolean} True if the region is reachable
     */
    canReach(target, type) {
        if (type === "Region") {
            // Check if StateLogic function exists for this region
            if (typeof StateLogic !== 'undefined' && StateLogic[target]) {
                try {
                    return StateLogic[target](this);
                } catch (error) {
                    console.warn(`Error evaluating StateLogic.${target}:`, error);
                    return false;
                }
            }
            // Fallback: check if the region is in our accessible regions set
            return this.regions.has(target);
        }
        return false;
    }

    /**
     * Gets all items in inventory
     * @returns {Map<string, number>} Map of item names to counts
     */
    getAllItems() {
        return new Map(this.items);
    }

    /**
     * Gets all accessible regions
     * @returns {Set<string>} Set of accessible region names
     */
    getAllRegions() {
        return new Set(this.regions);
    }

    /**
     * Clears all items and regions
     */
    clear() {
        this.items.clear();
        this.regions.clear();
        this.stars = 0;
    }

    /**
     * Creates a copy of the current game state
     * @returns {GameState} New GameState instance with same items and regions
     */
    clone() {
        const newState = new GameState();
        newState.items = new Map(this.items);
        newState.regions = new Set(this.regions);
        newState.stars = this.stars;
        return newState;
    }

    /**
     * Loads state from a JSON object
     * @param {Object} json - JSON object with items and regions
     */
    loadFromJSON(json) {
        this.items.clear();
        this.regions.clear();
        this.stars = 0;

        if (json.items) {
            for (const [itemName, count] of Object.entries(json.items)) {
                this.addItem(itemName, count); // Use addItem to properly track Crystal Stars
            }
        }

        if (json.regions) {
            for (const regionName of json.regions) {
                this.regions.add(regionName);
            }
        }

        // Support explicit stars count in JSON (for backwards compatibility)
        if (json.stars !== undefined) {
            this.stars = json.stars;
        }
    }

    /**
     * Converts the game state to a JSON object
     * @returns {Object} JSON representation of the game state
     */
    toJSON() {
        return {
            items: Object.fromEntries(this.items),
            regions: Array.from(this.regions),
            stars: this.stars
        };
    }

    /**
     * Gets statistics about the current game state
     * @returns {Object} Object with game state statistics
     */
    getStats() {
        return {
            totalItems: Array.from(this.items.values()).reduce((sum, count) => sum + count, 0),
            uniqueItems: this.items.size,
            accessibleRegions: this.regions.size,
            items: Object.fromEntries(this.items),
            regions: Array.from(this.regions)
        };
    }

    /**
     * Creates a game state with common starting items/abilities
     * @returns {GameState} GameState with basic starting setup
     */
    static createStartingState() {
        const state = new GameState();
        // Add basic starting regions (usually just Rogueport)
        state.addRegion("Rogueport");
        return state;
    }

    /**
     * Creates a game state with all items for testing purposes
     * Loads all items from items.json and uses ITEM_FREQUENCIES to determine counts
     * @returns {Promise<GameState>} GameState with all items added
     */
    static async createAllItemsState() {
        const state = new GameState();
        
        try {
            // Load all items from items.json
            const itemsResponse = await fetch('json/items.json');
            const itemsData = await itemsResponse.json();
            
            // Add each item with its frequency (default 1, or from ITEM_FREQUENCIES)
            for (const item of itemsData) {
                const itemName = item.itemName;
                
                // Skip items without a name
                if (!itemName) {
                    console.warn('Skipping item without name:', item);
                    continue;
                }
                
                let frequency = 1; // Default frequency
                
                // Override with ITEM_FREQUENCIES if available and item is listed
                if (typeof ITEM_FREQUENCIES !== 'undefined' && ITEM_FREQUENCIES.hasOwnProperty(itemName)) {
                    frequency = ITEM_FREQUENCIES[itemName];
                }
                
                // Only add items with frequency > 0
                if (frequency > 0) {
                    state.addItem(itemName, frequency);
                }
            }
            
            // Initialize with 7 Crystal Stars for testing
            state.stars = 7;
            
            // Add Crystal Star items for testing (even though they have frequency 0)
            const crystalStars = [
                "Diamond Star", "Emerald Star", "Gold Star", "Ruby Star", 
                "Sapphire Star", "Garnet Star", "Crystal Star"
            ];
            for (const starName of crystalStars) {
                state.addItem(starName, 1);
            }
            
            // Note: "stars" logic is handled directly by the parser using getStarsCount()
            
            console.log('Created all items state with', state.getStats().totalItems, 'total items');
            console.log('Crystal Stars initialized to:', state.getStarsCount());
            return state;
            
        } catch (error) {
            console.error('Failed to load items for all items state:', error);
            // Return empty state on error
            return state;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState };
} else if (typeof window !== 'undefined') {
    window.GameState = GameState;
}