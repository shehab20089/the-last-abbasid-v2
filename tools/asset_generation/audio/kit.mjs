// The kit of recorded takes the physical sounds are built from: for each family (a sabre's swish, sword on sword, a
// footstep on stone, a soldier's grunt), the takes chosen by eye and by measure from the raw libraries on the sheets
// of slice_sources.mjs and pick_sheet.mjs: one event each, no second event inside, no steady noise, no click inside a
// whoosh. Each take is a file of a pack and the seconds it spans there; build_kit.mjs cuts it, keeps up to `tail`
// seconds of its natural decay where no new event begins, high-passes it at `hp` Hz, trims and levels it, and writes
// assets/audio/kit/<family>_<n>.wav, which build_sounds.mjs layers into the game's cues. Every pack is CC0; PACKS
// says where each came from, for the credits (assets/audio/kit/CREDITS.md).

export const PACKS = {
  still_north_impacts: { title: "Medieval Sound Effects: Weapon on Weapon", author: "Still North Media",
    url: "https://opengameart.org/sites/default/files/medieval_sfx_weapon_on_weapon_1_of_2.7z (and _2_of_2)" },
  still_north_textures: { title: "Medieval Sound Effects: Weapon Textures", author: "Still North Media",
    url: "https://opengameart.org/content/medieval-sound-effects-weapon-textures" },
  kenney_impact: { title: "Impact Sounds", author: "Kenney", url: "https://kenney.nl/assets/impact-sounds" },
  kenney_rpg: { title: "RPG Audio", author: "Kenney", url: "https://kenney.nl/assets/rpg-audio" },
  artisticdude_rpg: { title: "RPG Sound Pack", author: "artisticdude", url: "https://opengameart.org/content/rpg-sound-pack" },
  inu_hits: { title: "37 hits/punches", author: "Independent.nu (submitted by qubodup)",
    url: "https://opengameart.org/content/37-hitspunches" },
  rubberduck_breaking: { title: "75 CC0 breaking/falling/hit sfx", author: "rubberduck",
    url: "https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx" },
  haeldb_voices: { title: "Male Grunt/Yelling Sounds", author: "HaelDB",
    url: "https://opengameart.org/content/male-gruntyelling-sounds" },
};

