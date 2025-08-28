// Logic Test Framework for TTYD Randomizer
// Tests logical accessibility requirements for locations and regions

class LogicTestFramework {
    constructor() {
        this.regionLogic = null;
        this.locationRules = null;
        this.locationCollection = null;
        this.testResults = [];
    }

    /**
     * Initialize the test framework with game data
     * @param {Object} regionLogic - Region logic from regions.json
     * @param {Object} locationRules - Location rules from rules.json
     * @param {LocationCollection} locationCollection - Collection of all locations
     */
    async initialize(regionLogic, locationRules, locationCollection) {
        this.regionLogic = regionLogic;
        this.locationRules = locationRules;
        this.locationCollection = locationCollection;
    }

    /**
     * Creates an empty game state for baseline testing
     * @returns {GameState} Empty game state
     */
    createEmptyGameState() {
        return new GameState();
    }

    /**
     * Creates a game state with basic starting items
     * @returns {GameState} Basic starting state
     */
    createStartingGameState() {
        const state = new GameState();
        // Add basic starting regions
        state.addRegion("Rogueport");
        return state;
    }

    /**
     * Test 1: Verify baseline accessibility with empty game state
     * Tests which locations should be accessible with no items/abilities
     */
    testEmptyGamestateBaseline() {
        console.log("=== Testing Empty Gamestate Baseline ===");
        const emptyState = this.createEmptyGameState();
        const results = {
            testName: "Empty Gamestate Baseline",
            accessible: [],
            inaccessible: [],
            errors: []
        };

        // Test region accessibility
        console.log("Testing region accessibility with empty state...");
        for (const [regionName, logic] of Object.entries(this.regionLogic)) {
            try {
                const isAccessible = this._evaluateRegionLogic(logic, emptyState);
                if (isAccessible) {
                    results.accessible.push(`Region: ${regionName}`);
                } else {
                    results.inaccessible.push(`Region: ${regionName}`);
                }
            } catch (error) {
                results.errors.push(`Region ${regionName}: ${error.message}`);
            }
        }

        // Test location accessibility
        console.log("Testing location accessibility with empty state...");
        this.locationCollection.forEach(location => {
            try {
                const isAccessible = location.isAccessible(emptyState, this.regionLogic);
                if (isAccessible) {
                    results.accessible.push(`Location: ${location.name}`);
                } else {
                    results.inaccessible.push(`Location: ${location.name}`);
                }
            } catch (error) {
                results.errors.push(`Location ${location.name}: ${error.message}`);
            }
        });

        this.testResults.push(results);
        return results;
    }

