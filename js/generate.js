// Main randomizer generation script for TTYD Randomizer

/**
 * Validates if the game is beatable with current item placement
 * Uses proper assumed fill validation: start with copy of all-items state, collect sphere by sphere
 * @param {LocationCollection} locations - All locations with current placements  
 * @param {Object} regionLogic - Region logic rules
 * @param {Map} itemIdToName - Map from item ID to item name
 * @param {GameState} allItemsState - Complete game state with all items (for copying)
 * @returns {boolean} True if game is beatable (final location is reachable)
 */
function validateGameBeatable(locations, regionLogic, itemIdToName, allItemsState) {
    // Start with a COPY of the all-items state to simulate having all remaining items
    const testState = allItemsState.clone();
    
    // Reset all location collected status for simulation
    locations.forEach(location => {
        location.setCollected(false);
    });
    
    let foundNewItems = true;
    let iterations = 0;
    const maxIterations = 100;
    
    // Sweep sphere by sphere - collect items from accessible locations
    while (foundNewItems && iterations < maxIterations) {
        foundNewItems = false;
        iterations++;
        
        locations.forEach(location => {
            // Skip if location is empty or already collected
            if (!location.hasItem() || location.isCollected()) {
                return;
            }
            
            // Check if this location is accessible with current state
            if (location.isAccessible(testState, regionLogic)) {
                // Mark location as collected
                location.setCollected(true);
                foundNewItems = true;
                
                // Add item to state (player found it!)
                const itemId = location.getItemId();
                if (itemId && itemIdToName) {
                    const itemName = itemIdToName.get(itemId);
                    if (itemName) {
                        testState.addItem(itemName, 1);
                    }
                }
            }
        });
    }
    
    // Check if the final location is reachable - this is our victory condition
    const finalLocation = locations.filter(loc => loc.name === "Palace of Shadow Final Staircase: Ultra Shroom")[0];
    if (!finalLocation) {
        console.warn("Final location 'Palace of Shadow Final Staircase: Ultra Shroom' not found");
        return false;
    }
    
    // Game is beatable if we can reach the final location
    const isReachable = finalLocation.isAccessible(testState, regionLogic);
    
    // Debug: For key validation calls, log detailed state
    if (Math.random() < 0.01) { // 1% chance to show some validation details
        console.log(`    Validation: Stars=${testState.getStarsCount()}, Items=${testState.getStats().totalItems}, Reachable=${isReachable}, Iterations=${iterations}`);
        if (!isReachable) {
            console.log(`    ⚠️ Final location not reachable - game unbeatable with current state`);
        }
    }
    
    return isReachable;
}

/**
 * Performs true assumed fill randomization algorithm following correct flow
 * Start with all items, remove them one by one into random locations
 * @param {LocationCollection} locations - All locations
 * @param {Array} randomizationItems - All items to place (fully shuffled) 
 * @param {Object} regionLogic - Region logic rules
 * @param {Map} itemIdToName - Map from item ID to item name
 * @param {GameState} allItemsState - Complete game state with all items
 * @returns {Object} Result object with success status and placement info
 */
