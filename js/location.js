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
     */
    constructor(name, id, rel, offsets = [], vanillaItem = 0, tags = [], placedItem = null) {
        this.name = name;
        this.id = id;
        this.rel = rel;
        this.offsets = offsets;
        this.vanillaItem = vanillaItem;
        this.tags = tags;
        this.placedItem = placedItem;
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
            changes.placedItem !== undefined ? changes.placedItem : this.placedItem
        );
    }

    /**
     * Places an item at this location
     * @param {number} itemId - The item ID to place at this location
     */
    placeItem(itemId) {
        this.placedItem = itemId;
    }

    /**
     * Removes the placed item from this location
     */
    clearPlacedItem() {
        this.placedItem = null;
    }

    /**
     * Checks if this location has a placed item
     * @returns {boolean} True if an item has been placed at this location
     */
    hasPlacedItem() {
        return this.placedItem !== null;
    }

    /**
     * Gets the item that should be at this location (placed item or vanilla item)
     * @returns {number} The item ID that should be at this location
     */
    getEffectiveItem() {
        return this.hasPlacedItem() ? this.placedItem : this.vanillaItem;
    }

    /**
     * Checks if this location is empty (no placed item)
     * @returns {boolean} True if no item has been placed at this location
     */
    isEmpty() {
        return this.placedItem === null;
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
            (this.placedItem === null || typeof this.placedItem === 'number')
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
     * Gets statistics about placed items
     * @returns {Object} Object with placement statistics
     */
    getPlacementStats() {
        const total = this.locations.length;
        const placed = this.getLocationsWithPlacedItems().length;
        const empty = total - placed;
        
        return {
            total,
            placed,
            empty,
            percentageFilled: total > 0 ? (placed / total * 100).toFixed(1) : 0
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Location, LocationCollection };
} else if (typeof window !== 'undefined') {
    window.Location = Location;
    window.LocationCollection = LocationCollection;
}