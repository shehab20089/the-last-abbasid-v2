// The paintings the cinematics are made from (docs/concept_art), and what is known of each beyond its
// colours: what part of it is kept, its depth (a base by height, then shapes, each nearer where it is
// darker than `darker` when that is given), what of it drifts, its water, its cloth that sways (hanging
// from `top`, free at `bottom`) and where its fire is (bright warm pixels above `min` luminance, inside
// `only` and outside `exclude` when given). Coordinates are the painting's own pixels. Read by
// build_cinematics.mjs.

export const PAINTINGS = {
  // Baghdad at peace across the Tigris: the bridge of boats, a round reed boat, the palace's banners.
  peace: {
    file: "11_City_of_Peace",
    depth: {
      base: [[0, 0], [380, 0.04], [480, 0.12], [520, 0.25], [700, 0.6], [941, 1]],
      shapes: [
        { poly: [[0, 0], [110, 0], [90, 200], [60, 330], [40, 480], [0, 520]], depth: 0.95, darker: 0.35 },
        { poly: [[0, 0], [580, 0], [560, 150], [400, 230], [250, 230], [120, 260], [0, 300]], depth: 0.95, darker: 0.3 },
        { poly: [[1440, 0], [1672, 0], [1672, 230], [1500, 200], [1440, 100]], depth: 0.95, darker: 0.3 },
        { poly: [[0, 400], [180, 400], [200, 560], [290, 600], [300, 760], [0, 780]], depth: 0.9, darker: 0.45 },
        { poly: [[410, 700], [460, 700], [560, 740], [870, 740], [880, 860], [540, 870], [410, 820]], depth: 0.85 },
        { poly: [[1300, 565], [1540, 565], [1540, 640], [1300, 640]], depth: 0.45 },
      ],
      blur: 16,
    },
    drift: [
      [[205, 440], [290, 440], [295, 530], [205, 530]],
      [[520, 425], [625, 425], [630, 548], [520, 548]],
      [[1300, 565], [1540, 565], [1540, 642], [1300, 642]],
    ],
    water: [
      [[290, 610], [1672, 600], [1672, 941], [880, 941], [870, 765], [540, 740], [300, 700]],
      [[0, 495], [1672, 485], [1672, 518], [0, 528]],
    ],
    sway: [
      { poly: [[120, 0], [580, 0], [560, 150], [400, 230], [250, 230], [130, 260]], top: 0, bottom: 250 },
      { poly: [[1440, 0], [1672, 0], [1672, 230], [1440, 120]], top: 0, bottom: 230 },
      { poly: [[988, 272], [1022, 272], [1022, 378], [988, 378]], top: 272, bottom: 378 },
      { poly: [[1138, 260], [1177, 260], [1177, 378], [1138, 378]], top: 260, bottom: 378 },
      { poly: [[1333, 293], [1362, 293], [1362, 382], [1333, 382]], top: 293, bottom: 382 },
      { poly: [[788, 328], [817, 328], [817, 422], [788, 422]], top: 328, bottom: 422 },
      { poly: [[0, 410], [170, 410], [170, 472], [0, 472]], top: 410, bottom: 472 },
    ],
    // The lamps and lit windows twinkle; not the sky or the sun.
    fire: { min: 0.68, exclude: [[[0, 0], [1672, 0], [1672, 150], [900, 230], [0, 320]], [[120, 320], [270, 320], [270, 410], [120, 410]]] },
  },

  // A library of the city: scholars, books lying flat, an astrolabe, the courtyard beyond an arch.
  library: {
    file: "12_House_of_Wisdom",
    depth: {
      base: [[0, 0.3], [600, 0.35], [700, 0.5], [941, 1]],
      shapes: [
        { poly: [[1000, 140], [1290, 140], [1290, 560], [1000, 560]], depth: 0.05, set: true },
        { poly: [[990, 520], [1300, 520], [1300, 640], [990, 640]], depth: 0.15, set: true },
        { poly: [[800, 400], [955, 400], [965, 712], [808, 712]], depth: 0.62 },
        { poly: [[150, 450], [520, 450], [520, 740], [150, 740]], depth: 0.55 },
        { poly: [[500, 480], [720, 480], [720, 700], [500, 700]], depth: 0.55 },
        { poly: [[1150, 440], [1672, 440], [1672, 780], [1150, 780]], depth: 0.62 },
        { poly: [[0, 450], [320, 450], [320, 941], [0, 941]], depth: 0.95, darker: 0.25 },
        { poly: [[1420, 740], [1672, 740], [1672, 941], [1420, 941]], depth: 0.95 },
      ],
      blur: 16,
    },
    water: [[[1020, 588], [1240, 588], [1240, 632], [1020, 632]], [[1100, 478], [1172, 478], [1172, 590], [1100, 590]]],
    sway: [
      { poly: [[640, 0], [715, 0], [715, 245], [640, 245]], top: 0, bottom: 245 },
      { poly: [[855, 238], [900, 238], [900, 372], [855, 372]], top: 238, bottom: 372 },
      { poly: [[1600, 0], [1672, 0], [1672, 250], [1600, 250]], top: 0, bottom: 250 },
      { poly: [[205, 0], [285, 0], [285, 170], [205, 170]], top: 0, bottom: 170 },
      { poly: [[510, 150], [570, 150], [570, 292], [510, 292]], top: 150, bottom: 292 },
      { poly: [[1545, 130], [1605, 130], [1605, 282], [1545, 282]], top: 130, bottom: 282 },
    ],
    fire: { min: 0.6, exclude: [[[1000, 140], [1290, 140], [1290, 430], [1000, 430]]] },
  },

  // A blank parchment on a desk by lamplight, seen from above: the map is drawn on it.
  map: {
    file: "13_Map_Table",
    depth: { base: [[0, 0.5], [941, 0.5]], blur: 4 },
    fire: { min: 0.6, only: [[[0, 0], [240, 0], [240, 280], [0, 280]]] },
  },

  // The army of Hülegü on the march in the snow, seen past three riders on a rise.
  host: {
    file: "14_The_Host",
    depth: {
      base: [[0, 0], [150, 0.02], [180, 0.06], [600, 0.42], [941, 0.95]],
      shapes: [
        { poly: [[60, 20], [460, 20], [460, 350], [350, 420], [350, 740], [60, 740]], depth: 0.86, darker: 0.45 },
        { poly: [[420, 310], [730, 310], [730, 800], [420, 800]], depth: 0.9, darker: 0.45 },
        { poly: [[700, 60], [1020, 60], [1020, 460], [960, 460], [960, 840], [700, 840]], depth: 0.87, darker: 0.45 },
      ],
      blur: 16,
    },
    sway: [
      { poly: [[150, 40], [460, 40], [460, 350], [150, 350]], top: 60, bottom: 350 },
      { poly: [[840, 80], [1020, 80], [1020, 460], [840, 460]], top: 110, bottom: 460 },
    ],
  },

  // The siege: a trebuchet crew hauling, the walls cracked under their banners, the city burning.
  siege: {
    file: "15_The_Siege",
    depth: {
      base: [[0, 0], [330, 0], [600, 0.32], [700, 0.6], [941, 1]],
      shapes: [
        // The great trebuchet, its frame and its arm, one body.
        { poly: [[400, 230], [480, 190], [690, 140], [1025, 40], [1050, 65], [780, 185], [760, 200], [905, 705], [860, 735], [560, 735], [600, 480], [470, 490], [465, 360], [400, 330]], depth: 0.62 },
        // The crew hauling.
        { poly: [[0, 510], [880, 520], [900, 840], [0, 860]], depth: 0.85, darker: 0.38 },
        // The row of trebuchets to the left, and the one by the walls.
        { poly: [[0, 290], [440, 290], [440, 560], [0, 560]], depth: 0.45, darker: 0.3 },
        { poly: [[1020, 460], [1270, 460], [1270, 690], [1020, 690]], depth: 0.42, darker: 0.3 },
        // The soldier at the right.
        { poly: [[1310, 590], [1520, 590], [1520, 860], [1310, 860]], depth: 0.88, darker: 0.4 },
      ],
      blur: 16,
    },
    fire: { min: 0.42 },
    sway: [
      { poly: [[903, 355], [945, 355], [945, 455], [903, 455]], top: 355, bottom: 455 },
      { poly: [[1035, 365], [1075, 365], [1075, 470], [1035, 470]], top: 365, bottom: 470 },
      { poly: [[1275, 370], [1310, 370], [1310, 480], [1275, 480]], top: 370, bottom: 480 },
      { poly: [[1530, 290], [1595, 290], [1595, 445], [1530, 445]], top: 290, bottom: 445 },
      { poly: [[0, 300], [95, 300], [95, 470], [0, 470]], top: 300, bottom: 470 },
    ],
  },

  // The river of ink: a boatman with the satchel, books on the black water, the far bank burning.
  river: {
    file: "16_River_of_Ink",
    depth: {
      base: [[0, 0], [150, 0.02], [310, 0.1], [941, 1]],
      shapes: [
        { poly: [[0, 380], [190, 380], [370, 560], [470, 650], [700, 760], [640, 941], [0, 941]], depth: 1 },
        { poly: [[640, 370], [940, 370], [975, 575], [640, 575]], depth: 0.5 },
      ],
      blur: 16,
    },
    drift: [[[640, 368], [945, 368], [978, 578], [640, 578]]],
    water: [[[0, 312], [1672, 312], [1672, 941], [640, 941], [700, 760], [470, 650], [370, 560], [190, 470], [0, 462]]],
    fire: { min: 0.5 },
  },

  // The morning after: the column of refugees with their books toward the sunrise, Yusuf at the back.
  road: {
    file: "17_Road_at_Dawn",
    depth: {
      base: [[0, 0], [300, 0.02], [420, 0.1], [440, 0.4], [720, 0.62], [941, 1]],
      shapes: [
        { poly: [[950, 60], [1672, 60], [1672, 520], [950, 520]], depth: 0.2 },
        { poly: [[30, 420], [1610, 420], [1610, 730], [30, 730]], depth: 0.58, darker: 0.42 },
        { poly: [[0, 0], [420, 0], [400, 180], [130, 360], [60, 420], [0, 420]], depth: 0.92, darker: 0.3 },
      ],
      blur: 16,
    },
    water: [[[0, 762], [1672, 762], [1672, 941], [0, 941]], [[0, 440], [560, 440], [560, 520], [0, 520]]],
    sway: [
      { poly: [[1180, 200], [1232, 200], [1232, 332], [1180, 332]], top: 200, bottom: 332 },
      { poly: [[1513, 150], [1572, 150], [1572, 302], [1513, 302]], top: 150, bottom: 302 },
      { poly: [[100, 0], [420, 0], [400, 190], [250, 200], [100, 120]], top: 0, bottom: 200 },
      { poly: [[1560, 280], [1672, 280], [1672, 420], [1560, 420]], top: 280, bottom: 420 },
    ],
    fire: { min: 0.5, only: [[[780, 0], [1672, 0], [1672, 520], [780, 520]]] },
  },

  // Yusuf on the wall over the burning city (the hero's sheet, its painting only).
  hero: {
    file: "01_Abbasid_Hero_Character_Concept",
    keep: [0, 0, 765, 1402],
    depth: {
      base: [[0, 0.1], [1402, 0.2]],
      shapes: [
        { poly: [[100, 60], [470, 60], [540, 300], [620, 420], [620, 720], [750, 800], [740, 980], [600, 1000], [600, 1260], [450, 1260], [420, 1100], [260, 1100], [200, 1220], [110, 1220], [150, 920], [90, 560]], depth: 0.75 },
        { poly: [[0, 20], [130, 20], [100, 520], [0, 520]], depth: 0.55 },
        { poly: [[0, 500], [110, 500], [110, 1402], [0, 1402]], depth: 0.6 },
        { poly: [[0, 1150], [765, 1150], [765, 1402], [0, 1402]], depth: 0.85 },
      ],
      blur: 16,
    },
    sway: [
      { poly: [[0, 30], [110, 30], [110, 350], [0, 350]], top: 30, bottom: 350 },
      { poly: [[560, 720], [760, 720], [760, 1000], [560, 1000]], top: 720, bottom: 1000 },
    ],
    fire: { min: 0.45, only: [[[440, 0], [765, 0], [765, 1150], [440, 1150]]] },
  },

  // The key art: Yusuf mid-cut in the burning market, the gate and its banners behind.
  keyart: {
    file: "02_Burning_Baghdad_Key_Art",
    depth: {
      base: [[0, 0], [200, 0.05], [500, 0.25], [700, 0.5], [941, 1]],
      shapes: [
        { poly: [[0, 0], [720, 0], [720, 250], [600, 480], [0, 480]], depth: 0.5 },
        { poly: [[340, 160], [850, 160], [1000, 330], [1000, 580], [930, 720], [950, 941], [350, 941], [300, 700], [340, 420]], depth: 0.75 },
        { poly: [[0, 480], [330, 480], [420, 941], [0, 941]], depth: 0.95, darker: 0.5 },
        { poly: [[1180, 380], [1672, 380], [1672, 941], [1180, 941]], depth: 0.95, darker: 0.5 },
      ],
      blur: 16,
    },
    sway: [
      { poly: [[1225, 225], [1290, 225], [1290, 410], [1225, 410]], top: 225, bottom: 410 },
      { poly: [[1325, 340], [1390, 340], [1390, 470], [1325, 470]], top: 340, bottom: 470 },
      { poly: [[1100, 400], [1150, 400], [1150, 500], [1100, 500]], top: 400, bottom: 500 },
      { poly: [[650, 150], [1030, 150], [1030, 330], [650, 330]], top: 150, bottom: 330 },
      { poly: [[0, 20], [180, 20], [180, 330], [0, 330]], top: 20, bottom: 330 },
    ],
    fire: { min: 0.45 },
  },

  // The Streets of Ash: Yusuf on a broken ledge, the cranes and the cage, the great dome in the smoke.
  streets: {
    file: "04_Streets_of_Ash",
    depth: {
      base: [[0, 0], [250, 0.06], [500, 0.25], [700, 0.5], [941, 0.9]],
      shapes: [
        { poly: [[0, 0], [240, 0], [240, 230], [420, 230], [430, 940], [0, 940]], depth: 0.8, darker: 0.45 },
        { poly: [[430, 240], [1080, 240], [1080, 941], [430, 941]], depth: 0.55, darker: 0.4 },
        { poly: [[1210, 0], [1672, 0], [1672, 941], [1210, 941]], depth: 0.75, darker: 0.4 },
        { poly: [[1080, 250], [1200, 250], [1200, 540], [1080, 540]], depth: 0.6, darker: 0.4 },
      ],
      blur: 16,
    },
    sway: [
      { poly: [[100, 20], [230, 20], [230, 300], [100, 300]], top: 20, bottom: 300 },
      { poly: [[1080, 250], [1200, 250], [1200, 540], [1080, 540]], top: 250, bottom: 540 },
      { poly: [[1018, 380], [1046, 380], [1046, 880], [1018, 880]], top: 380, bottom: 880 },
      { poly: [[1260, 280], [1370, 280], [1370, 420], [1260, 420]], top: 280, bottom: 420 },
    ],
    water: [[[1000, 800], [1200, 800], [1200, 941], [1000, 941]]],
    fire: { min: 0.45 },
  },

  // The Scholars' Quarter: the garden and its fountain, the library under its arches.
  scholars: {
    file: "05_Scholars_Quarter",
    depth: {
      base: [[0, 0], [330, 0.1], [500, 0.35], [800, 0.5], [941, 0.9]],
      shapes: [
        { poly: [[900, 0], [1672, 0], [1672, 870], [900, 870]], depth: 0.55 },
        { poly: [[95, 20], [200, 20], [200, 320], [95, 320]], depth: 0.6 },
        { poly: [[600, 130], [700, 130], [700, 700], [600, 700]], depth: 0.45, darker: 0.35 },
      ],
      blur: 16,
    },
    sway: [
      { poly: [[95, 40], [200, 40], [200, 300], [95, 300]], top: 40, bottom: 300 },
      { poly: [[485, 305], [555, 305], [555, 460], [485, 460]], top: 305, bottom: 460 },
      { poly: [[950, 110], [1010, 110], [1010, 330], [950, 330]], top: 110, bottom: 330 },
    ],
    water: [[[330, 690], [790, 690], [790, 790], [330, 790]], [[340, 640], [480, 640], [480, 740], [340, 740]]],
    fire: { min: 0.45 },
  },

  // The Last Gate: the broken gatehouse and its banners, the burning city across the river, a low sun.
  gate: {
    file: "06_The_Last_Gate",
    depth: {
      base: [[0, 0], [300, 0.04], [600, 0.12], [700, 0.45], [760, 0.6], [941, 1]],
      shapes: [
        { poly: [[790, 100], [880, 90], [1090, 70], [1300, 40], [1400, 0], [1672, 0], [1672, 720], [750, 720], [750, 240]], depth: 0.45 },
        { poly: [[0, 60], [230, 60], [230, 640], [0, 640]], depth: 0.7, darker: 0.35 },
      ],
      blur: 16,
    },
    sway: [
      { poly: [[905, 140], [985, 140], [985, 470], [905, 470]], top: 140, bottom: 470 },
      { poly: [[1460, 70], [1560, 70], [1560, 420], [1460, 420]], top: 70, bottom: 420 },
      { poly: [[0, 90], [110, 90], [110, 330], [0, 330]], top: 90, bottom: 330 },
      { poly: [[90, 300], [220, 300], [220, 500], [90, 500]], top: 300, bottom: 500 },
    ],
    water: [[[220, 590], [760, 590], [760, 640], [220, 640]], [[700, 700], [1500, 700], [1500, 780], [700, 780]]],
    fire: { min: 0.45, exclude: [[[190, 340], [320, 340], [320, 440], [190, 440]]] },
  },
};
