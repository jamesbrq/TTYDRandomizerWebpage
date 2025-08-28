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
        const placements = await performLogicalPlacement(items, locations, settings);
        
        // Step 4: Generate final result
        const result = generateFinalResult(placements, settings);
        
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
    
    // Create item pool based on frequencies
    const itemPool = createItemPool(settings);
    
    // Get all available locations
    const availableLocations = Array.from(logicEngine.locationTags.keys())
        .map(name => ({ name, placed_item: null, locked: false }));
    
    // Apply any locked items (starting partner, etc.)
    console.log('🔧 Applying locked items...');
    applyLockedItems(availableLocations, settings);
    
    // Debug: Show locked locations
    const lockedLocations = availableLocations.filter(loc => loc.locked);
    console.log(`🔒 Total locked locations: ${lockedLocations.length}`);
    lockedLocations.forEach(loc => console.log(`   - ${loc.name}: ${loc.placed_item}`));
    
    console.log(`📦 Created item pool: ${itemPool.length} items`);
    console.log(`📍 Available locations: ${availableLocations.length} locations`);
    
    return { items: itemPool, locations: availableLocations };
}

/**
 * Create item pool based on item frequencies and settings
 */
function createItemPool(settings) {
    const itemPool = [];
    
    // Load item frequencies
    const frequencies = typeof ITEM_FREQUENCIES !== 'undefined' ? ITEM_FREQUENCIES : {};
    
    // Add each item based on its frequency
    for (const itemData of gameData.items) {
        const itemName = itemData.itemName;
        const frequency = frequencies[itemName] !== undefined ? frequencies[itemName] : 1;
        
        // Skip disabled items (frequency 0)
        if (frequency === 0) continue;
        
        // Add items to pool
        for (let i = 0; i < frequency; i++) {
            itemPool.push(itemName);
        }
    }
    
    // Shuffle the item pool
    shuffleArray(itemPool);
    
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
    
    const maxAttempts = 10;
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
            const placements = await forwardFillPlacement(availableItems, locations, settings);
            
            // Validate 100% accessibility
            const validation = validateFullAccessibility(locations);
            
            if (validation.valid) {
                console.log(`✅ Placement successful: ${placements.size} items placed`);
                console.log(`🎯 Accessibility: ${validation.accessibleLocations}/${validation.totalLocations} locations`);
                return placements;
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
 * Forward-fill placement algorithm ensuring logical progression
 */
async function forwardFillPlacement(items, locations, settings) {
    const placements = new Map();
    
    // Start with COMPLETELY EMPTY state
    const gameState = GameState.createStartingState();
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
    
    // Separate progression and filler items for strategic placement
    const progressionItems = items.filter(item => isProgressionItem(item));
    const fillerItems = items.filter(item => !isProgressionItem(item));
    
    console.log(`📊 Item split: ${progressionItems.length} progression, ${fillerItems.length} filler`);
    
    // Shuffle both pools
    shuffleArray(progressionItems);
    shuffleArray(fillerItems);
    
    let sphere = 0;
    const maxSpheres = 50;
    
    while ((progressionItems.length > 0 || fillerItems.length > 0) && sphere < maxSpheres) {
        console.log(`🔄 Sphere ${sphere}: ${progressionItems.length} progression, ${fillerItems.length} filler remaining`);
        
        // Get currently accessible locations that don't have items yet
        const accessibleLocations = locations.filter(loc => 
            !loc.placed_item && logicEngine.isLocationAccessible(loc.name, gameState)
        );
        
        if (accessibleLocations.length === 0) {
            // Debug: show current state when stuck
            console.log('🔍 Debug - Current state when stuck:');
            console.log('Total items in state:', gameState.items.size);
            console.log('Stars:', gameState.getStarsCount());
            console.log('Sample items:', Array.from(gameState.items.entries()).slice(0, 10));
            
            // Check specifically for Crystal Stars
            const crystalStars = ['Diamond Star', 'Emerald Star', 'Gold Star', 'Ruby Star', 'Sapphire Star', 'Garnet Star', 'Crystal Star'];
            const foundStars = crystalStars.filter(star => gameState.has(star));
            console.log('Crystal Stars found:', foundStars);
            
            // Show non-filled locations
            const nonFilledLocations = locations.filter(loc => !loc.placed_item).map(loc => loc.name);
            console.log(`Non-filled locations (${nonFilledLocations.length}):`, nonFilledLocations);
            
            throw new Error(`No accessible locations available in sphere ${sphere}`);
        }
        
        // Shuffle accessible locations for randomness
        shuffleArray(accessibleLocations);
        
        let itemsPlacedThisSphere = 0;
        
        // Place items in accessible locations
        for (const location of accessibleLocations) {
            let itemToPlace = null;
            
            // Prefer progression items early, but mix in some filler
            if (progressionItems.length > 0 && (fillerItems.length === 0 || Math.random() < 0.7)) {
                itemToPlace = progressionItems.shift();
            } else if (fillerItems.length > 0) {
                itemToPlace = fillerItems.shift();
            }
            
            if (!itemToPlace) break;
            
            // Place the item
            location.placed_item = itemToPlace;
            placements.set(location.name, itemToPlace);
            
            // Add item to state so it's available for next sphere
            gameState.addItem(itemToPlace);
            itemsPlacedThisSphere++;
            
            // Log Crystal Star collection
            if (gameState._isCrystalStar && gameState._isCrystalStar(itemToPlace)) {
                console.log(`⭐ Crystal Star collected! ${itemToPlace} - Total stars: ${gameState.getStarsCount()}`);
            }
            
            console.log(`📍 Placed ${itemToPlace} at ${location.name}`);
            
            // Stop if we've filled all accessible locations this sphere
            if (progressionItems.length === 0 && fillerItems.length === 0) break;
        }
        
        if (itemsPlacedThisSphere === 0) {
            console.log('🔍 No items placed this sphere - current accessible locations:', accessibleLocations.length);
            throw new Error(`No progress made in sphere ${sphere}`);
        }
        
        console.log(`✅ Sphere ${sphere} completed: ${itemsPlacedThisSphere} items placed`);
        sphere++;
    }
    
    const remainingItems = progressionItems.length + fillerItems.length;
    if (remainingItems > 0) {
        throw new Error(`Could not place ${remainingItems} remaining items`);
    }
    
    console.log(`✅ Forward-fill completed in ${sphere} spheres`);
    return placements;
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
 * Generate final result object
 */
function generateFinalResult(placements, settings) {
    const result = {
        success: true,
        seed: generateSeedString(),
        settings: settings,
        placements: Object.fromEntries(placements),
        statistics: {
            totalItems: placements.size,
            totalLocations: Array.from(logicEngine.locationTags.keys()).length,
            generationTime: Date.now(),
            logicEngineStats: logicEngine.getStats()
        },
        metadata: {
            generator: 'TTYD Randomizer v2.0',
            algorithm: 'Optimized Forward-Fill',
            accessibility: '100% Guaranteed'
        }
    };
    
    console.log('📊 Generation Statistics:', result.statistics);
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