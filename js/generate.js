// Main randomizer generation script for TTYD Randomizer

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
        
        // Create the item pool for randomization
        const availableLocations = locations.getAvailableLocations();
        const targetLocationCount = availableLocations.length;
        
        console.log(`\nCreating item pool for ${targetLocationCount} available locations`);
        itemPool = ItemPool.createInitialPool(itemsData, targetLocationCount);
        
        // Remove the starting partner from the pool since it's already placed
        const startingPartnerCount = itemPool.getItemCount(startingPartnerName);
        if (startingPartnerCount > 0) {
            // Remove one instance of the starting partner
            itemPool.items.set(startingPartnerName, startingPartnerCount - 1);
            if (startingPartnerCount - 1 === 0) {
                itemPool.items.delete(startingPartnerName);
            }
            itemPool.totalItems--;
            console.log(`Removed ${startingPartnerName} from item pool (already placed)`);
        }
        
        console.log(`Item pool created:`, itemPool.getStats());
        
    } catch (error) {
        console.error('Failed to load locations or regions:', error);
        return {
            success: false,
            error: 'Failed to load locations or regions',
            timestamp: new Date().toISOString()
        };
    }
    
    // Create all-items state for testing accessibility
    const allItemsState = await GameState.createAllItemsState();
    
    // Test all locations for accessibility (including locked ones)
    const allAccessibleLocations = locations.filter(loc => loc.isAccessible(allItemsState, regionLogic));
    const allInaccessibleLocations = locations.filter(loc => !loc.isAccessible(allItemsState, regionLogic));
    const availableAccessibleLocations = locations.getAccessibleLocations(allItemsState, regionLogic);
    const lockedLocations = locations.getLockedLocations();
    
    const totalLocations = locations.size();
    
    console.log(`Accessibility test with all items:`);
    console.log(`  Total locations: ${totalLocations}`);
    console.log(`  All accessible locations (including locked): ${allAccessibleLocations.length}`);
    console.log(`  Available accessible locations (unlocked only): ${availableAccessibleLocations.length}`);
    console.log(`  Locked locations: ${lockedLocations.length}`);
    console.log(`  Truly inaccessible locations: ${allInaccessibleLocations.length}`);
    console.log(`  Overall accessibility percentage: ${((allAccessibleLocations.length / totalLocations) * 100).toFixed(1)}%`);
    
    // Show truly inaccessible locations
    if (allInaccessibleLocations.length > 0) {
        console.log(`\nTruly inaccessible locations with all items:`);
        allInaccessibleLocations.forEach(location => {
            console.log(`  - ${location.name} (Region: ${location.getRegionTag() || 'none'}) (Locked: ${location.isLocked()})`);
        });
    } else {
        console.log(`\nAll locations are accessible with all items!`);
    }
    
    // TODO: Add more generation steps here
    
    return {
        success: true,
        gameState: gameState,
        locations: locations,
        regionLogic: regionLogic,
        itemPool: itemPool,
        timestamp: new Date().toISOString()
    };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generate };
} else if (typeof window !== 'undefined') {
    window.generate = generate;
}