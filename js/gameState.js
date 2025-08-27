// GameState class for tracking player progress in TTYD Randomizer
class GameState {
    constructor() {
        this.items = new Map(); // item name -> count
        this.regions = new Set(); // accessible regions
    }

    /**
     * Adds an item to the player's inventory
     * @param {string} itemName - The name of the item
     * @param {number} count - Number of items to add (default 1)
     */
    addItem(itemName, count = 1) {
        const currentCount = this.items.get(itemName) || 0;
        this.items.set(itemName, currentCount + count);
    }

    /**
     * Removes an item from the player's inventory
     * @param {string} itemName - The name of the item
     * @param {number} count - Number of items to remove (default 1)
     */
    removeItem(itemName, count = 1) {
        const currentCount = this.items.get(itemName) || 0;
        const newCount = Math.max(0, currentCount - count);
        if (newCount === 0) {
            this.items.delete(itemName);
        } else {
            this.items.set(itemName, newCount);
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
        // For now, just check if the region is in our accessible regions set
        if (type === "Region") {
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
    }

    /**
     * Creates a copy of the current game state
     * @returns {GameState} New GameState instance with same items and regions
     */
    clone() {
        const newState = new GameState();
        newState.items = new Map(this.items);
        newState.regions = new Set(this.regions);
        return newState;
    }

    /**
     * Loads state from a JSON object
     * @param {Object} json - JSON object with items and regions
     */
    loadFromJSON(json) {
        this.items.clear();
        this.regions.clear();

        if (json.items) {
            for (const [itemName, count] of Object.entries(json.items)) {
                this.items.set(itemName, count);
            }
        }

        if (json.regions) {
            for (const regionName of json.regions) {
                this.regions.add(regionName);
            }
        }
    }

    /**
     * Converts the game state to a JSON object
     * @returns {Object} JSON representation of the game state
     */
    toJSON() {
        return {
            items: Object.fromEntries(this.items),
            regions: Array.from(this.regions)
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
     * Creates a game state for testing with many items
     * @returns {GameState} GameState with many items for testing
     */
    static createTestState() {
        const state = new GameState();
        
        // Add basic items
        state.addItem("Progressive Hammer", 2); // Ultra Hammer
        state.addItem("Progressive Boots", 2);  // Ultra Boots
        state.addItem("Paper Curse", 1);
        state.addItem("Plane Curse", 1);
        state.addItem("Tube Curse", 1);
        state.addItem("Boat Curse", 1);
        
        // Add partners
        state.addItem("Goombella", 1);
        state.addItem("Koops", 1);
        state.addItem("Flurrie", 1);
        state.addItem("Yoshi", 1);
        state.addItem("Vivian", 1);
        state.addItem("Bobbery", 1);
        
        // Add key items
        state.addItem("Blimp Ticket", 1);
        state.addItem("Train Ticket", 1);
        state.addItem("Contact Lens", 1);
        state.addItem("Sun Stone", 1);
        state.addItem("Moon Stone", 1);
        state.addItem("Necklace", 1);
        
        // Add many regions as accessible
        const regions = [
            "Rogueport", "rogueport_westside", "sewers_westside", "sewers_westside_ground",
            "petal_left", "petal_right", "hooktails_castle", "twilight_town", "twilight_trail",
            "fahr_outpost", "xnaut_fortress", "boggly_woods", "great_tree", "glitzville",
            "creepy_steeple", "keelhaul_key", "pirates_grotto", "excess_express",
            "riverside", "poshley_heights", "palace", "riddle_tower", "pit"
        ];
        
        regions.forEach(region => state.addRegion(region));
        
        return state;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState };
} else if (typeof window !== 'undefined') {
    window.GameState = GameState;
}