function performAssumedFill(locations, randomizationItems, regionLogic, itemIdToName, allItemsState) {
    console.log(`Starting assumed fill with ${randomizationItems.length} items`);
    
    // Step 1: Start with ALL items in our "inventory" (the player's assumed state)
    const playerInventory = allItemsState.clone();
    
    const unfilledLocations = locations.getAvailableLocations();
    const placedItems = [];
    const itemsToPlace = [...randomizationItems]; // Copy array
    let attempts = 0;
    const maxAttempts = 10000; 
    
    console.log(`Found ${unfilledLocations.length} available locations for placement`);
    
    while (itemsToPlace.length > 0 && unfilledLocations.length > 0 && attempts < maxAttempts) {
        attempts++;
        
        // Pick random item and location
        const itemIndex = Math.floor(Math.random() * itemsToPlace.length);
        const locationIndex = Math.floor(Math.random() * unfilledLocations.length);
        
        const item = itemsToPlace[itemIndex];
        const location = unfilledLocations[locationIndex];
        
        // Step 3: Place the item at the location (but pretend player still has it)
        location.placeItem(item.id);
        
        // Step 4: NOW remove the item from inventory and test beatability
        playerInventory.removeItem(item.name, 1);
        
        // Step 5: Check if game is still beatable by validating with remaining items
        // IMPORTANT: Pass a copy so validation doesn't modify our original playerInventory
        const inventoryClone = playerInventory.clone();
        
        // Debug: Add detailed logging for key validation attempts
        if (attempts <= 5 || attempts % 100 === 0) {
            const inventoryStats = inventoryClone.getStats();
            console.log(`  Pre-validation (attempt ${attempts}): Player has ${inventoryStats.totalItems} items, ${inventoryClone.getStarsCount()} stars`);
            console.log(`    Key items: ${inventoryStats.uniqueItems} unique types`);
            console.log(`    Testing placement: ${item.name} at ${location.name}`);
        }
        
        const isBeatable = validateGameBeatable(locations, regionLogic, itemIdToName, inventoryClone);
        
        // Debug: Show result for key attempts
        if (attempts <= 5 || attempts % 100 === 0) {
            console.log(`  Post-validation: Game beatable = ${isBeatable}`);
        }
        
        // Debug: Log first few attempts to understand what's happening
        if (attempts <= 3) {
            console.log(`Attempt ${attempts}: Placed ${item.name} at ${location.name}, Beatable: ${isBeatable}`);
        }
        
        if (isBeatable) {
            // ✅ Success - lock in the placement
            itemsToPlace.splice(itemIndex, 1);
            unfilledLocations.splice(locationIndex, 1);
            placedItems.push({ location: location.name, item: item.name });
            
            if (placedItems.length % 50 === 0) {
                console.log(`Placed ${placedItems.length} items so far... (${item.name} at ${location.name})`);
            }
        } else {
            // ❌ Failed - backtrack: remove item from location and add back to inventory
            location.removeItem();
            playerInventory.addItem(item.name, 1);
        }
        
        // Progress logging every 1000 attempts
        if (attempts % 1000 === 0) {
            console.log(`Attempt ${attempts}: ${placedItems.length} items placed, ${itemsToPlace.length} items remaining`);
        }
    }
    
    const success = unfilledLocations.length === 0; // Success when all locations are filled
    const remainingItems = itemsToPlace.length;
    const emptyLocations = unfilledLocations.length;
    
    console.log(`\nAssumed fill complete after ${attempts} attempts:`);
    console.log(`  Items placed: ${placedItems.length}`);
    console.log(`  Items remaining: ${remainingItems}`);
    console.log(`  Empty locations remaining: ${emptyLocations}`);
    console.log(`  Success: ${success}`);
    
    if (!success) {
        console.warn(`⚠️ Could not fill all locations within ${maxAttempts} attempts`);
    } else {
        console.log(`✅ Successfully filled all ${placedItems.length} locations! ${remainingItems} items remain unused.`);
    }
    
    return {
        success,
        placedCount: placedItems.length,
        remainingItems,
        emptyLocations,
        totalItems: randomizationItems.length,
        attempts,
        placedItems
    };
}

/**
 * Generates spoiler data with sphere-by-sphere playthrough analysis
 * @param {LocationCollection} locations - All locations with placed items
 * @param {Object} regionLogic - Region logic rules
 * @param {Map} itemIdToName - Map from item ID to item name
 * @param {Object} settings - Randomizer settings
 * @returns {Object} Spoiler data with sphere analysis
 */
