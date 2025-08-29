// Main randomizer generation script for TTYD Randomizer
// Completely reworked to use new GameState architecture with integrated locations and itemPool

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
        console.warn('No locations in game state for validation');
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
        
        // Find all currently accessible locations with items
        const accessibleLocations = locations.filter(location => 
            location.hasItem() && 
            !location.isCollected() && 
            location.isAccessible(testState)
        );
        
        // If no new accessible locations, we're done with this sweep
        if (accessibleLocations.length === 0) {
            break;
        }
        
        // Collect all items from accessible locations
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
                    
                    // Debug Crystal Stars specifically
                    if (itemName.includes("Star")) {
                        console.log(`      Collected ${itemName} during validation sweep`);
                    }
                }
            }
        });
        
        if (iterations <= 3 || iterations % 10 === 0) {
            console.log(`      Iteration ${iterations}: ${newItemsThisIteration} new items, ${testState.getStarsCount()} stars total`);
        }
    }
    
    // Check if the final location is reachable - this is our victory condition
    let finalLocation = locations.filter(loc => loc.name === "Palace of Shadow Final Staircase: Ultra Shroom")[0];
    if (!finalLocation) {
        console.warn("Final location 'Palace of Shadow Final Staircase: Ultra Shroom' not found");
        // Try alternative final location names
        const alternativeFinalLocation = locations.filter(loc => loc.name.includes("Palace of Shadow") && loc.name.includes("Final"))[0];
        if (!alternativeFinalLocation) {
            console.warn("No Palace of Shadow Final location found at all!");
            // List all Palace locations for debugging
            const palaceLocations = locations.filter(loc => loc.name.includes("Palace"));
            console.log("Palace locations found:", palaceLocations.map(loc => loc.name));
            return false;
        } else {
            console.log(`Using alternative final location: ${alternativeFinalLocation.name}`);
            finalLocation = alternativeFinalLocation;
        }
    }
    
    // Game is beatable if we can reach the final location
    const isReachable = finalLocation.isAccessible(testState);
    
    // 3. Check the final condition - if it passes then its valid
    // Enhanced debug logging for validation attempts
    if (Math.random() < 0.1) { // 10% chance to show validation details
        console.log(`    Validation Detail:`);
        console.log(`      Total items collected during sweep: ${totalItemsCollected}`);
        console.log(`      Final location: ${finalLocation.name}`);
        console.log(`      Stars: ${testState.getStarsCount()}, Items: ${testState.getStats().totalItems}`);
        console.log(`      Sweep completed in ${iterations} iterations`);
        console.log(`      Final location reachable: ${isReachable}`);
        
        // Show Crystal Star items in state
        const allItems = testState.getAllItems();
        const crystalStars = [];
        for (const [itemName, count] of allItems.entries()) {
            if (itemName.includes("Star") && count > 0) {
                crystalStars.push(`${itemName}(${count})`);
            }
        }
        console.log(`      Crystal Stars collected: ${crystalStars.join(", ") || "none"}`);
        
        // Check what rules the final location has
        if (finalLocation.rules && finalLocation.rules.length > 0) {
            console.log(`      Final location has ${finalLocation.rules.length} rules`);
        } else {
            console.log(`      Final location has no rules (should be accessible)`);
        }
        
        if (!isReachable) {
            console.log(`      ⚠️ Final location not reachable - game unbeatable with current state`);
            
            // Let's also check what items we have
            const itemsState = testState.getStats();
            const keyItems = ['Paper Curse', 'Tube Curse', 'Boat Curse', 'Plane Curse'];
            const hasKeyItems = keyItems.map(item => `${item}: ${itemsState.items[item] || 0}`);
            console.log(`      Key items: ${hasKeyItems.join(', ')}`);
        }
    }
    
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
    
    console.warn(`🔍 VALIDATION DEBUG:`);
    console.warn(`  Total locations in gameState: ${locations.size()}`);
    
    const locationsWithItems = locations.filter(loc => loc.hasItem());
    const locationsWithoutItems = locations.filter(loc => !loc.hasItem());
    
    console.warn(`  Locations WITH items: ${locationsWithItems.length}`);
    console.warn(`  Locations WITHOUT items: ${locationsWithoutItems.length}`);
    
    // Sample some locations with items to verify they have items
    console.warn(`  Sample locations WITH items:`);
    locationsWithItems.slice(0, 5).forEach(loc => {
        const itemId = loc.getItemId();
        const itemName = itemIdToName.get(itemId) || `ID:${itemId}`;
        console.warn(`    ${loc.name}: ${itemName}`);
    });
    
    // Check if locations are locked or unlocked
    const lockedCount = locations.filter(loc => loc.isLocked()).length;
    const unlockedCount = locations.filter(loc => !loc.isLocked()).length;
    console.warn(`  Locked locations: ${lockedCount}`);
    console.warn(`  Unlocked locations: ${unlockedCount}`);
    
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
        
        // Debug first few iterations
        if (iterations <= 3) {
            console.warn(`  Validation Iteration ${iterations}:`);
            console.warn(`    Accessible locations found: ${accessibleLocations.length}`);
            console.warn(`    Current state items: ${testState.getStats().totalItems}`);
            if (accessibleLocations.length > 0 && accessibleLocations.length <= 5) {
                console.warn(`    First few accessible locations:`);
                accessibleLocations.slice(0, 3).forEach(loc => {
                    console.warn(`      ${loc.name} (rules: ${loc.rules?.length || 0})`);
                });
            }
            if (iterations === 1) {
                console.warn(`    First iteration - analyzing all locations...`);
                const allLocationsWithItems = locations.filter(loc => loc.hasItem());
                console.warn(`    Total locations with items: ${allLocationsWithItems.length}`);
                
                // Debug: Check ALL locations (not just those with items) for rule count
                console.warn(`    Checking rule distribution across ALL locations...`);
                const allLocationsRuleCount = new Map();
                locations.forEach(loc => {
                    const ruleCount = loc.rules?.length || 0;
                    if (!allLocationsRuleCount.has(ruleCount)) {
                        allLocationsRuleCount.set(ruleCount, []);
                    }
                    allLocationsRuleCount.get(ruleCount).push(loc.name);
                });
                console.warn(`    ALL locations by rule count:`);
                for (const [ruleCount, locationNames] of allLocationsRuleCount.entries()) {
                    console.warn(`      ${ruleCount} rules: ${locationNames.length} locations`);
                    if (ruleCount === 0) {
                        console.warn(`        All 0-rule locations in total: ${locationNames.slice(0, 10).join(', ')}${locationNames.length > 10 ? `... (${locationNames.length} total)` : ''}`);
                    }
                }
                
                const locationsByRules = new Map();
                allLocationsWithItems.forEach(loc => {
                    const ruleCount = loc.rules?.length || 0;
                    if (!locationsByRules.has(ruleCount)) {
                        locationsByRules.set(ruleCount, []);
                    }
                    locationsByRules.get(ruleCount).push(loc.name);
                });
                console.warn(`    Locations WITH items by rule count:`);
                for (const [ruleCount, locationNames] of locationsByRules.entries()) {
                    console.warn(`      ${ruleCount} rules: ${locationNames.length} locations`);
                    if (ruleCount === 0) {
                        console.warn(`        0-rule locations with items: ${locationNames.join(', ')}`);
                    }
                    if (ruleCount === 1) {
                        console.warn(`        Sample 1-rule locations: ${locationNames.slice(0, 5).join(', ')}`);
                    }
                }
                
                // Test if any 1-rule locations should actually be accessible from start
                const oneRuleLocations = allLocationsWithItems.filter(loc => loc.rules?.length === 1);
                console.warn(`    Testing 1-rule locations for accessibility with empty state:`);
                let oneRuleAccessibleCount = 0;
                oneRuleLocations.slice(0, 10).forEach(loc => {
                    const accessible = loc.isAccessible(testState);
                    if (accessible) {
                        oneRuleAccessibleCount++;
                        console.warn(`      ✅ ${loc.name} is accessible with empty state`);
                    }
                });
                console.warn(`    1-rule locations accessible from start: ${oneRuleAccessibleCount}/${oneRuleLocations.length}`);
            }
            if (accessibleLocations.length === 0 && iterations > 1) {
                console.warn(`    No accessible locations found - checking why...`);
                const sampleLocations = locations.filter(loc => loc.hasItem()).slice(0, 5);
                console.warn(`    Sample locations with items:`);
                sampleLocations.forEach(loc => {
                    const accessible = loc.isAccessible(testState);
                    const collected = loc.isCollected();
                    console.warn(`      ${loc.name}: accessible=${accessible}, collected=${collected}, rules=${loc.rules?.length || 0}`);
                });
            }
        }
        
        if (accessibleLocations.length === 0) {
            break;
        }
        
        // Collect all items from accessible locations
        accessibleLocations.forEach(location => {
            location.setCollected(true);
            
            const itemId = location.getItemId();
            if (itemId && itemIdToName) {
                const itemName = itemIdToName.get(itemId);
                if (itemName) {
                    testState.addItem(itemName, 1);
                    // Crystal Stars automatically update the parser's stars logic when added as items
                }
            }
        });
    }
    
    // Find any locations with items that are still not collected (inaccessible)
    const inaccessibleLocations = locations.filter(location => 
        location.hasItem() && !location.isCollected()
    );
    
    const success = inaccessibleLocations.length === 0;
    
    if (!success) {
        console.warn(`📍 Inaccessible locations (${inaccessibleLocations.length}):`);
        
        // Sample a few locations to debug their requirements
        const sampleLocations = inaccessibleLocations.slice(0, 5);
        sampleLocations.forEach(location => {
            const itemId = location.getItemId();
            const itemName = itemIdToName.get(itemId) || 'Unknown';
            console.warn(`  ❌ ${location.name}: ${itemName}`);
            
            // Try to understand why this location isn't accessible
            if (location.rules && location.rules.length > 0) {
                console.warn(`    Rules: ${location.rules.slice(0, 3).join(', ')}`);
            }
        });
        
        // Show final state for debugging
        console.warn(`  Final state items: ${testState.getStats().totalItems} total, ${testState.getStarsCount()} stars`);
        
        // Check specific items that locations commonly need
        const keyItems = ["Progressive Boots", "Progressive Hammer", "Palace Key (Riddle Tower)", "Paper Curse", "Tube Curse"];
        keyItems.forEach(itemName => {
            const count = testState.getItemCount(itemName);
            if (count > 0) {
                console.warn(`    ${itemName}: ${count}`);
            }
        });
        
        // Only show first few inaccessible locations to avoid spam
        console.warn(`  First 10 inaccessible locations:`);
        inaccessibleLocations.slice(0, 10).forEach(location => {
            const itemId = location.getItemId();
            const itemName = itemIdToName.get(itemId) || 'Unknown';
            console.warn(`  ❌ ${location.name}: ${itemName}`);
        });
    }
    
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
        
        // Debug: Log which unique items are being classified as progression
        if (isProgressionItem(itemObj) && count > 0) {
            console.log(`  Progression: ${itemName} (${itemObj.progression || 'name-based'}) x${count}`);
        }
    }
    
    // Log summary of unique progression items with counts
    const progressionCounts = new Map();
    progression.forEach(item => {
        const current = progressionCounts.get(item.name) || 0;
        progressionCounts.set(item.name, current + 1);
    });
    
    console.log(`  Unique progression items (${progressionCounts.size}):`);
    const sortedProgression = Array.from(progressionCounts.entries()).sort();
    sortedProgression.forEach(([name, count]) => {
        if (count > 1) {
            console.log(`    ${name} x${count}`);
        }
    });
    
    // Check specific important items
    const importantItems = ["Progressive Boots", "Progressive Hammer", "Palace Key (Riddle Tower)", "Paper Curse", "Tube Curse"];
    console.log(`  Key item counts:`);
    importantItems.forEach(itemName => {
        const count = progressionCounts.get(itemName) || 0;
        console.log(`    ${itemName}: ${count}`);
    });
    
    return { progression, filler };
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
    const locations = gameState.getShuffledLocations().shuffle(); // copy so original isn't mutated

    const unfilled = locations.getAvailableLocations().filter(loc => loc.isEmpty());
    const placedItems = [];
    
    console.log(`  Starting assumed fill with ${progressionItems.length} progression items`);
    
    // Shuffle progression items with better randomization
    const shuffled = [...progressionItems];
    // Use crypto.getRandomValues for better randomization if available
    const getRandomIndex = (max) => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return Math.floor((array[0] / (0xFFFFFFFF + 1)) * max);
        }
        return Math.floor(Math.random() * max);
    };
    
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
        
        // 1. Pick a random item from the remaining items
        const item = shuffled.pop();
        
        // 2. Create "all state" = player has ALL progression items except the one we're placing
        const assumedInventory = gameState.clone();
        
        // Count how many of each progression item we should have in the "all state"
        const itemCounts = new Map();
        for (const progItem of progressionItems) {
            if (progItem.name !== item.name) {
                const currentCount = itemCounts.get(progItem.name) || 0;
                itemCounts.set(progItem.name, currentCount + 1);
            }
        }
        
        // Add progression items with their proper counts to the assumed inventory
        for (const [itemName, count] of itemCounts.entries()) {
            assumedInventory.addItem(itemName, count);
        }
        
        // 3. Get all locations reachable with this assumed inventory
        const candidateLocations = unfilled.filter(location => 
            location.isEmpty() && location.isAccessible(assumedInventory)
        );
        
        // 4. If no valid locations, this is a CRITICAL ERROR in assumed fill
        if (candidateLocations.length === 0) {
            console.error(`💥 ASSUMED FILL FAILURE: No valid locations for ${item.name}`);
            console.error(`🔍 DEBUGGING INFO:`);
            console.error(`  Item being placed: ${item.name} (ID: ${item.id})`);
            console.error(`  Items remaining to place: ${shuffled.length + 1}`);
            console.error(`  Items already placed: ${placedItems.length}`);
            
            // Debug unfilled locations
            const totalUnfilled = unfilled.length;
            const accessibleUnfilled = unfilled.filter(loc => loc.isAccessible(assumedInventory)).length;
            console.error(`  Total unfilled locations: ${totalUnfilled}`);
            console.error(`  Accessible unfilled locations: ${accessibleUnfilled}`);
            
            // Debug assumed inventory
            const inventoryStats = assumedInventory.getStats();
            console.error(`  Assumed inventory: ${inventoryStats.totalItems} items, ${inventoryStats.uniqueItems} unique`);
            
            // Show first few items in assumed inventory
            const allItems = assumedInventory.getAllItems();
            const itemsList = [];
            let count = 0;
            for (const [itemName, quantity] of allItems.entries()) {
                if (quantity > 0 && count < 10) {
                    itemsList.push(`${itemName}(${quantity})`);
                    count++;
                }
            }
            console.error(`  Sample inventory items: ${itemsList.join(', ')}${allItems.size > 10 ? '...' : ''}`);
            
            // Test accessibility of a few sample locations
            console.error(`  Testing sample locations:`);
            const sampleLocations = unfilled.slice(0, 5);
            sampleLocations.forEach(loc => {
                const accessible = loc.isAccessible(assumedInventory);
                console.error(`    ${loc.name}: ${accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'} (${loc.rules?.length || 0} rules)`);
                
                // If location has rules, show them
                if (!accessible && loc.rules && loc.rules.length > 0) {
                    console.error(`      Rules: ${loc.rules.slice(0, 2).join(', ')}${loc.rules.length > 2 ? '...' : ''}`);
                }
            });
            
            // This is a critical error - assumed fill should NEVER fail to find locations
            return { 
                success: false, 
                placedItems, 
                attempts,
                error: `No valid locations found for ${item.name} in assumed fill - this indicates a fundamental logic error`,
                failedItem: item.name,
                inventoryState: Array.from(allItems.entries()).filter(([name, qty]) => qty > 0)
            };
        }
        
        // 5. Pick a random valid location and place the item
        const locationIndex = getRandomIndex(candidateLocations.length);
        const location = candidateLocations[locationIndex];
        
        // Place the item (no validation needed - we know location is reachable)
        location.placeItem(item.id);
        
        // ✅ Success - remove location from unfilled list
        const unfilledIndex = unfilled.indexOf(location);
        unfilled.splice(unfilledIndex, 1);
        placedItems.push({ location: location.name, item: item.name });
        
        if (placedItems.length % 10 === 0) {
            console.log(`  Placed ${placedItems.length} progression items...`);
        }
        
        if (attempts % 1000 === 0) {
            console.log(`  Progression placement attempt ${attempts}: ${placedItems.length} placed, ${shuffled.length} remaining`);
            
            // Every 1000 attempts, re-shuffle the remaining items to break patterns
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = getRandomIndex(i + 1);
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
        }
    }
    
    const success = shuffled.length === 0;
    
    if (success) {
        // All items placed successfully - now validate the final game state
        console.log(`✅ All ${placedItems.length} progression items placed successfully`);
        
        // Test the theoretical "all items" state that assumed fill is based on
        console.log(`🧪 Testing theoretical 'all items' state before validation...`);
        const theoreticalAllState = gameState.clone();
        
        // Add ALL progression items to test the assumed fill theory
        const itemCounts = new Map();
        for (const progItem of progressionItems) {
            const currentCount = itemCounts.get(progItem.name) || 0;
            itemCounts.set(progItem.name, currentCount + 1);
        }
        
        // Add all progression items to theoretical state
        for (const [itemName, count] of itemCounts.entries()) {
            theoreticalAllState.addItem(itemName, count);
        }
        
        // Add all 7 Crystal Stars to theoretical state (needed for Pit and late-game areas)
        theoreticalAllState.addItem("Diamond Star", 1);
        theoreticalAllState.addItem("Emerald Star", 1);
        theoreticalAllState.addItem("Gold Star", 1);
        theoreticalAllState.addItem("Ruby Star", 1);
        theoreticalAllState.addItem("Sapphire Star", 1);
        theoreticalAllState.addItem("Garnet Star", 1);
        theoreticalAllState.addItem("Crystal Star", 1);
        
        console.log(`  Theoretical state has ${theoreticalAllState.getStats().totalItems} items`);
        
        // Check how many locations are accessible with ALL progression items
        const allAccessibleCount = locations.filter(loc => loc.isAccessible(theoreticalAllState)).length;
        const totalLocations = locations.size();
        console.log(`  Locations accessible with ALL progression items: ${allAccessibleCount}/${totalLocations}`);
        
        if (allAccessibleCount < totalLocations) {
            console.warn(`⚠️ THEORETICAL PROBLEM: Even with ALL progression items, ${totalLocations - allAccessibleCount} locations remain inaccessible!`);
            console.warn(`  This suggests the assumed fill theory may be flawed.`);
            
            // Debug: Show what locations are still inaccessible and why
            const inaccessibleWithAllItems = locations.filter(loc => !loc.isAccessible(theoreticalAllState));
            console.warn(`  🔍 DEBUGGING - First 10 locations inaccessible with ALL items:`);
            inaccessibleWithAllItems.slice(0, 10).forEach(loc => {
                console.warn(`    ❌ ${loc.name} (${loc.rules?.length || 0} rules)`);
                if (loc.rules && loc.rules.length > 0) {
                    console.warn(`       Rules: ${loc.rules.slice(0, 2).map(rule => JSON.stringify(rule)).join(', ')}${loc.rules.length > 2 ? '...' : ''}`);
                }
            });
            
            // Show what items we have in theoretical state
            console.warn(`  🎒 Theoretical state inventory (${theoreticalAllState.getStats().totalItems} items):`);
            const allItems = theoreticalAllState.getAllItems();
            const itemsList = [];
            for (const [itemName, count] of allItems.entries()) {
                if (count > 0) {
                    itemsList.push(`${itemName}: ${count}`);
                }
            }
            console.warn(`    ${itemsList.slice(0, 10).join(', ')}${itemsList.length > 10 ? `... (${itemsList.length} total)` : ''}`);
            console.warn(`    Crystal Stars: ${theoreticalAllState.getStarsCount()}`);
            
        } else {
            console.log(`✅ Theoretical validation passed: ALL locations accessible with all progression items`);
        }
        
        console.log(`🔍 Performing final validation to ensure game is beatable...`);
        
        // Validate 100% location accessibility
        const accessibilityCheck = validate100PercentAccessibility(gameState, itemIdToName);
        if (!accessibilityCheck.success) {
            console.warn(`❌ Accessibility validation failed: ${accessibilityCheck.inaccessibleCount} locations unreachable`);
            console.warn(`🔄 Restarting due to accessibility issues`);
            console.log('Clearing items from unlocked locations before restart...');
            gameState.getLocations().clearUnlockedPlacedItems();
            return runProgressionAssumedFill(gameState, progressionItems, fillerItems, itemIdToName);
        }
        
        const finalValidation = validateGameBeatable(gameState, itemIdToName);
        
        if (finalValidation) {
            console.log(`✅ Final validation passed - game is beatable with 100% accessibility!`);
        } else {
            console.warn(`❌ Final validation failed - game may not be beatable with current placement`);
            console.warn(`🔄 Restarting due to validation failure`);
            console.log('Clearing items from unlocked locations before restart...');
            gameState.getLocations().clearUnlockedPlacedItems();
            return runProgressionAssumedFill(gameState, progressionItems, fillerItems, itemIdToName);
        }
        
    } else {
        console.warn(`⚠️ Could not place all progression items within ${maxAttempts} attempts`);
        console.warn(`${shuffled.length} progression items remain unplaced`);
        
        // Debug what items were successfully placed
        console.log(`📋 Successfully placed progression items (${placedItems.length}):`);
        placedItems.forEach(item => {
            console.log(`  ✅ ${item.item} → ${item.location}`);
        });
        
        // Debug what items remain unplaced
        console.log(`❌ Unplaced progression items (${shuffled.length}):`);
        shuffled.forEach(item => {
            console.log(`  ❌ ${item.name || item.itemName} (ID: ${item.id})`);
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
    
    console.log(`▶ Starting improved assumed fill with ${itemPool.getTotalItems()} items`);
    
    // Step 1: Split items into progression and filler
    const { progression, filler } = splitItemPools(itemPool, itemsData);
    console.log(`  Split into ${progression.length} progression and ${filler.length} filler items`);
    
    // Step 2: Place progression items with assumed fill
    console.log('🎯 Placing progression items with assumed fill...');
    const progResult = runProgressionAssumedFill(gameState, progression, filler, itemIdToName);
    
    if (!progResult.success) {
        console.warn("⚠️ Progression placement failed");
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
    console.log('🔀 Shuffle filling filler items...');
    const remainingLocations = locations.getAvailableLocations().filter(loc => loc.isEmpty());
    const shuffledFiller = [...filler];
    
    // Shuffle filler items with improved randomization
    const getFillerRandomIndex = (max) => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return Math.floor((array[0] / (0xFFFFFFFF + 1)) * max);
        }
        return Math.floor(Math.random() * max);
    };
    
    for (let i = shuffledFiller.length - 1; i > 0; i--) {
        const j = getFillerRandomIndex(i + 1);
        [shuffledFiller[i], shuffledFiller[j]] = [shuffledFiller[j], shuffledFiller[i]];
    }
    
    // Place filler items (no validation needed)
    let fillerIndex = 0;
    remainingLocations.forEach(location => {
        if (fillerIndex < shuffledFiller.length) {
            const item = shuffledFiller[fillerIndex++];
            location.placeItem(item.id);
            placedItems.push({ location: location.name, item: item.name });
        }
    });
    
    const success = true;
    const remainingItems = Math.max(0, shuffledFiller.length - remainingLocations.length);
    const emptyLocations = Math.max(0, remainingLocations.length - shuffledFiller.length);
    
    console.log(`✅ Improved fill complete:`);
    console.log(`  Progression items placed: ${progResult.placedItems.length}`);
    console.log(`  Filler items placed: ${placedItems.length - progResult.placedItems.length}`);
    console.log(`  Total items placed: ${placedItems.length}`);
    console.log(`  Items remaining: ${remainingItems}`);
    console.log(`  Empty locations remaining: ${emptyLocations}`);
    
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
        console.error('No locations in game state for spoiler generation');
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
    
    console.log(`Starting sphere analysis...`);
    
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
        
        if (accessibleLocations.length > 0) {
            console.log(`  Sphere ${sphereNumber}: ${accessibleLocations.length} new locations`);
        }
        
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
                    
                    // Only log important progression items
                    const importantItems = ['Diamond Star', 'Emerald Star', 'Gold Star', 'Ruby Star', 
                                          'Sapphire Star', 'Garnet Star', 'Crystal Star', 'Goombella', 
                                          'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz',
                                          'Progressive Hammer', 'Progressive Boots'];
                    
                    if (importantItems.includes(itemName)) {
                        console.log(`    🔑 ${itemName} → ${location.name}`);
                        spoilerGen.addProgressionLog(`Found progression item`, itemName, location.name, analysisState);
                    }
                }
                
                processedLocations.add(location.id);
                foundNewItems = true;
            }
        });
        
        // If no new items found, we're done
        if (!foundNewItems || sphereItems.length === 0) {
            console.log(`  Sphere analysis complete - no new accessible locations`);
            break;
        }
        
        // Add sphere to spoiler generator
        spoilerGen.addItemSphere(sphereNumber, sphereProgressionItems, analysisState);
        
        // Add all sphere items to game state
        sphereItems.forEach(item => {
            analysisState.addItem(item.itemName, 1);
        });
        
        if (sphereProgressionItems.length > 0) {
            console.log(`  Sphere ${sphereNumber}: ${sphereProgressionItems.length} progression items (${analysisState.getStarsCount()} stars total)`);
        }
        
        // Safety check to prevent infinite loops
        if (sphereNumber > 50) {
            console.warn('Sphere analysis stopped at 50 spheres to prevent infinite loop');
            spoilerGen.addProgressionLog('Sphere analysis stopped at 50 spheres', '', '', analysisState);
            break;
        }
    }
    
    // Add final progression log entry
    spoilerGen.addProgressionLog('Sphere analysis complete', '', '', analysisState);
    
    console.log(`Sphere analysis complete. Total spheres: ${sphereNumber}`);
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
            console.log(`Locked ${placement.itemName} at ${placement.locationName}`);
            lockedCount++;
        } else {
            if (!location) console.warn(`Could not find location: ${placement.locationName}`);
            if (!itemId) console.warn(`Could not find item ID for: ${placement.itemName}`);
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
        console.log(`Random starting partner selected: ${startingPartnerName}`);
    }
    
    const startingPartnerLocation = locations.filter(loc => loc.name === "Rogueport Center: Goombella")[0];
    const startingPartnerItemId = itemNameToId.get(startingPartnerName);
    
    if (startingPartnerLocation && startingPartnerItemId) {
        startingPartnerLocation.lock();
        startingPartnerLocation.placeItem(startingPartnerItemId);
        console.log(`Locked ${startingPartnerName} at starting partner location`);
    } else {
        if (!startingPartnerLocation) console.warn("Could not find starting partner location");
        if (!startingPartnerItemId) console.warn(`Could not find item ID for: ${startingPartnerName}`);
    }
    
    return startingPartnerName;
}


