// Main randomizer generation script for TTYD Randomizer
// Completely reworked to use new GameState architecture with integrated locations and itemPool

// Global debug logger instance
let debugLogger = null;

/**
 * Validates if the game is beatable with current item placement using sphere-by-sphere analysis
 * @param {GameState} gameState - Complete game state with locations, items, and rules
 * @param {Map} itemIdToName - Map from item ID to item name
 * @returns {boolean} True if game is beatable (final location is reachable)
 */
function validateGameBeatable(gameState, itemIdToName) {
    // 1. Start with a fresh state that has proper starting inventory  
    const testState = GameState.createStartingState();
    const locations = gameState.getLocations();
    
    
    if (!locations) {
        return false;
    }
    
    // Reset all location collected status for simulation
    locations.forEach(location => {
        location.setCollected(false);
    });
    
    let iterations = 0;
    const maxIterations = 100;
    let totalItemsCollected = 0;
    
    // 2. Sweep all accessible locations for items, recheck for accessible locations 
    // and claim items again until 0 new accessible locations remain
    while (iterations < maxIterations) {
        iterations++;
        let newItemsThisIteration = 0;
        const iterationStartItems = testState.getStats().totalItems;
        const iterationStartStars = testState.getStarsCount();
        
        // Find all currently accessible locations with items
        const accessibleLocations = locations.filter(location => 
            location.hasItem() && 
            !location.isCollected() && 
            location.isAccessible(testState)
        );
        
        // Debug: Log sphere iteration details
        if (debugLogger) {
            debugLogger.logSphereIteration(iterations, accessibleLocations.length, 0, testState);
        }
        
        // Count remaining uncollected items for progress tracking
        const uncollectedItemsCount = locations.filter(loc => loc.hasItem() && !loc.isCollected()).length;
        
        // If no new accessible locations, we're done with this sweep
        if (accessibleLocations.length === 0) {
            break;
        }
        
        // Collect all items from accessible locations
        const collectedItems = [];
        accessibleLocations.forEach(location => {
            location.setCollected(true);
            newItemsThisIteration++;
            totalItemsCollected++;
            
            // Add item to state (player found it!)
            const itemId = location.getItemId();
            if (itemId && itemIdToName) {
                const itemName = itemIdToName.get(itemId);
                if (itemName) {
                    testState.addItem(itemName, 1);
                    collectedItems.push({ location, itemName });
                }
            }
        });
        
        // Debug: Update sphere iteration with collected items
        if (debugLogger && collectedItems.length > 0) {
            debugLogger.logSphere(iterations, accessibleLocations, collectedItems, testState);
        }
        
    }
    
    
    // Check if the final location is reachable - this is our victory condition
    let finalLocation = locations.filter(loc => loc.name === "Palace of Shadow Final Staircase: Ultra Shroom")[0];
    if (!finalLocation) {
        const alternativeFinalLocation = locations.filter(loc => loc.name.includes("Palace of Shadow") && loc.name.includes("Final"))[0];
        if (!alternativeFinalLocation) {
            console.error(`❌ No final location found!`);
            return false;
        }
        finalLocation = alternativeFinalLocation;
        console.log(`🔍 Using alternative final location: ${finalLocation.name}`);
    }
    
    // Game is beatable if we can reach the final location
    const isReachable = finalLocation.isAccessible(testState);
    
    
    return isReachable;
}

/**
 * Validates that 100% of locations with items are accessible to the player
 * @param {GameState} gameState - Complete game state with all items placed
 * @param {Map} itemIdToName - Map from item ID to item name
 * @returns {Object} Validation result with success status and inaccessible locations
 */
