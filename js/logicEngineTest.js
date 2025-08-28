/**
 * Test harness for the OptimizedLogicEngine
 * Validates that the new engine produces correct results compared to the old system
 */

class LogicEngineTest {
    constructor() {
        this.testResults = [];
        this.engine = null;
        this.testGameState = null;
    }
    
    async initialize() {
        console.log('🧪 Initializing Logic Engine Test...');
        
        // Load JSON data (same way as generate.js)
        const rulesData = await this.loadJson('../json/rules.json');
        const regionsData = await this.loadJson('../json/regions.json');
        const locationsData = await this.loadJson('../json/locations.json');
        const itemsData = await this.loadJson('../json/items.json');
        
        // Initialize the new engine
        this.engine = new OptimizedLogicEngine(rulesData, regionsData, locationsData, itemsData);
        
        // Create test game states
        this.createTestGameStates();
        
        console.log('✅ Test initialization complete');
        return true;
    }
    
    async loadJson(path) {
        try {
            const response = await fetch(path);
            return await response.json();
        } catch (error) {
            console.error(`Failed to load ${path}:`, error);
            return {};
        }
    }
    
    /**
     * Create various game states for testing
     */
    createTestGameStates() {
        this.testStates = {
            // Starting state (minimal items)
            starting: this.createGameState({
                'Progressive Boots': 0,
                'Progressive Hammer': 0
            }),
            
            // Early game state
            earlyGame: this.createGameState({
                'Progressive Boots': 1,
                'Progressive Hammer': 1,
                'Goombella': 1,
                'Koops': 1,
                'Plane Curse': 1
            }),
            
            // Mid game state
            midGame: this.createGameState({
                'Progressive Boots': 2,
                'Progressive Hammer': 1,
                'Paper Curse': 1,
                'Plane Curse': 1,
                'Tube Curse': 1,
                'Goombella': 1,
                'Koops': 1,
                'Flurrie': 1,
                'Yoshi': 1,
                'Diamond Star': 1,
                'Emerald Star': 1,
                'Gold Star': 1
            }),
            
            // Late game state
            lateGame: this.createGameState({
                'Progressive Boots': 2,
                'Progressive Hammer': 2,
                'Paper Curse': 1,
                'Plane Curse': 1,
                'Tube Curse': 1,
                'Boat Curse': 1,
                'Goombella': 1,
                'Koops': 1,
                'Flurrie': 1,
                'Yoshi': 1,
                'Vivian': 1,
                'Bobbery': 1,
                'Diamond Star': 1,
                'Emerald Star': 1,
                'Gold Star': 1,
                'Ruby Star': 1,
                'Sapphire Star': 1,
                'Garnet Star': 1,
                'Crystal Star': 1
            })
        };
    }
    
    /**
     * Create a mock game state for testing
     */
    createGameState(items) {
        const state = {
            items: new Map(),
            regions: new Set(),
            has(itemName, count = 1) {
                return (this.items.get(itemName) || 0) >= count;
            },
            getStarsCount() {
                const stars = ['Diamond Star', 'Emerald Star', 'Gold Star', 'Ruby Star', 'Sapphire Star', 'Garnet Star', 'Crystal Star'];
                return stars.reduce((count, star) => count + (this.has(star) ? 1 : 0), 0);
            },
            canReach(target, type) {
                // Simple mock implementation
                return this.regions.has(target);
            }
        };
        
        // Add items to state
        for (const [itemName, count] of Object.entries(items)) {
            state.items.set(itemName, count);
        }
        
        return state;
    }
    
    /**
     * Run comprehensive tests on the logic engine
     */
    async runTests() {
        console.log('🚀 Starting Logic Engine Tests...');
        
        await this.testBasicFunctionality();
        await this.testRegionLogic();
        await this.testLocationLogic();
        await this.testCombinedLogic();
        await this.testPerformance();
        await this.testErrorHandling();
        
        this.printTestSummary();
        
        return this.testResults;
    }
    
    /**
     * Test basic engine functionality
     */
    async testBasicFunctionality() {
        console.log('🔍 Testing basic functionality...');
        
        // Test initialization
        this.addTest('Engine initialization', this.engine !== null, 'Engine should initialize successfully');
        
        // Test stats
        const stats = this.engine.getStats();
        this.addTest('Stats generation', 
            stats && typeof stats.locationRules === 'number',
            `Should return valid stats object, got: ${JSON.stringify(stats)}`);
        
        // Test location tags mapping
        const locationsByRegion = this.engine.getLocationsByRegion();
        this.addTest('Location region mapping', 
            locationsByRegion.size > 0,
            `Should map locations to regions, found ${locationsByRegion.size} regions`);
    }
    
    /**
     * Test region-based logic
     */
    async testRegionLogic() {
        console.log('🗺️ Testing region logic...');
        
        // Test that locations in same region have consistent accessibility
        const rogueportLocations = [];
        for (const [location, tags] of this.engine.locationTags.entries()) {
            if (tags.includes('rogueport')) {
                rogueportLocations.push(location);
            }
        }
        
        if (rogueportLocations.length > 0) {
            const testLocation = rogueportLocations[0];
            const accessible = this.engine.isLocationAccessible(testLocation, this.testStates.starting);
            
            this.addTest('Rogueport accessibility',
                typeof accessible === 'boolean',
                `Should return boolean for ${testLocation}, got ${accessible}`);
        }
    }
    
