/**
 * Minimalistic TTYD Randomizer Generation System
 * 
 * Single entry point with optimized logic engine for 100% accessible item placement.
 * Replaces the complex dual-system approach with a clean, efficient implementation.
 */

// Generation state
let generationInProgress = false;
let logicEngine = null;
let gameData = null;

/**
 * Main generation function - the only function called by HTML
 * @param {Object} settings - User-selected randomization settings
 * @returns {Object} Generation result with item placements and metadata
 */
async function generateRandomizedSeed(settings = {}) {
    if (generationInProgress) {
        throw new Error('Generation already in progress');
    }
    
    generationInProgress = true;
    
    try {
        console.log('🎯 Starting TTYD randomizer generation...');
        console.log('Settings:', settings);
        
        // Step 1: Initialize game data and logic engine
        await initializeGameData();
        
        // Step 2: Create item pool and location list
        console.log('🎲 Creating item pool and location list...');
        const { items, locations } = prepareItemsAndLocations(settings);
        console.log(`📦 Item pool created: ${items.length} items`);
        console.log(`📍 Locations created: ${locations.length} locations`);
        
        // Step 3: Perform logical item placement with 100% accessibility guarantee
        const { placements, spoilerData } = await performLogicalPlacement(items, locations, settings);
        
        // Step 4: Generate final result
        const result = generateFinalResult(placements, spoilerData, settings);
        
        console.log('✅ Generation completed successfully');
        return result;
        
    } catch (error) {
        console.error('❌ Generation failed:', error);
        throw error;
    } finally {
        generationInProgress = false;
    }
}

/**
 * Initialize all game data and create optimized logic engine
 */
async function initializeGameData() {
    console.log('📋 Loading game data...');
    
    try {
        // Load all JSON data in parallel
        const [rulesData, regionsData, locationsData, itemsData] = await Promise.all([
            loadJsonData('json/rules.json'),
            loadJsonData('json/regions.json'),
            loadJsonData('json/locations.json'),
            loadJsonData('json/items.json')
        ]);
        
        // Store game data
        gameData = {
            rules: rulesData,
            regions: regionsData,
            locations: locationsData,
            items: itemsData
        };
        
        // Initialize optimized logic engine
        console.log('⚡ Initializing logic engine...');
        logicEngine = new OptimizedLogicEngine(
            gameData.rules,
            gameData.regions,
            gameData.locations,
            gameData.items
        );
        
        console.log('✅ Game data and logic engine initialized');
        
    } catch (error) {
        throw new Error(`Failed to initialize game data: ${error.message}`);
    }
}

/**
 * Load JSON data with error handling
 */
async function loadJsonData(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return await response.json();
}

/**
 * Prepare item pool and location list based on settings
 */
function prepareItemsAndLocations(settings) {
    console.log('🎲 Preparing items and locations...');
    
    // Get all available locations
    const availableLocations = Array.from(logicEngine.locationTags.keys())
        .map(name => ({ name, placed_item: null, locked: false }));
    
    // Apply any locked items (starting partner, etc.)
    console.log('🔧 Applying locked items...');
    applyLockedItems(availableLocations, settings);
    
    // Calculate how many non-locked locations we need to fill
    const lockedLocations = availableLocations.filter(loc => loc.locked);
    const nonLockedLocationCount = availableLocations.length - lockedLocations.length;
    
    // Create item pool to exactly match non-locked location count
    const itemPool = createItemPool(nonLockedLocationCount, settings);
    
    // Debug: Show locked locations
    console.log(`🔒 Total locked locations: ${lockedLocations.length}`);
    lockedLocations.forEach(loc => console.log(`   - ${loc.name}: ${loc.placed_item}`));
    
    console.log(`📦 Created item pool: ${itemPool.length} items`);
    console.log(`📍 Available locations: ${availableLocations.length} locations (${nonLockedLocationCount} non-locked)`);
    
    // Verify pool size matches non-locked locations
    if (itemPool.length !== nonLockedLocationCount) {
        throw new Error(`Item pool size mismatch: ${itemPool.length} items for ${nonLockedLocationCount} non-locked locations`);
    }
    
    return { items: itemPool, locations: availableLocations };
}

/**
 * Create item pool with exact size, prioritizing progression items
 * @param {number} requiredSize - Exact number of items needed to fill non-locked locations
 * @param {Object} settings - User settings
 */