    /**
     * Test 2: Progressive item unlocking
     * Tests that regions/locations become accessible as items are added
     */
    testProgressiveItemUnlocking() {
        console.log("=== Testing Progressive Item Unlocking ===");
        const results = {
            testName: "Progressive Item Unlocking",
            progressionTests: [],
            errors: []
        };

        // Define progression steps based on actual StateLogic requirements
        const progressionSteps = [
            {
                name: "Starting State (Empty)",
                items: [],
                expectAccessible: [] // Nothing should be accessible initially
            },
            {
                name: "Plane Curse (Petal Left access)",
                items: ["Plane Curse"],
                expectAccessible: ["petal_left"]
            },
            {
                name: "Paper Curse (Boggly Woods access)",
                items: ["Paper Curse"],
                expectAccessible: []
            },
            {
                name: "Paper + Plane (Pit access)",
                items: ["Paper Curse", "Plane Curse"],
                expectAccessible: ["petal_left", "pit"]
            },
            {
                name: "Flurrie alone (should not unlock Great Tree)",
                items: ["Flurrie"],
                expectAccessible: []
            },
            {
                name: "Paper Curse + Flurrie (Great Tree access)",
                items: ["Paper Curse", "Flurrie"],
                expectAccessible: ["great_tree"]
            },
            {
                name: "Blimp Ticket alone (should not unlock Glitzville)",
                items: ["Blimp Ticket"],
                expectAccessible: []
            },
            {
                name: "Contact Lens + Blimp Ticket (Glitzville access)",
                items: ["Contact Lens", "Blimp Ticket"],
                expectAccessible: ["rogueport_westside", "glitzville"]
            },
            {
                name: "Contact Lens (Westside access)",
                items: ["Contact Lens"],
                expectAccessible: ["rogueport_westside"]
            },
            {
                name: "Progressive Hammer (Super Hammer)",
                items: ["Progressive Hammer"],
                expectAccessible: []
            },
            {
                name: "Progressive Hammer x2 (Ultra Hammer)",
                items: ["Progressive Hammer", "Progressive Hammer"],
                expectAccessible: []
            },
            {
                name: "Hooktail Castle full requirements",
                items: ["Plane Curse", "Sun Stone", "Moon Stone", "Koops"],
                expectAccessible: ["petal_left", "hooktails_castle"]
            },
            {
                name: "Crystal Stars progression test",
                items: ["Diamond Star", "Emerald Star", "Gold Star"],
                expectAccessible: [],
                expectStars: 3
            }
        ];

        // Test each progression step
        for (const step of progressionSteps) {
            const state = new GameState();
            
            // Add items to state
            for (const item of step.items) {
                state.addItem(item);
            }

            const stepResult = {
                stepName: step.name,
                expectedAccessible: step.expectAccessible || [],
                actualAccessible: [],
                unexpectedAccessible: [],
                missing: [],
                expectedStars: step.expectStars,
                actualStars: state.getStarsCount()
            };

            // Test region accessibility
            for (const [regionName, logic] of Object.entries(this.regionLogic)) {
                try {
                    const isAccessible = this._evaluateRegionLogic(logic, state);
                    if (isAccessible) {
                        stepResult.actualAccessible.push(regionName);
                        if (!step.expectAccessible.includes(regionName)) {
                            stepResult.unexpectedAccessible.push(regionName);
                        }
                    }
                } catch (error) {
                    results.errors.push(`${step.name} - Region ${regionName}: ${error.message}`);
                }
            }

            // Check for missing expected regions
            for (const expectedRegion of step.expectAccessible) {
                if (!stepResult.actualAccessible.includes(expectedRegion)) {
                    stepResult.missing.push(expectedRegion);
                }
            }

            results.progressionTests.push(stepResult);
        }

        this.testResults.push(results);
        return results;
    }

