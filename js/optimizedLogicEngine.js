/**
 * Optimized Logic Engine for TTYD Randomizer
 * 
 * This engine builds upon parser.js helper functions to create an efficient
 * system for combining region-based logic (from tags) with location-specific rules.
 */

class OptimizedLogicEngine {
    constructor(rulesJson = {}, regionsJson = {}, locationsJson = [], itemsJson = []) {
        // Store raw data
        this.rawRules = rulesJson;
        this.rawRegions = regionsJson;
        this.rawLocations = locationsJson;
        this.rawItems = itemsJson;
        
        // Compiled rule functions (using parser.js functions)
        this.locationRules = new Map(); // location name -> compiled function
        this.regionRules = new Map();   // region tag -> compiled function
        this.locationTags = new Map();  // location name -> array of tags
        this.itemData = new Map();      // item name -> item data
        
        // Performance optimization
        this.accessibilityCache = new Map(); // state hash -> Map<location, accessible>
        this.lastStateHash = null;
        this.lastAccessibilityResults = null;
        
        console.log('🔧 Initializing OptimizedLogicEngine...');
        this.initialize();
    }
    
    /**
     * Initialize the logic engine by preprocessing all data using parser.js functions
     */
    initialize() {
        console.log('📋 Preprocessing locations and tags...');
        this.preprocessLocations();
        
        console.log('🗺️ Compiling region rules...');
        this.compileRegionRules();
        
        console.log('📜 Compiling location-specific rules...');
        this.compileLocationRules();
        
        console.log('🎯 Preprocessing items...');
        this.preprocessItems();
        
        console.log('✅ OptimizedLogicEngine initialized successfully');
        console.log(`   - ${this.locationRules.size} location-specific rules`);
        console.log(`   - ${this.regionRules.size} region rules`);
        console.log(`   - ${this.locationTags.size} total locations loaded`);
    }
    
    /**
     * Extract location names and their associated tags
     */
    preprocessLocations() {
        // Store ALL locations from JSON, not just ones with tags
        for (const location of this.rawLocations) {
            if (location.name) {
                // Store tags if they exist, empty array if not
                const tags = location.tags ? [...location.tags] : [];
                this.locationTags.set(location.name, tags);
            }
        }
    }
    
    /**
     * Compile region rules using parser.js jsonToLambda function
     */
    compileRegionRules() {
        for (const [regionTag, ruleExpr] of Object.entries(this.rawRegions)) {
            try {
                // Use parser.js jsonToLambda to compile the rule
                const compiledRule = jsonToLambda(ruleExpr);
                this.regionRules.set(regionTag, compiledRule);
            } catch (error) {
                console.warn(`Failed to compile region rule for ${regionTag}:`, error);
                // Fallback: always accessible
                this.regionRules.set(regionTag, () => true);
            }
        }
    }
    
    /**
     * Compile location-specific rules using parser.js jsonToLambda function
     */
    compileLocationRules() {
        for (const [locationName, ruleExpr] of Object.entries(this.rawRules)) {
            try {
                // Use parser.js jsonToLambda to compile the rule
                const compiledRule = jsonToLambda(ruleExpr);
                this.locationRules.set(locationName, compiledRule);
            } catch (error) {
                console.warn(`Failed to compile location rule for ${locationName}:`, error);
                // Fallback: always accessible
                this.locationRules.set(locationName, () => true);
            }
        }
    }
    
    /**
     * Preprocess item data for quick lookup
     */
    preprocessItems() {
        for (const item of this.rawItems) {
            if (item.itemName) {
                this.itemData.set(item.itemName, item);
            }
        }
    }
    
    /**
     * Check if a location is accessible based on combined region + location logic
     * This is the main entry point for location accessibility checking
     */
    isLocationAccessible(locationName, gameState) {
        // Check if we can use cached results
        const stateHash = this.getGameStateHash(gameState);
        if (this.lastStateHash === stateHash && this.lastAccessibilityResults) {
            const cached = this.lastAccessibilityResults.get(locationName);
            if (cached !== undefined) {
                return cached;
            }
        }
        
        let accessible = true;
        
        try {
            // 1. Check region-based requirements (from location tags)
            const tags = this.locationTags.get(locationName);
            if (tags) {
                for (const tag of tags) {
                    const regionRule = this.regionRules.get(tag);
                    if (regionRule) {
                        // Use the compiled function with StateLogic available
                        if (!this.safeEvaluateRule(regionRule, gameState, locationName, `region:${tag}`)) {
                            accessible = false;
                            break;
                        }
                    }
                }
            }
            
            // 2. Check location-specific requirements (from rules)
            if (accessible) {
                const locationRule = this.locationRules.get(locationName);
                if (locationRule) {
                    // Use the compiled function with StateLogic available
                    if (!this.safeEvaluateRule(locationRule, gameState, locationName, 'location')) {
                        accessible = false;
                    }
                }
            }
        } catch (error) {
            console.warn(`Error evaluating accessibility for ${locationName}:`, error);
            accessible = false; // Fail safe
        }
        
        return accessible;
    }
    
