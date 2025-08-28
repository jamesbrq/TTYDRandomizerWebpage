// New logical item placement algorithm that properly respects rules
// This replaces the broken algorithm in generate.js

class LogicalItemPlacer {
    constructor(locations, items, rules, regionLogic, settings) {
        this.locations = locations;
        this.items = items;
        this.rules = rules;
        this.regionLogic = regionLogic;
        this.settings = settings;
        
        // Track placement state
        this.gameState = GameState.createStartingState();
        this.unplacedItems = [...items];
        this.placedItems = new Map(); // location -> item
        this.currentSphere = 0; // Track progression spheres
        this.lastAccessibleLocationCount = 0; // Track progress
        
        // Split items by type for strategic placement
        this.progressionItems = this.shuffleArray(items.filter(item => this.isProgressionItem(item))); // Randomize progression items
        this.fillerItems = this.shuffleArray(items.filter(item => !this.isProgressionItem(item))); // Randomize filler items too
        
        console.log(`Logical placer initialized: ${this.progressionItems.length} progression, ${this.fillerItems.length} filler items`);
        
        // Debug: Show progression items being used
        console.log('Progression items:', this.progressionItems.slice(0, 10).join(', ') + (this.progressionItems.length > 10 ? '...' : ''));
        
        // Critical debug: Check for Progressive items specifically
        const progHammerCount = this.progressionItems.filter(item => item === 'Progressive Hammer').length;
        const progBootsCount = this.progressionItems.filter(item => item === 'Progressive Boots').length;
        const totalProgBootsInAll = items.filter(item => item === 'Progressive Boots').length;
        const totalProgHammerInAll = items.filter(item => item === 'Progressive Hammer').length;
        
        console.log(`🔍 Progressive item debug:`);
        console.log(`  Progressive Hammer: ${progHammerCount} in progression pool, ${totalProgHammerInAll} in total pool`);
        console.log(`  Progressive Boots: ${progBootsCount} in progression pool, ${totalProgBootsInAll} in total pool`);
        
        if (progHammerCount === 0) console.error('❌ NO Progressive Hammer in progression pool!');
        if (progBootsCount === 0) console.error('❌ NO Progressive Boots in progression pool!');
        
        // Note: Progression item count may vary due to item frequency overrides (e.g., Palace Key (Riddle Tower) x8)
        // This is expected and normal - just log for debugging
        console.log(`📊 Progression item count: ${this.progressionItems.length} (includes frequency multipliers)`);
        if (this.progressionItems.length < 50 || this.progressionItems.length > 100) {
            console.warn(`⚠️ Unusual progression item count: ${this.progressionItems.length} - may indicate issue`);
        }
    }
    
    isProgressionItem(itemName) {
        // Check if item has progression flag in allItems
        if (typeof allItems !== 'undefined' && allItems) {
            const itemData = allItems.find(item => item.itemName === itemName);
            return itemData?.progression === 'progression';
        }
        
        // Fallback: hardcoded list of known progression items
        const knownProgressionItems = [
            'Progressive Hammer', 'Progressive Boots', 'Tube Curse', 'Paper Curse', 'Plane Curse', 'Boat Curse',
            'Goombella', 'Koops', 'Flurrie', 'Yoshi', 'Vivian', 'Bobbery', 'Ms. Mowz',
            'Diamond Star', 'Emerald Star', 'Gold Star', 'Ruby Star', 'Sapphire Star', 'Garnet Star', 'Crystal Star',
            'Blimp Ticket', 'Train Ticket', 'Contact Lens', 'Sun Stone', 'Moon Stone', 'Necklace',
            'Station Key 1', 'Station Key 2', 'Elevator Key 1', 'Elevator Key 2', 'Elevator Key (Riverside)',
            'Palace Key', 'Palace Key (Riddle Tower)', 'Star Key', 'Castle Key', 'Steeple Key',
            'Black Key (Paper Curse)', 'Black Key (Tube Curse)', 'Black Key (Plane Curse)', 'Black Key (Boat Curse)',
            'Red Key', 'Blue Key', 'Shop Key', 'Storage Key 1', 'Storage Key 2', 'Grotto Key',
            'Old Letter', 'Autograph', 'Ragged Diary', 'Blanket', 'Vital Paper', 'Wedding Ring',
            'Skull Gem', 'Goldbob Guide', 'Shell Earrings', 'Puni Orb', 'Superbombomb', 'Gate Handle',
            'Briefcase', 'Gold Ring', 'Chuckola Cola', 'Coconut', 'Galley Pot', 'Cog'
        ];
        return knownProgressionItems.includes(itemName);
    }

    /**
     * Shuffle an array randomly (Fisher-Yates algorithm)
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    /**
     * Main placement algorithm using forward-fill logic with automatic retries
     */
    async place() {
        console.log('=== STARTING LOGICAL FORWARD-FILL PLACEMENT ===');
        
        let attempt = 1;
        const maxAttempts = 10;
        
        while (attempt <= maxAttempts) {
            console.log(`🎯 Placement attempt ${attempt}/${maxAttempts}`);
            
            try {
                // Step 1: Apply locked items (starting partner + Crystal Stars in their locations)
                this.applyLockedItems();
                
                // Step 2: Main forward-fill loop
                const success = await this.forwardFillLoop();
                
                if (success) {
                    console.log(`✅ Logical placement completed successfully on attempt ${attempt}`);
                    return this.placedItems;
                }
                
                // If we get here, placement failed but didn't throw an exception
                console.warn(`❌ Placement attempt ${attempt} failed silently, restarting...`);
                
            } catch (error) {
                if (error.message === 'RESTART_PLACEMENT') {
                    console.warn(`❌ Placement attempt ${attempt} hit deadlock, restarting...`);
                } else {
                    console.error(`❌ Placement attempt ${attempt} failed with error:`, error);
                }
            }
            
            // Reset for next attempt if we have attempts remaining
            if (attempt < maxAttempts) {
                this.resetPlacement();
                attempt++;
            } else {
                // Final attempt failed
                console.error(`💥 All ${maxAttempts} placement attempts failed!`);
                throw new Error(`Placement failed after ${maxAttempts} attempts - this seed may be impossible`);
            }
        }
    }
    
