// Forward Fill implementation for TTYD Randomizer
// Based on Algorithm 2: Forward Fill

// Global debug logger instance
let debugLogger = null;

/**
 * Forward Fill Algorithm Implementation
 * Places items sequentially and updates reachability after each placement
 */

/**
 * Performs a forward fill placement algorithm
 * @param {GameState} gameState - Complete game state with locations and item pool
 * @param {Array} itemsData - Original items data for progression classification
 * @param {Map} itemIdToName - Map from item ID to item name
 * @returns {Object} Result object with success status and placement info
 */
async function performForwardFill(gameState, itemsData, itemIdToName) {
    const locations = gameState.getLocations();
    const itemPool = gameState.getItemPool();
    
    if (!locations || !itemPool) {
        return {
            success: false,
            error: 'Missing locations or item pool in game state',
            placedCount: 0,
            remainingItems: 0,
            emptyLocations: 0,
            totalItems: 0,
            attempts: 0,
            placedItems: []
        };
    }

    // Split items into progression and filler (reuse from original generate.js)
    const { progression, filler } = splitItemPools(itemPool, itemsData);
    
    if (debugLogger) {
        debugLogger.log('FORWARD_FILL', 'Starting Forward Fill', {
            progressionItems: progression.length,
            fillerItems: filler.length,
            totalLocations: locations.size()
        });
    }

    // Algorithm 2 Implementation:
    // I = Empty (current player inventory - starts with base game state)
    const currentInventory = GameState.createStartingState();
    currentInventory.setLocations(gameState.getLocations());
    
    // I'.Shuffle() (shuffle the item pool)
    const shuffledProgression = [...progression];
    shuffleArray(shuffledProgression);
    
    const placedItems = [];
    const unfilled = locations.getAvailableLocations().filter(loc => loc.isEmpty());
    let attempts = 0;
    const maxAttempts = 10000;
    
    // while (R has nodes with null value) and (I' is not empty) do
    while (shuffledProgression.length > 0 && attempts < maxAttempts) {
        attempts++;
        
        if (unfilled.length === 0) {
            console.error("Ran out of locations for progression placement");
            break;
        }
        
        // r = Random null node in R (pick random empty location from ALL empty locations)
        const randomLocationIndex = getSecureRandomIndex(unfilled.length);
        const selectedLocation = unfilled[randomLocationIndex];
        
        // i = I'.Pop() (get next item from shuffled progression items)
        const item = shuffledProgression.shift();
        
        if (debugLogger) {
            debugLogger.log('FORWARD_FILL_STEP', `Placing ${item.name} at ${selectedLocation.name}`, {
                itemName: item.name,
                locationName: selectedLocation.name,
                remainingItems: shuffledProgression.length,
                currentInventoryItems: currentInventory.getStats().totalItems,
                attempt: attempts
            });
        }
        
        // r.Value = i (place item at selected location)
        selectedLocation.placeItem(item.id);
        
        // I.Add(i) (add item to current player inventory)
        currentInventory.addItem(item.name, 1);
        
        // Remove location from unfilled list
        const unfilledIndex = unfilled.indexOf(selectedLocation);
        unfilled.splice(unfilledIndex, 1);
        placedItems.push({ location: selectedLocation.name, item: item.name });
        
        // R = Search(G, I, Start) - Update reachability
        // This happens automatically through the currentInventory state updates
        // The next iteration will use the updated inventory state
        
        if (attempts % 25 === 0) {
            console.log(`Forward Fill Progress: ${placedItems.length}/${progression.length} items placed`);
        }
    }
    
    const progressionSuccess = shuffledProgression.length === 0;
    
    if (debugLogger) {
        debugLogger.log('FORWARD_FILL', `Progression placement ${progressionSuccess ? 'COMPLETED' : 'FAILED'}`, {
            success: progressionSuccess,
            placedCount: placedItems.length,
            remainingProgression: shuffledProgression.length,
            attempts
        });
    }
    
    if (!progressionSuccess) {
        return {
            success: false,
            error: 'Could not place all progression items with Forward Fill',
            placedCount: placedItems.length,
            remainingItems: shuffledProgression.length,
            emptyLocations: unfilled.length,
            totalItems: progression.length + filler.length,
            attempts,
            placedItems
        };
    }
    
    // Place remaining filler items
    const shuffledFiller = [...filler];
    shuffleArray(shuffledFiller);
    
    let fillerPlaced = 0;
    let fillerIndex = 0;
    unfilled.forEach(location => {
        if (fillerIndex < shuffledFiller.length) {
            const item = shuffledFiller[fillerIndex++];
            location.placeItem(item.id);
            placedItems.push({ location: location.name, item: item.name });
            fillerPlaced++;
        }
    });
    
    if (debugLogger) {
        debugLogger.log('FORWARD_FILL', 'Filler placement completed', {
            fillerPlaced,
            totalPlaced: placedItems.length
        });
    }
    
    return {
        success: true,
        placedCount: placedItems.length,
        remainingItems: Math.max(0, shuffledFiller.length - unfilled.length),
        emptyLocations: Math.max(0, unfilled.length - shuffledFiller.length),
        totalItems: progression.length + filler.length,
        attempts,
        placedItems,
        progressionPlaced: progression.length,
        fillerPlaced
    };
}