function generateSpoilerData(locations, regionLogic, itemIdToName, settings) {
    const spoiler = {
        seed: 'test-seed', // TODO: Generate actual seed
        timestamp: new Date().toISOString(),
        settings: settings,
        itemSpheres: [],
        locationItemPairs: []
    };
    
    // Create minimal starting game state for sphere analysis
    const gameState = new GameState();
    // Only add the most basic region - player starts in Rogueport
    gameState.addRegion("Rogueport");
    const processedLocations = new Set();
    let sphereNumber = 0;
    
    console.log(`Starting sphere analysis...`);
    
    // Get progression item types to filter sphere display
    const progressionTypes = new Set(['progression', 'useful']);
    
    // Sphere-by-sphere analysis
    while (true) {
        sphereNumber++;
        const sphereItems = [];
        const sphereProgressionItems = []; // Only progression items for display
        let foundNewItems = false;
        
        // Find all currently accessible locations with placed items
        const accessibleLocations = locations.filter(location => 
            location.hasItem() && 
            !processedLocations.has(location.id) && 
            location.isAccessible(gameState, regionLogic)
        );
        
        console.log(`  Sphere ${sphereNumber}: Checking ${accessibleLocations.length} newly accessible locations`);
        
        accessibleLocations.forEach(location => {
            const itemId = location.getItemId();
            const itemName = itemIdToName.get(itemId);
            
            if (itemName) {
                const sphereItem = {
                    itemName: itemName,
                    locationName: location.name,
                    region: location.getRegionTag() || 'unknown',
                    itemId: itemId
                };
                
                // Add all items to the complete list
                sphereItems.push(sphereItem);
                
                // Check if this is a progression item by looking up in items.json data
                // For now, we'll use a heuristic based on item names
                const isProgressionItem = isProgressionByName(itemName);
                if (isProgressionItem) {
                    sphereProgressionItems.push(sphereItem);
                }
                
                // Add to location-item pairs (all items)
                spoiler.locationItemPairs.push({
                    locationName: location.name,
                    itemName: itemName,
                    sphere: sphereNumber,
                    region: location.getRegionTag() || 'unknown'
                });
                
                processedLocations.add(location.id);
                foundNewItems = true;
            }
        });
        
        // If no new items found, we're done
        if (!foundNewItems || sphereItems.length === 0) {
            console.log(`  Sphere analysis complete - no new accessible locations`);
            break;
        }
        
        // Add sphere to spoiler data (only show progression items in sphere display)
        spoiler.itemSpheres.push({
            sphere: sphereNumber,
            itemCount: sphereProgressionItems.length,
            allItemCount: sphereItems.length, // Total items found this sphere
            items: sphereProgressionItems, // Only progression items shown
            gameStateSnapshot: {
                totalItems: gameState.getStats().totalItems,
                crystalStars: gameState.getStarsCount(),
                accessibleRegions: gameState.getAllRegions().size
            }
        });
        
        // Add ALL sphere items to game state (both progression and filler)
        sphereItems.forEach(item => {
            gameState.addItem(item.itemName, 1);
            
            // Update accessible regions based on new items
            const regionTag = item.region;
            if (regionTag && regionTag !== 'unknown') {
                gameState.addRegion(regionTag);
            }
        });
        
        // Also manually check for newly accessible regions based on game state
        updateAccessibleRegions(gameState, regionLogic);
        
        
        console.log(`  Sphere ${sphereNumber}: Found ${sphereItems.length} total items (${sphereProgressionItems.length} progression) (Stars: ${gameState.getStarsCount()})`);
        
        // Safety check to prevent infinite loops
        if (sphereNumber > 50) {
            console.warn('Sphere analysis stopped at 50 spheres to prevent infinite loop');
            break;
        }
    }
    
    console.log(`Sphere analysis complete. Total spheres: ${spoiler.itemSpheres.length}`);
    return spoiler;
}

/**
 * Determines if an item is progression-related based on its name
 * @param {string} itemName - The name of the item
 * @returns {boolean} True if the item is considered progression
 */