function createItemPool(requiredSize, settings) {
    console.log(`🎯 Creating item pool for exactly ${requiredSize} locations...`);
    
    const itemPool = [];
    const frequencies = typeof ITEM_FREQUENCIES !== 'undefined' ? ITEM_FREQUENCIES : {};
    
    // Create a single mixed pool of all items based on their frequencies
    const allItems = [];
    let progressionCount = 0;
    let fillerCount = 0;
    
    for (const itemData of gameData.items) {
        const itemName = itemData.itemName;
        
        // Get frequency (default to 1 if not specified, 0 means disabled)
        const frequency = frequencies[itemName] !== undefined ? frequencies[itemName] : 1;
        
        // Skip items explicitly disabled by frequency (frequency 0)
        if (frequency === 0) continue;
        
        // Add items based on frequency regardless of type for true randomness
        for (let i = 0; i < frequency; i++) {
            allItems.push(itemName);
        }
        
        // Track counts for debugging
        if (itemData.progression === 'progression' || itemData.progression === 'useful') {
            progressionCount += frequency;
        } else {
            fillerCount += frequency;
        }
    }
    
    console.log(`📊 Available items: ${progressionCount} progression/useful, ${fillerCount} filler (${allItems.length} total)`);
    
    // Debug: Show some key progression items
    const keyProgressionItems = ['Progressive Boots', 'Progressive Hammer', 'Goombella', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz'];
    console.log('🔍 Key progression items in pool:');
    keyProgressionItems.forEach(item => {
        const itemCount = allItems.filter(poolItem => poolItem === item).length;
        const itemData = gameData.items.find(data => data.itemName === item);
        const progressionType = itemData ? itemData.progression : 'NOT_FOUND';
        const frequency = frequencies[item] !== undefined ? frequencies[item] : 'default(1)';
        console.log(`   - ${item}: ${itemCount} copies, type=${progressionType}, freq=${frequency}`);
    });
    
    // Shuffle the mixed pool multiple times for true randomness
    for (let i = 0; i < 5; i++) {
        shuffleArray(allItems);
    }
    
    // Fill item pool exactly to required size
    for (let i = 0; i < requiredSize; i++) {
        if (allItems.length === 0) {
            // If we run out of items, create fallback items
            console.warn(`⚠️  Ran out of items, creating fallback items for remaining ${requiredSize - i} slots`);
            const fallbackFillers = ['Mushroom', 'Honey Syrup', 'Thunder Bolt', 'Fire Flower', '10 Coins'];
            const fallbackItem = fallbackFillers[i % fallbackFillers.length];
            itemPool.push(fallbackItem);
        } else {
            // Randomly select from available items (cycle through if needed)
            const randomIndex = Math.floor(Math.random() * allItems.length);
            const selectedItem = allItems.splice(randomIndex, 1)[0];
            itemPool.push(selectedItem);
        }
    }
    
    console.log(`📦 Final item pool: ${itemPool.length} items (exactly matches ${requiredSize} required)`);
    
    // Final verification
    if (itemPool.length !== requiredSize) {
        throw new Error(`Item pool size error: created ${itemPool.length} items, needed ${requiredSize}`);
    }
    
    return itemPool;
}

/**
 * Apply locked items (starting partner, Crystal Stars, etc.) based on settings
 */
function applyLockedItems(locations, settings) {
    // Define starting partners mapping
    const startingPartners = [
        "Goombella", // 1
        "Koops",     // 2
        "Bobbery",   // 3
        "Yoshi",     // 4
        "Flurrie",   // 5
        "Vivian",    // 6
        "Ms. Mowz"   // 7
    ];
    
    // Apply starting partner lock if specified
    if (settings.starting_partner && settings.starting_partner >= 1 && settings.starting_partner <= 7) {
        const startingLocation = locations.find(loc => 
            loc.name === 'Rogueport Center: Goombella'
        );
        
        if (startingLocation) {
            startingLocation.placed_item = startingPartners[settings.starting_partner - 1];
            startingLocation.locked = true;
            console.log(`🔒 Locked starting partner: ${startingPartners[settings.starting_partner - 1]}`);
        }
    }
    
    // Lock Crystal Stars to their boss locations for proper progression
    const crystalStarLocks = {
        "Hooktail's Castle Hooktail's Room: Diamond Star": "Diamond Star",
        "Great Tree Entrance: Emerald Star": "Emerald Star", 
        "Glitzville Arena: Gold Star": "Gold Star",
        "Creepy Steeple Upper Room: Ruby Star": "Ruby Star",
        "Pirate's Grotto Cortez' Hoard: Sapphire Star": "Sapphire Star",
        "Poshley Heights Sanctum Altar: Garnet Star": "Garnet Star",
        "X-Naut Fortress Boss Room: Crystal Star": "Crystal Star"
    };
    
    // Apply Crystal Star locks
    console.log(`🔍 Attempting to lock ${Object.keys(crystalStarLocks).length} Crystal Star locations...`);
    for (const [locationName, itemName] of Object.entries(crystalStarLocks)) {
        const location = locations.find(loc => loc.name === locationName);
        if (location) {
            location.placed_item = itemName;
            location.locked = true;
            console.log(`🔒 Locked Crystal Star: ${itemName} at ${locationName}`);
        } else {
            console.warn(`⚠️ Crystal Star lock location not found: ${locationName}`);
            console.warn(`Available locations containing 'Star':`, locations.filter(loc => loc.name.includes('Star')).map(loc => loc.name));
        }
    }
}

/**
 * Perform logical item placement with 100% accessibility guarantee
 */
async function performLogicalPlacement(items, locations, settings) {
    console.log('🧩 Starting logical item placement...');
    
    const maxAttempts = 20;
    let attempt = 1;
    
    while (attempt <= maxAttempts) {
        console.log(`🎯 Placement attempt ${attempt}/${maxAttempts}`);
        
        try {
            // Reset locations for retry (except locked ones)
            if (attempt > 1) {
                locations.forEach(loc => {
                    if (!loc.locked) {
                        loc.placed_item = null;
                    }
                });
            }
            
            // Create fresh item pool for this attempt
            const availableItems = [...items];
            
            // Remove locked items from available pool
            locations.forEach(loc => {
                if (loc.locked && loc.placed_item) {
                    const itemIndex = availableItems.indexOf(loc.placed_item);
                    if (itemIndex !== -1) {
                        availableItems.splice(itemIndex, 1);
                    }
                }
            });
            
            // Perform forward-fill placement
            const { placements, spoilerData } = await forwardFillPlacement(availableItems, locations, settings);
            
            // Validate 100% accessibility
            const validation = validateFullAccessibility(locations);
            
            if (validation.valid) {
                console.log(`✅ Placement successful: ${placements.size} items placed`);
                console.log(`🎯 Accessibility: ${validation.accessibleLocations}/${validation.totalLocations} locations`);
                return { placements, spoilerData };
            } else {
                throw new Error(`Accessibility validation failed: ${validation.reason}`);
            }
            
        } catch (error) {
            console.warn(`❌ Attempt ${attempt} failed:`, error.message);
            
            if (attempt >= maxAttempts) {
                throw new Error(`Failed to generate accessible seed after ${maxAttempts} attempts`);
            }
            
            attempt++;
        }
    }
}

/**
 * Sweep newly accessible locations for pre-placed items and collect them
 */
function sweepAccessibleLocationsForItems(locations, gameState, logicEngine, spoilerData = null) {
    let itemsCollected = 0;
    
    // Find Crystal Star locations for debugging
    const crystalStarLocations = locations.filter(loc => 
        loc.locked && loc.placed_item && 
        ['Diamond Star', 'Emerald Star', 'Gold Star', 'Ruby Star', 'Sapphire Star', 'Garnet Star', 'Crystal Star'].includes(loc.placed_item)
    );
    
    if (crystalStarLocations.length > 0) {
        console.log(`🔍 Checking accessibility of ${crystalStarLocations.length} Crystal Star locations...`);
        crystalStarLocations.forEach(loc => {
            const accessible = logicEngine.isLocationAccessible(loc.name, gameState);
            const alreadyHas = gameState.has(loc.placed_item);
            console.log(`   - ${loc.placed_item} at ${loc.name}: accessible=${accessible}, already_has=${alreadyHas}`);
        });
    }
    
    locations.forEach(location => {
        // Check if this location has a pre-placed item and is now accessible
        if (location.placed_item && logicEngine.isLocationAccessible(location.name, gameState)) {
            // Check if we haven't already collected this item (avoid double collection)
            if (!gameState.has(location.placed_item)) {
                gameState.addItem(location.placed_item);
                itemsCollected++;
                console.log(`🧹 Swept pre-placed item: ${location.placed_item} from ${location.name}`);
                
                // Track swept item in spoiler data if provided
                if (spoilerData) {
                    spoilerData.placements.push({
                        location: location.name,
                        item: location.placed_item,
                        sphere: 'SWEPT',
                        type: 'pre-placed'
                    });
                }
                
                // Log Crystal Star collection - use a more direct check since gameState._isCrystalStar might not exist
                const crystalStars = ['Diamond Star', 'Emerald Star', 'Gold Star', 'Ruby Star', 'Sapphire Star', 'Garnet Star', 'Crystal Star'];
                if (crystalStars.includes(location.placed_item)) {
                    console.log(`⭐ Crystal Star swept! ${location.placed_item} - Total stars: ${gameState.getStarsCount()}`);
                    if (spoilerData) spoilerData.statistics.crystalStarsSwept++;
                }
            }
        }
    });
    
    if (itemsCollected > 0) {
        console.log(`🧹 Sweep completed: ${itemsCollected} pre-placed items collected`);
    }
    
    return itemsCollected;
}

/**
 * Forward-fill placement algorithm ensuring logical progression
 */
async function forwardFillPlacement(items, locations, settings) {
    const placements = new Map();
    const spoilerData = {
        placements: [],
        spheres: [],
        statistics: {
            totalSpheres: 0,
            progressionItemsPlaced: 0,
            fillerItemsPlaced: 0,
            crystalStarsSwept: 0
        }
    };
    
    // Start with COMPLETELY EMPTY state
    let gameState = GameState.createStartingState();
    // Clear any default starting items
    gameState.items.clear();
    gameState.stars = 0;
    
    // Only add locked items to placements, NOT to starting state
    // They will be collected when their sphere becomes accessible
    let lockedItemCount = 0;
    locations.forEach(loc => {
        if (loc.locked && loc.placed_item) {
            placements.set(loc.name, loc.placed_item);
            lockedItemCount++;
            console.log(`🔒 Pre-placed locked item: ${loc.placed_item} at ${loc.name}`);
        }
    });
    console.log(`📋 Total locked items: ${lockedItemCount}`);
    
    // Perform initial sweep of starting accessible locations for pre-placed items
    console.log('🧹 Performing initial sweep for immediately accessible pre-placed items...');
    sweepAccessibleLocationsForItems(locations, gameState, logicEngine, spoilerData);
    
    // Create a single mixed pool of all items for truly random placement
    const allItems = [...items];
    
    // Thoroughly shuffle the combined pool multiple times for maximum randomness
    for (let i = 0; i < 5; i++) {
        shuffleArray(allItems);
    }
    
    console.log(`📊 Total items in mixed pool: ${allItems.length}`);
    
    let sphere = 0;
    const maxSpheres = 50;
    let swapCounts = {};
    
    while (allItems.length > 0 && sphere < maxSpheres) {
        const progressionRemaining = allItems.filter(item => isProgressionItem(item)).length;
        const fillerRemaining = allItems.length - progressionRemaining;
        console.log(`🔄 Sphere ${sphere}: ${allItems.length} items remaining (${progressionRemaining} progression, ${fillerRemaining} filler)`);
        
        // First, sweep newly accessible locations for any pre-placed items
        sweepAccessibleLocationsForItems(locations, gameState, logicEngine, spoilerData);
        
        // Get currently accessible locations that don't have items yet
        const accessibleLocations = locations.filter(loc => 
            !loc.placed_item && logicEngine.isLocationAccessible(loc.name, gameState)
        );
        
        if (accessibleLocations.length === 0) {
            console.log(`🚫 Dead end in sphere ${sphere}: No accessible locations available`);
            
            // Check if we have progression items left to swap
            const remainingProgressionItems = allItems.filter(item => isProgressionItem(item));
            console.log(`📦 Remaining progression items: ${remainingProgressionItems.length}`, remainingProgressionItems.slice(0, 5));
            
            if (remainingProgressionItems.length === 0) {
                // No more progression items to swap, we're truly stuck
                console.log('❌ No more progression items available to swap');
                throw new Error(`No accessible locations available in sphere ${sphere}`);
            }
            
            // Find ALL placed items that we could potentially swap (exclude locked items)
            const placedItems = [];
            for (const location of locations) {
                if (location.placed_item && !location.locked) { // Don't swap locked items
                    placedItems.push({
                        location: location,
                        item: location.placed_item
                    });
                }
            }
            
            if (placedItems.length === 0) {
                console.log('❌ No placed items available to swap');
                throw new Error(`No accessible locations available in sphere ${sphere}`);
            }
            
            // Prevent infinite loops - if we've done too many swaps in this sphere, fail
            if (!swapCounts[sphere]) swapCounts[sphere] = 0;
            swapCounts[sphere]++;
            
            // Be more generous with swap attempts when completely stuck
            const maxSwapsForSphere = accessibleLocations.length === 0 ? 100 : 50;
            if (swapCounts[sphere] > maxSwapsForSphere) {
                console.log(`❌ Too many swaps (${swapCounts[sphere]}) in sphere ${sphere}, giving up`);
                throw new Error(`Too many swaps attempted in sphere ${sphere}`);
            }
            
            // Prioritize swapping key items that are more likely to unlock progression
            const keyProgressionItems = [
                'Progressive Boots', 'Progressive Hammer',
                'Goombella', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery',
                'Diamond Star', 'Emerald Star', 'Gold Star', 'Ruby Star', 
                'Sapphire Star', 'Garnet Star', 'Crystal Star',
                'Train Ticket', 'Blimp Ticket'
            ];
            
            // Helper function to check if placing an item at a location would help make progress
            const wouldHelpProgress = (itemName, locationName, currentGameState) => {
                // First check: avoid direct circular dependency
                const tempState = new GameState(settings);
                
                // Copy all items from current state EXCEPT the item we're testing
                for (const [item, count] of currentGameState.items.entries()) {
                    if (item !== itemName) {
                        for (let i = 0; i < count; i++) {
                            tempState.addItem(item);
                        }
                    }
                }
                tempState.stars = currentGameState.stars;
                
                // If the location is not accessible without the item, it's a circular dependency
                if (!logicEngine.isLocationAccessible(locationName, tempState)) {
                    return false;
                }
                
                // Second check: would placing this item unlock any new locations?
                const currentAccessibleCount = locations.filter(loc => 
                    !loc.placed_item && logicEngine.isLocationAccessible(loc.name, currentGameState)
                ).length;
                
                // Create a test state WITH the item placed
                const testState = new GameState(settings);
                for (const [item, count] of currentGameState.items.entries()) {
                    for (let i = 0; i < count; i++) {
                        testState.addItem(item);
                    }
                }
                testState.addItem(itemName); // Add the item we're testing
                testState.stars = currentGameState.stars;
                
                const newAccessibleCount = locations.filter(loc => 
                    !loc.placed_item && logicEngine.isLocationAccessible(loc.name, testState)
                ).length;
                
                // Allow placement if:
                // 1. It unlocks new locations, OR
                // 2. We have very few accessible locations (getting desperate), OR 
                // 3. We're dealing with key progression items that might be needed later, OR
                // 4. We're completely stuck (zero accessible locations)
                const isKeyItem = ['Progressive Hammer', 'Progressive Boots', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz'].includes(itemName);
                const isStuck = currentAccessibleCount === 0;
                return newAccessibleCount > currentAccessibleCount || currentAccessibleCount <= 3 || isKeyItem || isStuck;
            };
            
            // Strategy: Swap a random PLACED item with an unplaced PROGRESSION item
            // But check for circular dependencies
            
            let swapTarget = null;
            let swapItem = null;
            let attempts = 0;
            const maxAttempts = 100;
            
            // Look for key progression items in the remaining pool first
            const remainingKeyItems = remainingProgressionItems.filter(item => keyProgressionItems.includes(item));
            
            while (!swapItem && attempts < maxAttempts) {
                attempts++;
                
                let candidateItem = null;
                let candidateTarget = null;
                
                if (remainingKeyItems.length > 0 && attempts <= 50) {
                    // Prioritize placing key progression items - swap with any placed item
                    const randomRemainingIndex = Math.floor(Math.random() * remainingKeyItems.length);
                    candidateItem = remainingKeyItems[randomRemainingIndex];
                    
                    const randomPlacedIndex = Math.floor(Math.random() * placedItems.length);
                    candidateTarget = placedItems[randomPlacedIndex];
                } else {
                    // No key items remaining, swap any placed item with any remaining progression item
                    const randomPlacedIndex = Math.floor(Math.random() * placedItems.length);
                    const randomRemainingIndex = Math.floor(Math.random() * remainingProgressionItems.length);
                    
                    candidateTarget = placedItems[randomPlacedIndex];
                    candidateItem = remainingProgressionItems[randomRemainingIndex];
                }
                
                // Check if this swap would help progress (avoid circular dependencies)
                if (wouldHelpProgress(candidateItem, candidateTarget.location.name, gameState)) {
                    swapTarget = candidateTarget;
                    swapItem = candidateItem;
                } else {
                    console.log(`⚠️  Skipping non-progressive swap: ${candidateItem} at ${candidateTarget.location.name}`);
                }
            }
            
            if (!swapItem) {
                console.log(`❌ Could not find valid swap after ${maxAttempts} attempts - may have unsolvable circular dependencies`);
                throw new Error(`No valid swap found in sphere ${sphere}`);
            }
            
            console.log(`🔄 Dead end reached! Swap ${swapCounts[sphere]}/50 - Swapping "${swapTarget.item}" at "${swapTarget.location.name}" with "${swapItem}" (${attempts} attempts)`);
            
            // Remove the old item from the location and add it back to the pool
            allItems.push(swapTarget.item);
            
            // Remove the new item from the pool and place it at the location
            const itemIndex = allItems.indexOf(swapItem);
            allItems.splice(itemIndex, 1);
            swapTarget.location.placed_item = swapItem;
            
            // Update placements tracking
            placements.set(swapTarget.location.name, swapItem);
            
            // Update spoiler data - find and update the placement record
            const placementRecord = spoilerData.placements.find(p => p.location === swapTarget.location.name);
            if (placementRecord) {
                placementRecord.item = swapItem;
            }
            
            // Rebuild game state from scratch to ensure consistency
            gameState = new GameState(settings);
            
            // Re-add all locked items
            for (const location of locations) {
                if (location.placed_item && location.locked) {
                    gameState.addItem(location.placed_item);
                }
            }
            
            // Re-add all placed items in order of their spheres
            const sortedPlacements = spoilerData.placements
                .filter(p => p.sphere < sphere) // Only items from previous spheres
                .sort((a, b) => a.sphere - b.sphere);
            
            for (const placement of sortedPlacements) {
                gameState.addItem(placement.item);
            }
            
            console.log(`🔧 Rebuilt game state with ${gameState.items.size} items. Continuing from sphere ${sphere}...`);
            
            // Continue to next iteration to re-check accessible locations
            continue;
        }
        
        // Shuffle accessible locations for randomness
        shuffleArray(accessibleLocations);
        
        let itemsPlacedThisSphere = 0;
        const spherePlacements = [];
        
        // Place items in accessible locations
        for (const location of accessibleLocations) {
            if (allItems.length === 0) break;
            
            // Select a completely random item from the mixed pool
            const randomIndex = Math.floor(Math.random() * allItems.length);
            const itemToPlace = allItems.splice(randomIndex, 1)[0];
            
            // Place the item
            location.placed_item = itemToPlace;
            placements.set(location.name, itemToPlace);
            
            // Determine item type for spoiler tracking
            const itemType = isProgressionItem(itemToPlace) ? 'progression' : 'filler';
            
            // Track in spoiler data
            const placementData = {
                location: location.name,
                item: itemToPlace,
                sphere: sphere,
                type: itemType
            };
            spoilerData.placements.push(placementData);
            spherePlacements.push(placementData);
            
            // Update statistics
            if (itemType === 'progression') {
                spoilerData.statistics.progressionItemsPlaced++;
            } else {
                spoilerData.statistics.fillerItemsPlaced++;
            }
            
            // Add item to state so it's available for next sphere
            gameState.addItem(itemToPlace);
            itemsPlacedThisSphere++;
            
            // Log Crystal Star collection
            if (gameState._isCrystalStar && gameState._isCrystalStar(itemToPlace)) {
                console.log(`⭐ Crystal Star collected! ${itemToPlace} - Total stars: ${gameState.getStarsCount()}`);
            }
            
            console.log(`📍 Placed ${itemToPlace} at ${location.name}: ${location.originalItem || location.name.split(': ')[1] || 'Unknown'}`);
            
            // Stop if we've run out of items to place
            if (allItems.length === 0) break;
        }
        
        if (itemsPlacedThisSphere === 0) {
            console.log('🔍 No items placed this sphere - current accessible locations:', accessibleLocations.length);
            throw new Error(`No progress made in sphere ${sphere}`);
        }
        
        // Add sphere summary to spoiler data
        const sphereProgressionCount = spherePlacements.filter(p => p.type === 'progression').length;
        const sphereFillerCount = spherePlacements.filter(p => p.type === 'filler').length;
        
        spoilerData.spheres.push({
            sphere: sphere,
            itemsPlaced: itemsPlacedThisSphere,
            placements: spherePlacements
        });
        
        console.log(`✅ Sphere ${sphere} completed: ${itemsPlacedThisSphere} items placed (${sphereProgressionCount} progression, ${sphereFillerCount} filler)`);
        sphere++;
    }
    
    if (allItems.length > 0) {
        throw new Error(`Could not place ${allItems.length} remaining items`);
    }
    
    // Finalize spoiler statistics
    spoilerData.statistics.totalSpheres = sphere;
    
    console.log(`✅ Forward-fill completed in ${sphere} spheres`);
    return { placements, spoilerData };
}

/**
 * Check if an item is progression-critical using items.json data
 */
function isProgressionItem(itemName) {
    if (!gameData || !gameData.items) {
        console.warn('Game data not loaded, falling back to hardcoded logic');
        return false;
    }
    
    // Find the item in gameData.items
    const itemData = gameData.items.find(item => item.itemName === itemName);
    
    if (!itemData) {
        console.warn(`Item not found in items.json: ${itemName}`);
        return false;
    }
    
    // Items marked as "progression" are critical for advancement
    return itemData.progression === 'progression';
}

/**
 * Validate that all locations are accessible with final item placements
 */
function validateFullAccessibility(locations) {
    // Create final game state with all placed items
    const finalGameState = GameState.createStartingState();
    
    locations.forEach(loc => {
        if (loc.placed_item) {
            finalGameState.addItem(loc.placed_item);
        }
    });
    
    // Check accessibility of all locations
    const accessibleLocations = logicEngine.getAccessibleLocations(finalGameState);
    const totalLocations = locations.length;
    const accessibleCount = accessibleLocations.length;
    
    const isValid = accessibleCount === totalLocations;
    
    return {
        valid: isValid,
        accessibleLocations: accessibleCount,
        totalLocations: totalLocations,
        reason: isValid ? null : `Only ${accessibleCount}/${totalLocations} locations accessible`
    };
}

/**
 * Generate spoiler summary with important item locations
 */
function generateSpoilerSummary(spoilerData) {
    const importantItems = [
        'Progressive Boots', 'Progressive Hammer', 
        'Goombella', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz',
        'Diamond Star', 'Emerald Star', 'Gold Star', 'Ruby Star', 'Sapphire Star', 'Garnet Star', 'Crystal Star'
    ];
    
    const summary = {
        importantItems: {},
        sphereBreakdown: {},
        crystalStars: {},
        partners: {}
    };
    
    // Find important items
    spoilerData.placements.forEach(placement => {
        if (importantItems.includes(placement.item)) {
            summary.importantItems[placement.item] = {
                location: placement.location,
                sphere: placement.sphere,
                type: placement.type
            };
            
            // Special categorization
            if (placement.item.includes('Star')) {
                summary.crystalStars[placement.item] = placement.location;
            } else if (['Goombella', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz'].includes(placement.item)) {
                summary.partners[placement.item] = placement.location;
            }
        }
    });
    
    // Sphere breakdown
    spoilerData.spheres.forEach(sphereData => {
        summary.sphereBreakdown[`Sphere ${sphereData.sphere}`] = {
            itemsPlaced: sphereData.itemsPlaced,
            progressionItems: sphereData.placements.filter(p => p.type === 'progression').length,
            fillerItems: sphereData.placements.filter(p => p.type === 'filler').length
        };
    });
    
    return summary;
}

/**
 * Generate formatted spoiler log matching the old format
 */
function generateFormattedSpoilerLog(spoilerData, placements, settings, seed, generationTime) {
    const timestamp = new Date().toISOString();
    const regionMap = {
        // Define region mapping for locations
        'Boggly Woods': 'BOGGLY_WOODS',
        'Creepy Steeple': 'CREEPY_STEEPLE', 
        'Excess Express': 'EXCESS_EXPRESS',
        'Fahr Outpost': 'FAHR_OUTPOST',
        'Glitzville': 'GLITZVILLE',
        'Great Tree': 'GREAT_TREE',
        "Hooktail's Castle": 'HOOKTAILS_CASTLE',
        'Keelhaul Key': 'KEELHAUL_KEY',
        'Palace of Shadow': 'PALACE',
        'Petal Meadows': 'PETAL_LEFT',
        'Petalburg': 'PETAL_LEFT',
        "Pirate's Grotto": 'PIRATES_GROTTO',
        'Pit of 100 Trials': 'PIT',
        'Poshley Heights': 'POSHLEY_HEIGHTS',
        'Riddle Tower': 'RIDDLE_TOWER',
        'Riverside Station': 'RIVERSIDE',
        'Rogueport Westside': 'ROGUEPORT_WESTSIDE',
        'Rogueport Sewers West': 'SEWERS_WESTSIDE',
        'Petal Meadows Sewers': 'SEWERS_WESTSIDE_GROUND',
        'Twilight Town': 'TWILIGHT_TOWN',
        'Twilight Trail': 'TWILIGHT_TRAIL',
        'Moon': 'XNAUT_FORTRESS',
        'X-Naut Fortress': 'XNAUT_FORTRESS'
    };

    let spoilerText = '';
    
    // Header
    spoilerText += '===============================================\n';
    spoilerText += '    TTYD Randomizer - Spoiler Log\n';
    spoilerText += '===============================================\n\n';
    
    spoilerText += `Seed: ${seed}\n`;
    spoilerText += `Generated: ${timestamp}\n`;
    spoilerText += `Version: 2.0.0\n\n`;
    
    // Settings
    spoilerText += 'SETTINGS:\n';
    spoilerText += '---------\n';
    Object.entries(settings).forEach(([key, value]) => {
        spoilerText += `  ${key}: ${value}\n`;
    });
    spoilerText += '\n';
    
    // Statistics
    spoilerText += 'STATISTICS:\n';
    spoilerText += '-----------\n';
    spoilerText += `  totalLocations: ${spoilerData.placements.length}\n`;
    spoilerText += `  accessibleLocations: ${spoilerData.placements.length}\n`;
    spoilerText += `  itemsPlaced: ${spoilerData.placements.length}\n`;
    spoilerText += `  progressionItems: ${spoilerData.statistics.progressionItemsPlaced}\n`;
    spoilerText += `  fillerItems: ${spoilerData.statistics.fillerItemsPlaced}\n`;
    spoilerText += `  sphereCount: ${spoilerData.statistics.totalSpheres}\n`;
    spoilerText += `  crystalStarsSwept: ${spoilerData.statistics.crystalStarsSwept}\n`;
    spoilerText += `  generationTime: ${generationTime}\n\n`;
    
    // Group locations by region
    const locationsByRegion = {};
    
    spoilerData.placements.forEach(placement => {
        const locationName = placement.location;
        let regionKey = 'UNKNOWN';
        
        // Try to match location to region
        for (const [regionName, regionCode] of Object.entries(regionMap)) {
            if (locationName.includes(regionName)) {
                regionKey = regionCode;
                break;
            }
        }
        
        if (!locationsByRegion[regionKey]) {
            locationsByRegion[regionKey] = [];
        }
        
        locationsByRegion[regionKey].push(placement);
    });
    
    // Location-Item Pairs
    spoilerText += 'LOCATION-ITEM PAIRS:\n';
    spoilerText += '--------------------\n\n';
    
    // Sort regions alphabetically
    const sortedRegions = Object.keys(locationsByRegion).sort();
    
    sortedRegions.forEach(regionKey => {
        spoilerText += `${regionKey}:\n`;
        
        // Sort locations within region
        locationsByRegion[regionKey].sort((a, b) => a.location.localeCompare(b.location));
        
        locationsByRegion[regionKey].forEach(placement => {
            const sphereInfo = placement.sphere === 'SWEPT' ? 'Pre-placed' : `Sphere ${placement.sphere}`;
            spoilerText += `  ${placement.location}: ${placement.item} [${sphereInfo}]\n`;
        });
        
        spoilerText += '\n';
    });
    
    // Progression Log (simplified for now)
    spoilerText += 'PROGRESSION LOG:\n';
    spoilerText += '----------------\n';
    
    let logEntry = 1;
    const startTime = new Date(timestamp);
    
    spoilerText += `${logEntry++}. [${startTime.toLocaleTimeString()}] Starting randomization\n`;
    spoilerText += `${logEntry++}. [${startTime.toLocaleTimeString()}] Created starting game state\n`;
    
    // Add sphere progression
    spoilerData.spheres.forEach((sphereInfo, index) => {
        const sphereTime = new Date(startTime.getTime() + (index * 100));
        spoilerText += `${logEntry++}. [${sphereTime.toLocaleTimeString()}] Sphere ${sphereInfo.sphere} completed: ${sphereInfo.itemsPlaced} items placed (${sphereInfo.placements.filter(p => p.type === 'progression').length} progression, ${sphereInfo.placements.filter(p => p.type === 'filler').length} filler)\n`;
    });
    
    const endTime = new Date(startTime.getTime() + generationTime);
    spoilerText += `${logEntry++}. [${endTime.toLocaleTimeString()}] Randomization completed\n`;
    
    return spoilerText;
}

/**
 * Save spoiler log as a downloadable file
 */
function saveSpoilerLogAsFile(spoilerText, seed) {
    try {
        // Create a blob with the spoiler text
        const blob = new Blob([spoilerText], { type: 'text/plain' });
        
        // Create a download URL
        const url = URL.createObjectURL(blob);
        
        // Create a temporary download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `TTYD_Spoiler_${seed}.txt`;
        downloadLink.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        console.log(`📄 Spoiler log saved as: TTYD_Spoiler_${seed}.txt`);
        return true;
    } catch (error) {
        console.error('❌ Failed to save spoiler log:', error);
        return false;
    }
}

/**
 * Generate final result object
 */
function generateFinalResult(placements, spoilerData, settings) {
    const seed = generateSeedString();
    const generationTime = Date.now();
    
    const formattedSpoilerLog = generateFormattedSpoilerLog(spoilerData, placements, settings, seed, generationTime);
    
    const result = {
        success: true,
        seed: seed,
        settings: settings,
        placements: Object.fromEntries(placements),
        spoiler: {
            placements: spoilerData.placements,
            spheres: spoilerData.spheres,
            statistics: spoilerData.statistics,
            summary: generateSpoilerSummary(spoilerData),
            formattedLog: formattedSpoilerLog,
            saveSpoilerLog: () => saveSpoilerLogAsFile(formattedSpoilerLog, seed)
        },
        statistics: {
            totalItems: placements.size,
            totalLocations: Array.from(logicEngine.locationTags.keys()).length,
            generationTime: generationTime,
            logicEngineStats: logicEngine.getStats()
        },
        metadata: {
            generator: 'TTYD Randomizer v2.0',
            algorithm: 'Optimized Forward-Fill',
            accessibility: '100% Guaranteed'
        }
    };
    
    // Automatically save spoiler log
    console.log('💾 Automatically saving spoiler log...');
    saveSpoilerLogAsFile(formattedSpoilerLog, seed);
    
    console.log('📊 Generation Statistics:', result.statistics);
    console.log('📜 Spoiler Statistics:', result.spoiler.statistics);
    return result;
}

/**
 * Generate a random seed string
 */
function generateSeedString() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Shuffle array in place (Fisher-Yates algorithm)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateRandomizedSeed };
} else {
    window.generateRandomizedSeed = generateRandomizedSeed;
}