    /**
     * Test 3: Specific requirement validation
     * Tests specific complex requirements
     */
    testSpecificRequirements() {
        console.log("=== Testing Specific Requirements ===");
        const results = {
            testName: "Specific Requirements",
            tests: [],
            errors: []
        };

        const specificTests = [
            {
                name: "Hooktail Castle requires Plane Curse + Sun/Moon Stone + Koops/Bobbery",
                setupState: (state) => {
                    state.addItem("Plane Curse"); // Required by petal_left function
                    state.addItem("Sun Stone");
                    state.addItem("Moon Stone");
                    state.addItem("Koops");
                },
                expectAccessible: ["hooktails_castle"],
                expectInaccessible: []
            },
            {
                name: "Great Tree requires Paper Curse + Flurrie",
                setupState: (state) => {
                    state.addItem("Paper Curse"); // Required by boggly_woods function
                    state.addItem("Flurrie");
                },
                expectAccessible: ["great_tree"],
                expectInaccessible: []
            },
            {
                name: "Glitzville requires Contact Lens + Blimp Ticket",
                setupState: (state) => {
                    state.addItem("Contact Lens"); // Required by westside function
                    state.addItem("Blimp Ticket");
                },
                expectAccessible: ["glitzville"],
                expectInaccessible: []
            },
            {
                name: "Pit requires Paper + Plane Curse",
                setupState: (state) => {
                    state.addItem("Paper Curse");
                    state.addItem("Plane Curse");
                },
                expectAccessible: ["pit"],
                expectInaccessible: []
            },
            {
                name: "Petal Left requires Plane Curse",
                setupState: (state) => {
                    state.addItem("Plane Curse");
                },
                expectAccessible: ["petal_left"],
                expectInaccessible: []
            },
            {
                name: "Westside requires Contact Lens OR Bobbery OR Tube Curse OR Ultra Hammer",
                setupState: (state) => {
                    state.addItem("Contact Lens");
                },
                expectAccessible: ["rogueport_westside"],
                expectInaccessible: []
            }
        ];

        for (const test of specificTests) {
            const state = new GameState();
            test.setupState(state);

            const testResult = {
                testName: test.name,
                passed: true,
                details: []
            };

            // Test expected accessible regions
            for (const regionName of test.expectAccessible) {
                try {
                    const logic = this.regionLogic[regionName];
                    if (logic) {
                        const isAccessible = this._evaluateRegionLogic(logic, state);
                        if (!isAccessible) {
                            testResult.passed = false;
                            testResult.details.push(`Expected ${regionName} to be accessible, but it was not`);
                        } else {
                            testResult.details.push(`✓ ${regionName} correctly accessible`);
                        }
                    }
                } catch (error) {
                    results.errors.push(`${test.name} - ${regionName}: ${error.message}`);
                    testResult.passed = false;
                }
            }

            // Test expected inaccessible regions
            for (const regionName of test.expectInaccessible) {
                try {
                    const logic = this.regionLogic[regionName];
                    if (logic) {
                        const isAccessible = this._evaluateRegionLogic(logic, state);
                        if (isAccessible) {
                            testResult.passed = false;
                            testResult.details.push(`Expected ${regionName} to be inaccessible, but it was accessible`);
                        } else {
                            testResult.details.push(`✓ ${regionName} correctly inaccessible`);
                        }
                    }
                } catch (error) {
                    results.errors.push(`${test.name} - ${regionName}: ${error.message}`);
                    testResult.passed = false;
                }
            }

            results.tests.push(testResult);
        }

        this.testResults.push(results);
        return results;
    }

    /**
     * Test 4: Location-specific rule validation
     * Tests rules.json requirements for individual locations
     */
    testLocationRules() {
        console.log("=== Testing Location Rules ===");
        const results = {
            testName: "Location Rules",
            locationTests: [],
            errors: []
        };

        // Test a sample of locations with different rule types
        const testCases = [
            {
                locationName: "Boggly Woods Plane Panel Room: Shine Sprite",
                setupState: (state) => {
                    state.addItem("Koops");
                },
                shouldBeAccessible: true
            },
            {
                locationName: "Boggly Woods Plane Panel Room: Quake Hammer", 
                setupState: (state) => {
                    state.addItem("Plane Curse");
                },
                shouldBeAccessible: true
            },
            {
                locationName: "Great Tree Entrance: Emerald Star",
                setupState: (state) => {
                    state.addItem("Red Key");
                    state.addItem("Puni Orb");
                    state.addItem("Flurrie");
                    state.addItem("Blue Key");
                    state.addItem("Koops");
                    state.addItem("Progressive Boots"); // Use Progressive Boots for super_boots function
                },
                shouldBeAccessible: true
            },
            {
                locationName: "Glitzville Storage Back Room: Star Piece",
                setupState: (state) => {
                    // Missing some requirements intentionally
                    state.addItem("Flurrie");
                    state.addItem("Storage Key 1");
                    // Missing Storage Key 2, Yoshi, and super hammer
                },
                shouldBeAccessible: false
            },
            {
                locationName: "Pit of 100 Trials Floor 10: Sleepy Stomp",
                setupState: (state) => {
                    // Add 1 Crystal Star to meet the requirement
                    state.addItem("Diamond Star");
                },
                shouldBeAccessible: true
            },
            {
                locationName: "Pit of 100 Trials Floor 30: Zap Tap", 
                setupState: (state) => {
                    // Add only 1 Crystal Star - should not be enough (needs 2)
                    state.addItem("Diamond Star");
                },
                shouldBeAccessible: false
            },
            {
                locationName: "Pit of 100 Trials Floor 30: Zap Tap",
                setupState: (state) => {
                    // Add 2 Crystal Stars - should be accessible
                    state.addItem("Diamond Star");
                    state.addItem("Emerald Star");
                },
                shouldBeAccessible: true
            }
        ];

        for (const testCase of testCases) {
            const state = new GameState();
            testCase.setupState(state);

            try {
                const rule = this.locationRules[testCase.locationName];
                if (rule) {
                    const isAccessible = this._evaluateLocationRule(rule, state);
                    const testResult = {
                        locationName: testCase.locationName,
                        expected: testCase.shouldBeAccessible,
                        actual: isAccessible,
                        passed: isAccessible === testCase.shouldBeAccessible
                    };
                    results.locationTests.push(testResult);
                } else {
                    results.errors.push(`No rule found for location: ${testCase.locationName}`);
                }
            } catch (error) {
                results.errors.push(`${testCase.locationName}: ${error.message}`);
            }
        }

        this.testResults.push(results);
        return results;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log("=== Starting Logic Test Suite ===");
        
        const allResults = {
            emptyBaseline: this.testEmptyGamestateBaseline(),
            progressiveUnlocking: this.testProgressiveItemUnlocking(),
            specificRequirements: this.testSpecificRequirements(),
            locationRules: this.testLocationRules(),
            endgameRegions: this.testEndgameRegions()
        };

        this._printTestSummary(allResults);
        return allResults;
    }