    /**
     * Safely evaluate a compiled rule function with error handling
     */
    safeEvaluateRule(ruleFn, gameState, locationName, ruleType) {
        try {
            // The parser.js functions expect a state object and use StateLogic
            return ruleFn(gameState);
        } catch (error) {
            console.warn(`Rule evaluation error for ${locationName} (${ruleType}):`, error.message);
            return false; // Fail safe
        }
    }
    
    /**
     * Get all currently accessible locations (optimized batch processing)
     */
    getAccessibleLocations(gameState) {
        const stateHash = this.getGameStateHash(gameState);
        
        // Check if we already computed this state
        if (this.lastStateHash === stateHash && this.lastAccessibilityResults) {
            return Array.from(this.lastAccessibilityResults.entries())
                .filter(([_, accessible]) => accessible)
                .map(([locationName, _]) => locationName);
        }
        
        // Compute accessibility for all locations
        const accessibilityResults = new Map();
        const accessibleLocations = [];
        
        for (const locationName of this.locationTags.keys()) {
            const accessible = this.isLocationAccessible(locationName, gameState);
            accessibilityResults.set(locationName, accessible);
            
            if (accessible) {
                accessibleLocations.push(locationName);
            }
        }
        
        // Also check locations that only have rules (no tags)
        for (const locationName of this.locationRules.keys()) {
            if (!accessibilityResults.has(locationName)) {
                const accessible = this.isLocationAccessible(locationName, gameState);
                accessibilityResults.set(locationName, accessible);
                
                if (accessible) {
                    accessibleLocations.push(locationName);
                }
            }
        }
        
        // Cache results
        this.lastStateHash = stateHash;
        this.lastAccessibilityResults = accessibilityResults;
        
        return accessibleLocations;
    }
    
    /**
     * Generate a hash of the game state for caching purposes
     * Only includes relevant state that affects accessibility
     */
    getGameStateHash(gameState) {
        // Create a hash based on items, star count, and regions
        const items = Array.from(gameState.items.entries()).sort();
        const starsCount = gameState.getStarsCount ? gameState.getStarsCount() : 0;
        const regions = gameState.regions ? Array.from(gameState.regions).sort() : [];
        
        return JSON.stringify({ items, starsCount, regions });
    }
    
    /**
     * Clear all caches (call when game state changes significantly)
     */
    clearCaches() {
        this.accessibilityCache.clear();
        this.lastStateHash = null;
        this.lastAccessibilityResults = null;
    }
    
    /**
     * Debug function to explain why a location is or isn't accessible
     */
    explainAccessibility(locationName, gameState) {
        const explanation = {
            location: locationName,
            accessible: true,
            reasons: []
        };
        
        // Check region requirements
        const tags = this.locationTags.get(locationName);
        if (tags) {
            for (const tag of tags) {
                const regionRule = this.regionRules.get(tag);
                if (regionRule) {
                    const passed = this.safeEvaluateRule(regionRule, gameState, locationName, `region:${tag}`);
                    explanation.reasons.push({
                        type: 'region',
                        tag: tag,
                        passed: passed,
                        rule: this.rawRegions[tag]
                    });
                    
                    if (!passed) {
                        explanation.accessible = false;
                    }
                }
            }
        }
        
        // Check location-specific requirements
        const locationRule = this.locationRules.get(locationName);
        if (locationRule) {
            const passed = this.safeEvaluateRule(locationRule, gameState, locationName, 'location');
            explanation.reasons.push({
                type: 'location',
                passed: passed,
                rule: this.rawRules[locationName]
            });
            
            if (!passed) {
                explanation.accessible = false;
            }
        }
        
        return explanation;
    }
    
    /**
     * Get statistics about the logic engine performance
     */
    getStats() {
        return {
            locationRules: this.locationRules.size,
            regionRules: this.regionRules.size,
            locationsWithTags: this.locationTags.size,
            cachedResults: this.lastAccessibilityResults?.size || 0,
            cacheHit: this.lastStateHash !== null
        };
    }
    