/**
 * Shuffles array using Fisher-Yates algorithm with secure randomization
 * @param {Array} array - Array to shuffle in place
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = getSecureRandomIndex(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Generates a cryptographically secure random index if available, fallback to Math.random
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random index between 0 and max-1
 */
function getSecureRandomIndex(max) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return Math.floor((array[0] / (0xFFFFFFFF + 1)) * max);
    }
    return Math.floor(Math.random() * max);
}

/**
 * Splits items from ItemPool into progression and filler items
 * @param {ItemPool} itemPool - The item pool to split
 * @param {Array} itemsData - Original items data with progression info
 * @returns {Object} Object with {progression, filler} arrays
 */
function splitItemPools(itemPool, itemsData) {
    const progression = [];
    const filler = [];
    
    // Create lookup map for progression info
    const itemLookup = new Map();
    itemsData.forEach(item => {
        if (item.itemName) {
            itemLookup.set(item.itemName, item);
        }
    });
    
    // Iterate through the itemPool's items Map to respect frequencies
    for (const [itemName, count] of itemPool.items.entries()) {
        const itemData = itemLookup.get(itemName);
        const itemObj = {
            name: itemName,
            id: itemData ? itemData.id : null,
            progression: itemData ? itemData.progression : null
        };
        
        // Add the item 'count' times to respect frequencies
        for (let i = 0; i < count; i++) {
            if (isProgressionItem(itemObj)) {
                progression.push(itemObj);
            } else {
                filler.push(itemObj);
            }
        }
    }
    
    return { progression, filler };
}

/**
 * Identifies if an item should be treated as progression based on items.json data
 * @param {Object} item - Item object with name and progression properties
 * @returns {boolean} True if item is progression
 */
function isProgressionItem(item) {
    const name = item.name || item.itemName;
    if (!name) return false;
    
    // ONLY use progression property from items.json - only "progression" items
    if (item.progression === "progression") {
        return true;
    }
    
    // Everything else (useful, filler, null/undefined) is treated as filler
    return false;
}

/**
 * Main randomizer generation function using Forward Fill algorithm
 * @param {Object} settings - Settings object from the UI
 * @returns {Promise<Object>} Result object with success status and spoiler data
 */
async function generateForwardFill(settings = {}) {

    // Initialize debug logger for this generation
    debugLogger = new DebugLogger();
    debugLogger.log('GENERATION', 'Starting Forward Fill generation', { settings });

    const seed = Date.now() + Math.random() * 1000000;
    
    try {
        // Step 1: Initialize complete randomizer state
        const gameState = await GameState.initializeRandomizerData(true);
        
        if (!gameState.getLocations() || !gameState.getItemPool()) {
            throw new Error('Failed to initialize game state with locations and item pool');
        }
        
        // Step 2: Create item name mappings
        const itemsResponse = await fetch('json/items.json');
        if (!itemsResponse.ok) {
            throw new Error(`Failed to fetch items.json: ${itemsResponse.status} ${itemsResponse.statusText}`);
        }
        const itemsData = await itemsResponse.json();
        
        const itemNameToId = new Map();
        const itemIdToName = new Map();
        itemsData.forEach(item => {
            if (item.itemName && item.id) {
                itemNameToId.set(item.itemName, item.id);
                itemIdToName.set(item.id, item.itemName);
            }
        });
        
        // Step 3: Lock special locations (reuse from original)
        const locations = gameState.getLocations();
        const crystalStarsLocked = lockCrystalStars(locations, itemNameToId);
        const startingPartner = lockStartingPartner(locations, itemNameToId, settings);
        
        // Step 4: Update item pool to remove locked items
        const itemPool = gameState.getItemPool();
        const crystalStars = ["Diamond Star", "Emerald Star", "Gold Star", "Ruby Star", "Sapphire Star", "Garnet Star", "Crystal Star"];
        crystalStars.forEach(star => itemPool.removeItem(star));
        itemPool.removeItem(startingPartner);
        
        // Step 5: Perform Forward Fill randomization
        const placementResult = await performForwardFill(gameState, itemsData, itemIdToName);
        
        if (!placementResult.success) {
            return {
                success: false,
                error: placementResult.error || 'Forward Fill randomization failed',
                timestamp: new Date().toISOString(),
                settings: settings
            };
        }
        
        // Step 6: Generate spoiler data (reuse from original)
        const spoilerSeed = Math.random().toString(36).substring(2, 15);
        const settingsString = btoa(JSON.stringify(settings));
        const spoilerGen = generateSpoilerData(gameState, itemIdToName, settings, spoilerSeed, settingsString);
        
        // Step 7: Create final result
        const finalResult = {
            success: true,
            seed: spoilerSeed,
            timestamp: new Date().toISOString(),
            settings: settings,
            algorithm: 'Forward Fill',
            stats: {
                totalLocations: locations.size(),
                itemsPlaced: placementResult.placedCount,
                crystalStarsLocked: crystalStarsLocked,
                startingPartner: startingPartner
            },
            placementResult: placementResult,
            gameState: gameState.toJSON()
        };
        
        // Download spoiler and debug logs
        spoilerGen.downloadSpoiler(null, 'txt');
        
        if (debugLogger) {
            debugLogger.saveToFile();
        }
        
        return finalResult;
        
    } catch (error) {
        if (debugLogger) {
            debugLogger.log('ERROR', 'Generation failed', { error: error.message });
        }
        
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            settings: settings
        };
    }
}