export const KIT = {
  // a sabre or katana cut through the air, its edge whistling
  swing_light: { pack: "still_north_textures", hp: 220, tail: 0.08, takes: [
    ["Katana Swing.wav", 0.326, 0.566],
    ["Katana Swing.wav", 1.313, 1.538],
    ["Katana Swing.wav", 2.27, 2.506],
    ["Katana Swing.wav", 4.54, 4.726],
    ["Katana Swing.wav", 5.728, 5.984],
    ["Katana Swing.wav", 6.971, 7.176],
    ["Katana Swing.wav", 7.923, 8.163],
    ["Sabre Swing.wav", 4.039, 4.265],
    ["Sabre Swing.wav", 4.53, 4.766],
    ["Sabre Swing.wav", 7.427, 7.642],
    ["Sabre Swing.wav", 8.349, 8.574],
    ["Sabre Swing.wav", 13.3, 13.576],
    ["Sabre Swing.wav", 13.691, 14.007],
    ["Sabre Swing.wav", 14.062, 14.362],
    ["Sabre Swing.wav", 18.271, 18.607],
    ["Sabre Swing.wav", 18.707, 18.968],
    ["Sabre Swing.wav", 19.018, 19.259],
  ] },
  // a dagger's quick swish
  swing_quick: { pack: "still_north_textures", hp: 300, tail: 0.08, takes: [
    ["Dagger Swing.wav", 0, 0.446],
    ["Dagger Swing.wav", 0.436, 0.932],
    ["Dagger Swing.wav", 0.922, 1.433],
    ["Dagger Swing.wav", 1.423, 2.105],
    ["Dagger Swing.wav", 2.095, 2.511],
    ["Dagger Swing.wav", 2.571, 3],
  ] },
  // an axe swung with the whole body: a heavy whomp
  swing_heavy: { pack: "still_north_textures", hp: 60, tail: 0.1, takes: [
    ["Axe Swing.wav", 1.223, 2.04],
    ["Axe Swing.wav", 2.345, 3.042],
    ["Axe Swing.wav", 3.092, 3.688],
    ["Axe Swing.wav", 3.949, 4.681],
    ["Axe Swing.wav", 4.671, 5.673],
    ["Axe Swing.wav", 5.663, 6.797],
  ] },
  // a spear swung and thrust
  swing_spear: { pack: "still_north_textures", hp: 150, tail: 0.08, takes: [
    ["Spear Swing.wav", 0, 0.787],
    ["Spear Swing.wav", 0.777, 1.253],
    ["Spear Swing.wav", 1.243, 2],
    ["Spear Swing.wav", 1.99, 2.616],
    ["Spear Swing.wav", 3.884, 4.515],
  ] },
  // a long knife (seax) cut through the air
  swing_seax: { pack: "still_north_textures", hp: 200, tail: 0.08, takes: [
    ["Seax Swing.wav", 0.291, 0.531],
    ["Seax Swing.wav", 2.395, 2.631],
    ["Seax Swing.wav", 3.217, 3.503],
    ["Seax Swing.wav", 4.034, 4.225],
    ["Seax Swing.wav", 4.796, 4.986],
    ["Seax Swing.wav", 5.943, 6.099],
    ["Seax Swing.wav", 6.921, 7.131],
    ["Seax Swing.wav", 7.808, 8.003],
    ["Seax Swing.wav", 8.604, 8.92],
  ] },
  // a recurve bow loosed: the string's slap
  bow_shoot: { pack: "still_north_textures", hp: 120, tail: 0.25, takes: [
    ["Scythian Recurve Shoot.wav", 0.09, 0.621],
    ["Scythian Recurve Shoot.wav", 2.741, 3.167],
    ["Scythian Recurve Shoot.wav", 3.398, 3.693],
    ["Scythian Recurve Shoot.wav", 3.683, 4.034],
    ["Scythian Recurve Shoot.wav", 1.904, 2.07],
  ] },
  // an arrow or bolt passing by
  arrow_pass: { pack: "still_north_textures", hp: 300, tail: 0.1, takes: [
    ["Scythian Recurve Arrow Pass.wav", 0.496, 1.077],
    ["Scythian Recurve Arrow Pass.wav", 1.067, 1.674],
    ["Scythian Recurve Arrow Pass.wav", 2.17, 2.756],
    ["Crossbow Bolt Passby.wav", 0.281, 0.667],
    ["Crossbow Bolt Passby.wav", 0.937, 1.338],
    ["Crossbow Bolt Passby.wav", 1.894, 2.33],
  ] },
  // a sabre drawn fast from its scabbard
  sabre_draw: { pack: "still_north_textures", hp: 300, tail: 0.15, takes: [
    ["Sabre Draw Fast.wav", 1.418, 2.06],
    ["Sabre Draw Fast.wav", 11.556, 12.027],
    ["Sabre Draw Fast.wav", 4.27, 4.736],
    ["Sabre Draw Fast.wav", 9.486, 9.872],
    ["Sabre Draw Fast.wav", 8.82, 9.311],
    ["Sabre Draw Fast.wav", 2.496, 3.067],
  ] },
  // sword struck on sword, ringing
  clash_ring: { pack: "still_north_impacts", hp: 150, tail: 0.9, takes: [
    ["Norse Sword Katana Blade on Blade.wav", 22.07, 22.3],
    ["Sabre Norse Sword Blade on Blade.wav", 12.448, 12.699],
    ["Sabre Katana Blade on Blade.wav", 12.278, 12.488],
    ["Norse Sword Katana Blade on Blade.wav", 13.851, 14.057],
    ["Norse Sword Katana Blade on Blade.wav", 5.613, 5.828],
    ["Norse Sword Katana Blade on Blade.wav", 4.876, 5.076],
    ["Sabre Norse Sword Blade on Blade.wav", 11.476, 11.706],
    ["Sabre Norse Sword Blade on Blade.wav", 17.66, 17.951],
    ["Norse Sword Katana Blade on Blade.wav", 0.246, 0.441],
    ["Sabre Katana Blade on Blade.wav", 1.238, 1.428],
    ["Sabre Katana Blade on Blade.wav", 2.641, 2.826],
    ["Norse Sword Katana Blade on Blade.wav", 2.851, 3.042],
    ["Norse Sword Katana Blade on Blade.wav", 6.344, 6.545],
    ["Norse Sword Katana Blade on Blade.wav", 1.017, 1.218],
    ["Sabre Katana Blade on Blade.wav", 0.451, 0.646],
    ["Sabre Katana Blade on Blade.wav", 5.728, 5.923],
    ["Sabre Katana Blade on Blade.wav", 6.515, 6.68],
  ] },
  // a blade struck on a wooden haft
  clash_wood: { pack: "still_north_impacts", hp: 90, tail: 0.4, takes: [
    ["Axe Norse Sword Haft on Blade.wav", 4.906, 5.102],
    ["Spear Norse Sword Haft on Blade.wav", 4.375, 4.615],
    ["Axe Sabre Haft on Blade.wav", 0.661, 0.847],
    ["Axe Norse Sword Haft on Blade.wav", 1.032, 1.198],
    ["Axe Sabre Haft on Blade.wav", 1.077, 1.283],
    ["Spear Sabre Haft on Blade.wav", 3.628, 3.844],
    ["Spear Norse Sword Haft on Blade.wav", 0.21, 0.436],
    ["Spear Sabre Haft on Blade.wav", 0.165, 0.411],
    ["Axe Sabre Haft on Blade.wav", 0.155, 0.336],
    ["Spear Sabre Haft on Blade.wav", 7.808, 8.048],
    ["Axe Norse Sword Haft on Blade.wav", 0.426, 0.581],
    ["Axe Norse Sword Haft on Blade.wav", 2.601, 2.831],
    ["Spear Katana Haft on Blade.wav", 0.075, 0.316],
    ["Spear Katana Haft on Blade.wav", 1.839, 2.085],
  ] },
  // a mace or axe struck on a sword
  clash_heavy: { pack: "still_north_impacts", hp: 60, tail: 0.8, takes: [
    ["Mace Norse Sword Blade.wav", 5.317, 5.487],
    ["Mace Norse Sword Blade.wav", 0.591, 0.822],
    ["Mace Norse Sword Blade.wav", 3.648, 3.929],
    ["Mace Norse Sword Blade.wav", 5.758, 5.903],
    ["Mace Norse Sword Blade.wav", 7.417, 7.567],
    ["Mace Sabre Blade.wav", 8.073, 8.259],
    ["Axe Sabre Blade on Blade.wav", 5.347, 5.648],
    ["Axe Sabre Blade on Blade.wav", 4.144, 4.365],
    ["Axe Sabre Blade on Blade.wav", 0.521, 0.787],
    ["Mace Sabre Blade.wav", 1.614, 1.789],
    ["Mace Sabre Blade.wav", 2.12, 2.325],
    ["Mace Sabre Blade.wav", 2.651, 2.897],
    ["Mace Sabre Blade.wav", 6.009, 6.179],
  ] },
  // a mace ground along a blade
  scrape: { pack: "still_north_impacts", hp: 300, tail: 0, takes: [
    ["Mace Sabre Blade.wav", 3.297, 3.924],
    ["Mace Sabre Blade.wav", 4.295, 4.836],
  ] },
  // a spearhead ringing from a mace's blow
  ring_metal: { pack: "still_north_impacts", hp: 200, tail: 0.8, takes: [
    ["Mace Spear Blade.wav", 4.575, 4.741],
    ["Mace Spear Blade.wav", 5.167, 5.332],
    ["Mace Spear Blade.wav", 6.229, 6.404],
  ] },
  // a heavy punch to the body
  punch_heavy: { pack: "kenney_impact", hp: 40, tail: 0.1, takes: [
    ["Audio/impactPunch_heavy_000.ogg", 0, 0.461],
    ["Audio/impactPunch_heavy_001.ogg", 0, 0.391],
    ["Audio/impactPunch_heavy_002.ogg", 0, 0.341],
    ["Audio/impactPunch_heavy_003.ogg", 0, 0.351],
    ["Audio/impactPunch_heavy_004.ogg", 0, 0.391],
  ] },
  // a punch to the body
  punch_medium: { pack: "kenney_impact", hp: 40, tail: 0.1, takes: [
    ["Audio/impactPunch_medium_000.ogg", 0, 0.311],
    ["Audio/impactPunch_medium_001.ogg", 0, 0.241],
    ["Audio/impactPunch_medium_002.ogg", 0, 0.311],
    ["Audio/impactPunch_medium_003.ogg", 0, 0.266],
    ["Audio/impactPunch_medium_004.ogg", 0, 0.316],
  ] },
  // a heavy soft thud, as of a body falling
  thud_heavy: { pack: "kenney_impact", hp: 30, tail: 0.15, takes: [
    ["Audio/impactSoft_heavy_000.ogg", 0, 0.527],
    ["Audio/impactSoft_heavy_001.ogg", 0, 0.569],
    ["Audio/impactSoft_heavy_002.ogg", 0, 0.569],
    ["Audio/impactSoft_heavy_003.ogg", 0, 0.541],
    ["Audio/impactSoft_heavy_004.ogg", 0, 0.498],
  ] },
  // a soft low thump
  thud_light: { pack: "kenney_impact", hp: 30, tail: 0.1, takes: [
    ["Audio/impactSoft_medium_000.ogg", 0, 0.115],
    ["Audio/impactSoft_medium_001.ogg", 0, 0.18],
    ["Audio/impactSoft_medium_002.ogg", 0, 0.132],
    ["Audio/impactSoft_medium_003.ogg", 0, 0.137],
    ["Audio/impactSoft_medium_004.ogg", 0, 0.144],
  ] },
  // a footstep on stone
  step_stone: { pack: "kenney_impact", hp: 60, tail: 0.05, takes: [
    ["Audio/footstep_concrete_000.ogg", 0, 0.103],
    ["Audio/footstep_concrete_001.ogg", 0, 0.105],
    ["Audio/footstep_concrete_002.ogg", 0, 0.11],
    ["Audio/footstep_concrete_003.ogg", 0, 0.108],
    ["Audio/footstep_concrete_004.ogg", 0, 0.111],
  ] },
  // a footstep on boards
  step_wood: { pack: "kenney_impact", hp: 60, tail: 0.05, takes: [
    ["Audio/footstep_wood_000.ogg", 0, 0.271],
    ["Audio/footstep_wood_001.ogg", 0, 0.249],
    ["Audio/footstep_wood_002.ogg", 0, 0.248],
    ["Audio/footstep_wood_003.ogg", 0, 0.249],
    ["Audio/footstep_wood_004.ogg", 0, 0.245],
  ] },
  // a plank knocked hard
  plank: { pack: "kenney_impact", hp: 60, tail: 0.1, takes: [
    ["Audio/impactPlank_medium_000.ogg", 0, 0.2],
    ["Audio/impactPlank_medium_001.ogg", 0, 0.226],
    ["Audio/impactPlank_medium_002.ogg", 0, 0.215],
    ["Audio/impactPlank_medium_003.ogg", 0, 0.205],
    ["Audio/impactPlank_medium_004.ogg", 0, 0.18],
  ] },
  // a light metal plate struck
  plate_light: { pack: "kenney_impact", hp: 80, tail: 0.2, takes: [
    ["Audio/impactPlate_light_000.ogg", 0, 0.476],
    ["Audio/impactPlate_light_001.ogg", 0, 0.611],
    ["Audio/impactPlate_light_002.ogg", 0, 0.451],
    ["Audio/impactPlate_light_003.ogg", 0, 0.476],
    ["Audio/impactPlate_light_004.ogg", 0, 0.561],
  ] },
  // a metal plate struck
  plate_medium: { pack: "kenney_impact", hp: 80, tail: 0.2, takes: [
    ["Audio/impactPlate_medium_000.ogg", 0, 0.531],
    ["Audio/impactPlate_medium_001.ogg", 0, 0.616],
    ["Audio/impactPlate_medium_002.ogg", 0, 0.515],
    ["Audio/impactPlate_medium_003.ogg", 0, 0.596],
    ["Audio/impactPlate_medium_004.ogg", 0, 0.534],
  ] },
  // a heavy metal plate struck
  plate_heavy: { pack: "kenney_impact", hp: 80, tail: 0.2, takes: [
    ["Audio/impactPlate_heavy_000.ogg", 0, 0.456],
    ["Audio/impactPlate_heavy_001.ogg", 0, 0.349],
    ["Audio/impactPlate_heavy_002.ogg", 0, 0.494],
    ["Audio/impactPlate_heavy_003.ogg", 0, 0.344],
    ["Audio/impactPlate_heavy_004.ogg", 0, 0.559],
  ] },
  // heavy timber struck
  wood_heavy: { pack: "kenney_impact", hp: 40, tail: 0.15, takes: [
    ["Audio/impactWood_heavy_000.ogg", 0, 0.31],
    ["Audio/impactWood_heavy_001.ogg", 0, 0.31],
    ["Audio/impactWood_heavy_002.ogg", 0, 0.31],
    ["Audio/impactWood_heavy_003.ogg", 0, 0.31],
    ["Audio/impactWood_heavy_004.ogg", 0, 0.31],
  ] },
  // wood knocked lightly
  wood_light: { pack: "kenney_impact", hp: 60, tail: 0.1, takes: [
    ["Audio/impactWood_light_000.ogg", 0, 0.11],
    ["Audio/impactWood_light_001.ogg", 0, 0.263],
    ["Audio/impactWood_light_002.ogg", 0, 0.125],
    ["Audio/impactWood_light_003.ogg", 0, 0.263],
    ["Audio/impactWood_light_004.ogg", 0, 0.263],
  ] },
  // wood knocked
  wood_medium: { pack: "kenney_impact", hp: 40, tail: 0.12, takes: [
    ["Audio/impactWood_medium_000.ogg", 0, 0.22],
    ["Audio/impactWood_medium_001.ogg", 0, 0.251],
    ["Audio/impactWood_medium_002.ogg", 0, 0.241],
    ["Audio/impactWood_medium_003.ogg", 0, 0.2],
    ["Audio/impactWood_medium_004.ogg", 0, 0.241],
  ] },
  // cloth rustled
  cloth: { pack: "kenney_rpg", hp: 150, tail: 0.05, takes: [
    ["Audio/cloth1.ogg", 0.02, 0.601],
    ["Audio/cloth2.ogg", 0.025, 0.391],
    ["Audio/cloth3.ogg", 0, 0.477],
    ["Audio/cloth4.ogg", 0, 0.384],
  ] },
  // cloth and a belt moved
  cloth_belt: { pack: "kenney_rpg", hp: 150, tail: 0.05, takes: [
    ["Audio/clothBelt.ogg", 0, 0.707],
    ["Audio/clothBelt2.ogg", 0, 0.586],
  ] },
  // a blade chopping into meat
  chop: { pack: "kenney_rpg", hp: 80, tail: 0.1, takes: [
    ["Audio/chop.ogg", 0.005, 0.24],
  ] },
  // a knife slicing
  slice: { pack: "kenney_rpg", hp: 400, tail: 0.05, takes: [
    ["Audio/knifeSlice.ogg", 0.07, 0.451],
    ["Audio/knifeSlice2.ogg", 0.005, 0.456],
  ] },
  // a book's pages turned and closed
  book: { pack: "kenney_rpg", hp: 200, tail: 0.05, takes: [
    ["Audio/bookFlip1.ogg", 0.276, 0.712],
    ["Audio/bookFlip2.ogg", 0, 0.411],
    ["Audio/bookFlip3.ogg", 0, 0.231],
    ["Audio/bookOpen.ogg", 0, 0.151],
  ] },
  // a metal latch and a click
  latch: { pack: "kenney_rpg", hp: 200, tail: 0.05, takes: [
    ["Audio/metalClick.ogg", 0, 0.381],
    ["Audio/metalLatch.ogg", 0, 0.2],
  ] },
  // a wooden door opening
  door_open: { pack: "kenney_rpg", hp: 60, tail: 0.2, takes: [
    ["Audio/doorOpen_1.ogg", 0, 0.902],
    ["Audio/doorOpen_2.ogg", 0.02, 1.383],
  ] },
  // timber creaking
  creak: { pack: "kenney_rpg", hp: 80, tail: 0.1, takes: [
    ["Audio/creak1.ogg", 0.05, 0.661],
    ["Audio/creak2.ogg", 0, 0.762],
    ["Audio/creak3.ogg", 0.01, 0.311],
  ] },
  // leather dropped on the ground
  leather_drop: { pack: "kenney_rpg", hp: 60, tail: 0.1, takes: [
    ["Audio/dropLeather.ogg", 0, 0.311],
  ] },
  // a knife drawn
  knife_draw: { pack: "kenney_rpg", hp: 300, tail: 0.1, takes: [
    ["Audio/drawKnife1.ogg", 0, 0.4],
    ["Audio/drawKnife2.ogg", 0, 0.376],
    ["Audio/drawKnife3.ogg", 0.025, 0.341],
  ] },
  // mail shaken
  chainmail: { pack: "artisticdude_rpg", hp: 400, tail: 0.1, takes: [
    ["RPG Sound Pack/inventory/chainmail1.wav", 0, 0.416],
    ["RPG Sound Pack/inventory/chainmail2.wav", 0.005, 0.436],
  ] },
  // light armour moving
  armour_light: { pack: "artisticdude_rpg", hp: 300, tail: 0.1, takes: [
    ["RPG Sound Pack/inventory/armor-light.wav", 0, 0.351],
  ] },
  // small pieces of metal knocking
  metal_small: { pack: "artisticdude_rpg", hp: 400, tail: 0.1, takes: [
    ["RPG Sound Pack/inventory/metal-small1.wav", 0, 0.155],
    ["RPG Sound Pack/inventory/metal-small2.wav", 0, 0.18],
    ["RPG Sound Pack/inventory/metal-small3.wav", 0.005, 0.301],
  ] },
  // heavy cloth moved
  cloth_heavy: { pack: "artisticdude_rpg", hp: 120, tail: 0.05, takes: [
    ["RPG Sound Pack/inventory/cloth-heavy.wav", 0.01, 0.306],
    ["RPG Sound Pack/inventory/cloth.wav", 0.005, 0.341],
  ] },
  // a bottle opened
  bottle: { pack: "artisticdude_rpg", hp: 150, tail: 0.1, takes: [
    ["RPG Sound Pack/inventory/bottle.wav", 0.005, 0.381],
  ] },
  // a sword unsheathed
  unsheathe: { pack: "artisticdude_rpg", hp: 300, tail: 0.1, takes: [
    ["RPG Sound Pack/battle/sword-unsheathe.wav", 0, 0.356],
    ["RPG Sound Pack/battle/sword-unsheathe2.wav", 0.01, 0.326],
    ["RPG Sound Pack/battle/sword-unsheathe3.wav", 0, 0.356],
    ["RPG Sound Pack/battle/sword-unsheathe4.wav", 0, 0.301],
    ["RPG Sound Pack/battle/sword-unsheathe5.wav", 0.01, 0.351],
  ] },
  // a hit or punch to the body
  hit_body: { pack: "inu_hits", hp: 50, tail: 0.1, takes: [
    ["hits/hit06.mp3.flac", 0.256, 0.787],
    ["hits/hit10.mp3.flac", 0.035, 0.356],
    ["hits/hit12.mp3.flac", 0.115, 0.536],
    ["hits/hit14.mp3.flac", 0.09, 0.496],
    ["hits/hit15.mp3.flac", 0.13, 0.496],
    ["hits/hit16.mp3.flac", 0.21, 0.742],
    ["hits/hit17.mp3.flac", 0.115, 0.566],
    ["hits/hit18.mp3.flac", 0.2, 0.732],
    ["hits/hit26.mp3.flac", 0.13, 0.516],
    ["hits/hit30.mp3.flac", 0.115, 0.636],
    ["hits/hit31.mp3.flac", 0.14, 0.536],
    ["hits/hit32.mp3.flac", 0.195, 0.616],
  ] },
  // a pot shattering
  shatter: { pack: "rubberduck_breaking", hp: 80, tail: 0.3, takes: [
    ["bfh1_breaking_01.ogg", 0, 0.912],
    ["bfh1_breaking_02.ogg", 0.005, 0.311],
    ["bfh1_breaking_03.ogg", 0.005, 0.426],
  ] },
  // glass shattering
  glass_shatter: { pack: "rubberduck_breaking", hp: 120, tail: 0.3, takes: [
    ["bfh1_glass_breaking_01.ogg", 0, 0.441],
    ["bfh1_glass_breaking_02.ogg", 0, 0.346],
    ["bfh1_glass_breaking_03.ogg", 0, 0.636],
  ] },
  // wood cracking and breaking
  wood_crack: { pack: "rubberduck_breaking", hp: 80, tail: 0.2, takes: [
    ["bfh1_wood_breaking_01.ogg", 0.005, 0.165],
    ["bfh1_wood_breaking_02.ogg", 0, 0.145],
    ["bfh1_wood_breaking_03.ogg", 0, 0.311],
    ["bfh1_wood_breaking_04.ogg", 0.005, 0.256],
  ] },
  // rock breaking
  rock_break: { pack: "rubberduck_breaking", hp: 50, tail: 0.3, takes: [
    ["bfh1_rock_breaking_01.ogg", 0, 0.461],
    ["bfh1_rock_breaking_03.ogg", 0, 0.455],
  ] },
  // stones falling
  rubble: { pack: "rubberduck_breaking", hp: 60, tail: 0.2, takes: [
    ["bfh1_rock_falling_01.ogg", 0.005, 0.416],
    ["bfh1_rock_falling_02.ogg", 0, 0.316],
    ["bfh1_rock_falling_03.ogg", 0, 0.707],
    ["bfh1_rock_falling_05.ogg", 0.005, 0.316],
    ["bfh1_rock_falling_07.ogg", 0, 0.266],
  ] },
  // metal falling and clattering
  metal_fall: { pack: "rubberduck_breaking", hp: 80, tail: 0.3, takes: [
    ["bfh1_metal_falling_01.ogg", 0.055, 0.862],
    ["bfh1_metal_falling_02.ogg", 0.01, 0.636],
  ] },
  // a metal object struck
  metal_hit: { pack: "rubberduck_breaking", hp: 80, tail: 0.3, takes: [
    ["bfh1_metal_hit_02.ogg", 0, 0.311],
    ["bfh1_metal_hit_03.ogg", 0.015, 0.341],
    ["bfh1_metal_hit_05.ogg", 0, 0.276],
  ] },
  // debris falling
  debris: { pack: "rubberduck_breaking", hp: 60, tail: 0.3, takes: [
    ["bfh1_falling_01.ogg", 0, 0.877],
    ["bfh1_falling_04.ogg", 0, 1.183],
    ["bfh1_falling_05.ogg", 0, 0.697],
  ] },
  // a man's grunt of pain or effort (the soldiers)
  voice_soldier_grunt: { pack: "haeldb_voices", hp: 90, tail: 0.15, takes: [
    ["yelling sounds/1yell13.wav", 0, 0.356],
    ["yelling sounds/1yell14.wav", 0.055, 0.596],
    ["yelling sounds/1yell15.wav", 0.21, 0.661],
    ["yelling sounds/1yell6.wav", 0.481, 1],
    ["yelling sounds/1yell7.wav", 0.516, 1.052],
    ["yelling sounds/1yell9.wav", 0.226, 0.596],
    ["yelling sounds/2yell1.wav", 0.381, 0.842],
    ["yelling sounds/2yell3.wav", 0.005, 0.421],
    ["yelling sounds/2yell4.wav", 1.363, 1.799],
  ] },
  // a man's cry as he is cut down (the soldiers)
  voice_soldier_death: { pack: "haeldb_voices", hp: 90, tail: 0.25, takes: [
    ["yelling sounds/1yell11.wav", 0.702, 1.538],
    ["yelling sounds/2yell8.wav", 0.12, 0.837],
    ["yelling sounds/2yell9.wav", 0.266, 1.022],
    ["yelling sounds/yell1.wav", 1.473, 2.696],
    ["yelling sounds/yell2.wav", 0.306, 1.724],
    ["yelling sounds/yell13.wav", 0.306, 1],
    ["yelling sounds/yell7.wav", 0.045, 0.842],
  ] },
  // a man's shout of alarm (the soldiers)
  voice_soldier_shout: { pack: "haeldb_voices", hp: 90, tail: 0.15, takes: [
    ["yelling sounds/1yell4.wav", 0.115, 0.742],
    ["yelling sounds/1yell2.wav", 0.145, 0.942],
    ["yelling sounds/2yell2.wav", 0.361, 1.163],
    ["yelling sounds/1yell3.wav", 0.727, 1.569],
    ["yelling sounds/2yell5.wav", 1.002, 1.574],
  ] },
  // a man's grunt of pain (Yusuf)
  voice_hero_grunt: { pack: "haeldb_voices", hp: 90, tail: 0.15, takes: [
    ["yelling sounds/3grunt1.wav", 0.511, 0.902],
    ["yelling sounds/3grunt4.wav", 0.246, 0.5],
    ["yelling sounds/3grunt5.wav", 0.135, 0.5],
    ["yelling sounds/3yell3.wav", 0.205, 0.626],
    ["yelling sounds/3yell4.wav", 0.2, 0.722],
    ["yelling sounds/3grunt3.wav", 0, 0.5],
  ] },
  // a man's dying cry (Yusuf)
  voice_hero_death: { pack: "haeldb_voices", hp: 90, tail: 0.3, takes: [
    ["yelling sounds/3yell14.wav", 0.236, 1.158],
    ["yelling sounds/3yell5.wav", 0.511, 1.353],
  ] },
  // a man's great war cry (Yusuf)
  voice_hero_cry: { pack: "haeldb_voices", hp: 90, tail: 0.3, takes: [
    ["yelling sounds/3yell1.wav", 0.376, 1.904],
    ["yelling sounds/3yell2.wav", 0.241, 1.5],
    ["yelling sounds/3yell9.wav", 0.366, 2],
  ] },
  // a man's roar (the Captain, pitched down)
  voice_captain: { pack: "haeldb_voices", hp: 70, tail: 0.3, takes: [
    ["yelling sounds/yell10.wav", 0.035, 1.909],
    ["yelling sounds/yell11.wav", 0.421, 2.275],
    ["yelling sounds/yell4.wav", 0.451, 1.5],
    ["yelling sounds/yell5.wav", 0.431, 1.699],
  ] },
};