    /**
     * Evaluates region logic expression
     * @param {Object} logic - Logic expression from regions.json
     * @param {GameState} state - Current game state
     * @returns {boolean} True if requirements are met
     */
    _evaluateRegionLogic(logic, state) {
        if (logic.has) {
            return state.has(logic.has);
        }
        
        if (logic.function) {
            // Use StateLogic functions if available
            if (typeof StateLogic !== 'undefined' && StateLogic[logic.function]) {
                return StateLogic[logic.function](state);
            }
            return false; // Function not found
        }
        
        if (logic.can_reach) {
            return state.canReach(logic.can_reach.target, logic.can_reach.type);
        }
        
        if (logic.and) {
            return logic.and.every(subLogic => this._evaluateRegionLogic(subLogic, state));
        }
        
        if (logic.or) {
            return logic.or.some(subLogic => this._evaluateRegionLogic(subLogic, state));
        }
        
        return true; // Default to accessible
    }

    /**
     * Evaluates location rule from rules.json
     * @param {Object} rule - Rule expression from rules.json
     * @param {GameState} state - Current game state
     * @returns {boolean} True if requirements are met
     */
    _evaluateLocationRule(rule, state) {
        if (rule.has) {
            if (typeof rule.has === 'object' && rule.has.item) {
                // Special case for stars - use the stars function instead
                if (rule.has.item === 'stars') {
                    const starsCount = state.getStarsCount ? state.getStarsCount() : 0;
                    return starsCount >= (rule.has.count || 1);
                }
                return state.has(rule.has.item, rule.has.count || 1);
            }
            return state.has(rule.has);
        }
        
        if (rule.function) {
            if (typeof StateLogic !== 'undefined' && StateLogic[rule.function]) {
                return StateLogic[rule.function](state);
            }
            // Basic function checks
            switch (rule.function) {
                case 'super_boots':
                    return state.has("Super Boots") || state.has("Ultra Boots");
                case 'ultra_boots':
                    return state.has("Ultra Boots");
                case 'super_hammer':
                    return state.has("Super Hammer") || state.has("Ultra Hammer");
                case 'ultra_hammer':
                    return state.has("Ultra Hammer");
                case 'tube_curse':
                    return state.has("Tube Curse");
                default:
                    return false;
            }
        }
        
        if (rule.can_reach) {
            return state.canReach(rule.can_reach);
        }
        
        if (rule.and) {
            return rule.and.every(subRule => this._evaluateLocationRule(subRule, state));
        }
        
        if (rule.or) {
            return rule.or.some(subRule => this._evaluateLocationRule(subRule, state));
        }
        
        return true; // Default to accessible
    }