/**
 * Locks Crystal Stars to their vanilla locations
 * @param {LocationCollection} locations - All locations
 * @param {Map} itemNameToId - Map from item name to ID
 * @returns {number} Number of Crystal Stars locked
 */
function lockCrystalStars(locations, itemNameToId) {
    const crystalStarPlacements = [
        { locationName: "Hooktail's Castle Hooktail's Room: Diamond Star", itemName: "Diamond Star" },
        { locationName: "Great Tree Entrance: Emerald Star", itemName: "Emerald Star" },
        { locationName: "Glitzville Arena: Gold Star", itemName: "Gold Star" },
        { locationName: "Creepy Steeple Upper Room: Ruby Star", itemName: "Ruby Star" },
        { locationName: "Pirate's Grotto Cortez' Hoard: Sapphire Star", itemName: "Sapphire Star" },
        { locationName: "Poshley Heights Sanctum Altar: Garnet Star", itemName: "Garnet Star" },
        { locationName: "X-Naut Fortress Boss Room: Crystal Star", itemName: "Crystal Star" }
    ];
    
    let lockedCount = 0;
    crystalStarPlacements.forEach(placement => {
        const location = locations.filter(loc => loc.name === placement.locationName)[0];
        const itemId = itemNameToId.get(placement.itemName);
        
        if (location && itemId) {
            location.lock();
            location.placeItem(itemId);
            lockedCount++;
        }
    });
    
    return lockedCount;
}

/**
 * Locks starting partner to the starting location
 * @param {LocationCollection} locations - All locations
 * @param {Map} itemNameToId - Map from item name to ID
 * @param {Object} settings - Randomizer settings
 * @returns {string} Name of starting partner locked
 */
function lockStartingPartner(locations, itemNameToId, settings) {
    const startingPartners = [
        "", "Goombella", "Koops", "Bobbery", "Yoshi", "Flurrie", "Vivian", "Ms. Mowz"
    ];
    
    const startingPartnerOption = parseInt(settings?.['Starting Partner']) || 1;
    let startingPartnerName = startingPartners[startingPartnerOption] || "Goombella";
    
    // Handle random partner selection
    if (startingPartnerOption === 8) {
        const randomIndex = Math.floor(Math.random() * 7) + 1;
        startingPartnerName = startingPartners[randomIndex];
    }
    
    const startingPartnerLocation = locations.filter(loc => loc.name === "Rogueport Center: Goombella")[0];
    const startingPartnerItemId = itemNameToId.get(startingPartnerName);
    
    if (startingPartnerLocation && startingPartnerItemId) {
        startingPartnerLocation.lock();
        startingPartnerLocation.placeItem(startingPartnerItemId);
    }
    
    return startingPartnerName;
}

/**
 * Generates spoiler data using SpoilerGenerator with sphere-by-sphere playthrough analysis
 * @param {GameState} gameState - Complete game state with placed items
 * @param {Map} itemIdToName - Map from item ID to item name
 * @param {Object} settings - Randomizer settings
 * @param {string} seed - The randomizer seed
 * @param {string} settingsString - Base64 encoded settings string
 * @returns {SpoilerGenerator} Configured SpoilerGenerator instance
 */