    /**
     * Get detailed breakdown of locations by region tags
     */
    getLocationsByRegion() {
        const byRegion = new Map();
        
        for (const [locationName, tags] of this.locationTags.entries()) {
            for (const tag of tags) {
                if (!byRegion.has(tag)) {
                    byRegion.set(tag, []);
                }
                byRegion.get(tag).push(locationName);
            }
        }
        
        return byRegion;
    }
}

/**
 * Properly escape a string for use in JavaScript code generation
 */
function escapeJavaScriptString(str) {
    return str.replace(/\\/g, '\\\\')  // Escape backslashes first
              .replace(/"/g, '\\"')    // Escape double quotes
              .replace(/'/g, "\\'")    // Escape single quotes  
              .replace(/\n/g, '\\n')   // Escape newlines
              .replace(/\r/g, '\\r')   // Escape carriage returns
              .replace(/\t/g, '\\t');  // Escape tabs
}

/**
 * Enhanced buildExpr function that handles additional rule patterns
 * Extends the parser.js buildExpr with better error handling and more patterns
 */
function enhancedBuildExpr(expr) {
    if (!expr) return 'true';
    
    // Handle count-based has expressions
    if (expr.has && expr.count) {
        const escapedItem = escapeJavaScriptString(expr.has);
        return `state.has("${escapedItem}", ${expr.count})`;
    }
    
    // Handle object-form has expressions
    if (expr.has && typeof expr.has === 'object') {
        if (expr.has.item === 'stars') {
            const count = expr.has.count || 1;
            return `(state.getStarsCount ? state.getStarsCount() >= ${count} : false)`;
        }
        const escapedItem = escapeJavaScriptString(expr.has.item);
        return `state.has("${escapedItem}", ${expr.has.count || 1})`;
    }
    
    // Handle simple has expressions with proper escaping
    if (expr.has && typeof expr.has === 'string') {
        const escapedItem = escapeJavaScriptString(expr.has);
        return `state.has("${escapedItem}")`;
    }
    
    // Handle function calls
    if (expr.function) {
        return `StateLogic.${expr.function}(state)`;
    }
    
    // Handle can_reach with type specification
    if (expr.can_reach && typeof expr.can_reach === 'object') {
        const escapedTarget = escapeJavaScriptString(expr.can_reach.target);
        const escapedType = escapeJavaScriptString(expr.can_reach.type);
        return `state.canReach("${escapedTarget}", "${escapedType}")`;
    }
    
    // Handle simple can_reach
    if (expr.can_reach && typeof expr.can_reach === 'string') {
        const escapedTarget = escapeJavaScriptString(expr.can_reach);
        return `state.canReach("${escapedTarget}", "Location")`;
    }
    
    // Handle logical AND
    if (expr.and) {
        const subExpressions = expr.and.map(subExpr => enhancedBuildExpr(subExpr));
        return `(${subExpressions.join(' && ')})`;
    }
    
    // Handle logical OR  
    if (expr.or) {
        const subExpressions = expr.or.map(subExpr => enhancedBuildExpr(subExpr));
        return `(${subExpressions.join(' || ')})`;
    }
    
    // Handle not expressions
    if (expr.not) {
        return `!(${enhancedBuildExpr(expr.not)})`;
    }
    
    // Fall back to original buildExpr for compatibility (but with error handling)
    try {
        return buildExpr(expr);
    } catch (error) {
        console.warn('buildExpr fallback failed for expression:', expr, error);
        return 'false'; // Fail safe
    }
}

/**
 * Enhanced jsonToLambda that uses the enhanced buildExpr
 */
function enhancedJsonToLambda(expr) {
    try {
        const code = enhancedBuildExpr(expr);
        return new Function("state", `return ${code};`);
    } catch (error) {
        console.warn('Failed to compile rule expression:', expr, error);
        return () => false; // Fail safe
    }
}

// Replace the original jsonToLambda if we're enhancing it
if (typeof jsonToLambda !== 'undefined') {
    // Store reference to original
    const originalJsonToLambda = jsonToLambda;
    
    // Override with enhanced version that falls back to original
    window.jsonToLambda = function(expr) {
        try {
            return enhancedJsonToLambda(expr);
        } catch (error) {
            console.warn('Enhanced parser failed, falling back to original');
            return originalJsonToLambda(expr);
        }
    };
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OptimizedLogicEngine, enhancedJsonToLambda };
} else {
    window.OptimizedLogicEngine = OptimizedLogicEngine;
    window.enhancedJsonToLambda = enhancedJsonToLambda;
}