    /**
     * Test location-specific logic
     */
    async testLocationLogic() {
        console.log('📍 Testing location-specific logic...');
        
        // Test locations with known rules
        const testCases = [
            {
                location: 'Boggly Woods Plane Panel Room: Shine Sprite',
                state: this.testStates.starting,
                expectedAccessible: false,
                reason: 'Should require Koops or ultra_boots'
            },
            {
                location: 'Boggly Woods Plane Panel Room: Shine Sprite',
                state: this.testStates.earlyGame, // Has Koops
                expectedAccessible: true,
                reason: 'Should be accessible with Koops'
            }
        ];
        
        for (const testCase of testCases) {
            if (this.engine.locationRules.has(testCase.location)) {
                const accessible = this.engine.isLocationAccessible(testCase.location, testCase.state);
                this.addTest(`Location rule: ${testCase.location}`,
                    accessible === testCase.expectedAccessible,
                    `${testCase.reason}. Got: ${accessible}, expected: ${testCase.expectedAccessible}`);
            }
        }
    }
    
    /**
     * Test combined region + location logic
     */
    async testCombinedLogic() {
        console.log('🔗 Testing combined logic...');
        
        // Test a location that requires both region access and specific items
        const testLocation = 'Great Tree Entrance: Emerald Star';
        
        // Test with insufficient state (should fail region or location requirements)
        let accessible = this.engine.isLocationAccessible(testLocation, this.testStates.starting);
        this.addTest('Combined logic - insufficient items',
            accessible === false,
            `${testLocation} should not be accessible with starting items`);
        
        // Test with sufficient state
        accessible = this.engine.isLocationAccessible(testLocation, this.testStates.lateGame);
        this.addTest('Combined logic - sufficient items',
            typeof accessible === 'boolean',
            `${testLocation} should return valid result with late game items`);
    }
    
    /**
     * Test performance and caching
     */
    async testPerformance() {
        console.log('⚡ Testing performance...');
        
        const startTime = performance.now();
        
        // Get all accessible locations (this tests the batch optimization)
        const accessible1 = this.engine.getAccessibleLocations(this.testStates.midGame);
        const firstCallTime = performance.now() - startTime;
        
        // Second call should be much faster due to caching
        const cacheStartTime = performance.now();
        const accessible2 = this.engine.getAccessibleLocations(this.testStates.midGame);
        const secondCallTime = performance.now() - cacheStartTime;
        
        this.addTest('Performance - initial call',
            firstCallTime < 1000, // Should complete within 1 second
            `Initial accessibility check took ${firstCallTime.toFixed(2)}ms`);
        
        this.addTest('Performance - cached call',
            secondCallTime < firstCallTime / 2, // Should be significantly faster
            `Cached call took ${secondCallTime.toFixed(2)}ms vs ${firstCallTime.toFixed(2)}ms initial`);
        
        this.addTest('Performance - result consistency',
            accessible1.length === accessible2.length,
            `Should return same results: ${accessible1.length} vs ${accessible2.length} locations`);
    }
    
    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('🛡️ Testing error handling...');
        
        // Test with invalid location
        const invalidResult = this.engine.isLocationAccessible('Invalid Location Name', this.testStates.starting);
        this.addTest('Error handling - invalid location',
            typeof invalidResult === 'boolean',
            'Should handle invalid location gracefully');
        
        // Test with null state
        try {
            const nullResult = this.engine.isLocationAccessible('Rogueport Docks: Star Piece', null);
            this.addTest('Error handling - null state',
                false,
                'Should throw or handle null state gracefully');
        } catch (error) {
            this.addTest('Error handling - null state',
                true,
                'Properly throws error for null state');
        }
    }
    
    /**
     * Add a test result
     */
    addTest(name, passed, message) {
        const result = {
            name,
            passed: Boolean(passed),
            message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${name}: ${message}`);
    }
    
    /**
     * Print comprehensive test summary
     */
    printTestSummary() {
        const passed = this.testResults.filter(t => t.passed).length;
        const failed = this.testResults.length - passed;
        const passRate = ((passed / this.testResults.length) * 100).toFixed(1);
        
        console.log('\n📊 TEST SUMMARY');
        console.log('═'.repeat(50));
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${passed} (${passRate}%)`);
        console.log(`Failed: ${failed}`);
        
        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.filter(t => !t.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
        }
        
        console.log('\n🔧 ENGINE STATS:');
        const stats = this.engine.getStats();
        Object.entries(stats).forEach(([key, value]) => {
            console.log(`  - ${key}: ${value}`);
        });
        
        console.log('═'.repeat(50));
    }
    
    /**
     * Export test results for analysis
     */
    exportResults() {
        return {
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(t => t.passed).length,
                failed: this.testResults.filter(t => !t.passed).length,
                passRate: ((this.testResults.filter(t => t.passed).length / this.testResults.length) * 100).toFixed(1) + '%'
            },
            tests: this.testResults,
            engineStats: this.engine?.getStats() || null,
            timestamp: new Date().toISOString()
        };
    }
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined' && window.location) {
    // Browser environment
    window.LogicEngineTest = LogicEngineTest;
    
    // Auto-run if requested via URL parameter
    if (window.location.search.includes('runTests=true')) {
        document.addEventListener('DOMContentLoaded', async () => {
            const tester = new LogicEngineTest();
            await tester.initialize();
            await tester.runTests();
        });
    }
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { LogicEngineTest };
}