function generateSpoilerData(gameState, itemIdToName, settings, seed, settingsString) {
    const locations = gameState.getLocations();
    if (!locations) {
        const emptySpoiler = new SpoilerGenerator();
        emptySpoiler.initialize(seed, settings, settingsString);
        return emptySpoiler;
    }
    
    // Initialize SpoilerGenerator
    const spoilerGen = new SpoilerGenerator();
    spoilerGen.initialize(seed, settings, settingsString);
    
    // Add progression log entry for start of generation
    spoilerGen.addProgressionLog('Forward Fill generation started', '', '', gameState);
    
    // Create minimal starting game state for sphere analysis
    const analysisState = GameState.createStartingState();
    const processedLocations = new Set();
    let sphereNumber = 0;
    
    // Sphere-by-sphere analysis
    while (true) {
        sphereNumber++;
        const sphereItems = [];
        const sphereProgressionItems = [];
        let foundNewItems = false;
        
        // Find all currently accessible locations with placed items
        const accessibleLocations = locations.filter(location => 
            location.hasItem() && 
            !processedLocations.has(location.id) && 
            location.isAccessible(analysisState)
        );
        
        accessibleLocations.forEach(location => {
            const itemId = location.getItemId();
            const itemName = itemIdToName.get(itemId);
            
            if (itemName) {
                const sphereItem = {
                    itemName: itemName,
                    location: location
                };
                
                sphereItems.push(sphereItem);
                
                // Add location-item pair to spoiler
                spoilerGen.addLocationItemPair(location, itemName, itemId, sphereNumber.toString());
                
                // Check if this is a progression item
                const isProgressionItem = isProgressionByName(itemName);
                if (isProgressionItem) {
                    sphereProgressionItems.push(sphereItem);
                }
                
                processedLocations.add(location.id);
                foundNewItems = true;
            }
        });
        
        // If no new items found, we're done
        if (!foundNewItems || sphereItems.length === 0) {
            break;
        }
        
        // Add sphere to spoiler generator
        spoilerGen.addItemSphere(sphereNumber, sphereProgressionItems, analysisState);
        
        // Add all sphere items to game state
        sphereItems.forEach(item => {
            analysisState.addItem(item.itemName, 1);
        });
        
        // Safety check to prevent infinite loops
        if (sphereNumber > 50) {
            break;
        }
    }
    
    // Add final progression log entry
    spoilerGen.addProgressionLog('Forward Fill sphere analysis complete', '', '', analysisState);
    
    return spoilerGen;
}

/**
 * Determines if an item is progression-related based on its name
 * @param {string} itemName - The name of the item
 * @returns {boolean} True if the item is considered progression
 */
function isProgressionByName(itemName) {
    // Crystal Stars (but exclude Star Pieces and other non-Crystal Stars)
    if (itemName.includes('Star') && itemName !== 'Star Piece' && itemName !== 'Star Key' && 
        !itemName.includes('Shooting Star') && !itemName.includes('Star Points')) {
        return true;
    }
    
    // Partner items
    const partners = ['Goombella', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz'];
    if (partners.includes(itemName)) {
        return true;
    }
    
    // Progressive items (exact match for Progressive prefix)
    if (itemName.startsWith('Progressive ')) {
        return true;
    }
    
    // Curses (exact matches)
    const curses = ['Paper Curse', 'Tube Curse', 'Boat Curse', 'Plane Curse'];
    if (curses.includes(itemName)) {
        return true;
    }
    
    // Keys (be more specific to avoid false positives)
    const keys = [
        'Black Key', 'Red Key', 'Blue Key', 'Gate Handle', 'Castle Key',
        'Station Key 1', 'Station Key 2', 'Card Key 1', 'Card Key 2', 'Card Key 3', 'Card Key 4',
        'Elevator Key', 'Palace Key', 'Shop Key', 'Steeple Key', 'Grotto Key',
        'Storage Key 1', 'Storage Key 2'
    ];
    if (keys.some(key => itemName.includes(key))) {
        return true;
    }
    
    // Story progression items (exact matches to avoid false positives)
    const storyItems = [
        'Contact Lens', 'Necklace', 'Moon Stone', 'Sun Stone', 'Wedding Ring', 'Data Disk',
        'Chuckola Cola', 'Golden Card', 'Silver Card', 'Magical Map',
        'Autograph', 'Blanket', 'Blimp Ticket', 'Briefcase', 'Cog', 'Coconut',
        'Galley Pot', 'Gold Ring', 'Goldbob Guide', 'Old Letter', 'Puni Orb',
        'Ragged Diary', 'Shell Earrings', 'Skull Gem', 'Superbombomb', 
        'The Letter "p"', 'Train Ticket', 'Vital Paper'
    ];
    if (storyItems.includes(itemName)) {
        return true;
    }
    
    return false;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateForwardFill };
} else if (typeof window !== 'undefined') {
    window.generateForwardFill = generateForwardFill;
}