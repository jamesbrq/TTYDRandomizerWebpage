/**
 * Identify whether an item should be treated as progression
 */
function isProgression(item) {
    const name = typeof item === "string" ? item : (item.name || item.itemName);
    if (!name) return false;

    if (typeof item === "object" && (item.progression === "progression" || item.progression === "useful")) {
        return true;
    }
}

/**
 * Splits items into progression and filler
 */
function splitItemPools(allItems) {
    const progression = [];
    const filler = [];
    for (const item of allItems) {
        if (isProgression(item)) progression.push(item);
        else filler.push(item);
    }
    return [progression, filler];
}

/**
 * Inline assumed-fill logic for progression items
 */
function runAssumedFill(locations, progressionItems, regionLogic, allItemsState) {
    const unfilled = locations.getAvailableLocations();
    const placedItems = [];

    // Shuffle progression items
    const shuffled = [...progressionItems];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    while (shuffled.length > 0) {
        const item = shuffled.pop();
        if (unfilled.length === 0) {
            console.error("Ran out of locations for progression placement");
            return { success: false, placedItems };
        }

        const idx = Math.floor(Math.random() * unfilled.length);
        const loc = unfilled.splice(idx, 1)[0];

        loc.placeItem(item.id);

        const valid = validateGameBeatable(locations, regionLogic, allItemsState);
        if (valid) {
            placedItems.push({ location: loc.name, item: item.name || item.itemName });
        } else {
            loc.removeItem();
            shuffled.unshift(item); // retry later
            unfilled.push(loc);
        }
    }

    return { success: true, placedItems };
}

/**
 * Improved assumed-fill algorithm:
 * 1. Place progression items with assumed fill
 * 2. Shuffle-fill filler items
 */
function performImprovedFill(locations, allItems, regionLogic, itemIdToName, allItemsState) {
    console.log(`▶ Starting improved assumed fill with ${allItems.length} items`);

    const [progressionItems, fillerItems] = splitItemPools(allItems);
    console.log(`  Split into ${progressionItems.length} progression and ${fillerItems.length} filler items`);

    // Step 1: Progression
    const progResult = runAssumedFill(locations, progressionItems, regionLogic, allItemsState);
    if (!progResult.success) {
        console.warn("⚠️ Progression placement failed");
        return progResult;
    }

    const placedItems = [...progResult.placedItems];

    // Step 2: Filler
    const leftover = locations.getAvailableLocations();
    const shuffledFillers = [...fillerItems];
    for (let i = shuffledFillers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledFillers[i], shuffledFillers[j]] = [shuffledFillers[j], shuffledFillers[i]];
    }

    let idx = 0;
    leftover.forEach(loc => {
        if (idx < shuffledFillers.length) {
            const item = shuffledFillers[idx++];
            loc.placeItem(item.id);
            placedItems.push({ location: loc.name, item: item.name || item.itemName });
        }
    });

    console.log(`✅ Fill complete. Placed ${placedItems.length} items total`);
    return {
        success: true,
        placedItems,
        progressionPlaced: progResult.placedItems.length,
        fillerPlaced: placedItems.length - progResult.placedItems.length
    };
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = { performImprovedFill };
} else if (typeof window !== "undefined") {
    window.performImprovedFill = performImprovedFill;
}
