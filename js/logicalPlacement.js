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
        
        // Split items by type for strategic placement
        this.progressionItems = items.filter(item => this.isProgressionItem(item));
        this.fillerItems = items.filter(item => !this.isProgressionItem(item));
        
        console.log(`Logical placer initialized: ${this.progressionItems.length} progression, ${this.fillerItems.length} filler items`);
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
     * Main placement algorithm using forward-fill logic
     */
    async place() {
        console.log('=== STARTING LOGICAL FORWARD-FILL PLACEMENT ===');
        
        // Step 1: Apply locked items (starting partner + Crystal Stars in their locations)
        this.applyLockedItems();
        
        // Step 2: Main forward-fill loop
        const success = await this.forwardFillLoop();
        
        if (!success) {
            throw new Error('Forward-fill placement failed - could not place all items logically');
        }
        
        console.log('✅ Logical placement completed successfully');
        return this.placedItems;
    }
    
    /**
     * Apply locked items (starting partner, Crystal Stars in boss locations)
     */
    applyLockedItems() {
        console.log('Applying locked items...');
        
        // Starting partner at Rogueport Center
        const startingPartnerLocation = this.locations.find(loc => loc.name === "Rogueport Center: Goombella");
        if (startingPartnerLocation) {
            const startingPartner = this.getStartingPartnerName();
            this.placeItemAtLocation(startingPartner, startingPartnerLocation, true);
            console.log(`Locked starting partner: ${startingPartner}`);
        }
        
        // Crystal Stars at boss locations (these are progression gates)
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
                console.log(`Locked Crystal Star: ${itemName} at ${locationName}`);
            }
        });
    }
    
    getStartingPartnerName() {
        const partners = ["Goombella", "Koops", "Bobbery", "Yoshi", "Flurrie", "Vivian", "Ms. Mowz"];
        return partners[this.settings.starting_partner - 1] || "Goombella";
    }
    
    /**
     * Main forward-fill placement loop
     */
    async forwardFillLoop() {
        let iterations = 0;
        const maxIterations = 1000;
        
        while (this.unplacedItems.length > 0 && iterations < maxIterations) {
            iterations++;
            
            if (iterations % 50 === 0) {
                console.log(`Forward-fill iteration ${iterations}: ${this.unplacedItems.length} items remaining`);
            }
            
            // Get currently accessible empty locations
            const accessibleLocations = this.getAccessibleEmptyLocations();
            
            if (accessibleLocations.length === 0) {
                console.error('No accessible empty locations available!');
                console.error(`Remaining items: ${this.unplacedItems.length}`);
                console.error(`Game state:`, this.gameState.getStats());
                return false;
            }
            
            // Try to place a progression item first (if available)
            let placed = false;
            if (this.progressionItems.length > 0) {
                placed = this.placeProgressionItem(accessibleLocations);
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
        }
        
        if (this.unplacedItems.length > 0) {
            console.error(`Forward-fill failed: ${this.unplacedItems.length} items could not be placed`);
            return false;
        }
        
        console.log(`Forward-fill completed in ${iterations} iterations`);
        return true;
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
        
        // Fallback: check region accessibility
        const regionTag = location.getRegionTag();
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
        
        if (rule.has) {
            return this.gameState.has(rule.has);
        }
        
        if (rule.function) {
            // Use StateLogic functions from parser.js
            if (typeof StateLogic !== 'undefined' && StateLogic[rule.function]) {
                return StateLogic[rule.function](this.gameState);
            }
            return false;
        }
        
        if (rule.can_reach) {
            return this.gameState.canReach(rule.can_reach.target, rule.can_reach.type);
        }
        
        if (rule.and) {
            return rule.and.every(subRule => this.evaluateRule(subRule));
        }
        
        if (rule.or) {
            return rule.or.some(subRule => this.evaluateRule(subRule));
        }
        
        return true;
    }
    
    /**
     * Place a progression item strategically
     */
    placeProgressionItem(accessibleLocations) {
        if (this.progressionItems.length === 0) return false;
        
        const progressionItem = this.progressionItems.shift();
        
        // Choose location strategically - prefer locations that will unlock more areas
        const bestLocation = this.chooseBestLocationForProgression(accessibleLocations, progressionItem);
        
        if (bestLocation) {
            this.placeItemAtLocation(progressionItem, bestLocation);
            console.log(`Placed progression item: ${progressionItem} at ${bestLocation.name} (${bestLocation.getRegionTag() || 'unknown'})`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Choose the best location for a progression item
     */
    chooseBestLocationForProgression(locations, itemName) {
        // For now, simple strategy: prefer mid-game locations over early/late
        const scored = locations.map(location => {
            const region = location.getRegionTag() || 'unknown';
            
            // Scoring strategy for progression items
            let score = 50; // Base score
            
            // Mid-game areas get higher scores
            const regionScores = {
                'boggly_woods': 80, 'great_tree': 75, 'glitzville': 70,
                'twilight_town': 65, 'creepy_steeple': 60, 'keelhaul_key': 55,
                'petal_right': 45, 'hooktails_castle': 40, 'sewers_westside': 35,
                'petal_left': 30, 'rogueport_westside': 25, 'unknown': 20,
                'palace': 15, 'riddle_tower': 10, 'xnaut_fortress': 5, 'pit': 1
            };
            
            score = regionScores[region] || score;
            
            return { location, score };
        });
        
        // Sort by score and return best
        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.location || locations[0];
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
            this.placeItemAtLocation(fillerItem, location);
            placed++;
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
        
        // Place in location
        location.placeItem(itemId);
        if (isLocked) location.locked = true;
        
        // Update tracking
        this.placedItems.set(location.name, itemName);
        this.gameState.addItem(itemName, 1);
        
        // Remove from unplaced items
        const index = this.unplacedItems.indexOf(itemName);
        if (index >= 0) {
            this.unplacedItems.splice(index, 1);
        }
        
        return true;
    }
    
    /**
     * Update accessible regions based on current game state
     */
    updateAccessibleRegions() {
        // This should update gameState.regions based on current items
        // Implementation depends on how region logic is structured
        performRegionSweep(this.gameState, this.regionLogic);
    }
}

// Export for use in generate.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LogicalItemPlacer };
} else if (typeof window !== 'undefined') {
    window.LogicalItemPlacer = LogicalItemPlacer;
}