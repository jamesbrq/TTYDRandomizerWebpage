// Location class definition for TTYD Randomizer location entries
class Location {
    /**
     * Creates a new Location instance
     * @param {string} name - The display name of the location
     * @param {number} id - The unique identifier for the location
     * @param {string} rel - The REL file this location is in (e.g., "dol", "gor", "aaa", etc.)
     * @param {Array<string>} offsets - Array of hex offset strings for this location
     * @param {number} vanillaItem - The vanilla item ID at this location
     * @param {Array<string>} tags - Array of tags describing this location (e.g., ["tattle"])
     * @param {number|null} placedItem - The item ID that has been placed at this location (null if empty)
     * @param {boolean} locked - Whether this location is locked from randomization
     */
    constructor(name, id, rel, offsets = [], vanillaItem = 0, tags = [], placedItem = null, locked = false) {
        this.name = name;
        this.id = id;
        this.rel = rel;
        this.offsets = offsets;
        this.vanillaItem = vanillaItem;
        this.tags = tags;
        this.placed_item = placedItem;
        this.locked = locked;
    }

    /**
     * Creates a Location from a JSON object
     * @param {Object} json - JSON object with location data
     * @returns {Location} New Location instance
     */
    static fromJSON(json) {
        return new Location(
            json.name,
            json.id,
            json.rel,
            json.offsets || [],
            json.vanilla_item || 0,
            json.tags || []
        );
    }

    /**
     * Converts the Location to a JSON object
     * @returns {Object} JSON representation of the location
     */
    toJSON() {
        return {
            name: this.name,
            id: this.id,
            rel: this.rel,
            offsets: this.offsets,
            vanilla_item: this.vanillaItem,
            tags: this.tags
        };
    }

    /**
     * Checks if this location has a specific tag
     * @param {string} tag - The tag to check for
     * @returns {boolean} True if the location has the tag
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /**
     * Checks if this location is a tattle location
     * @returns {boolean} True if this is a tattle location
     */
    isTattle() {
        return this.hasTag('tattle');
    }

    /**
     * Checks if this location is in a specific REL file
     * @param {string} relName - The REL file name to check
     * @returns {boolean} True if the location is in the specified REL
     */
    isInRel(relName) {
        return this.rel === relName;
    }

    /**
     * Checks if this location is in the main DOL file
     * @returns {boolean} True if the location is in the DOL
     */
    isInDol() {
        return this.rel === 'dol';
    }

    /**
     * Gets the first offset as a number (if any)
     * @returns {number|null} The first offset as a number, or null if no offsets
     */
    getFirstOffset() {
        if (this.offsets.length === 0) return null;
        return parseInt(this.offsets[0], 16);
    }

    /**
     * Gets all offsets as numbers
     * @returns {Array<number>} Array of offsets as numbers
     */
    getAllOffsets() {
        return this.offsets.map(offset => parseInt(offset, 16));
    }

    /**
     * Returns a string representation of the location
     * @returns {string} String representation
     */
    toString() {
        return `Location(${this.name}, ID: ${this.id}, REL: ${this.rel})`;
    }

    /**
     * Creates a copy of this location with modified properties
     * @param {Object} changes - Object with properties to change
     * @returns {Location} New Location instance with changes applied
     */
    clone(changes = {}) {
        return new Location(
            changes.name !== undefined ? changes.name : this.name,
            changes.id !== undefined ? changes.id : this.id,
            changes.rel !== undefined ? changes.rel : this.rel,
            changes.offsets !== undefined ? changes.offsets : [...this.offsets],
            changes.vanillaItem !== undefined ? changes.vanillaItem : this.vanillaItem,
            changes.tags !== undefined ? changes.tags : [...this.tags],
            changes.placed_item !== undefined ? changes.placed_item : this.placed_item,
            changes.locked !== undefined ? changes.locked : this.locked
        );
    }

    /**
     * Places an item at this location
     * @param {number} itemId - The item ID to place at this location
     */
    placeItem(itemId) {
        this.placed_item = itemId;
    }