    /**
     * Print test summary
     */
    _printTestSummary(allResults) {
        console.log("\n=== TEST SUMMARY ===");
        
        for (const [testName, result] of Object.entries(allResults)) {
            console.log(`\n${testName.toUpperCase()}:`);
            
            if (result.errors && result.errors.length > 0) {
                console.log(`  ❌ ${result.errors.length} errors found`);
                result.errors.slice(0, 3).forEach(error => {
                    console.log(`    - ${error}`);
                });
                if (result.errors.length > 3) {
                    console.log(`    ... and ${result.errors.length - 3} more errors`);
                }
            } else {
                console.log(`  ✅ No errors found`);
            }

            if (result.accessible) {
                console.log(`  📍 ${result.accessible.length} locations/regions accessible`);
            }
            
            if (result.inaccessible) {
                console.log(`  🚫 ${result.inaccessible.length} locations/regions inaccessible`);
            }

            if (result.progressionTests) {
                const stepsWithIssues = result.progressionTests.filter(step => 
                    step.missing.length > 0 || step.unexpectedAccessible.length > 0).length;
                console.log(`  📊 ${result.progressionTests.length} progression steps tested`);
                if (stepsWithIssues > 0) {
                    console.log(`  ⚠️  ${stepsWithIssues} steps had unexpected results`);
                }
            }

            if (result.tests) {
                const passed = result.tests.filter(t => t.passed).length;
                console.log(`  🧪 ${passed}/${result.tests.length} specific tests passed`);
            }

            if (result.locationTests) {
                const passed = result.locationTests.filter(t => t.passed).length;
                console.log(`  🎯 ${passed}/${result.locationTests.length} location tests passed`);
            }
        }
    }

    /**
     * Test 5: Endgame Region Requirements
     * Tests the specific problematic endgame regions that commonly fail
     */
    testEndgameRegions() {
        console.log("=== Testing Endgame Regions ===");
        const results = {
            errors: [],
            tests: []
        };

        // Test cases for the three problematic endgame regions
        const testCases = [
            {
                regionName: "fahr_outpost",
                description: "Fahr Outpost with full requirements",
                setupState: (state) => {
                    // Add all requirements for fahr_outpost
                    state.addItem("Progressive Hammer", 2); // ultra_hammer
                    state.addItem("Progressive Boots", 2); // ultra_boots
                    state.addItem("Paper Curse");
                    state.addItem("Tube Curse");
                    state.addItem("Bobbery");
                    state.addItem("Contact Lens");
                    state.addItem("Yoshi");
                    state.addItem("Flurrie");
                },
                shouldBeAccessible: true
            },
            {
                regionName: "poshley_heights", 
                description: "Poshley Heights with required keys and abilities",
                setupState: (state) => {
                    state.addItem("Station Key 1");
                    state.addItem("Elevator Key (Riverside)");
                    state.addItem("Progressive Hammer", 1); // super_hammer
                    state.addItem("Progressive Boots", 2); // ultra_boots
                },
                shouldBeAccessible: true
            },
            {
                regionName: "riddle_tower",
                description: "Riddle Tower with all Palace Keys",
                setupState: (state) => {
                    state.addItem("Paper Curse");
                    state.addItem("Tube Curse");
                    state.addItem("Palace Key");
                    state.addItem("Bobbery");
                    state.addItem("Boat Curse");
                    state.addItem("Star Key");
                    // Add 8 copies of Palace Key (Riddle Tower)
                    state.addItem("Palace Key (Riddle Tower)", 8);
                },
                shouldBeAccessible: true
            },
            {
                regionName: "fahr_outpost",
                description: "Fahr Outpost missing ultra_hammer",
                setupState: (state) => {
                    state.addItem("Progressive Hammer", 1); // only super_hammer
                    state.addItem("Progressive Boots", 2);
                    state.addItem("Yoshi");
                },
                shouldBeAccessible: false
            },
            {
                regionName: "poshley_heights",
                description: "Poshley Heights missing Station Key 1",
                setupState: (state) => {
                    // Missing Station Key 1
                    state.addItem("Elevator Key (Riverside)");
                    state.addItem("Progressive Hammer", 1);
                    state.addItem("Progressive Boots", 2);
                },
                shouldBeAccessible: false
            }
        ];

        for (const testCase of testCases) {
            const state = new GameState();
            testCase.setupState(state);

            try {
                let isAccessible = false;
                
                // Use StateLogic to test region accessibility
                if (typeof StateLogic !== 'undefined' && StateLogic[testCase.regionName]) {
                    isAccessible = StateLogic[testCase.regionName](state);
                } else {
                    results.errors.push(`No StateLogic function found for region: ${testCase.regionName}`);
                    continue;
                }

                const testResult = {
                    testName: testCase.description,
                    passed: isAccessible === testCase.shouldBeAccessible,
                    details: [
                        `Region: ${testCase.regionName}`,
                        `Expected: ${testCase.shouldBeAccessible}`,
                        `Actual: ${isAccessible}`,
                        `Items: ${Array.from(state.getAllItems().entries()).map(([item, count]) => 
                            count > 1 ? `${item} x${count}` : item).join(', ')}`
                    ]
                };

                results.tests.push(testResult);

                // Add detailed debugging for failures
                if (!testResult.passed) {
                    this._debugEndgameRegionFailure(testCase.regionName, state, testResult.details);
                }

            } catch (error) {
                results.errors.push(`${testCase.description}: ${error.message}`);
            }
        }

        this.testResults.push(results);
        return results;
    }