function validate100PercentAccessibility(gameState, itemIdToName) {
    // Use the same sweep logic as validateGameBeatable to find all accessible locations
    // Start with a fresh state that has proper starting inventory
    const testState = GameState.createStartingState();
    const locations = gameState.getLocations();
    
    if (!locations) {
        return { success: false, inaccessibleCount: 0, inaccessibleLocations: [] };
    }
    
    
    // Reset all location collected status
    locations.forEach(location => {
        location.setCollected(false);
    });
    
    let iterations = 0;
    const maxIterations = 100;
    
    // Sweep all accessible locations
    while (iterations < maxIterations) {
        iterations++;
        
        const accessibleLocations = locations.filter(location => 
            location.hasItem() && 
            !location.isCollected() && 
            location.isAccessible(testState)
        );
        
        // Debug: Log accessibility validation iteration
        if (debugLogger) {
            debugLogger.logSphereIteration(`100%-${iterations}`, accessibleLocations.length, 0, testState);
        }
        
        if (accessibleLocations.length === 0) {
            break;
        }
        
        // Collect all items from accessible locations
        const collectedItems = [];
        accessibleLocations.forEach(location => {
            location.setCollected(true);
            
            const itemId = location.getItemId();
            if (itemId && itemIdToName) {
                const itemName = itemIdToName.get(itemId);
                if (itemName) {
                    testState.addItem(itemName, 1);
                    collectedItems.push({ location, itemName });
                    // Crystal Stars automatically update the parser's stars logic when added as items
                }
            }
        });
        
        // Debug: Log collected items in this accessibility validation sphere
        if (debugLogger && collectedItems.length > 0) {
            debugLogger.logSphere(`100%-${iterations}`, accessibleLocations, collectedItems, testState);
        }
    }
    
    // Find any locations with items that are still not collected (inaccessible)
    const inaccessibleLocations = locations.filter(location => 
        location.hasItem() && !location.isCollected()
    );
    
    const success = inaccessibleLocations.length === 0;
    
    
    return {
        success,
        inaccessibleCount: inaccessibleLocations.length,
        inaccessibleLocations: inaccessibleLocations.map(loc => ({
            name: loc.name,
            itemName: itemIdToName.get(loc.getItemId()) || 'Unknown'
        }))
    };
}

/**
 * Identifies if an item should be treated as progression based on items.json data
 * @param {Object} item - Item object with name and progression properties
 * @returns {boolean} True if item is progression
 */