/**
 * Main randomizer generation function using new GameState architecture
 * @param {Object} settings - Settings object from the UI
 * @returns {Promise<Object>} Result object with success status and spoiler data
 */
async function generate(settings = {}) {
    console.log('🎲 Starting TTYD Randomizer generation with new GameState architecture');
    console.log('Settings:', settings);
    
    // Initialize with a unique seed for each generation
    const seed = Date.now() + Math.random() * 1000000;
    console.log(`🎯 Using generation seed: ${Math.floor(seed)}`);
    
    try {
        // Step 1: Initialize complete randomizer state
        console.log('📋 Initializing game state with locations and item pool...');
        const gameState = await GameState.initializeRandomizerData(true);
        
        if (!gameState.getLocations() || !gameState.getItemPool()) {
            throw new Error('Failed to initialize game state with locations and item pool');
        }
        
        const stats = gameState.getStats();
        console.log('✅ Game state initialized:');
        console.log(`  - Locations: ${stats.locations.total} (${stats.locations.available} available)`);
        console.log(`  - Item pool: ${stats.itemPool.totalItems} items (${stats.itemPool.uniqueItems} unique)`);
        
        // Debug: Check if item pool size matches available locations
        const availableLocationCount = stats.locations.available;
        const itemPoolSize = stats.itemPool.totalItems;
        console.log(`📊 Pool size analysis: ${itemPoolSize} items for ${availableLocationCount} available locations`);
        
        if (itemPoolSize < availableLocationCount) {
            console.warn(`⚠️ Item pool (${itemPoolSize}) is smaller than available locations (${availableLocationCount})`);
            console.log('This is expected after locking Crystal Stars and starting partner');
        } else if (itemPoolSize > availableLocationCount) {
            console.log(`📦 Item pool (${itemPoolSize}) is larger than available locations (${availableLocationCount})`);
            console.log('Excess items will be removed during ItemPool.createInitialPool sizing');
        } else {
            console.log(`✅ Item pool size perfectly matches available locations`);
        }
        
        // Step 2: Create item name mappings
        console.log('🔍 Creating item name mappings...');
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
        
        console.log(`📝 Created mappings for ${itemsData.length} items`);
        
        // Step 3: Lock special locations
        console.log('🔒 Locking special locations...');
        const locations = gameState.getLocations();
        
        const crystalStarsLocked = lockCrystalStars(locations, itemNameToId);
        const startingPartner = lockStartingPartner(locations, itemNameToId, settings);
        
        console.log(`✅ Locked ${crystalStarsLocked} Crystal Stars and starting partner (${startingPartner})`);
        
        // Step 4: Update item pool to remove locked items
        console.log('♻️ Updating item pool to remove locked items...');
        const itemPool = gameState.getItemPool();
        
        // Remove Crystal Stars from pool (they have frequency 0 anyway, but just to be safe)
        const crystalStars = ["Diamond Star", "Emerald Star", "Gold Star", "Ruby Star", "Sapphire Star", "Garnet Star", "Crystal Star"];
        let totalCrystalStarsRemoved = 0;
        crystalStars.forEach(star => {
            const removedCount = itemPool.removeItem(star);
            if (removedCount > 0) {
                console.log(`Removed ${removedCount} instances of ${star} from item pool`);
                totalCrystalStarsRemoved += removedCount;
            }
        });
        
        // Remove starting partner from pool
        const partnerRemoved = itemPool.removeItem(startingPartner);
        if (partnerRemoved > 0) {
            console.log(`Removed ${partnerRemoved} instances of ${startingPartner} from item pool`);
        }
        
        console.log(`🗑️ Total items removed: ${totalCrystalStarsRemoved} Crystal Stars + ${partnerRemoved} ${startingPartner} = ${totalCrystalStarsRemoved + partnerRemoved} items`);
        
        const updatedStats = gameState.getStats();
        console.log(`✅ Updated item pool: ${updatedStats.itemPool.totalItems} items remaining`);
        
        // Final validation: Check if we have the right number of items for available locations
        const finalAvailableLocations = updatedStats.locations.available - crystalStarsLocked - 1; // -1 for starting partner
        const finalItemCount = updatedStats.itemPool.totalItems;
        
        console.log(`🔢 Final count check:`);
        console.log(`  - Available locations after locking: ${finalAvailableLocations}`);
        console.log(`  - Items in pool: ${finalItemCount}`);
        console.log(`  - Locations locked: ${crystalStarsLocked + 1} (${crystalStarsLocked} Crystal Stars + 1 starting partner)`);
        
        if (finalItemCount < finalAvailableLocations) {
            console.warn(`⚠️ Not enough items (${finalItemCount}) for available locations (${finalAvailableLocations})`);
            console.log('Some locations will remain empty after randomization');
        } else if (finalItemCount > finalAvailableLocations) {
            console.warn(`⚠️ Too many items (${finalItemCount}) for available locations (${finalAvailableLocations})`);
            console.log('Some items will remain unplaced after randomization');
        } else {
            console.log(`✅ Perfect match: ${finalItemCount} items for ${finalAvailableLocations} locations`);
        }
        
        // Step 5: Perform improved assumed fill randomization
        console.log('🎯 Starting improved assumed fill randomization...');
        const placementResult = performImprovedFill(gameState, itemsData, itemIdToName);
        
        if (!placementResult.success) {
            console.error('❌ Randomization failed:', placementResult.error);
            return {
                success: false,
                error: placementResult.error || 'Randomization failed',
                timestamp: new Date().toISOString(),
                settings: settings
            };
        }
        
        console.log(`✅ Randomization successful! Placed ${placementResult.placedCount} items`);
        
        // Step 6: Generate spoiler data using SpoilerGenerator
        console.log('📊 Generating spoiler data...');
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
        
        console.log(`✅ Generated spoiler with sphere analysis complete`);
        
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
        console.log('💾 Downloading spoiler file...');
        spoilerGen.downloadSpoiler(null, 'txt');
        
        console.log('🎉 Randomizer generation complete!');
        return finalResult;
        
    } catch (error) {
        console.error('💥 Randomizer generation failed:', error);
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