    /**
     * Apply locked items (starting partner, Crystal Stars in boss locations)
     */
    applyLockedItems() {
        console.log('Applying locked items...');
        
        // Starting partner at Rogueport Center - immediately accessible
        const startingPartnerLocation = this.locations.find(loc => loc.name === "Rogueport Center: Goombella");
        if (startingPartnerLocation) {
            const startingPartner = this.getStartingPartnerName();
            this.placeItemAtLocation(startingPartner, startingPartnerLocation, true);
            console.log(`✅ Starting partner locked: ${startingPartner}`);
        }
        
        // Crystal Stars at boss locations (these are progression gates - not immediately accessible)
        const crystalStarLocks = {
            "Hooktail's Castle Hooktail's Room: Diamond Star": "Diamond Star",
            "Great Tree Entrance: Emerald Star": "Emerald Star", 
            "Glitzville Arena: Gold Star": "Gold Star",
            "Creepy Steeple Upper Room: Ruby Star": "Ruby Star",
            "Pirate's Grotto Cortez' Hoard: Sapphire Star": "Sapphire Star",
            "Poshley Heights Sanctum Altar: Garnet Star": "Garnet Star",
            "X-Naut Fortress Boss Room: Crystal Star": "Crystal Star"
        };
        
        Object.entries(crystalStarLocks).forEach(([locationName, itemName]) => {
            const location = this.locations.find(loc => loc.name === locationName);
            if (location) {
                this.placeItemAtLocation(itemName, location, true);
                console.log(`🔒 Locked Crystal Star: ${itemName} at ${locationName}`);
                // Don't add to game state yet - will be collected when location becomes accessible
            }
        });
        
        // Initial collection check in case any locked items are immediately accessible
        this.collectAccessibleItems();
        
        console.log(`⭐ Initial stars count: ${this.gameState.getStarsCount()}`);
    }
    
    getStartingPartnerName() {
        const partners = ["Goombella", "Koops", "Bobbery", "Yoshi", "Flurrie", "Vivian", "Ms. Mowz"];
        return partners[this.settings.starting_partner - 1] || "Goombella";
    }
    
    /**
     * Main forward-fill placement loop with sphere-based progression
     */
    async forwardFillLoop() {
        let iterations = 0;
        const maxIterations = 1000;
        
        while (this.unplacedItems.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // First: Check for newly accessible locked items (like Crystal Stars)
            this.collectAccessibleItems();
            
            // Get currently accessible empty locations
            const accessibleLocations = this.getAccessibleEmptyLocations();
            
            if (accessibleLocations.length === 0) {
                console.error('No accessible empty locations available!');
                console.error(`Remaining items: ${this.unplacedItems.length}`);
                console.error(`Current sphere: ${this.currentSphere}`);
                
                // Debug: Check what's wrong with locations
                const totalLocations = this.locations.length;
                const placedLocations = this.locations.filter(loc => loc.hasPlacedItem()).length;
                const lockedLocations = this.locations.filter(loc => loc.locked).length;
                const emptyLocations = this.locations.filter(loc => !loc.hasPlacedItem() && !loc.locked).length;
                
                console.error(`Location stats: ${totalLocations} total, ${placedLocations} placed, ${lockedLocations} locked, ${emptyLocations} empty`);
                console.error(`Expected: ${totalLocations - lockedLocations} unlocked locations should match placed non-locked items`);
                console.error(`Actual calculation: ${totalLocations} - ${lockedLocations} = ${totalLocations - lockedLocations} expected placeable locations`);
                
                if (emptyLocations > 0) {
                    console.error('Empty locations exist but none are accessible - checking first few:');
                    const sampleEmpty = this.locations.filter(loc => !loc.hasPlacedItem() && !loc.locked).slice(0, 5);
                    sampleEmpty.forEach(loc => {
                        const accessible = this.isLocationAccessible(loc);
                        console.error(`  ${loc.name}: accessible=${accessible}`);
                    });
                }
                
                // Try item swapping to resolve the deadlock
                if (this.attemptItemSwapping()) {
                    console.warn('🔄 Item swapping resolved deadlock, continuing...');
                    this.updateAccessibleRegions();
                    continue;
                }
                
                // If swapping didn't work, restart the entire placement
                console.warn('🔄 Item swapping failed, restarting placement...');
                throw new Error('RESTART_PLACEMENT');
            }
            
            // Check if we're making progression (unlocking new locations)
            const isProgressionNeeded = this.isProgressionNeeded(accessibleLocations.length);
            
            // Try to place a progression item if needed or randomly
            let placed = false;
            if (this.progressionItems.length > 0 && (isProgressionNeeded || Math.random() < 0.3)) {
                placed = this.placeProgressionItem(accessibleLocations);
                if (placed) {
                    console.log(`🔑 Placed progression item in sphere ${this.currentSphere}`);
                }
            }
            
            // If no progression item placed, place filler items
            if (!placed) {
                placed = this.placeFillerItems(accessibleLocations);
            }
            
            if (!placed) {
                console.error('Could not place any items in accessible locations');
                return false;
            }
            
            // Update accessible regions after placement
            this.updateAccessibleRegions();
            
            // Check for sphere advancement
            this.checkSphereAdvancement(accessibleLocations.length);
            
            if (iterations % 100 === 0) {
                console.log(`Iteration ${iterations}: Sphere ${this.currentSphere}, ${this.unplacedItems.length} items remaining, ${accessibleLocations.length} accessible locations`);
            }
        }
        
        if (this.unplacedItems.length > 0) {
            console.error(`Forward-fill failed: ${this.unplacedItems.length} items could not be placed`);
            return false;
        }
        
        console.log(`✅ Forward-fill completed in ${iterations} iterations across ${this.currentSphere + 1} spheres`);
        return true;
    }
    
