// GameState class for tracking player progress in TTYD Randomizer
class GameState {
    constructor() {
        this.items = new Map(); // item name -> count
        this.stars = 0; // Count of Crystal Stars obtained
        this.locations = null; // LocationCollection instance
        this.itemPool = null; // ItemPool instance
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
     * Sets the locations collection for this game state
     * @param {LocationCollection} locationCollection - The location collection to set
     */
    setLocations(locationCollection) {
        this.locations = locationCollection;
    }

    /**
     * Gets the locations collection
     * @returns {LocationCollection|null} The location collection
     */
    getLocations() {
        return this.locations;
    }

    /**
     * Gets the locations collection
     * @returns {LocationCollection|null} The location collection
     */
    getShuffledLocations() {
        return this.locations;
    }

    /**
     * Sets the item pool for this game state
     * @param {ItemPool} itemPool - The item pool to set
     */
    setItemPool(itemPool) {
        this.itemPool = itemPool;
    }

    /**
     * Gets the item pool
     * @returns {ItemPool|null} The item pool
     */
    getItemPool() {
        return this.itemPool;
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
     * Clears all items, locations, and item pool
     */
    clear() {
        this.items.clear();
        this.stars = 0;
        this.locations = null;
        this.itemPool = null;
    }

    /**
     * Creates a copy of the current game state
     * @returns {GameState} New GameState instance with same items, locations, and item pool
     */
    clone() {
        const newState = new GameState();
        newState.items = new Map(this.items);
        newState.stars = this.stars;
        newState.locations = this.locations ? this.locations.clone() : null;
        newState.itemPool = this.itemPool ? this.itemPool.clone() : null;
        return newState;
    }

    /**
     * Loads state from a JSON object
     * @param {Object} json - JSON object with items, locations, and itemPool
     */
    loadFromJSON(json) {
        this.items.clear();
        this.stars = 0;
        this.locations = null;
        this.itemPool = null;

        if (json.items) {
            for (const [itemName, count] of Object.entries(json.items)) {
                this.addItem(itemName, count); // Use addItem to properly track Crystal Stars
            }
        }

        // Support explicit stars count in JSON (for backwards compatibility)
        if (json.stars !== undefined) {
            this.stars = json.stars;
        }

        // Load locations if present (assumes LocationCollection is available)
        if (json.locations && typeof LocationCollection !== 'undefined') {
            this.locations = new LocationCollection();
            this.locations.loadFromJSON(json.locations);
        }

        // Load itemPool if present (assumes ItemPool is available)
        if (json.itemPool && typeof ItemPool !== 'undefined') {
            this.itemPool = new ItemPool();
            // Reconstruct itemPool from its JSON representation
            if (json.itemPool.items) {
                this.itemPool.items = new Map(Object.entries(json.itemPool.items));
                this.itemPool.totalItems = json.itemPool.totalItems || 0;
            }
        }
    }

    /**
     * Converts the game state to a JSON object
     * @returns {Object} JSON representation of the game state
     */
    toJSON() {
        const json = {
            items: Object.fromEntries(this.items),
            stars: this.stars
        };

        // Include locations if present
        if (this.locations) {
            json.locations = this.locations.toJSON();
        }

        // Include itemPool if present
        if (this.itemPool) {
            json.itemPool = {
                items: Object.fromEntries(this.itemPool.items),
                totalItems: this.itemPool.totalItems
            };
        }

        return json;
    }

    /**
     * Gets statistics about the current game state
     * @returns {Object} Object with game state statistics
     */
    getStats() {
        const stats = {
            totalItems: Array.from(this.items.values()).reduce((sum, count) => sum + count, 0),
            uniqueItems: this.items.size,
            crystalStars: this.stars,
            items: Object.fromEntries(this.items),
        };

        // Add location statistics if locations are present
        if (this.locations) {
            const locationStats = this.locations.getPlacementStats();
            stats.locations = {
                total: locationStats.total,
                available: locationStats.available,
                locked: locationStats.locked,
                placed: locationStats.placed,
                empty: locationStats.empty,
                withRules: this.locations.filter(loc => loc.rules.length > 0).length,
                percentageFilled: locationStats.percentageFilled,
                percentageLocked: locationStats.percentageLocked
            };
        }

        // Add item pool statistics if item pool is present
        if (this.itemPool) {
            const poolStats = this.itemPool.getStats();
            stats.itemPool = {
                totalItems: poolStats.totalItems,
                uniqueItems: poolStats.uniqueItems,
                averageFrequency: poolStats.averageFrequency,
                isEmpty: this.itemPool.isEmpty()
            };
        }

        return stats;
    }

    /**
     * Creates a game state with common starting items/abilities
     * @param {LocationCollection} locations - Optional location collection to set
     * @param {ItemPool} itemPool - Optional item pool to set
     * @returns {GameState} GameState with basic starting setup
     */
    static createStartingState(locations = null, itemPool = null) {
        const state = new GameState();
        
        // Set locations and itemPool if provided
        if (locations) {
            state.setLocations(locations);
        }
        if (itemPool) {
            state.setItemPool(itemPool);
        }
        
        return state;
    }

    /**
     * Creates an empty game state with locations initialized for testing accessibility
     * @param {boolean} includeItemPool - Whether to include an empty item pool
     * @returns {Promise<GameState>} Empty GameState with locations initialized
     */
    static async createEmptyStateWithLocations(includeItemPool = false) {
        try {
            // Initialize locations with rules
            const locationCollection = await GameState.initializeLocationsWithRules();
            
            // Create empty state
            const state = new GameState();
            state.setLocations(locationCollection);
            
            // Include empty item pool if requested
            if (includeItemPool) {
                state.setItemPool(new ItemPool());
            }
            
            console.log(`Created empty state with ${locationCollection.size()} locations`);
            return state;
            
        } catch (error) {
            console.error('Failed to create empty state with locations:', error);
            return new GameState();
        }
    }

    /**
     * Creates a game state with all items for testing purposes
     * Uses ItemPool functionality to load items with proper frequencies
     * @param {boolean} includeLocations - Whether to initialize locations as well
     * @returns {Promise<GameState>} GameState with all items added
     */
    static async createAllItemsState(includeLocations = true) {
        const state = new GameState();
        
        try {
            // Initialize item pool with all items
            const itemPool = await GameState.initializeItemPool();
            
            // Set the item pool on the state
            state.setItemPool(itemPool.clone()); // Clone to keep original intact
            
            // Add all items from the pool to the game state
            for (const [itemName, count] of itemPool.items.entries()) {
                // Only add items with count > 0
                if (count > 0) {
                    state.addItem(itemName, count);
                }
            }
            
            // Initialize locations if requested
            if (includeLocations) {
                const locationCollection = await GameState.initializeLocationsWithRules();
                state.setLocations(locationCollection);
            }
            
            // Crystal Stars and starting partner are NOT added here since they are
            // locked at specific locations and will be collected during validation sweep
            
            // Note: "stars" logic is handled directly by the parser using getStarsCount()
            
            const stats = state.getStats();
            console.log('Created all items state with', stats.totalItems, 'total items');
            console.log('Unique items:', stats.uniqueItems);
            console.log('Crystal Stars initialized to:', state.getStarsCount());
            
            if (includeLocations && state.locations) {
                console.log('Locations initialized:', state.locations.size());
            }
            
            return state;
            
        } catch (error) {
            console.error('Failed to create all items state:', error);
            // Return empty state on error
            return state;
        }
    }

    /**
     * Initializes all locations with rules from regions.json and rules.json
     * Loads locations and adds appropriate rules based on their tags and specific location names
     * @returns {Promise<LocationCollection>} LocationCollection with all locations and rules initialized
     */
    static async initializeLocationsWithRules() {
        try {
            // Load all required data
            const [locationsResponse, regionsResponse, rulesResponse] = await Promise.all([
                fetch('json/locations.json'),
                fetch('json/regions.json'),
                fetch('json/rules.json')
            ]);
            
            const locationsData = await locationsResponse.json();
            const regionsData = await regionsResponse.json();
            const rulesData = await rulesResponse.json();
            
            // Create LocationCollection and load base locations
            if (typeof LocationCollection === 'undefined') {
                throw new Error('LocationCollection class not available');
            }
            
            const locationCollection = new LocationCollection();
            
            // Process each location
            for (const locationJson of locationsData) {
                const rules = [];
                
                // Add rules from regions.json based on tags
                if (locationJson.tags && Array.isArray(locationJson.tags)) {
                    for (const tag of locationJson.tags) {
                        if (regionsData[tag]) {
                            rules.push(regionsData[tag]);
                        }
                    }
                }
                
                // Add specific rules from rules.json based on location name
                if (locationJson.name && rulesData[locationJson.name]) {
                    rules.push(rulesData[locationJson.name]);
                }
                
                // Create Location object with rules
                const location = new Location(
                    locationJson.name,
                    locationJson.id,
                    locationJson.rel,
                    locationJson.offsets || [],
                    locationJson.vanilla_item || 0,
                    locationJson.tags || [],
                    rules // Add the rules array
                );
                
                locationCollection.addLocation(location);
            }
            
            console.log(`Initialized ${locationCollection.size()} locations with rules`);
            console.log(`Locations with rules: ${locationCollection.filter(loc => loc.rules.length > 0).length}`);
            
            return locationCollection;
            
        } catch (error) {
            console.error('Failed to initialize locations with rules:', error);
            // Return empty collection on error
            return new LocationCollection();
        }
    }

    /**
     * Initializes the item pool from items.json using ItemPool class functionality
     * @param {number} targetLocationCount - Number of available locations to fill (optional)
     * @returns {Promise<ItemPool>} ItemPool instance with all items initialized
     */
    static async initializeItemPool(targetLocationCount = null) {
        try {
            // Check if ItemPool class is available
            if (typeof ItemPool === 'undefined') {
                throw new Error('ItemPool class not available. Make sure itemPool.js is loaded.');
            }

            // Load items data
            const itemsResponse = await fetch('json/items.json');
            const itemsData = await itemsResponse.json();
            
            // Validate items data
            if (!Array.isArray(itemsData)) {
                throw new Error('items.json should contain an array of items');
            }

            let itemPool;
            
            if (targetLocationCount !== null) {
                // Create sized pool for randomization
                itemPool = ItemPool.createInitialPool(itemsData, targetLocationCount);
            } else {
                // Create full pool with all items at their specified frequencies
                itemPool = new ItemPool();
                const itemNames = itemsData
                    .map(item => item.itemName)
                    .filter(name => name); // Filter out items without names
                
                itemPool.populatePool(itemNames);
            }
            
            const stats = itemPool.getStats();
            console.log(`Initialized item pool:`, stats);
            console.log(`Total items: ${stats.totalItems}, Unique items: ${stats.uniqueItems}`);
            
            return itemPool;
            
        } catch (error) {
            console.error('Failed to initialize item pool:', error);
            // Return empty pool on error
            return new ItemPool();
        }
    }

    /**
     * Comprehensive initialization for randomizer setup
     * Initializes both locations with rules and item pool, optionally sized for randomization
     * @param {boolean} sizedForRandomization - Whether to size item pool to match available locations
     * @returns {Promise<GameState>} GameState with locations and item pool initialized
     */
    static async initializeRandomizerData(sizedForRandomization = true) {
        try {
            console.log('Initializing randomizer data...');
            
            // Initialize locations with rules
            const locationCollection = await GameState.initializeLocationsWithRules();
            
            let itemPool;
            if (sizedForRandomization) {
                // Count available (unlocked) locations for proper item pool sizing
                const availableLocationCount = locationCollection.getAvailableLocations().length;
                console.log(`Found ${availableLocationCount} available locations`);
                
                // Create sized item pool
                itemPool = await GameState.initializeItemPool(availableLocationCount);
            } else {
                // Create full item pool
                itemPool = await GameState.initializeItemPool();
            }
            
            // Create a starting game state with locations and item pool
            const gameState = GameState.createStartingState(locationCollection, itemPool);
            
            const stats = {
                totalLocations: locationCollection.size(),
                availableLocations: locationCollection.getAvailableLocations().length,
                lockedLocations: locationCollection.getLockedLocations().length,
                locationsWithRules: locationCollection.filter(loc => loc.rules.length > 0).length,
                totalItems: itemPool.getTotalItems(),
                uniqueItems: itemPool.getUniqueItems().length
            };
            
            console.log('Randomizer data initialized:', stats);
            console.log('GameState contains locations:', gameState.getLocations() !== null);
            console.log('GameState contains item pool:', gameState.getItemPool() !== null);
            
            return gameState;
            
        } catch (error) {
            console.error('Failed to initialize randomizer data:', error);
            // Return minimal setup on error
            const fallbackState = new GameState();
            fallbackState.setLocations(new LocationCollection());
            fallbackState.setItemPool(new ItemPool());
            return fallbackState;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState };
} else if (typeof window !== 'undefined') {
    window.GameState = GameState;
}