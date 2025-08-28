function buildExpr(expr) {
    if (expr.has) {
        return `state.has("${expr.has}")`;
    }
    if (expr.function) {
        return `StateLogic.${expr.function}(state)`;
    }
    if (expr.can_reach) {
        return `state.canReach("${expr.can_reach.target}", "${expr.can_reach.type}")`;
    }
    if (expr.and) {
        return expr.and.map(buildExpr).join(" && ");
    }
    if (expr.or) {
        return expr.or.map(buildExpr).join(" || ");
    }
    throw new Error("Unknown expression: " + JSON.stringify(expr));
}

function jsonToLambda(expr) {
    const code = buildExpr(expr);
    return new Function("state", `return ${code};`);
}

async function loadLogicFromJson(url) {
    const response = await fetch(url);
    const data = await response.json();
    const logicMap = {};
    for (const [location, expr] of Object.entries(data)) {
        logicMap[location] = jsonToLambda(expr);
    }
    return logicMap;
}

const StateLogic = {
    rogueport_westside(state) {
        return state.has("Contact Lens") || state.has("Bobbery") || 
               StateLogic.tube_curse(state) || StateLogic.ultra_hammer(state);
    },

    super_hammer(state) {
        return state.has("Progressive Hammer", 1);
    },

    ultra_hammer(state) {
        return state.has("Progressive Hammer", 2);
    },

    super_boots(state) {
        return state.has("Progressive Boots", 1);
    },

    ultra_boots(state) {
        return state.has("Progressive Boots", 2);
    },

    tube_curse(state) {
        return state.has("Paper Curse") && state.has("Tube Curse");
    },

    petal_left(state) {
        return state.has("Plane Curse");
    },

    petal_right(state) {
        return StateLogic.super_hammer(state) && StateLogic.super_boots(state);
    },

    hooktails_castle(state) {
        return state.has("Sun Stone") && state.has("Moon Stone") && 
               (state.has("Koops") || state.has("Bobbery"));
    },

    boggly_woods(state) {
        return state.has("Paper Curse") || 
               (StateLogic.super_hammer(state) && StateLogic.super_boots(state));
    },

    great_tree(state) {
        return state.has("Flurrie");
    },

    glitzville(state) {
        return state.has("Blimp Ticket");
    },

    twilight_town(state) {
        return (StateLogic.sewer_westside(state) && state.has("Yoshi")) ||
               (StateLogic.sewer_westside_ground(state) && StateLogic.ultra_boots(state));
    },

    twilight_trail(state) {
        return StateLogic.twilight_town(state) && StateLogic.tube_curse(state);
    },

    creepy_steeple(state) {
        return state.has("Paper Curse") && state.has("Flurrie") && StateLogic.super_boots(state);
    },

    keelhaul_key(state) {
        return ((state.has("Yoshi") && StateLogic.tube_curse(state) && state.has("Old Letter")) ||
                (StateLogic.ultra_hammer(state) && StateLogic.super_boots(state)));
    },

    pirates_grotto(state) {
        return state.has("Yoshi") && state.has("Bobbery") && 
               state.has("Skull Gem") && StateLogic.super_boots(state);
    },

    excess_express(state) {
        return state.has("Train Ticket");
    },

    riverside(state) {
        return state.has("Vivian") && state.has("Autograph") && 
               state.has("Ragged Diary") && state.has("Blanket") && 
               state.has("Vital Paper") && state.has("Train Ticket");
    },

    poshley_heights(state) {
        return state.has("Station Key 1") && state.has("Elevator Key (Riverside)") && 
               StateLogic.super_hammer(state) && StateLogic.ultra_boots(state);
    },

    fahr_outpost(state) {
        return StateLogic.ultra_hammer(state) && 
               ((state.canReach("sewers_westside_ground", "Region") && StateLogic.ultra_boots(state)) || 
                (state.canReach("sewers_westside", "Region") && state.has("Yoshi")));
    },

    moon(state) {
        return state.has("Bobbery") && state.has("Goldbob Guide");
    },

    ttyd(state) {
        return (state.has("Plane Curse") || StateLogic.super_hammer(state) ||
                (state.has("Flurrie") && (state.has("Bobbery") || StateLogic.tube_curse(state) ||
                (state.has("Contact Lens") && state.has("Paper Curse")))));
    },

    pit(state) {
        return state.has("Paper Curse") && state.has("Plane Curse");
    },

    sewers_westside_ground(state) {
        return state.has("Flurrie") && ((state.has("Contact Lens") && state.has("Paper Curse")) || 
               state.has("Bobbery") || StateLogic.tube_curse(state) || StateLogic.ultra_hammer(state));
    },

    palace(state, chapters = 7) {
        const starsCount = state.getStarsCount ? state.getStarsCount() : 0;
        return StateLogic.ttyd(state) && starsCount >= chapters;
    },

    riddle_tower(state) {
        return StateLogic.tube_curse(state) && state.has("Palace Key") && 
               state.has("Bobbery") && state.has("Boat Curse") && 
               state.has("Star Key") && state.has("Palace Key (Riddle Tower)", 8);
    },

    sewer_westside(state) {
        return StateLogic.tube_curse(state) || state.has("Bobbery") || 
               (state.has("Paper Curse") && state.has("Contact Lens")) || 
               (StateLogic.ultra_hammer(state) && (state.has("Paper Curse") || 
               (StateLogic.ultra_boots(state) && state.has("Yoshi"))));
    },

    sewer_westside_ground(state) {
        return (state.has("Contact Lens") && state.has("Paper Curse")) || 
               state.has("Bobbery") || StateLogic.tube_curse(state) || 
               StateLogic.ultra_hammer(state);
    },

    key_any(state) {
        return state.has("Red Key") || state.has("Blue Key");
    },

    stars(state) {
        return state.getStarsCount ? state.getStarsCount() : 0;
    },

    // Aliases for plural versions (to match region names in fahr_outpost logic)
    sewers_westside(state) {
        return StateLogic.sewer_westside(state);
    },

    xnaut_fortress(state) {
        return StateLogic.moon(state) && StateLogic.fahr_outpost(state);
    },
};

// Example usage
(async () => {
    const logic = {
        "Boggly Woods Flurrie's House: Flurrie": {
            "and": [
                { "has": "Plane Curse" },
                { "has": "Paper Curse" },
                { "has": "Necklace" }
            ]
        },
        "Creepy Steeple Main Hall: Lucky Start": {
            "function": "super_hammer"
        }
    };

    // Simulate local JSON (instead of fetch)
    const logicMap = {};
    for (const [location, expr] of Object.entries(logic)) {
        logicMap[location] = jsonToLambda(expr);
    }

    console.log(logicMap);
    // {
    //   "Boggly Woods Flurrie's House: Flurrie": [Function],
    //   "Creepy Steeple Main Hall: Lucky Start": [Function]
    // }
})();