    /**
     * Removes the placed item from this location
     */
    clearPlacedItem() {
        this.placed_item = null;
    }

    /**
     * Checks if this location has a placed item
     * @returns {boolean} True if an item has been placed at this location
     */
    hasPlacedItem() {
        return this.placed_item !== null;
    }

    /**
     * Gets the item that should be at this location (placed item or vanilla item)
     * @returns {number} The item ID that should be at this location
     */
    getEffectiveItem() {
        return this.hasPlacedItem() ? this.placed_item : this.vanillaItem;
    }

    /**
     * Checks if this location is empty (no placed item)
     * @returns {boolean} True if no item has been placed at this location
     */
    isEmpty() {
        return this.placed_item === null;
    }

    /**
     * Locks this location from randomization
     */
    lock() {
        this.locked = true;
    }

    /**
     * Unlocks this location for randomization
     */
    unlock() {
        this.locked = false;
    }

    /**
     * Checks if this location is locked from randomization
     * @returns {boolean} True if the location is locked
     */
    isLocked() {
        return this.locked;
    }

    /**
     * Checks if this location is available for randomization
     * @returns {boolean} True if the location is not locked
     */
    isAvailable() {
        return !this.locked;
    }

    /**
     * Gets the region tag for this location (first region tag found)
     * @returns {string|null} The region tag, or null if none found
     */
    getRegionTag() {
        const regionTags = [
            'rogueport_westside', 'sewers_westside', 'sewers_westside_ground',
            'petal_left', 'petal_right', 'hooktails_castle', 'twilight_town',
            'twilight_trail', 'fahr_outpost', 'xnaut_fortress', 'boggly_woods',
            'great_tree', 'glitzville', 'creepy_steeple', 'keelhaul_key',
            'pirates_grotto', 'excess_express', 'riverside', 'poshley_heights',
            'palace', 'riddle_tower', 'pit'
        ];
        
        return this.tags.find(tag => regionTags.includes(tag)) || null;
    }

    /**
     * Checks if this location is accessible given the current game state
     * @param {Object} gameState - Current game state object with items and abilities
     * @param {Object} regionLogic - Region logic map loaded from regions.json
     * @returns {boolean} True if the location is accessible
     */
    isAccessible(gameState, regionLogic) {
        const regionTag = this.getRegionTag();
        if (!regionTag || !regionLogic[regionTag]) {
            return true; // Default to accessible if no region logic found
        }

        const logic = regionLogic[regionTag];
        return this._evaluateLogic(logic, gameState);
    }

    /**
     * Evaluates a logic expression against the game state
     * @param {Object} logic - Logic expression object
     * @param {Object} gameState - Current game state
     * @returns {boolean} True if logic requirements are met
     * @private
     */
    _evaluateLogic(logic, gameState) {
        if (logic.has) {
            return gameState.has(logic.has);
        }
        
        if (logic.function) {
            // Assume StateLogic is available globally
            if (typeof StateLogic !== 'undefined' && StateLogic[logic.function]) {
                return StateLogic[logic.function](gameState);
            }
            return false;
        }
        
        if (logic.can_reach) {
            return gameState.canReach(logic.can_reach.target, logic.can_reach.type);
        }
        
        if (logic.and) {
            return logic.and.every(subLogic => this._evaluateLogic(subLogic, gameState));
        }
        
        if (logic.or) {
            return logic.or.some(subLogic => this._evaluateLogic(subLogic, gameState));
        }
        
        return true; // Default to accessible if no recognized logic
    }

    /**
     * Validates that this location has all required properties
     * @returns {boolean} True if the location is valid
     */
    isValid() {
        return (
            typeof this.name === 'string' && this.name.length > 0 &&
            typeof this.id === 'number' && this.id >= 0 &&
            typeof this.rel === 'string' && this.rel.length > 0 &&
            Array.isArray(this.offsets) &&
            typeof this.vanillaItem === 'number' &&
            Array.isArray(this.tags) &&
            (this.placed_item === null || typeof this.placed_item === 'number') &&
            typeof this.locked === 'boolean'
        );
    }
}

