// Level 1, The Fallen Market (Suq al-Warraqin, the Booksellers' Market of Baghdad), as data.
// Coordinates are tiles of 16 px; the street's walking surface is the top of row STREET.
// The level builder (tools/levels/build_level.mjs) turns this into the scene; the backdrop painter
// reads the sections to dress each stretch of street.
//
// The fights each ask their own question: a man about to be beheaded at the gate street (reach the
// executioner before the blade falls), a looter at his plunder (strike before he knows you are
// there), a soldier over a mother and her son (a duel, face to face), a spearman covering an archer
// on the stone terrace (get past the spear under the arrows), two soldiers burning books below the
// gallery (go round above them and drop in, or walk into them), the ambush at Ibrahim's door (from
// ahead and behind), a soldier stabbing at the dead, and two shields locked at the river gate
// (break them). The dead of the market lie in the street between.

export const STREET = 28;
export const COLS = 300;
export const ROWS = 32;

/** Where the pyre stands: the prop's centre column. Its fire burns on the heap (6 px right of it). */
const PYRE = 161;

export const LEVEL = {
  id: "fallen_market",
  scene: "res://features/levels/fallen_market/fallen_market.tscn",
  env: "res://assets/environments/market",
  look: "night",
  // The far city is the concept painting's (docs/concept_art), pixel-converted.
  painting: { source: "docs/concept_art/03_The_Fallen_Market.png", crop: [430, 0, 960, 340], scroll: 0.06,
    patches: [[282, 228, 368, 316]] },
  title: "LEVEL_FALLEN_MARKET",
  music: "market",
  ambience: "fire_wind",
  next: "res://features/levels/streets_of_ash/streets_of_ash.tscn",
  exitCard: "market_end",
  exitTitle: "LEVEL_STREETS_OF_ASH",
  // The objective for the story so far: the first entry whose flag is set (an empty flag is the start).
  objectives: [
    ["satchel", "OBJ_RIVER_GATE"], ["ambush_cleared", "OBJ_SPEAK_IBRAHIM"], ["ambush", "OBJ_DEFEND_SHOP"],
    ["", "OBJ_FIND_IBRAHIM"],
  ],
  stallsUnderPlanks: true,
  cols: COLS,
  rows: ROWS,
  start: [6, STREET],
  // Stretches of street and how each is dressed (columns, inclusive start, exclusive end).
  sections: [
    { name: "gate_street", from: 0, to: 44, theme: "houses" },
    { name: "potters_lane", from: 44, to: 84, theme: "potters" },
    { name: "spice_row", from: 84, to: 146, theme: "spices" },
    { name: "khan", from: 146, to: 188, theme: "khan" },
    { name: "mosque_wall", from: 188, to: 198, theme: "mosque" },
    { name: "booksellers", from: 198, to: 254, theme: "books" },
    { name: "river_gate", from: 254, to: 300, theme: "wall" },
  ],
  // [material, col0, col1, row0, row1] inclusive. Materials: street, stone, brick, plank, crate.
  terrain: [
    ["street", 0, COLS - 1, STREET, ROWS - 1],
    ["brick", 0, 2, 4, STREET - 1],
    ["crate", 20, 22, 27, 27],
    ["stone", 50, 55, 26, 27],
    ["plank", 88, 93, 25, 25],
    ["plank", 104, 109, 25, 25],
    ["plank", 121, 126, 25, 25],
    // The stone terrace the archer holds, a step up from the street.
    ["stone", 131, 132, 27, 27],
    ["stone", 133, 145, 26, 27],
    // The crates up to the gallery, the gallery over the pyre, and the house it leads onto.
    ["crate", 150, 152, 25, 27],
    ["plank", 153, 171, 22, 22],
    ["brick", 172, 183, 19, STREET - 1],
    ["crate", 214, 215, 25, 27],
    ["plank", 216, 220, 22, 22],
    ["stone", 262, 263, 27, 27],
    ["brick", 297, 299, 4, STREET - 1],
  ],
  // Decoration: [prop, col, row?, flip?]. Stalls under the timber roofs are placed automatically.
  props: [
    ["cart", 9], ["jars_broken", 16], ["rubble", 26], ["banner_fallen", 42], ["sacks", 40, null, true],
    ["jars", 47], ["pages", 58], ["jars_broken", 62], ["beam_charred", 72], ["sacks", 76],
    // The dead of the market.
    ["corpse_man_front", 27.5], ["corpse_woman_back", 49], ["corpse_man_arrows", 86.5], ["corpse_headless", 124],
    ["corpse_woman_front", 147], ["corpse_scholar", 203], ["corpse_man_back", 238], ["corpse_guard", 292],
    // The body the soldier by the river gate is stabbing at.
    ["corpse_man_back", 266.75],
    // The looter's strongbox, broken open before him.
    ["chest_looted", 68.125],
    ["rubble", 95], ["jars", 112], ["banner_fallen", 119], ["sacks", 129],
    ["jars", 139, 26],
    // The pyre of books below the gallery.
    ["book_pyre", PYRE], ["pages", 156], ["cart", 168], ["beam_charred", 176, 19],
    ["rubble", 189], ["pages", 200], ["book_pile", 210], ["pages", 216], ["book_pile", 226],
    ["pages", 234], ["book_pile", 244], ["banner_fallen", 252], ["rubble", 260], ["beam_charred", 286],
    ["jars_broken", 276], ["rubble", 290],
  ],
  // Facades painted over solid blocks so they read as buildings rather than masses of brick.
  facades: [
    { kind: "tower", col: 0, width: 3, top: 4 },
    { kind: "house", col: 172, width: 12, top: 19 },
    { kind: "gate", col: 297, width: 3, top: 4 },
  ],
  knownTechniques: [],
  checkpoints: [
    { id: "potters_lamp", col: 79 },
    { id: "mosque_lamp", col: 193 },
  ],
  manuscripts: [
    { id: "optics", col: 53, row: 26 },
    // Pulled from the pyre's edge: the burners have to be dealt with to reach it.
    { id: "ledger", col: 167 },
    { id: "verses", col: 218, row: 22 },
  ],
  // Soldiers: activity is what he is busy with until he notices the hero (an animation); guard is
  // how readily he raises his shield; hidden soldiers are out of sight until their group wakes.
  enemies: [
    // 0. At the gate street, a man kneeling under a raised sabre: reach the soldier before it falls.
    { kind: "swordsman", col: 34, face: 1, activity: "execute", victim: "gate_captive", delay: 3.0, patrol: 0 },
    // 1. The looter, kneeling at the chest with his back to the street.
    { kind: "swordsman", col: 66, face: 1, activity: "loot" },
    // 2. Over the mother and her son, sabre raised; her cry turns him.
    { kind: "swordsman", col: 99, face: 1, activity: "menace", group: "mother" },
    // 3. The terrace: a spearman holding the step, an archer on watch behind him.
    { kind: "spearman", col: 135, row: 26, face: -1 },
    { kind: "archer", col: 142, row: 26, face: -1, activity: "watch" },
    // 4. Feeding the pyre and talking across it.
    { kind: "swordsman", col: PYRE - 2.625, face: 1, activity: "burn" },
    { kind: "spearman", col: PYRE + 2, face: -1, activity: "chat" },
    // 5. The ambush at Ibrahim's door: two from the shops ahead, one from behind.
    { kind: "swordsman", col: 226, face: -1, dormant: true, hidden: true, group: "ambush" },
    { kind: "spearman", col: 232, face: -1, dormant: true, hidden: true, group: "ambush" },
    { kind: "swordsman", col: 184, face: 1, dormant: true, hidden: true, group: "ambush" },
    // 6. Short of the gate, a soldier stabbing at a body in the street.
    { kind: "swordsman", col: 265, face: 1, activity: "stab", patrol: 0 },
    // 7. The river gate's sentries, shields locked.
    { kind: "swordsman", col: 280, face: -1, guard: 0.95, patrol: 0 },
    { kind: "swordsman", col: 283, face: -1, guard: 0.95, patrol: 0 },
  ],
  // Townspeople the soldiers hold; the one at the gate street kneels under the executioner's sabre.
  captives: [
    { id: "gate_captive", kind: "refugee_man", col: 36, face: 1, run: -1, thanks: "SAVED_1" },
  ],
  npcs: [
    { id: "wounded_guard", kind: "guard", col: 11, face: 1, dialogue: "guard" },
    // Crouched over her son, her back to the soldier; she speaks once he is dead.
    { id: "mother", kind: "mother", col: 101, face: 1, dialogue: "mother", requires: "mother_cleared" },
    { id: "ibrahim", kind: "scholar", col: 248, face: -1, dialogue: "ibrahim", requires: "ambush_cleared",
      gives: "satchel", notice: "NOTICE_SATCHEL" },
  ],
  // Areas that start story beats, hints and ambushes: [id, col0, col1].
  triggers: [
    { id: "hint_move", from: 3, to: 9, hint: "HINT_MOVE" },
    { id: "hint_jump", from: 14, to: 19, hint: "HINT_JUMP" },
    { id: "execution", from: 19, to: 21, speaker: "SPEAKER_YUSUF", line: "EXECUTION_1" },
    { id: "hint_attack", from: 23, to: 26, hint: "HINT_ATTACK" },
    { id: "refugees", from: 44, to: 46, event: "refugees", speaker: "SPEAKER_REFUGEE", line: "REFUGEE_1" },
    { id: "hint_surprise", from: 57, to: 61, hint: "HINT_SURPRISE" },
    { id: "hint_guard", from: 84, to: 88, hint: "HINT_GUARD" },
    { id: "mother_cry", from: 92, to: 94, event: "alarm", group: "mother", speaker: "SPEAKER_MOTHER",
      line: "MOTHER_CRY_1" },
    { id: "hint_roll", from: 110, to: 113, hint: "HINT_ROLL" },
    { id: "hint_archer", from: 116, to: 119, hint: "HINT_ARCHER_COVER" },
    { id: "hint_climb", from: 146, to: 150, hint: "HINT_CLIMB" },
    { id: "burners", from: 150, to: 152, speaker: "SPEAKER_YUSUF", line: "BURNERS_1" },
    { id: "hint_plunge", from: 153, to: 158, above: 80, height: 120, hint: "HINT_PLUNGE" },
    { id: "hint_heal", from: 198, to: 202, hint: "HINT_HEAL" },
    { id: "ambush", from: 205, to: 207, event: "ambush", group: "ambush", line: "AMBUSH_1" },
    { id: "hint_guard_break", from: 270, to: 274, hint: "HINT_GUARD_BREAK" },
  ],
  exit: { name: "RiverGate", col: 297, prompt: "PROMPT_OPEN_GATE", lockedPrompt: "PROMPT_GATE_LOCKED",
    lockedLine: "GATE_LOCKED_1", requires: "satchel" },
  // Fires: [col, row (surface they stand on), size].
  fires: [
    // A stall burning beside the mother lights her and the soldier over her.
    [30, STREET, "large"], [39.5, STREET, "small"], [72, STREET, "medium"], [104.5, STREET, "small"], [113, 25, "small"],
    [128, STREET, "medium"], [PYRE - 0.125, STREET, "medium"], [186, STREET, "large"], [204, STREET, "medium"],
    [228, STREET, "large"], [245, STREET, "small"], [258, STREET, "medium"], [274, STREET, "large"],
  ],
};
