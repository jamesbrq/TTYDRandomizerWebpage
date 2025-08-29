# TTYD Randomizer - JavaScript API Documentation

This document provides comprehensive documentation for all functions and classes in the TTYD Randomizer JavaScript codebase.

## Table of Contents

1. [GameState (gameState.js)](#gamestate-gamestatejs)
2. [Parser & StateLogic (parser.js)](#parser--statelogic-parserjs)
3. [Location System (location.js)](#location-system-locationjs)
4. [Item Pool (itemPool.js)](#item-pool-itempooljs)
5. [Spoiler Generator (spoilerGenerator.js)](#spoiler-generator-spoilergeneratorjs)

---

## GameState (gameState.js)

The `GameState` class tracks player progress throughout the randomizer, managing items, regions, and Crystal Stars.

### Constructor
```javascript
constructor()
```
Initializes a new GameState with empty items Map, regions Set, and 0 stars.

### Item Management

#### `addItem(itemName, count = 1)`
Adds items to the player's inventory.
- **itemName** (string): Name of the item to add
- **count** (number): Number of items to add (default: 1)
- Automatically tracks Crystal Stars when added

#### `removeItem(itemName, count = 1)`
Removes items from the player's inventory.
- **itemName** (string): Name of the item to remove  
- **count** (number): Number of items to remove (default: 1)
- Automatically updates Crystal Stars count
- Prevents negative counts

#### `has(itemName, requiredCount = 1)`
Checks if the player has a specific item.
- **itemName** (string): Name of the item to check
- **requiredCount** (number): Minimum count required (default: 1)
- **Returns**: boolean - True if player has required count

#### `getItemCount(itemName)`
Gets the count of a specific item.
- **itemName** (string): Name of the item
- **Returns**: number - Count of the item (0 if not found)

#### `getAllItems()`
Gets all items in inventory.
- **Returns**: Map<string, number> - Copy of all items and their counts

### Crystal Stars

#### `getStarsCount()`
Gets the current Crystal Stars count.
- **Returns**: number - Number of Crystal Stars obtained

#### `_isCrystalStar(itemName)` (private)
Checks if an item is a Crystal Star.
- **itemName** (string): Name of the item
- **Returns**: boolean - True if item is a Crystal Star

### Region Management

#### `addRegion(regionName)`
Adds a region to the accessible regions set.
- **regionName** (string): Name of the region to add

#### `removeRegion(regionName)`
Removes a region from the accessible regions set.
- **regionName** (string): Name of the region to remove

#### `canReach(target, type)`
Checks if a region is reachable using StateLogic.
- **target** (string): Target location/region name
- **type** (string): Type (usually "Region")
- **Returns**: boolean - True if region is reachable

#### `getAllRegions()`
Gets all accessible regions.
- **Returns**: Set<string> - Copy of all accessible region names

### Utility Methods

#### `clear()`
Clears all items, regions, and resets stars to 0.

#### `clone()`
Creates a deep copy of the current game state.
- **Returns**: GameState - New GameState instance with same data

#### `loadFromJSON(json)`
Loads state from a JSON object.
- **json** (Object): JSON object with items, regions, and stars data

#### `toJSON()`
Converts the game state to a JSON object.
- **Returns**: Object - JSON representation of the game state

#### `getStats()`
Gets statistics about the current game state.
- **Returns**: Object - Statistics including total items, unique items, accessible regions

### Static Methods

#### `GameState.createStartingState()`
Creates a game state with basic starting setup.
- **Returns**: GameState - New GameState with Rogueport region accessible

---

## Parser & StateLogic (parser.js)

This module handles logic expression parsing and evaluation for region accessibility.

### Expression Building Functions

#### `buildExpr(expr)`
Converts a logic expression object to JavaScript code.
- **expr** (Object): Logic expression with conditions like `has`, `function`, `stars`, `can_reach`, `and`, `or`
- **Returns**: string - JavaScript expression code

#### `jsonToLambda(expr)`
Creates an executable function from a logic expression.
- **expr** (Object): Logic expression object
- **Returns**: Function - Executable function that takes a state parameter

#### `loadLogicFromJson(url)`
Loads logic expressions from a JSON file.
- **url** (string): URL to the JSON logic file
- **Returns**: Promise<Object> - Map of location names to lambda functions

### StateLogic Object

The `StateLogic` object contains functions for checking region accessibility based on game state.

#### Region Access Functions

##### `westside(state)`
Checks access to Rogueport westside area.
- Requires: Contact Lens OR Bobbery OR tube_curse OR ultra_hammer

##### `super_hammer(state)` / `ultra_hammer(state)`
Checks for Progressive Hammer upgrades.
- **super_hammer**: Progressive Hammer level 1
- **ultra_hammer**: Progressive Hammer level 2

##### `super_boots(state)` / `ultra_boots(state)`
Checks for Progressive Boots upgrades.
- **super_boots**: Progressive Boots level 1
- **ultra_boots**: Progressive Boots level 2

##### `tube_curse(state)`
Checks for tube curse capability.
- Requires: Paper Curse AND Tube Curse

##### `petal_left(state)` / `petal_right(state)`
Checks access to Petal Meadows areas.
- **petal_left**: Requires Plane Curse
- **petal_right**: Requires super_hammer AND super_boots

##### `hooktails_castle(state)`
Checks access to Hooktail's Castle.
- Requires: Sun Stone AND Moon Stone AND (Koops OR Bobbery)

##### `boggly_woods(state)`
Checks access to Boggly Woods.
- Requires: Paper Curse OR (super_hammer AND super_boots)

##### `great_tree(state)`
Checks access to Great Tree.
- Requires: Flurrie

##### `glitzville(state)`
Checks access to Glitzville.
- Requires: Blimp Ticket

##### `twilight_town(state)`
Checks access to Twilight Town.
- Complex logic involving sewer access and movement abilities

##### `twilight_trail(state)`
Checks access to Twilight Trail.
- Requires: twilight_town AND tube_curse

##### `steeple(state)`
Checks access to Creepy Steeple.
- Requires: Paper Curse AND Flurrie AND super_boots

##### `keelhaul_key(state)`
Checks access to Keelhaul Key.
- Complex logic with multiple paths involving Yoshi, items, and abilities

##### `pirates_grotto(state)`
Checks access to Pirate's Grotto.
- Requires: Yoshi AND Bobbery AND Skull Gem AND super_boots

##### `excess_express(state)`
Checks access to Excess Express.
- Requires: Train Ticket

##### `riverside(state)`
Checks access to Riverside Station.
- Requires: Multiple story items (Vivian, Autograph, Ragged Diary, Blanket, Vital Paper, Train Ticket)

##### `poshley_heights(state)`
Checks access to Poshley Heights.
- Requires: Station Key 1 AND Elevator Key AND super_hammer AND ultra_boots

##### `fahr_outpost(state)`
Checks access to Fahr Outpost.
- Requires: ultra_hammer AND specific sewer/movement combinations

##### `moon(state)`
Checks access to Moon.
- Requires: Bobbery AND Goldbob Guide

##### `ttyd(state)`
Checks access to Thousand-Year Door.
- Complex logic with multiple possible paths

##### `pit(state)`
Checks access to Pit of 100 Trials.
- Requires: Paper Curse AND Plane Curse

##### `palace(state, chapters = 7)`
Checks access to Palace of Shadow.
- Requires: ttyd access AND sufficient Crystal Stars (default 7)

##### `riddle_tower(state)`
Checks access to Riddle Tower.
- Requires: Multiple items including Palace Keys and curses

#### Helper Functions

##### `sewer_westside(state)` / `sewer_westside_ground(state)`
Check access to different parts of the sewers with various item combinations.

##### `key_any(state)`
Checks if player has any colored key.
- Returns: true if Red Key OR Blue Key

##### `stars(state)`
Gets current Crystal Stars count.
- **Returns**: number - Current stars count

##### `xnaut_fortress(state)`
Checks access to X-Naut Fortress.
- Requires: moon AND fahr_outpost access

---

## Location System (location.js)

The location system manages individual locations and collections of locations for item randomization.

### Location Class

#### Constructor
```javascript
constructor(name, id, rel, offsets = [], vanillaItem = 0, tags = [], placedItem = null, locked = false)
```
Creates a new Location instance with all properties.

#### Static Methods

##### `Location.fromJSON(json)`
Creates a Location from a JSON object.
- **json** (Object): JSON object with location data
- **Returns**: Location - New Location instance

#### Instance Methods

##### `toJSON()`
Converts the Location to a JSON object.
- **Returns**: Object - JSON representation

##### `hasTag(tag)`
Checks if location has a specific tag.
- **tag** (string): Tag to check for
- **Returns**: boolean - True if location has the tag

##### `isTattle()`
Checks if location is a tattle location.
- **Returns**: boolean - True if has 'tattle' tag

##### `isInRel(relName)` / `isInDol()`
Checks location's REL file.
- **relName** (string): REL file name to check
- **Returns**: boolean - True if in specified REL/DOL

##### `getFirstOffset()` / `getAllOffsets()`
Gets offset information as numbers.
- **Returns**: number|null or Array<number>

##### `toString()`
String representation of the location.
- **Returns**: string - Formatted location info

##### `clone(changes = {})`
Creates a copy with optional modifications.
- **changes** (Object): Properties to change
- **Returns**: Location - New Location instance

#### Item Management

##### `placeItem(itemId)`
Places an item at this location.
- **itemId** (number): Item ID to place

##### `clearPlacedItem()`
Removes the placed item from this location.

##### `hasPlacedItem()`
Checks if location has a placed item.
- **Returns**: boolean - True if item is placed

##### `getEffectiveItem()`
Gets the effective item (placed or vanilla).
- **Returns**: number - Item ID that should be at location

##### `isEmpty()`
Checks if location is empty (no placed item).
- **Returns**: boolean - True if no placed item

#### Lock System

##### `lock()` / `unlock()`
Locks/unlocks location from randomization.

##### `isLocked()` / `isAvailable()`
Checks lock status.
- **Returns**: boolean - Lock/availability status

#### Accessibility

##### `getRegionTag()`
Gets the region tag for this location.
- **Returns**: string|null - Region tag or null

##### `isAccessible(gameState, regionLogic)`
Checks if location is accessible given game state.
- **gameState** (Object): Current game state
- **regionLogic** (Object): Region logic map
- **Returns**: boolean - True if accessible

##### `_evaluateLogic(logic, gameState)` (private)
Evaluates logic expressions against game state.

##### `isValid()`
Validates that location has all required properties.
- **Returns**: boolean - True if location is valid

### LocationCollection Class

#### Constructor
```javascript
constructor()
```
Initializes empty location collection.

#### Collection Management

##### `addLocation(location)`
Adds a location to the collection.
- **location** (Location): Location instance to add

##### `loadFromJSON(jsonArray)`
Loads locations from JSON array.
- **jsonArray** (Array<Object>): Array of location JSON objects

##### `getLocationById(id)`
Gets location by ID.
- **id** (number): Location ID
- **Returns**: Location|undefined

#### Filtering Methods

##### `getLocationsByTag(tag)`
Gets all locations with specific tag.
- **tag** (string): Tag to filter by
- **Returns**: Array<Location>

##### `getLocationsByRel(relName)`
Gets all locations in specific REL file.
- **relName** (string): REL file name
- **Returns**: Array<Location>

##### `getTattleLocations()`
Gets all tattle locations.
- **Returns**: Array<Location>

##### `getLocationsWithPlacedItems()` / `getEmptyLocations()`
Filter by item placement status.
- **Returns**: Array<Location>

##### `getLockedLocations()` / `getAvailableLocations()`
Filter by lock status.
- **Returns**: Array<Location>

#### Bulk Operations

##### `clearAllPlacedItems()`
Clears placed items from all locations.

##### `lockLocationsByTag(tag)` / `unlockLocationsByTag(tag)`
Lock/unlock locations by tag.
- **tag** (string): Tag to filter by

##### `lockAllLocations()` / `unlockAllLocations()`
Lock/unlock all locations.

#### Accessibility Methods

##### `getAccessibleLocations(gameState, regionLogic)`
Gets all accessible locations.
- **gameState** (Object): Current game state
- **regionLogic** (Object): Region logic map
- **Returns**: Array<Location> - Accessible and available locations

##### `getInaccessibleLocations(gameState, regionLogic)`
Gets all inaccessible locations.
- **Returns**: Array<Location>

##### `getAccessibleEmptyLocations(gameState, regionLogic)`
Gets accessible locations available for item placement.
- **Returns**: Array<Location>

##### `getAccessibleLocationsByRegion(regionTag, gameState, regionLogic)`
Gets accessible locations in specific region.
- **regionTag** (string): Region to filter by
- **Returns**: Array<Location>

#### Utility Methods

##### `size()`
Gets total number of locations.
- **Returns**: number

##### `toJSON()`
Converts all locations to JSON.
- **Returns**: Array<Object>

##### `forEach(callback)` / `map(callback)` / `filter(predicate)`
Standard array methods for iteration.

##### `clone()`
Creates a deep copy of the collection.
- **Returns**: LocationCollection

##### `getPlacementStats(gameState = null, regionLogic = null)`
Gets comprehensive statistics about the collection.
- **Returns**: Object - Statistics including totals, percentages, accessibility data

---

## Item Pool (itemPool.js)

Manages the item pool for randomization, handling item frequencies and drawing mechanics.

### ITEM_FREQUENCIES Constant

A constant object defining how many copies of each item exist in the pool. Items not listed default to 1 copy. Notable entries:
- High frequency items: "10 Coins" (60), "Star Piece" (100), "Shine Sprite" (40)
- Disabled items: Crystal Stars (0 frequency)
- Progressive items: "Progressive Boots" (2), "Progressive Hammer" (2)

### ItemPool Class

#### Constructor
```javascript
constructor()
```
Initializes empty item pool with items Map and totalItems counter.

#### Pool Management

##### `getItemFrequency(itemName)`
Gets the frequency for an item.
- **itemName** (string): Name of the item
- **Returns**: number - Frequency (defaults to 1 if not in ITEM_FREQUENCIES)

##### `populatePool(itemNames)`
Populates the pool based on item frequencies.
- **itemNames** (Array<string>): Array of item names to add
- Only adds items with frequency > 0

##### `getPoolAsArray()`
Gets all items as an array respecting frequencies.
- **Returns**: Array<string> - Array with duplicates based on frequency

#### Drawing and Returning

##### `drawRandomItem()`
Gets a random item from pool and removes one instance.
- **Returns**: string|null - Random item name, or null if pool empty
- Automatically decrements count and removes item if count reaches 0

##### `returnItem(itemName)`
Adds one instance of an item back to the pool.
- **itemName** (string): Item to add back
- Increments totalItems counter

#### Information Methods

##### `getItemCount(itemName)`
Gets current count of specific item in pool.
- **itemName** (string): Item to check
- **Returns**: number - Current count

##### `getTotalItems()`
Gets total number of items remaining in pool.
- **Returns**: number

##### `isEmpty()`
Checks if pool is empty.
- **Returns**: boolean

##### `getUniqueItems()`
Gets all unique item names in pool.
- **Returns**: Array<string>

#### Utility Methods

##### `clear()`
Clears the entire pool.

##### `clone()`
Creates a copy of current pool state.
- **Returns**: ItemPool - New instance with same items

##### `getStats()`
Gets pool statistics.
- **Returns**: Object - Statistics including unique items, total items, average frequency

---

## Spoiler Generator (spoilerGenerator.js)

Generates comprehensive spoiler logs in multiple formats, tracking item placement and accessibility progression.

### SpoilerGenerator Class

#### Constructor
```javascript
constructor()
```
Initializes spoiler data structure with empty arrays and default values.

#### Initialization

##### `initialize(seed, settings, settingsString)`
Sets up basic spoiler information.
- **seed** (string): Randomizer seed
- **settings** (Object): Settings object from UI
- **settingsString** (string): Base64 encoded settings

#### Data Collection

##### `addLocationItemPair(location, itemName, itemId, sphere = 'unknown')`
Adds a location-item pair to the spoiler.
- **location** (Location): Location object
- **itemName** (string): Name of placed item
- **itemId** (number): ID of placed item
- **sphere** (string): Sphere this item was placed in

##### `addItemSphere(sphereNumber, items, gameState)`
Adds an item sphere to the spoiler.
- **sphereNumber** (number): Sphere number
- **items** (Array<Object>): Items in this sphere
- **gameState** (Object): Game state when sphere was accessible

##### `addProgressionLog(action, itemName = '', locationName = '', gameState = null)`
Adds a progression log entry.
- **action** (string): Description of action taken
- **itemName** (string): Item involved (optional)
- **locationName** (string): Location involved (optional)
- **gameState** (Object): Current game state (optional)

##### `setStatistics(stats)`
Sets final statistics for the spoiler.
- **stats** (Object): Statistics object with totals and performance data

#### File Generation

##### `generateSpoilerContent(format = 'txt')`
Generates spoiler file content in specified format.
- **format** (string): Format ('json', 'txt', 'html')
- **Returns**: string - Spoiler file content

##### `downloadSpoiler(filename = null, format = 'txt')`
Downloads the spoiler file to user's computer.
- **filename** (string): Custom filename (auto-generated if null)
- **format** (string): File format

#### Private Generation Methods

##### `_generateTextSpoiler()` (private)
Generates plain text spoiler with organized sections.
- **Returns**: string - Formatted text spoiler

##### `_generateJSONSpoiler()` (private)
Generates JSON spoiler with all data.
- **Returns**: string - Pretty-printed JSON

##### `_generateHTMLSpoiler()` (private)
Generates styled HTML spoiler with embedded CSS.
- **Returns**: string - Complete HTML document

##### `_groupByRegion()` (private)
Groups location-item pairs by region.
- **Returns**: Object - Grouped pairs by region

##### `_getKeyItemsFromState(gameState)` (private)
Extracts key progression items from game state.
- **gameState** (GameState): Current game state
- **Returns**: Array<string> - Array of key item names

#### Static Analysis Methods

##### `SpoilerGenerator.calculateItemSpheres(locations, regionLogic)`
Calculates item spheres based on accessibility progression.
- **locations** (Array<Location>): All locations with placed items
- **regionLogic** (Object): Region logic map
- **Returns**: Array<Object> - Array of sphere data with accessibility progression

##### `SpoilerGenerator._getItemNameById(itemId)` (private)
Gets item name by ID using global allItems array.
- **itemId** (number): Item ID
- **Returns**: string - Item name or fallback

##### `SpoilerGenerator._updateAccessibleRegions(gameState, regionLogic)` (private)
Updates accessible regions based on current game state.
- **gameState** (GameState): Current game state to update
- **regionLogic** (Object): Region logic map

---

## Export Information

All modules support both CommonJS (Node.js) and browser environments:

```javascript
// Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClassName };
}
// Browser
else if (typeof window !== 'undefined') {
    window.ClassName = ClassName;
}
```

This allows the code to work in both server-side and client-side JavaScript environments.