/**
 * LocationCollection class for managing multiple json
 */
class LocationCollection {
    constructor() {
        this.locations = [];
        this.locationMap = new Map();
    }

    /**
     * Adds a location to the collection
     * @param {Location} location - The location to add
     */
    addLocation(location) {
        if (!(location instanceof Location)) {
            throw new Error('Must provide a Location instance');
        }
        
        this.locations.push(location);
        this.locationMap.set(location.id, location);
    }

    /**
     * Loads json from a JSON array
     * @param {Array<Object>} jsonArray - Array of location JSON objects
     */
    loadFromJSON(jsonArray) {
        this.locations = [];
        this.locationMap.clear();
        
        for (const json of jsonArray) {
            const location = Location.fromJSON(json);
            this.addLocation(location);
        }
    }

    /**
     * Gets a location by ID
     * @param {number} id - The location ID
     * @returns {Location|undefined} The location with the given ID
     */
    getLocationById(id) {
        return this.locationMap.get(id);
    }

    /**
     * Gets all json with a specific tag
     * @param {string} tag - The tag to filter by
     * @returns {Array<Location>} Array of json with the tag
     */
    getLocationsByTag(tag) {
        return this.locations.filter(location => location.hasTag(tag));
    }

    /**
     * Gets all json in a specific REL file
     * @param {string} relName - The REL file name
     * @returns {Array<Location>} Array of json in the REL
     */
    getLocationsByRel(relName) {
        return this.locations.filter(location => location.isInRel(relName));
    }

    /**
     * Gets all tattle json
     * @returns {Array<Location>} Array of tattle json
     */
    getTattleLocations() {
        return this.getLocationsByTag('tattle');
    }

    /**
     * Gets the total number of json
     * @returns {number} Number of json in the collection
     */
    size() {
        return this.locations.length;
    }

    /**
     * Converts all json to JSON format
     * @returns {Array<Object>} Array of location JSON objects
     */
    toJSON() {
        return this.locations.map(location => location.toJSON());
    }

    /**
     * Iterates over all json
     * @param {Function} callback - Function to call for each location
     */
    forEach(callback) {
        this.locations.forEach(callback);
    }

    /**
     * Maps over all json
     * @param {Function} callback - Function to call for each location
     * @returns {Array} Array of mapped values
     */
    map(callback) {
        return this.locations.map(callback);
    }

    /**
     * Filters json
     * @param {Function} predicate - Function to test each location
     * @returns {Array<Location>} Array of json that pass the test
     */
    filter(predicate) {
        return this.locations.filter(predicate);
    }

    /**
     * Gets all locations that have placed items
     * @returns {Array<Location>} Array of locations with placed items
     */
    getLocationsWithPlacedItems() {
        return this.locations.filter(location => location.hasPlacedItem());
    }

    /**
     * Gets all empty locations (no placed items)
     * @returns {Array<Location>} Array of empty locations
     */
    getEmptyLocations() {
        return this.locations.filter(location => location.isEmpty());
    }

    /**
     * Clears all placed items from all locations
     */
    clearAllPlacedItems() {
        this.locations.forEach(location => location.clearPlacedItem());
    }


    /**
     * Gets all locked locations
     * @returns {Array<Location>} Array of locked locations
     */
    getLockedLocations() {
        return this.locations.filter(location => location.isLocked());
    }

    /**
     * Gets all available (unlocked) locations
     * @returns {Array<Location>} Array of available locations
     */
    getAvailableLocations() {
        return this.locations.filter(location => location.isAvailable());
    }

    /**
     * Locks all locations with a specific tag
     * @param {string} tag - The tag to lock locations by
     */
    lockLocationsByTag(tag) {
        this.getLocationsByTag(tag).forEach(location => location.lock());
    }