    /**
     * Debug helper for endgame region failures
     */
    _debugEndgameRegionFailure(regionName, state, details) {
        if (regionName === 'fahr_outpost') {
            const ultraHammer = StateLogic.ultra_hammer(state);
            const sewerWestsideGround = state.canReach("sewers_westside_ground", "Region");
            const ultraBoots = StateLogic.ultra_boots(state);
            const sewerWestside = state.canReach("sewers_westside", "Region");
            const hasYoshi = state.has("Yoshi");
            
            details.push(`Debug fahr_outpost:`);
            details.push(`  ultra_hammer: ${ultraHammer} (Progressive Hammer: ${state.getItemCount("Progressive Hammer")})`);
            details.push(`  sewers_westside_ground: ${sewerWestsideGround}`);
            details.push(`  ultra_boots: ${ultraBoots} (Progressive Boots: ${state.getItemCount("Progressive Boots")})`);
            details.push(`  sewers_westside: ${sewerWestside}`);
            details.push(`  Yoshi: ${hasYoshi}`);
            
        } else if (regionName === 'poshley_heights') {
            const stationKey1 = state.has("Station Key 1");
            const elevatorKey = state.has("Elevator Key (Riverside)");
            const superHammer = StateLogic.super_hammer(state);
            const ultraBoots = StateLogic.ultra_boots(state);
            
            details.push(`Debug poshley_heights:`);
            details.push(`  Station Key 1: ${stationKey1}`);
            details.push(`  Elevator Key (Riverside): ${elevatorKey}`);
            details.push(`  super_hammer: ${superHammer}`);
            details.push(`  ultra_boots: ${ultraBoots}`);
            
        } else if (regionName === 'riddle_tower') {
            const tubeCurse = StateLogic.tube_curse(state);
            const palaceKey = state.has("Palace Key");
            const bobbery = state.has("Bobbery");
            const boatCurse = state.has("Boat Curse");
            const starKey = state.has("Star Key");
            const palaceKeyRT = state.getItemCount("Palace Key (Riddle Tower)");
            
            details.push(`Debug riddle_tower:`);
            details.push(`  tube_curse: ${tubeCurse}`);
            details.push(`  Palace Key: ${palaceKey}`);
            details.push(`  Bobbery: ${bobbery}`);
            details.push(`  Boat Curse: ${boatCurse}`);
            details.push(`  Star Key: ${starKey}`);
            details.push(`  Palace Key (Riddle Tower): ${palaceKeyRT}/8`);
        }
    }

    /**
     * Get detailed results for analysis
     */
    getTestResults() {
        return this.testResults;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LogicTestFramework };
} else if (typeof window !== 'undefined') {
    window.LogicTestFramework = LogicTestFramework;
}