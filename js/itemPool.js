// Item frequencies for TTYD Randomizer
// Items not listed here are assumed to have 1 copy in the item pool
const ITEM_FREQUENCIES = {
    "10 Coins": 60,
    "Boo's Sheet": 4,
    "Castle Key": 4,
    "Close Call": 2,
    "Close Call P": 2,
    "Coconut": 2,
    "Courage Shell": 3,
    "Damage Dodge": 2,
    "Damage Dodge P": 2,
    "Defend Plus": 2,
    "Defend Plus P": 2,
    "Dizzy Dial": 2,
    "Double Dip": 2,
    "Double Dip P": 2,
    "Dried Shroom": 4,
    "Earth Quake": 3,
    "Fire Drive": 2,
    "Fire Flower": 8,
    "Flower Saver": 2,
    "Flower Saver P": 2,
    "FP Plus": 3,
    "Fright Mask": 2,
    "Gold Bar": 2,
    "Gold Bar x3": 3,
    "Gradual Syrup": 2,
    "Hammer Throw": 2,
    "Happy Flower": 2,
    "Happy Heart": 2,
    "Happy Heart P": 2,
    "Head Rattle": 2,
    "Honey Syrup": 7,
    "HP Drain": 2,
    "HP Plus": 3,
    "HP Plus P": 3,
    "Ice Smash": 2,
    "Ice Storm": 5,
    "Inn Coupon": 7,
    "Jammin' Jelly": 8,
    "Last Stand": 2,
    "Last Stand P": 2,
    "Life Shroom": 8,
    "Maple Syrup": 5,
    "Mini Mr.Mini": 2,
    "Mr.Softener": 2,
    "Multibounce": 2,
    "Mushroom": 10,
    "Mystery": 3,
    "Palace Key": 3,
    "Palace Key (Riddle Tower)": 8,
    "Point Swap": 2,
    "POW Block": 3,
    "Power Jump": 2,
    "Power Plus": 2,
    "Power Plus P": 2,
    "Power Punch": 3,
    "Power Rush": 4,
    "Power Rush P": 4,
    "Power Smash": 2,
    "Pretty Lucky": 2,
    "Quake Hammer": 2,
    "Repel Cape": 3,
    "Ruin Powder": 3,
    "Shine Sprite": 40,
    "Shooting Star": 8,
    "Shrink Stomp": 2,
    "Simplifier": 2,
    "Sleepy Sheep": 5,
    "Sleepy Stomp": 2,
    "Slow Shroom": 2,
    "Soft Stomp": 2,
    "Spite Pouch": 2,
    "Star Piece": 100,
    "Stopwatch": 5,
    "Super Appeal": 2,
    "Super Appeal P": 2,
    "Super Shroom": 10,
    "Tasty Tonic": 2,
    "Thunder Bolt": 2,
    "Thunder Rage": 8,
    "Tornado Jump": 2,
    "Ultra Mushroom": 8,
    "Unsimplifier": 2,
    "Volt Shroom": 2,
    "Whacka Bump": 8,
    "Diamond Star": 0,
    "Emerald Star": 0,
    "Gold Star": 0,
    "Ruby Star": 0,
    "Sapphire Star": 0,
    "Garnet Star": 0,
    "Crystal Star": 0,
    "Progressive Boots": 2,
    "Progressive Hammer": 2
};

/**
 * ItemPool class for managing the randomizer item pool
 */
class ItemPool {
    constructor() {
        this.items = new Map();
        this.totalItems = 0;
    }

    /**
     * Gets the frequency for an item (defaults to 1 if not specified)
     * @param {string} itemName - The name of the item
     * @returns {number} The frequency of the item
     */
    getItemFrequency(itemName) {
        return ITEM_FREQUENCIES[itemName] || 1;
    }

    /**
     * Adds items to the pool based on their frequencies
     * @param {Array<string>} itemNames - Array of item names to add
     */
    populatePool(itemNames) {
        this.items.clear();
        this.totalItems = 0;

        for (const itemName of itemNames) {
            const frequency = this.getItemFrequency(itemName);
            if (frequency > 0) {
                this.items.set(itemName, frequency);
                this.totalItems += frequency;
            }
        }
    }

    /**
     * Gets all items in the pool as an array (respecting frequencies)
     * @returns {Array<string>} Array of item names with duplicates based on frequency
     */
    getPoolAsArray() {
        const pool = [];
        for (const [itemName, frequency] of this.items.entries()) {
            for (let i = 0; i < frequency; i++) {
                pool.push(itemName);
            }
        }
        return pool;
    }

    /**
     * Gets a random item from the pool and removes one instance of it
     * @returns {string|null} Random item name, or null if pool is empty
     */
    drawRandomItem() {
        if (this.totalItems === 0) return null;

        const poolArray = this.getPoolAsArray();
        const randomIndex = Math.floor(Math.random() * poolArray.length);
        const selectedItem = poolArray[randomIndex];

        // Remove one instance of the item
        const currentCount = this.items.get(selectedItem);
        if (currentCount > 1) {
            this.items.set(selectedItem, currentCount - 1);
        } else {
            this.items.delete(selectedItem);
        }
        this.totalItems--;

        return selectedItem;
    }

    /**
     * Adds one instance of an item back to the pool
     * @param {string} itemName - The item to add back
     */
    returnItem(itemName) {
        const currentCount = this.items.get(itemName) || 0;
        this.items.set(itemName, currentCount + 1);
        this.totalItems++;
    }

    /**
     * Gets the current count of a specific item in the pool
     * @param {string} itemName - The item to check
     * @returns {number} Current count of the item
     */
    getItemCount(itemName) {
        return this.items.get(itemName) || 0;
    }

    /**
     * Gets the total number of items remaining in the pool
     * @returns {number} Total items in pool
     */
    getTotalItems() {
        return this.totalItems;
    }

    /**
     * Checks if the pool is empty
     * @returns {boolean} True if no items remain
     */
    isEmpty() {
        return this.totalItems === 0;
    }

    /**
     * Gets all unique item names in the pool
     * @returns {Array<string>} Array of unique item names
     */
    getUniqueItems() {
        return Array.from(this.items.keys());
    }

    /**
     * Clears the entire pool
     */
    clear() {
        this.items.clear();
        this.totalItems = 0;
    }

    /**
     * Creates a copy of the current pool state
     * @returns {ItemPool} New ItemPool instance with same items
     */
    clone() {
        const newPool = new ItemPool();
        newPool.items = new Map(this.items);
        newPool.totalItems = this.totalItems;
        return newPool;
    }

    /**
     * Gets pool statistics
     * @returns {Object} Object with pool statistics
     */
    getStats() {
        return {
            uniqueItems: this.items.size,
            totalItems: this.totalItems,
            averageFrequency: this.items.size > 0 ? (this.totalItems / this.items.size).toFixed(2) : 0,
            items: Object.fromEntries(this.items)
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ITEM_FREQUENCIES, ItemPool };
} else if (typeof window !== 'undefined') {
    window.ITEM_FREQUENCIES = ITEM_FREQUENCIES;
    window.ItemPool = ItemPool;
}