function isProgressionItem(item) {
    const name = item.name || item.itemName;
    if (!name) return false;
    
    // ONLY use progression property from items.json - only "progression" items for assumed fill
    // "useful" and "filler" items are treated as filler for randomization purposes
    if (item.progression === "progression") {
        return true;
    }
    
    // Everything else (useful, filler, null/undefined) is treated as filler
    return false;
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
 * Runs assumed fill logic specifically for progression items
 * @param {GameState} gameState - Complete game state
 * @param {Array} progressionItems - Array of progression items to place
 * @param {Array} fillerItems - Array of filler items (for validation state)
 * @param {Map} itemIdToName - Item ID to name mapping
 * @returns {Object} Result of progression placement
 */
function runProgressionAssumedFill(gameState, progressionItems, fillerItems, itemIdToName) {
    const maxRetries = 10;
    
    for (let retryAttempt = 0; retryAttempt < maxRetries; retryAttempt++) {
        if (retryAttempt > 0) {
            // Clear all non-locked items (preserves locked Crystal Stars and starting partner)
            gameState.getLocations().clearUnlockedPlacedItems();
        }
        
        const result = attemptProgressionAssumedFill(gameState, progressionItems, fillerItems, itemIdToName, retryAttempt);
        
        if (result.success) {
            return result;
        }
        
        console.log(`❌ RETRY: Assumed fill failed on attempt ${retryAttempt + 1}/${maxRetries}`);
    }
    
    console.error(`🚨 FINAL FAILURE: Assumed fill failed after ${maxRetries} attempts`);
    return {
        success: false,
        placedItems: [],
        attempts: 0,
        error: `Failed after ${maxRetries} retry attempts`
    };
}

function attemptProgressionAssumedFill(gameState, progressionItems, fillerItems, itemIdToName, retryAttempt) {
    const locations = gameState.getLocations();
    const unfilled = locations.getAvailableLocations().filter(loc => loc.isEmpty());
    const placedItems = [];
    
    // Debug: Log assumed fill start
    if (debugLogger) {
        debugLogger.logAssumedFillStart(progressionItems.length, fillerItems.length, unfilled.length);
    }
    
    // Shuffle progression items with improved Fisher-Yates algorithm
    const shuffled = [...progressionItems];
    const getRandomIndex = (max) => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return Math.floor((array[0] / (0xFFFFFFFF + 1)) * max);
        }
        return Math.floor(Math.random() * max);
    };
    
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = getRandomIndex(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    let attempts = 0;
    const maxAttempts = 10000;
    
    while (shuffled.length > 0 && attempts < maxAttempts) {
        attempts++;
        
        if (unfilled.length === 0) {
            console.error("Ran out of locations for progression placement");
            return { success: false, placedItems, attempts };
        }
        
        // 1. Pick a truly random item from the remaining items
        const randomIndex = getRandomIndex(shuffled.length);
        const item = shuffled.splice(randomIndex, 1)[0];
        
        // 2. Create "all state" = player has ALL progression items except the one we're placing
        const assumedInventory = GameState.createStartingState();
        assumedInventory.setLocations(gameState.getLocations()); // Use same LocationCollection!
        
        // Count how many of each remaining progression item we should have in the "all state"
        // We assume we have all progression items except the one we're currently placing
        const itemCounts = new Map();
        for (const progItem of shuffled) {
            if (progItem.name !== item.name) {
                const currentCount = itemCounts.get(progItem.name) || 0;
                itemCounts.set(progItem.name, currentCount + 1);
            }
        }
        
        // Add progression items with their proper counts to the assumed inventory
        for (const [itemName, count] of itemCounts.entries()) {
            assumedInventory.addItem(itemName, count);
        }
        
        // Add items from locked locations that are accessible with this assumed inventory
        // These are always available (Crystal Stars + starting partner) so add them once
        const lockedLocations = gameState.getLocations().filter(loc => loc.isLocked() && loc.hasItem());
        const addedLockedItems = new Set(); // Prevent duplicate additions
        
        for (const lockedLoc of lockedLocations) {
            if (lockedLoc.isAccessible(assumedInventory)) {
                const itemId = lockedLoc.getItemId();
                if (itemId && itemIdToName) {
                    const itemName = itemIdToName.get(itemId);
                    if (itemName && !addedLockedItems.has(itemName)) {
                        assumedInventory.addItem(itemName, 1);
                        addedLockedItems.add(itemName);
                    }
                }
            }
        }
        
        
        // 3. Get all locations reachable with this assumed inventory
        const candidateLocations = unfilled.filter(location => 
            location.isEmpty() && location.isAccessible(assumedInventory)
        );
        
        // Debug: Log assumed inventory analysis for this item
        if (debugLogger) {
            debugLogger.logAssumedInventoryAnalysis(item.name, assumedInventory, candidateLocations, itemCounts, placedItems.length, shuffled.length);
        }
        
        // Shuffle candidate locations to improve randomization
        for (let i = candidateLocations.length - 1; i > 0; i--) {
            const j = getRandomIndex(i + 1);
            [candidateLocations[i], candidateLocations[j]] = [candidateLocations[j], candidateLocations[i]];
        }
        
        
        // 4. If no valid locations, this is a CRITICAL ERROR in assumed fill
        if (candidateLocations.length === 0) {
            console.error(`🚨 ASSUMED FILL FAILURE: No accessible locations for ${item.name}`);
            console.error(`🚨 Remaining items to place: ${shuffled.length + 1}`);
            console.error(`🚨 Items successfully placed so far: ${placedItems.length}`);
            console.error(`🚨 Total unfilled locations: ${unfilled.length}`);
            
            // Detailed assumed inventory analysis
            console.error(`🚨 ASSUMED INVENTORY ANALYSIS:`);
            console.error(`   Total items in assumed inventory: ${assumedInventory.getStats().totalItems}`);
            console.error(`   Crystal Stars in assumed inventory: ${assumedInventory.getStarsCount()}`);
            
            // Show all items in assumed inventory
            const allAssumedItems = assumedInventory.getAllItems();
            const itemsList = [];
            for (const [itemName, count] of allAssumedItems.entries()) {
                if (count > 0) {
                    itemsList.push(`${itemName}(${count})`);
                }
            }
            console.error(`   Items: ${itemsList.slice(0, 10).join(', ')}${itemsList.length > 10 ? `... (${itemsList.length} total unique items)` : ''}`);
            
            // Count accessible vs inaccessible unfilled locations
            const accessibleUnfilled = unfilled.filter(loc => loc.isAccessible(assumedInventory));
            console.error(`🚨 LOCATION ACCESSIBILITY:`);
            console.error(`   Accessible unfilled locations: ${accessibleUnfilled.length}/${unfilled.length}`);
            console.error(`   But none are empty or candidate locations: ${candidateLocations.length}`);
            
            // Test a few unfilled locations to see why they're not accessible
            console.error(`🚨 Testing first 5 unfilled locations:`);
            unfilled.slice(0, 5).forEach(loc => {
                const accessible = loc.isAccessible(assumedInventory);
                const empty = loc.isEmpty();
                console.error(`  ${loc.name}: ${accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}, ${empty ? 'EMPTY' : 'HAS ITEM'} (${loc.rules?.length || 0} rules)`);
                
                // Debug: Log detailed accessibility for failed locations
                if (debugLogger) {
                    debugLogger.logAccessibility(loc.name, accessible, loc.rules, assumedInventory);
                }
            });
            
            return { 
                success: false, 
                placedItems, 
                attempts,
                error: `No valid locations found for ${item.name} in assumed fill`,
                failedItem: item.name
            };
        }
        
        // 5. Pick a random valid location and place the item
        const locationIndex = getRandomIndex(candidateLocations.length);
        const location = candidateLocations[locationIndex];
        
        // Debug: Log item placement
        if (debugLogger) {
            debugLogger.logItemPlacement(item.name, candidateLocations.length, location, attempts, assumedInventory);
        }
        
        // Place the item (no validation needed - we know location is reachable)
        location.placeItem(item.id);
        
        // ✅ Success - remove location from unfilled list
        const unfilledIndex = unfilled.indexOf(location);
        unfilled.splice(unfilledIndex, 1);
        placedItems.push({ location: location.name, item: item.name });
        
        // Debug: Log successful placements for early items
        if (placedItems.length <= 5 || placedItems.length % 25 === 0) {
            console.log(`✅ Placed ${item.name} → ${location.name}`);
        }
        
        // Re-shuffle remaining progression items after each placement to improve randomization
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = getRandomIndex(i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        if (attempts % 1000 === 0) {
            // Additional shuffle every 1000 attempts as backup
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = getRandomIndex(i + 1);
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
        }
    }
    
    const success = shuffled.length === 0;
    
    // Debug: Log assumed fill completion
    if (debugLogger) {
        debugLogger.logAssumedFillComplete(success, placedItems.length, attempts, shuffled);
    }
    
    if (!success) {
        console.error(`❌ Failed to place ${shuffled.length} progression items:`);
        shuffled.slice(0, 5).forEach(item => {
            console.error(`  - ${item.name}`);
        });
    }
    
    return { success, placedItems, attempts, unplacedItems: shuffled };
}

/**
 * Improved assumed fill algorithm that separates progression and filler items
 * @param {GameState} gameState - Complete game state with locations and item pool
 * @param {Array} itemsData - Original items data for progression classification
 * @param {Map} itemIdToName - Map from item ID to item name
 * @returns {Object} Result object with success status and placement info
 */
async function performImprovedFill(gameState, itemsData, itemIdToName) {
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
    
    
    // Step 1: Split items into progression and filler
    const { progression, filler } = splitItemPools(itemPool, itemsData);
    
    
    // Step 2: Place progression items with assumed fill
    const progResult = runProgressionAssumedFill(gameState, progression, filler, itemIdToName);
    
    if (!progResult.success) {
        return {
            success: false,
            error: 'Could not place all progression items',
            placedCount: progResult.placedItems.length,
            remainingItems: progression.length - progResult.placedItems.length,
            emptyLocations: locations.getAvailableLocations().filter(loc => loc.isEmpty()).length,
            totalItems: progression.length + filler.length,
            attempts: progResult.attempts,
            placedItems: progResult.placedItems
        };
    }
    
    const placedItems = [...progResult.placedItems];
    
    // Step 3: Shuffle fill filler items into remaining locations
    const remainingLocations = locations.getAvailableLocations().filter(loc => loc.isEmpty());
    const shuffledFiller = [...filler];
    
    
    // Shuffle filler items using secure randomization
    for (let i = shuffledFiller.length - 1; i > 0; i--) {
        const j = getSecureRandomIndex(i + 1);
        [shuffledFiller[i], shuffledFiller[j]] = [shuffledFiller[j], shuffledFiller[i]];
    }
    
    // Place filler items (no validation needed)
    let fillerIndex = 0;
    let fillerPlaced = 0;
    remainingLocations.forEach(location => {
        if (fillerIndex < shuffledFiller.length) {
            const item = shuffledFiller[fillerIndex++];
            location.placeItem(item.id);
            placedItems.push({ location: location.name, item: item.name });
            fillerPlaced++;
        }
    });
    
    
    // Validate the complete game state
    const accessibilityCheck = validate100PercentAccessibility(gameState, itemIdToName);
    const beatabilityCheck = validateGameBeatable(gameState, itemIdToName);
    
    const success = true;
    const remainingItems = Math.max(0, shuffledFiller.length - remainingLocations.length);
    const emptyLocations = Math.max(0, remainingLocations.length - shuffledFiller.length);
    
    
    return {
        success,
        placedCount: placedItems.length,
        remainingItems,
        emptyLocations,
        totalItems: progression.length + filler.length,
        attempts: progResult.attempts,
        placedItems,
        progressionPlaced: progResult.placedItems.length,
        fillerPlaced: placedItems.length - progResult.placedItems.length
    };
}

/**
 * Finds item ID by name using reverse lookup
 * @param {string} itemName - Name of the item
 * @param {Map} itemIdToName - Map from ID to name
 * @returns {number|null} Item ID or null if not found
 */
function findItemIdByName(itemName, itemIdToName) {
    for (const [id, name] of itemIdToName.entries()) {
        if (name === itemName) {
            return id;
        }
    }
    return null;
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
    spoilerGen.addProgressionLog('Randomizer generation started', '', '', gameState);
    
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
    spoilerGen.addProgressionLog('Sphere analysis complete', '', '', analysisState);
    
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
    
    // Reduce Shine Sprites to progression (we don't need all 40 for assumed fill)
    // Only consider them progression if we're being very conservative
    // For now, let's NOT include them as progression to reduce the count
    // if (itemName === 'Shine Sprite') {
    //     return true;
    // }
    
    return false;
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
        } else {
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
    } else {
    }
    
    return startingPartnerName;
}