    /**
     * Check if progression items are needed to unlock more locations
     */
    isProgressionNeeded(currentAccessibleCount) {
        // If we have fewer accessible locations than last time, we might be stuck
        if (currentAccessibleCount < this.lastAccessibleLocationCount) {
            return true;
        }
        
        // If we haven't gained new locations in a while, we likely need progression
        if (currentAccessibleCount === this.lastAccessibleLocationCount && this.progressionItems.length > 0) {
            return true;
        }
        
        // If we have very few accessible locations compared to remaining items, prioritize progression
        if (currentAccessibleCount < this.unplacedItems.length * 0.1 && this.progressionItems.length > 0) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if we've advanced to a new sphere of progression
     */
    checkSphereAdvancement(currentAccessibleCount) {
        if (currentAccessibleCount > this.lastAccessibleLocationCount) {
            // We've unlocked new locations - advance sphere
            this.currentSphere++;
            this.lastAccessibleLocationCount = currentAccessibleCount;
            console.log(`🌟 Advanced to sphere ${this.currentSphere} (${currentAccessibleCount} accessible locations)`);
        }
    }
    
    /**
     * Get all empty locations that are currently accessible
     */
    getAccessibleEmptyLocations() {
        return this.locations.filter(location => {
            // Must be empty and not locked
            if (location.hasPlacedItem() || location.locked) {
                return false;
            }
            
            // Check if location is logically accessible
            return this.isLocationAccessible(location);
        });
    }
    
    /**
     * Check if a location is accessible with current game state
     */
    isLocationAccessible(location) {
        // Check location-specific rule from rules.json
        const locationRule = this.rules[location.name];
        if (locationRule) {
            return this.evaluateRule(locationRule);
        }
        
        // Fallback: check region accessibility using StateLogic
        const regionTag = location.getRegionTag();
        if (regionTag && typeof StateLogic !== 'undefined' && StateLogic[regionTag]) {
            try {
                const result = StateLogic[regionTag](this.gameState);
                
                // Debug endgame region failures with specific item checks
                if (['fahr_outpost', 'poshley_heights', 'riddle_tower'].includes(regionTag) && !result && this.gameState.items.size > 150) {
                    console.log(`❌ ${regionTag}: inaccessible with ${this.gameState.items.size} items, ${this.unplacedItems.length} unplaced`);
                    this.debugEndgameFailure(regionTag);
                }
                
                return result;
            } catch (error) {
                console.warn(`Error evaluating StateLogic.${regionTag}:`, error);
            }
        }
        
        // Final fallback: use regionLogic from regions.json
        if (regionTag && this.regionLogic[regionTag]) {
            return this.evaluateRule(this.regionLogic[regionTag]);
        }
        
        // Default: accessible if no rule (likely early Rogueport areas)
        return true;
    }
    
    /**
     * Evaluate a logical rule against current game state
     */
    evaluateRule(rule) {
        if (!rule) return true;
        
        // Handle simple item requirement
        if (rule.has) {
            if (typeof rule.has === 'string') {
                const count = rule.count || 1;
                return this.gameState.has(rule.has, count);
            }
            // Handle object form: { item: "itemName", count: X }
            if (typeof rule.has === 'object' && rule.has.item) {
                // Special handling for "stars" item
                if (rule.has.item === 'stars') {
                    const requiredStars = rule.has.count || 1;
                    const currentStars = this.gameState.getStarsCount();
                    const hasEnoughStars = currentStars >= requiredStars;
                    // Only log stars check failures
                    if (!hasEnoughStars) console.log(`⭐ Stars check failed: ${currentStars}/${requiredStars}`);
                    return hasEnoughStars;
                }
                // Normal item handling
                return this.gameState.has(rule.has.item, rule.has.count || 1);
            }
        }
        
        // Handle function calls (abilities like super_boots, ultra_hammer etc.)
        if (rule.function) {
            return this.evaluateFunction(rule.function);
        }
        
        // Handle location/region reachability
        if (rule.can_reach) {
            // Check if it's a location that can be reached and has been completed
            const targetLocation = this.locations.find(loc => loc.name === rule.can_reach);
            if (targetLocation) {
                // Location-based can_reach: location must be accessible and have an item placed
                const isAccessible = this.isLocationAccessible(targetLocation);
                const hasItem = targetLocation.hasPlacedItem();
                // Debug only critical can_reach failures
                if (!isAccessible || !hasItem) {
                    console.log(`🎯 can_reach "${rule.can_reach}": accessible=${isAccessible}, hasItem=${hasItem}`);
                }
                return isAccessible && hasItem;
            } else {
                // Region-based can_reach: use gameState.canReach
                return this.gameState.canReach(rule.can_reach, "Region");
            }
        }
        
        // Handle logical AND - all conditions must be true
        if (rule.and) {
            return rule.and.every(subRule => this.evaluateRule(subRule));
        }
        
        // Handle logical OR - at least one condition must be true
        if (rule.or) {
            return rule.or.some(subRule => this.evaluateRule(subRule));
        }
        
        // Handle negation (NOT)
        if (rule.not) {
            return !this.evaluateRule(rule.not);
        }
        
        return true;
    }
    
    /**
     * Evaluate function-based rules (movement abilities, etc.)
     */
    evaluateFunction(functionName) {
        switch (functionName) {
            case 'super_boots':
                return this.gameState.has('Progressive Boots', 1);
            case 'ultra_boots':
                return this.gameState.has('Progressive Boots', 2);
            case 'super_hammer':
                return this.gameState.has('Progressive Hammer', 1);
            case 'ultra_hammer':
                return this.gameState.has('Progressive Hammer', 2);
            case 'paper_curse':
                return this.gameState.has('Paper Curse');
            case 'plane_curse':
                return this.gameState.has('Plane Curse');
            case 'tube_curse':
                return this.gameState.has('Tube Curse');
            case 'boat_curse':
                return this.gameState.has('Boat Curse');
            case 'key_any':
                return this.gameState.has('Red Key') || this.gameState.has('Blue Key');
            case 'ttyd':
                // Can reach Thousand Year Door (endgame area)
                const stars = this.gameState.getStarsCount();
                const canReachTTYD = stars >= 7;
                console.log(`🏛️ TTYD access check: ${stars}/7 stars = ${canReachTTYD}`);
                return canReachTTYD;
            case 'pit':
                // Can reach Pit of 100 Trials
                const hasPaperCurse = this.gameState.has('Paper Curse');
                console.log(`🕳️ Pit access check: Paper Curse = ${hasPaperCurse}`);
                return hasPaperCurse;
            case 'fahr_outpost':
                // Can reach Fahr Outpost
                return this.gameState.has('Train Ticket');
            case 'keelhaul_key':
                // Can reach Keelhaul Key
                return this.gameState.has('Blimp Ticket');
            case 'riverside':
                // Can reach Riverside Station
                return this.gameState.has('Train Ticket');
            default:
                // Use StateLogic functions from parser.js if available
                if (typeof StateLogic !== 'undefined' && StateLogic[functionName]) {
                    return StateLogic[functionName](this.gameState);
                }
                console.warn(`Unknown function: ${functionName}`);
                return false;
        }
    }
    
    /**
     * Place a progression item strategically
     */
    placeProgressionItem(accessibleLocations) {
        if (this.progressionItems.length === 0) return false;
        
        const progressionItem = this.progressionItems.shift();
        
        // Debug logging for Progressive items
        if (progressionItem === 'Progressive Hammer' || progressionItem === 'Progressive Boots') {
            console.log(`🔍 Attempting to place ${progressionItem}...`);
        }
        
        // Choose location strategically - prefer locations that will unlock more areas
        const bestLocation = this.chooseBestLocationForProgression(accessibleLocations, progressionItem);
        
        if (bestLocation) {
            const placementSuccess = this.placeItemAtLocation(progressionItem, bestLocation);
            if (placementSuccess) {
                console.log(`✅ Placed progression item: ${progressionItem} at ${bestLocation.name} (${bestLocation.getRegionTag() || 'unknown'})`);
                return true;
            } else {
                // Placement failed (likely circular dependency), put item back
                this.progressionItems.unshift(progressionItem);
                
                // Debug logging for failed placement
                if (progressionItem === 'Progressive Hammer' || progressionItem === 'Progressive Boots') {
                    console.log(`❌ Failed to place ${progressionItem} at ${bestLocation.name} - likely circular dependency`);
                }
                
                // Failed progression placement (try another location)
                return false;
            }
        } else {
            // No suitable location found, put item back
            this.progressionItems.unshift(progressionItem);
            
            if (progressionItem === 'Progressive Hammer' || progressionItem === 'Progressive Boots') {
                console.log(`❌ No suitable location found for ${progressionItem}`);
            }
        }
        
        return false;
    }
    
    /**
     * Choose a random location for a progression item with bias toward accessibility
     */
    chooseBestLocationForProgression(locations, itemName) {
        // For truly random placement, just pick a random accessible location
        // But we can weight by how "useful" the location might be for progression
        
        const scored = locations.map(location => {
            let score = Math.random() * 100; // Base random score 0-100
            
            // Small bias toward locations that might unlock more content
            // This is subtle so we don't compromise randomness too much
            const region = location.getRegionTag() || 'unknown';
            
            // Slight preference for early-to-mid game areas (just 10% boost)
            const accessibilityBonus = {
                'rogueport': 10, 'petal_meadows': 8, 'hooktails_castle': 6,
                'boggly_woods': 8, 'great_tree': 6, 'glitzville': 5,
                'twilight_town': 4, 'creepy_steeple': 3, 'keelhaul_key': 2
            };
            
            score += accessibilityBonus[region] || 0;
            
            return { location, score };
        });
        
        // Sort by score and pick randomly from top candidates for more variety
        scored.sort((a, b) => b.score - a.score);
        
        // Pick randomly from top 30% of locations to maintain some randomness
        const topCandidates = scored.slice(0, Math.max(1, Math.ceil(scored.length * 0.3)));
        const randomIndex = Math.floor(Math.random() * topCandidates.length);
        
        return topCandidates[randomIndex]?.location || locations[0];
    }
    
    /**
     * Place filler items in accessible locations
     */
    placeFillerItems(accessibleLocations) {
        let placed = 0;
        const maxFillerPerIteration = Math.min(5, accessibleLocations.length);
        
        for (let i = 0; i < maxFillerPerIteration && this.fillerItems.length > 0; i++) {
            const location = accessibleLocations[i];
            if (!location || location.hasPlacedItem()) continue;
            
            const fillerItem = this.fillerItems.shift() || this.generateFillerItem();
            const placementSuccess = this.placeItemAtLocation(fillerItem, location);
            if (placementSuccess) {
                placed++;
            } else {
                // Placement failed, put filler item back (if it wasn't generated)
                if (this.fillerItems.length > 0 || fillerItem !== this.generateFillerItem()) {
                    this.fillerItems.unshift(fillerItem);
                }
                // Failed filler placement (silent)
            }
        }
        
        return placed > 0;
    }
    
    /**
     * Generate additional filler items if needed
     */
    generateFillerItem() {
        const fillerOptions = ['Star Piece', '10 Coins', 'Mushroom', 'Honey Syrup', 'Super Shroom', 'Shine Sprite'];
        return fillerOptions[Math.floor(Math.random() * fillerOptions.length)];
    }
    
    /**
     * Place an item at a specific location
     */
    placeItemAtLocation(itemName, location, isLocked = false) {
        const itemId = getItemIdByName(itemName);
        if (!itemId) {
            console.warn(`No ID found for item: ${itemName}`);
            return false;
        }
        
        // Check for circular dependency before placing
        if (this.wouldCreateCircularDependency(itemName, location)) {
            // Circular dependency prevented (silent)
            return false;
        }
        
        // Place in location
        location.placeItem(itemId);
        if (isLocked) location.locked = true;
        
        // Update tracking
        this.placedItems.set(location.name, itemName);
        
        // DO NOT add items to gameState immediately - they should only be collected
        // when logically reachable through collectAccessibleItems()
        
        // Remove from unplaced items only if not locked
        // Locked items should not be in the unplaced pool since they weren't in the original item pool
        if (!isLocked) {
            const index = this.unplacedItems.indexOf(itemName);
            if (index >= 0) {
                this.unplacedItems.splice(index, 1);
            }
        }
        
        return true;
    }
    
    /**
     * Check if placing an item would create a circular dependency
     */
    wouldCreateCircularDependency(itemName, location) {
        // Enhanced circular dependency detection for Progressive items
        
        // Special handling for Progressive Hammer and Progressive Boots
        if (itemName === 'Progressive Hammer') {
            const rule = this.rules[location.name];
            if (rule && (this.ruleRequiresFunction(rule, 'ultra_hammer') || this.ruleRequiresFunction(rule, 'super_hammer'))) {
                console.log(`❌ Circular dependency: Progressive Hammer cannot be placed at ${location.name} (requires hammer abilities)`);
                return true;
            }
            
            const regionTag = location.getRegionTag();
            const regionRule = this.regionLogic[regionTag];
            if (regionRule && (this.ruleRequiresFunction(regionRule, 'ultra_hammer') || this.ruleRequiresFunction(regionRule, 'super_hammer'))) {
                console.log(`❌ Circular dependency: Progressive Hammer cannot be placed at ${location.name} (region ${regionTag} requires hammer abilities)`);
                return true;
            }
        }
        
        if (itemName === 'Progressive Boots') {
            const rule = this.rules[location.name];
            if (rule && (this.ruleRequiresFunction(rule, 'ultra_boots') || this.ruleRequiresFunction(rule, 'super_boots'))) {
                console.log(`❌ Circular dependency: Progressive Boots cannot be placed at ${location.name} (requires boots abilities)`);
                return true;
            }
            
            const regionTag = location.getRegionTag();
            const regionRule = this.regionLogic[regionTag];
            if (regionRule && (this.ruleRequiresFunction(regionRule, 'ultra_boots') || this.ruleRequiresFunction(regionRule, 'super_boots'))) {
                console.log(`❌ Circular dependency: Progressive Boots cannot be placed at ${location.name} (region ${regionTag} requires boots abilities)`);
                return true;
            }
        }
        
        // Simple but effective approach: check if location's rules directly require this item
        const rule = this.rules[location.name];
        if (rule && this.ruleRequiresItem(rule, itemName)) {
            return true;
        }
        
        // Check region rules too
        const regionTag = location.getRegionTag();
        const regionRule = this.regionLogic[regionTag];
        if (regionRule && this.ruleRequiresItem(regionRule, itemName)) {
            return true;
        }
        
        // Additional check: test if location becomes inaccessible when item is removed
        const testState = this.gameState.clone();
        if (testState.has(itemName)) {
            testState.removeItem(itemName, testState.getItemCount(itemName)); // Remove all copies
            
            // Create temporary placer with test state
            const originalState = this.gameState;
            this.gameState = testState;
            
            const isAccessibleWithoutItem = this.isLocationAccessible(location);
            
            // Restore original state
            this.gameState = originalState;
            
            // If location is not accessible without this item, it's likely a dependency
            if (!isAccessibleWithoutItem) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if a rule requires a specific function (recursively)
     */
    ruleRequiresFunction(rule, functionName) {
        if (!rule) return false;
        
        // Direct function requirement
        if (rule.function === functionName) return true;
        
        // Check in AND conditions
        if (rule.and && Array.isArray(rule.and)) {
            return rule.and.some(subRule => this.ruleRequiresFunction(subRule, functionName));
        }
        
        // Check in OR conditions
        if (rule.or && Array.isArray(rule.or)) {
            return rule.or.some(subRule => this.ruleRequiresFunction(subRule, functionName));
        }
        
        return false;
    }
    
    /**
     * Check if a rule requires a specific item (recursively)
     */
    ruleRequiresItem(rule, itemName) {
        if (!rule) return false;
        
        // Direct item requirement
        if (rule.has === itemName) return true;
        
        // Check in AND conditions
        if (rule.and && Array.isArray(rule.and)) {
            return rule.and.some(subRule => this.ruleRequiresItem(subRule, itemName));
        }
        
        // Check in OR conditions  
        if (rule.or && Array.isArray(rule.or)) {
            return rule.or.some(subRule => this.ruleRequiresItem(subRule, itemName));
        }
        
        // Check function requirements (like StateLogic functions)
        if (rule.function) {
            // For common progression items, check if they're needed by functions
            const progressionItems = {
                'Progressive Hammer': ['super_hammer', 'ultra_hammer'],
                'Progressive Boots': ['super_boots', 'ultra_boots'],
                'Paper Curse': ['paper_curse', 'tube_curse'],
                'Tube Curse': ['tube_curse'],
                'Plane Curse': ['plane_curse'],
                'Boat Curse': ['boat_curse']
            };
            
            const functions = progressionItems[itemName];
            if (functions && functions.includes(rule.function)) {
                return true;
            }
            
            // Check if StateLogic function directly requires this item
            if (typeof StateLogic !== 'undefined' && StateLogic[rule.function]) {
                // This is a more complex check that would require parsing StateLogic source
                // For now, we'll rely on the accessibility test above
            }
        }
        
        return false;
    }
    
    /**
     * Debug endgame failure specifically for the placement algorithm
     */
    debugEndgameFailure(regionTag) {
        const state = this.gameState;
        
        if (regionTag === 'fahr_outpost') {
            const ultraHammer = StateLogic.ultra_hammer(state);
            const sewerWestsideGround = state.canReach("sewers_westside_ground", "Region");  
            const ultraBoots = StateLogic.ultra_boots(state);
            const sewerWestside = state.canReach("sewers_westside", "Region");
            const hasYoshi = state.has("Yoshi");
            
            console.log(`  🔧 fahr_outpost debug:`);
            console.log(`    ultra_hammer: ${ultraHammer} (Progressive Hammer: ${state.getItemCount("Progressive Hammer")})`);
            console.log(`    sewers_westside_ground: ${sewerWestsideGround}`);
            console.log(`    ultra_boots: ${ultraBoots} (Progressive Boots: ${state.getItemCount("Progressive Boots")})`);
            console.log(`    sewers_westside: ${sewerWestside}`);
            console.log(`    Yoshi: ${hasYoshi}`);
            
            // Check if second Progressive Hammer is unplaced or placed but uncollected
            const remainingProgHammer = this.unplacedItems.filter(item => item === "Progressive Hammer").length;
            const remainingProgBoots = this.unplacedItems.filter(item => item === "Progressive Boots").length;
            console.log(`    Remaining Progressive Hammer: ${remainingProgHammer}`);
            console.log(`    Remaining Progressive Boots: ${remainingProgBoots}`);
            
        } else if (regionTag === 'poshley_heights') {
            const stationKey1 = state.has("Station Key 1");
            const elevatorKey = state.has("Elevator Key (Riverside)");
            const superHammer = StateLogic.super_hammer(state);
            const ultraBoots = StateLogic.ultra_boots(state);
            
            console.log(`  🏢 poshley_heights debug:`);
            console.log(`    Station Key 1: ${stationKey1}`);
            console.log(`    Elevator Key (Riverside): ${elevatorKey}`);
            console.log(`    super_hammer: ${superHammer} (Progressive Hammer: ${state.getItemCount("Progressive Hammer")})`);
            console.log(`    ultra_boots: ${ultraBoots} (Progressive Boots: ${state.getItemCount("Progressive Boots")})`);
            
        } else if (regionTag === 'riddle_tower') {
            const tubeCurse = StateLogic.tube_curse(state);
            const palaceKey = state.has("Palace Key");
            const bobbery = state.has("Bobbery");
            const boatCurse = state.has("Boat Curse");
            const starKey = state.has("Star Key");
            const palaceKeyRT = state.getItemCount("Palace Key (Riddle Tower)");
            
            console.log(`  🗼 riddle_tower debug:`);
            console.log(`    tube_curse: ${tubeCurse} (Paper: ${state.has("Paper Curse")}, Tube: ${state.has("Tube Curse")})`);
            console.log(`    Palace Key: ${palaceKey}`);
            console.log(`    Bobbery: ${bobbery}`);
            console.log(`    Boat Curse: ${boatCurse}`);
            console.log(`    Star Key: ${starKey}`);
            console.log(`    Palace Key (Riddle Tower): ${palaceKeyRT}/8`);
        }
    }

    /**
     * Debug specific region requirements to understand why it's not accessible
     */
    debugRegionRequirements(regionTag) {
        const state = this.gameState;
        
        if (regionTag === 'fahr_outpost') {
            const ultraHammer = StateLogic.ultra_hammer(state);
            const sewerWestsideGround = state.canReach("sewers_westside_ground", "Region");
            const ultraBoots = StateLogic.ultra_boots(state);
            const sewerWestside = state.canReach("sewers_westside", "Region");
            const hasYoshi = state.has("Yoshi");
            
            console.log(`  fahr_outpost requirements:`);
            console.log(`    ultra_hammer: ${ultraHammer} (need Progressive Hammer x2: ${state.getItemCount("Progressive Hammer")})`);
            console.log(`    sewers_westside_ground region: ${sewerWestsideGround}`);
            console.log(`    ultra_boots: ${ultraBoots} (need Progressive Boots x2: ${state.getItemCount("Progressive Boots")})`);
            console.log(`    sewers_westside region: ${sewerWestside}`);
            console.log(`    Yoshi: ${hasYoshi}`);
            
        } else if (regionTag === 'poshley_heights') {
            const stationKey1 = state.has("Station Key 1");
            const elevatorKey = state.has("Elevator Key (Riverside)");
            const superHammer = StateLogic.super_hammer(state);
            const ultraBoots = StateLogic.ultra_boots(state);
            
            console.log(`  poshley_heights requirements:`);
            console.log(`    Station Key 1: ${stationKey1}`);
            console.log(`    Elevator Key (Riverside): ${elevatorKey}`);
            console.log(`    super_hammer: ${superHammer} (need Progressive Hammer x1: ${state.getItemCount("Progressive Hammer")})`);
            console.log(`    ultra_boots: ${ultraBoots} (need Progressive Boots x2: ${state.getItemCount("Progressive Boots")})`);
            
        } else if (regionTag === 'riddle_tower') {
            const tubeCurse = StateLogic.tube_curse(state);
            const palaceKey = state.has("Palace Key");
            const bobbery = state.has("Bobbery");
            const boatCurse = state.has("Boat Curse");
            const starKey = state.has("Star Key");
            const palaceKeyRT = state.getItemCount("Palace Key (Riddle Tower)");
            
            console.log(`  riddle_tower requirements:`);
            console.log(`    tube_curse: ${tubeCurse} (Paper Curse: ${state.has("Paper Curse")}, Tube Curse: ${state.has("Tube Curse")})`);
            console.log(`    Palace Key: ${palaceKey}`);
            console.log(`    Bobbery: ${bobbery}`);
            console.log(`    Boat Curse: ${boatCurse}`);
            console.log(`    Star Key: ${starKey}`);
            console.log(`    Palace Key (Riddle Tower): ${palaceKeyRT}/8 needed`);
        }
    }
    
    /**
     * Update accessible regions based on current game state
     */
    updateAccessibleRegions() {
        // This should update gameState.regions based on current items
        // Implementation depends on how region logic is structured
        performRegionSweep(this.gameState, this.regionLogic);
    }
    
    /**
     * Collect items from locked locations that have become accessible
     */
    /**
     * Collect all accessible items (both regular and locked) for proper sphere progression
     */
    collectAccessibleItems() {
        let collected = 0;
        const collectedThisRound = new Set(); // Track what we collected this round to avoid duplicates
        
        this.locations.forEach(location => {
            if (location.hasPlacedItem()) {
                const itemName = this.placedItems.get(location.name);
                const locationKey = `${location.name}:${itemName}`;
                
                // Only collect if this specific location hasn't been collected yet AND location is accessible
                if (itemName && !collectedThisRound.has(locationKey) && this.isLocationAccessible(location)) {
                    // Check if we've already collected from this specific location
                    if (!location.collected) {
                        this.gameState.addItem(itemName, 1);
                        location.collected = true; // Mark this location as collected
                        collectedThisRound.add(locationKey);
                        collected++;
                        
                        // Log collection for progression items
                        if (this.isProgressionItem(itemName)) {
                            console.log(`📦 Collected: ${itemName} from ${location.name} (now have ${this.gameState.getItemCount(itemName)})`);
                        }
                    }
                }
            }
        });
        return collected;
    }

    /**
     * @deprecated Use collectAccessibleItems() instead
     */
    collectAccessibleLockedItems() {
        let collected = 0;
        
        this.locations.forEach(location => {
            if (location.locked && location.hasPlacedItem()) {
                const itemName = this.placedItems.get(location.name);
                
                // Check if this locked location is now accessible but we haven't collected its item yet
                if (itemName && !this.gameState.has(itemName) && this.isLocationAccessible(location)) {
                    // Add the item to game state
                    this.gameState.addItem(itemName, 1);
                    collected++;
                    
                    console.log(`🔓 Collected locked item: ${itemName} from ${location.name}`);
                    
                    // Special handling for Crystal Stars - ensure stars count is updated
                    if (itemName.includes('Star')) {
                        console.log(`⭐ Stars count now: ${this.gameState.getStarsCount()}`);
                    }
                }
            }
        });
        
        if (collected > 0) {
            console.log(`🔓 Collected ${collected} locked items that became accessible`);
            // Update regions after collecting locked items
            this.updateAccessibleRegions();
        }
    }
    
    /**
     * Attempt to resolve deadlocks by swapping items between locations
     */
    attemptItemSwapping() {
        console.warn('🔄 Attempting item swapping to resolve deadlock...');
        
        // Get the currently inaccessible empty locations that are causing the deadlock
        const inaccessibleEmptyLocations = this.locations.filter(loc => 
            !loc.hasPlacedItem() && !loc.locked && !this.isLocationAccessible(loc)
        );
        
        if (inaccessibleEmptyLocations.length === 0) {
            console.warn('🔄 No inaccessible empty locations found - deadlock unclear');
            return false;
        }
        
        console.warn(`🔄 Found ${inaccessibleEmptyLocations.length} inaccessible empty locations`);
        inaccessibleEmptyLocations.slice(0, 3).forEach(loc => {
            console.warn(`  - ${loc.name} (region: ${loc.getRegionTag() || 'unknown'})`);
        });
        
        // Find progression items that could help unlock these locations
        // Look for progression items in accessible locations that we could move
        const accessiblePlacedItems = [];
        
        this.locations.forEach(location => {
            if (location.hasPlacedItem() && !location.locked && this.isLocationAccessible(location)) {
                const itemName = this.placedItems.get(location.name);
                if (itemName && this.isProgressionItem(itemName)) {
                    accessiblePlacedItems.push({location, itemName});
                }
            }
        });
        
        console.warn(`🔄 Found ${accessiblePlacedItems.length} progression items in accessible locations`);
        
        // Try strategic swaps - move progression items to earlier/more accessible locations
        for (const progItem of accessiblePlacedItems.slice(0, 10)) { // Try up to 10 swaps
            // Look for filler items in early-game accessible locations
            const earlyFillerCandidates = [];
            
            this.locations.forEach(location => {
                if (location.hasPlacedItem() && !location.locked && this.isLocationAccessible(location)) {
                    const itemName = this.placedItems.get(location.name);
                    const region = location.getRegionTag() || 'unknown';
                    
                    // Target early-game regions for progression items
                    if (itemName && !this.isProgressionItem(itemName) && 
                        ['rogueport', 'sewers_westside', 'petal_meadows', 'unknown'].includes(region)) {
                        earlyFillerCandidates.push({location, itemName});
                    }
                }
            });
            
            // Try swapping with early filler locations
            for (const fillerItem of earlyFillerCandidates) {
                if (this.attemptValidatedSwap(progItem, fillerItem, inaccessibleEmptyLocations)) {
                    console.warn(`✅ Successful swap: ${progItem.itemName} <-> ${fillerItem.itemName}`);
                    return true;
                }
            }
        }
        
        console.warn('🔄 No beneficial swaps found');
        return false;
    }
    
    /**
     * Attempt to swap two items and validate it actually helps
     */
    attemptValidatedSwap(itemA, itemB, inaccessibleEmptyLocations) {
        // Store original state before swap
        const itemAId = itemA.location.placed_item;
        const itemBId = itemB.location.placed_item;
        
        // Count currently accessible empty locations before swap
        const accessibleEmptyBefore = this.getAccessibleEmptyLocations().length;
        
        // Temporarily remove both items
        itemA.location.placed_item = null;
        itemB.location.placed_item = null;
        this.gameState.removeItem(itemA.itemName, 1);
        this.gameState.removeItem(itemB.itemName, 1);
        this.placedItems.delete(itemA.location.name);
        this.placedItems.delete(itemB.location.name);
        
        // Try placing them in swapped locations
        const itemAPlacedInB = this.placeItemAtLocation(itemA.itemName, itemB.location);
        const itemBPlacedInA = this.placeItemAtLocation(itemB.itemName, itemA.location);
        
        if (itemAPlacedInB && itemBPlacedInA) {
            // Update accessible regions after swap
            this.updateAccessibleRegions();
            
            // Count accessible empty locations after swap
            const accessibleEmptyAfter = this.getAccessibleEmptyLocations().length;
            
            // Check if any previously inaccessible locations are now accessible
            let newlyAccessible = 0;
            inaccessibleEmptyLocations.forEach(loc => {
                if (this.isLocationAccessible(loc)) {
                    newlyAccessible++;
                }
            });
            
            // Swap is beneficial if it unlocked new locations
            if (accessibleEmptyAfter > accessibleEmptyBefore || newlyAccessible > 0) {
                console.warn(`🔄 Swap beneficial: +${accessibleEmptyAfter - accessibleEmptyBefore} accessible, +${newlyAccessible} newly accessible`);
                return true;
            } else {
                console.warn(`🔄 Swap not beneficial: ${accessibleEmptyBefore} -> ${accessibleEmptyAfter} accessible`);
            }
        }
        
        // Swap failed or wasn't beneficial - restore original placement
        itemA.location.placed_item = itemAId;
        itemB.location.placed_item = itemBId;
        this.gameState.addItem(itemA.itemName, 1);
        this.gameState.addItem(itemB.itemName, 1);
        this.placedItems.set(itemA.location.name, itemA.itemName);
        this.placedItems.set(itemB.location.name, itemB.itemName);
        this.updateAccessibleRegions(); // Restore regions
        
        return false;
    }
    
    /**
     * Reset the placement state for a complete restart
     */
    resetPlacement() {
        console.warn('🔄 Performing complete placement reset...');
        
        // Clear all non-locked items and reset collection flags
        this.locations.forEach(location => {
            if (!location.locked) {
                location.placed_item = null;
                location.collected = false; // Reset collection flag
            } else if (location.locked) {
                location.collected = false; // Reset collection flag for locked items too
            }
        });
        
        // Reset game state to starting state but keep locked items
        this.gameState = GameState.createStartingState();
        
        // Re-add locked items to game state
        this.locations.forEach(location => {
            if (location.locked && location.hasPlacedItem()) {
                const itemName = getItemNameById(location.placed_item);
                if (itemName) {
                    this.gameState.addItem(itemName, 1);
                }
            }
        });
        
        // Reset tracking
        const lockedItems = new Map();
        this.placedItems.forEach((itemName, locationName) => {
            const location = this.locations.find(loc => loc.name === locationName);
            if (location && location.locked) {
                lockedItems.set(locationName, itemName);
            }
        });
        this.placedItems = lockedItems;
        
        // Reset item pools with fresh randomization
        const allItems = [...this.items];
        this.progressionItems = this.shuffleArray(allItems.filter(item => this.isProgressionItem(item)));
        this.fillerItems = this.shuffleArray(allItems.filter(item => !this.isProgressionItem(item)));
        this.unplacedItems = [...allItems];
        
        // Remove already placed locked items from pools
        this.placedItems.forEach(itemName => {
            const progIndex = this.progressionItems.indexOf(itemName);
            if (progIndex >= 0) this.progressionItems.splice(progIndex, 1);
            
            const fillerIndex = this.fillerItems.indexOf(itemName);
            if (fillerIndex >= 0) this.fillerItems.splice(fillerIndex, 1);
            
            const unplacedIndex = this.unplacedItems.indexOf(itemName);
            if (unplacedIndex >= 0) this.unplacedItems.splice(unplacedIndex, 1);
        });
        
        // Reset sphere tracking
        this.currentSphere = 0;
        this.lastAccessibleLocationCount = 0;
        
        console.warn(`🔄 Reset complete: ${this.unplacedItems.length} items to place`);
    }
}

// Export for use in generate.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LogicalItemPlacer };
} else if (typeof window !== 'undefined') {
    window.LogicalItemPlacer = LogicalItemPlacer;
}