    /**
     * Unlocks all locations with a specific tag
     * @param {string} tag - The tag to unlock locations by
     */
    unlockLocationsByTag(tag) {
        this.getLocationsByTag(tag).forEach(location => location.unlock());
    }

    /**
     * Locks all locations
     */
    lockAllLocations() {
        this.locations.forEach(location => location.lock());
    }

    /**
     * Unlocks all locations
     */
    unlockAllLocations() {
        this.locations.forEach(location => location.unlock());
    }

    /**
     * Gets all accessible locations given the current game state
     * @param {Object} gameState - Current game state object
     * @param {Object} regionLogic - Region logic map from regions.json
     * @returns {Array<Location>} Array of accessible locations
     */
    getAccessibleLocations(gameState, regionLogic) {
        return this.locations.filter(location => 
            location.isAccessible(gameState, regionLogic) && location.isAvailable()
        );
    }

    /**
     * Gets all inaccessible locations given the current game state
     * @param {Object} gameState - Current game state object
     * @param {Object} regionLogic - Region logic map from regions.json
     * @returns {Array<Location>} Array of inaccessible locations
     */
    getInaccessibleLocations(gameState, regionLogic) {
        return this.locations.filter(location => 
            !location.isAccessible(gameState, regionLogic)
        );
    }

    /**
     * Gets all accessible and empty locations for item placement
     * @param {Object} gameState - Current game state object
     * @param {Object} regionLogic - Region logic map from regions.json
     * @returns {Array<Location>} Array of accessible, empty locations
     */
    getAccessibleEmptyLocations(gameState, regionLogic) {
        return this.locations.filter(location => 
            location.isAccessible(gameState, regionLogic) && 
            location.isEmpty() && 
            location.isAvailable()
        );
    }

    /**
     * Gets locations by region tag that are accessible
     * @param {string} regionTag - The region tag to filter by
     * @param {Object} gameState - Current game state object
     * @param {Object} regionLogic - Region logic map from regions.json
     * @returns {Array<Location>} Array of accessible locations in the region
     */
    getAccessibleLocationsByRegion(regionTag, gameState, regionLogic) {
        return this.getLocationsByTag(regionTag).filter(location =>
            location.isAccessible(gameState, regionLogic) && location.isAvailable()
        );
    }

    /**
     * Creates a copy of this LocationCollection
     * @returns {LocationCollection} New LocationCollection with cloned locations
     */
    clone() {
        const newCollection = new LocationCollection();
        newCollection.locations = this.locations.map(location => location.clone());
        return newCollection;
    }

    /**
     * Gets statistics about placed items and accessibility
     * @param {Object} gameState - Current game state object (optional)
     * @param {Object} regionLogic - Region logic map from regions.json (optional)
     * @returns {Object} Object with placement and accessibility statistics
     */
    getPlacementStats(gameState = null, regionLogic = null) {
        const total = this.locations.length;
        const placed = this.getLocationsWithPlacedItems().length;
        const empty = total - placed;
        const locked = this.getLockedLocations().length;
        const available = this.getAvailableLocations().length;
        
        const stats = {
            total,
            placed,
            empty,
            locked,
            available,
            percentageFilled: total > 0 ? (placed / total * 100).toFixed(1) : 0,
            percentageLocked: total > 0 ? (locked / total * 100).toFixed(1) : 0
        };

        // Add accessibility stats if game state is provided
        if (gameState && regionLogic) {
            const accessible = this.getAccessibleLocations(gameState, regionLogic).length;
            const inaccessible = total - accessible;
            const accessibleEmpty = this.getAccessibleEmptyLocations(gameState, regionLogic).length;
            
            stats.accessible = accessible;
            stats.inaccessible = inaccessible;
            stats.accessibleEmpty = accessibleEmpty;
            stats.percentageAccessible = total > 0 ? (accessible / total * 100).toFixed(1) : 0;
        }

        return stats;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Location, LocationCollection };
} else if (typeof window !== 'undefined') {
    window.Location = Location;
    window.LocationCollection = LocationCollection;
}