/**
 * Main randomizer generation function using new GameState architecture
 * @param {Object} settings - Settings object from the UI
 * @returns {Promise<Object>} Result object with success status and spoiler data
 */
async function generate(settings = {}) {
    
    // Initialize debug logger for this generation
    debugLogger = new DebugLogger();
    debugLogger.log('GENERATION', 'Starting randomizer generation', { settings });
    
    // Initialize with a unique seed for each generation
    const seed = Date.now() + Math.random() * 1000000;
    
    try {
        // Step 1: Initialize complete randomizer state
        const gameState = await GameState.initializeRandomizerData(true);
        
        if (!gameState.getLocations() || !gameState.getItemPool()) {
            throw new Error('Failed to initialize game state with locations and item pool');
        }
        
        // Step 2: Create item name mappings
        // Reuse items data from gameState initialization to avoid duplicate fetch
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
        
        
        // Step 3: Lock special locations
        const locations = gameState.getLocations();
        
        const crystalStarsLocked = lockCrystalStars(locations, itemNameToId);
        const startingPartner = lockStartingPartner(locations, itemNameToId, settings);
        
        
        // Step 4: Update item pool to remove locked items
        const itemPool = gameState.getItemPool();
        
        // Remove Crystal Stars from pool (they have frequency 0 anyway, but just to be safe)
        const crystalStars = ["Diamond Star", "Emerald Star", "Gold Star", "Ruby Star", "Sapphire Star", "Garnet Star", "Crystal Star"];
        let totalCrystalStarsRemoved = 0;
        crystalStars.forEach(star => {
            const removedCount = itemPool.removeItem(star);
            totalCrystalStarsRemoved += removedCount;
        });
        
        // Remove starting partner from pool
        const partnerRemoved = itemPool.removeItem(startingPartner);
        
        // Step 5: Perform improved assumed fill randomization
        const placementResult = await performImprovedFill(gameState, itemsData, itemIdToName);
        
        if (!placementResult.success) {
            return {
                success: false,
                error: placementResult.error || 'Randomization failed',
                timestamp: new Date().toISOString(),
                settings: settings
            };
        }
        
        
        // Step 6: Generate spoiler data using SpoilerGenerator
        const seed = Math.random().toString(36).substring(2, 15);
        const settingsString = btoa(JSON.stringify(settings)); // Base64 encode settings
        const spoilerGen = generateSpoilerData(gameState, itemIdToName, settings, seed, settingsString);
        
        // Set final statistics
        spoilerGen.setStatistics({
            totalLocations: locations.size(),
            filledCount: placementResult.placedCount,
            accessibilityChecks: placementResult.accessibilityChecks || 0,
            placementAttempts: placementResult.placementAttempts || 0,
            generationTime: Date.now() - performance.now()
        });
        
        
        // Step 7: Create final result and download spoiler
        const finalResult = {
            success: true,
            seed: seed,
            timestamp: new Date().toISOString(),
            settings: settings,
            stats: {
                totalLocations: locations.size(),
                itemsPlaced: placementResult.placedCount,
                crystalStarsLocked: crystalStarsLocked,
                startingPartner: startingPartner
            },
            placementResult: placementResult,
            gameState: gameState.toJSON() // Include complete state for debugging
        };
        
        // Download spoiler file using SpoilerGenerator
        spoilerGen.downloadSpoiler(null, 'txt');
        
        // Save debug logs to file
        if (debugLogger) {
            debugLogger.saveToFile();
        }
        
        return finalResult;
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            settings: settings
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generate };
} else if (typeof window !== 'undefined') {
    window.generate = generate;
}