function isProgressionByName(itemName) {
    // Crystal Stars (should not appear in randomization but just in case)
    if (itemName.includes('Star') && itemName !== 'Star Piece' && itemName !== 'Star Key') {
        return true;
    }
    
    // Partner items
    const partners = ['Goombella', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz'];
    if (partners.includes(itemName)) {
        return true;
    }
    
    // Progressive items
    if (itemName.includes('Progressive')) {
        return true;
    }
    
    // Key items and abilities
    const progressionItems = [
        // Curses
        'Paper Curse', 'Tube Curse', 'Boat Curse', 'Plane Curse',
        
        // Keys
        'Black Key', 'Red Key', 'Blue Key', 'Gate Handle', 'Castle Key',
        'Station Key', 'Card Key', 'Elevator Key', 'Palace Key',
        
        // Special abilities and items
        'Contact Lens', 'Super Boots', 'Ultra Boots', 'Hammer', 'Super Hammer', 'Ultra Hammer',
        
        // Story progression items
        'Necklace', 'Moon Stone', 'Sun Stone', 'Wedding Ring', 'Data Disk',
        'Cookbook', 'Chuckola Cola', 'Golden Card', 'Silver Card', 'Magical Map',
        
        // Other important items
        'Shine Sprite' // Upgrade currency
    ];
    
    return progressionItems.some(item => itemName.includes(item));
}

/**
 * Updates accessible regions in game state based on current items
 * @param {GameState} gameState - The game state to update
 * @param {Object} regionLogic - Region logic rules
 */
function updateAccessibleRegions(gameState, regionLogic) {
    // Check all regions and add newly accessible ones
    const regionNames = [
        'rogueport_westside', 'sewers_westside', 'sewers_westside_ground',
        'petal_left', 'petal_right', 'hooktails_castle', 'twilight_town',
        'twilight_trail', 'fahr_outpost', 'xnaut_fortress', 'boggly_woods',
        'great_tree', 'glitzville', 'creepy_steeple', 'keelhaul_key',
        'pirates_grotto', 'excess_express', 'riverside', 'poshley_heights',
        'palace', 'riddle_tower', 'pit'
    ];
    
    regionNames.forEach(regionName => {
        if (!gameState.regions.has(regionName)) {
            // Check if this region is now accessible
            if (typeof StateLogic !== 'undefined' && StateLogic[regionName]) {
                try {
                    if (StateLogic[regionName](gameState)) {
                        gameState.addRegion(regionName);
                    }
                } catch (error) {
                    // Region logic might fail, that's ok
                }
            }
        }
    });
}

/**
 * Downloads a spoiler file to the user's computer
 * @param {Object} spoilerData - The spoiler data to download
 */
function downloadSpoilerFile(spoilerData) {
    try {
        // Format the spoiler data as JSON
        const jsonString = JSON.stringify(spoilerData, null, 2);
        
        // Create a blob with the JSON data
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create a download URL
        const url = URL.createObjectURL(blob);
        
        // Create a temporary anchor element for download
        const a = document.createElement('a');
        a.href = url;
        a.download = `TTYD_Randomizer_Spoiler_${spoilerData.seed}.json`;
        
        // Trigger the download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        console.log(`✅ Spoiler file downloaded: TTYD_Randomizer_Spoiler_${spoilerData.seed}.json`);
        
    } catch (error) {
        console.error('Failed to download spoiler file:', error);
    }
}

/**
 * Main randomizer generation function
 * This is the only function that will be called externally
 * @param {Object} settings - Settings object from the UI
 */
async function generate(settings = {}) {
    console.log('Starting randomizer generation');
    
    // Create game state
    const gameState = new GameState();
    let itemPool = null;
    
    // Add any starting items if needed
    // gameState.addItem("Starting Item", 1);
    
    console.log('Game state created:', gameState.getStats());
    console.log('Starting items:', Object.fromEntries(gameState.getAllItems()));
    
    // Create locations
    const locations = new LocationCollection();
    let regionLogic = {};
    
    try {
        // Load locations from JSON file
        const locationsResponse = await fetch('json/locations.json');
        const locationsData = await locationsResponse.json();
        
        locations.loadFromJSON(locationsData);
        console.log(`Loaded ${locations.size()} locations`);
        console.log('Location stats:', locations.getPlacementStats());
        
        // Load region logic rules from regions.json
        const regionsResponse = await fetch('json/regions.json');
        const regionsData = await regionsResponse.json();
        
        // Convert region logic expressions to executable functions
        for (const [regionName, logicExpr] of Object.entries(regionsData)) {
            try {
                regionLogic[regionName] = jsonToLambda(logicExpr);
            } catch (error) {
                console.error(`Error parsing region logic for ${regionName}:`, error);
                console.log('Logic expression:', logicExpr);
                throw error;
            }
        }
        
        console.log(`Loaded region logic rules for ${Object.keys(regionLogic).length} regions`);
        
        // Load individual location rules from rules.json
        const rulesResponse = await fetch('json/rules.json');
        const rulesData = await rulesResponse.json();
        
        // Load items data for placing items
        const itemsResponse = await fetch('json/items.json');
        const itemsData = await itemsResponse.json();
        
        // Create item name to ID mapping
        const itemNameToId = {};
        itemsData.forEach(item => {
            if (item.itemName && item.id) {
                itemNameToId[item.itemName] = item.id;
            }
        });
        
        console.log(`Loaded ${itemsData.length} items for placement`);
        
        // Apply combined logic to each location
        locations.forEach(location => {
            const locationName = location.name;
            const regionTag = location.getRegionTag();
            
            // Get region logic (if any)
            const regionLogicExpr = regionTag && regionsData[regionTag] ? regionsData[regionTag] : null;
            
            // Get location-specific logic (if any)
            const locationLogicExpr = rulesData[locationName] ? rulesData[locationName] : null;
            
            // Combine both rules with AND logic
            let combinedLogic = null;
            if (regionLogicExpr && locationLogicExpr) {
                combinedLogic = {
                    "and": [regionLogicExpr, locationLogicExpr]
                };
            } else if (regionLogicExpr) {
                combinedLogic = regionLogicExpr;
            } else if (locationLogicExpr) {
                combinedLogic = locationLogicExpr;
            }
            
            // Convert to executable function if we have any logic
            if (combinedLogic) {
                try {
                    location.accessibilityLogic = jsonToLambda(combinedLogic);
                } catch (error) {
                    console.error(`Error parsing combined logic for ${locationName}:`, error);
                    // Location will remain accessible by default if logic parsing fails
                }
            }
        });
        
        // Count locations with various logic combinations
        let locationsWithRegionLogic = 0;
        let locationsWithLocationLogic = 0;
        let locationsWithBothLogic = 0;
        let locationsWithAnyLogic = 0;
        
        locations.forEach(location => {
            const regionTag = location.getRegionTag();
            const hasRegionLogic = regionTag && regionsData[regionTag];
            const hasLocationLogic = rulesData[location.name];
            
            if (hasRegionLogic) locationsWithRegionLogic++;
            if (hasLocationLogic) locationsWithLocationLogic++;
            if (hasRegionLogic && hasLocationLogic) locationsWithBothLogic++;
            if (hasRegionLogic || hasLocationLogic) locationsWithAnyLogic++;
        });
        
        console.log(`Logic application stats:`);
        console.log(`  Locations with region logic: ${locationsWithRegionLogic}`);
        console.log(`  Locations with location-specific logic: ${locationsWithLocationLogic}`);
        console.log(`  Locations with both types: ${locationsWithBothLogic}`);
        console.log(`  Locations with any logic: ${locationsWithAnyLogic}`);
        console.log(`  Locations with no logic (always accessible): ${locations.size() - locationsWithAnyLogic}`);
        
        // Lock Crystal Stars to their vanilla locations
        const crystalStarPlacements = [
            { locationName: "Hooktail's Castle Hooktail's Room: Diamond Star", itemName: "Diamond Star" },
            { locationName: "Great Tree Entrance: Emerald Star", itemName: "Emerald Star" },
            { locationName: "Glitzville Arena: Gold Star", itemName: "Gold Star" },
            { locationName: "Creepy Steeple Upper Room: Ruby Star", itemName: "Ruby Star" },
            { locationName: "Pirate's Grotto Cortez' Hoard: Sapphire Star", itemName: "Sapphire Star" },
            { locationName: "Poshley Heights Sanctum Altar: Garnet Star", itemName: "Garnet Star" },
            { locationName: "X-Naut Fortress Boss Room: Crystal Star", itemName: "Crystal Star" }
        ];
        
        let lockedCrystalStars = 0;
        crystalStarPlacements.forEach(placement => {
            const location = locations.filter(loc => loc.name === placement.locationName)[0];
            const itemId = itemNameToId[placement.itemName];
            
            if (location && itemId) {
                location.lock();
                location.placeItem(itemId);
                console.log(`Placed ${placement.itemName} (ID: ${itemId}) at ${placement.locationName}`);
                lockedCrystalStars++;
            } else {
                if (!location) console.warn(`Could not find location: ${placement.locationName}`);
                if (!itemId) console.warn(`Could not find item ID for: ${placement.itemName}`);
            }
        });
        
        console.log(`\nLocked and placed ${lockedCrystalStars} Crystal Star locations`);
        
        // Lock starting partner location based on settings
        const startingPartners = [
            "", // Index 0 unused - option values start at 1
            "Goombella", // Option 1
            "Koops",     // Option 2  
            "Bobbery",   // Option 3
            "Yoshi",     // Option 4
            "Flurrie",   // Option 5
            "Vivian",    // Option 6
            "Ms. Mowz"   // Option 7
            // Option 8 would be "Random Partner" - handled separately
        ];
        
        // Get starting partner from settings (default to Goombella)
        const startingPartnerOption = parseInt(settings?.['Starting Partner']) || 1;
        let startingPartnerName = startingPartners[startingPartnerOption] || "Goombella";
        
        // Handle random partner selection
        if (startingPartnerOption === 8) {
            const randomIndex = Math.floor(Math.random() * 7) + 1; // Random 1-7
            startingPartnerName = startingPartners[randomIndex];
            console.log(`Random starting partner selected: ${startingPartnerName}`);
        }
        
        // Lock the starting partner location and place the item
        const startingPartnerLocation = locations.filter(loc => loc.name === "Rogueport Center: Goombella")[0];
        const startingPartnerItemId = itemNameToId[startingPartnerName];
        
        if (startingPartnerLocation && startingPartnerItemId) {
            startingPartnerLocation.lock();
            startingPartnerLocation.placeItem(startingPartnerItemId);
            console.log(`Placed ${startingPartnerName} (ID: ${startingPartnerItemId}) at starting partner location`);
        } else {
            if (!startingPartnerLocation) console.warn("Could not find starting partner location: Rogueport Center: Goombella");
            if (!startingPartnerItemId) console.warn(`Could not find item ID for: ${startingPartnerName}`);
        }
        
        // Create randomization item list (no pool needed for assumed fill)
        const availableLocations = locations.getAvailableLocations();
        console.log(`\nCreating item list for ${availableLocations.length} available locations`);
        
        // Verify ITEM_FREQUENCIES is available for frequency-based item generation
        if (typeof ITEM_FREQUENCIES === 'undefined') {
            console.warn('ITEM_FREQUENCIES is not defined! Using default frequency of 1 for all items.');
        }
        
        // Build single randomization item list (fully random)
        const randomizationItems = [];
        
        for (const item of itemsData) {
            if (!item.itemName) continue;
            
            const frequency = ITEM_FREQUENCIES.hasOwnProperty(item.itemName) ? ITEM_FREQUENCIES[item.itemName] : 1;
            
            // Skip items with frequency 0 (Crystal Stars) and starting partner
            
            // Skip Crystal Stars (frequency 0) and starting partner
            if (frequency === 0 || item.itemName === startingPartnerName) {
                continue;
            }
            
            // Add items based on frequency
            for (let i = 0; i < frequency; i++) {
                randomizationItems.push({
                    name: item.itemName,
                    id: item.id
                });
            }
        }
        
        // Shuffle all items completely randomly
        for (let i = randomizationItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [randomizationItems[i], randomizationItems[j]] = [randomizationItems[j], randomizationItems[i]];
        }
        
        console.log(`Created randomized item list with ${randomizationItems.length} items (excluding locked items)`);
        
        
        // Create itemIdToName mapping for validation
        const itemIdToName = new Map();
        itemsData.forEach(item => {
            if (item.id && item.itemName) {
                itemIdToName.set(item.id, item.itemName);
            }
        });
        
        // Create all-items state for validation
        const allItemsValidationState = await GameState.createAllItemsState();
        
        // Run true assumed fill randomization algorithm
        console.log(`\nStarting assumed fill randomization...`);
        const placementResult = performImprovedFill(
            locations, randomizationItems, regionLogic, itemIdToName, allItemsValidationState
        );
        
        let spoiler = null;
        
        if (placementResult.success) {
            console.log(`✅ Randomization successful! Placed ${placementResult.placedCount} items`);
            
            // Generate spoiler data with sphere-by-sphere playthrough analysis
            console.log(`\nGenerating spoiler data...`);
            spoiler = generateSpoilerData(locations, regionLogic, itemIdToName, settings);
            console.log(`Generated spoiler with ${spoiler.itemSpheres.length} spheres`);
            
            // Log playthrough spheres for validation
            spoiler.itemSpheres.forEach((sphere, index) => {
                console.log(`\nSphere ${sphere.sphere}:`);
                sphere.items.forEach(item => {
                    console.log(`  ${item.itemName} @ ${item.locationName} (${item.region})`);
                });
                console.log(`  Game State: ${sphere.gameStateSnapshot.totalItems} items, ${sphere.gameStateSnapshot.crystalStars} stars`);
            });
            
        } else {
            console.warn(`❌ Randomization failed: ${placementResult.error}`);
        }
        
        // Generate and download spoiler file
        const spoilerData = {
            success: true,
            seed: Math.random().toString(36).substring(2, 15),
            timestamp: new Date().toISOString(),
            settings: settings,
            stats: {
                totalLocations: locations.size(),
                itemsPlaced: locations.getPlacedLocations().length
            },
            spoiler: spoiler
        };
        
        // Download spoiler file
        downloadSpoilerFile(spoilerData);
        
        return spoilerData;
        
    } catch (error) {
        console.error('Failed to load locations or regions:', error);
        return {
            success: false,
            error: 'Failed to load locations or regions',
            timestamp: new Date().toISOString()
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generate };
} else if (typeof window !== 'undefined') {
    window.generate = generate;
}