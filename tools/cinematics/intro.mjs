// The chapter's opening, in place of its card: the world of 1258 before the night the game is played.
// See docs/cinematics_plan.md. Camera rects are [x, y, w, h] in the painting's pixels (2.39:1, the
// letterboxed picture) at times through the shot (0 to 1).
import { FIRE, PEACE, LAMP, COLD } from "./grades.mjs";

export default {
  id: "intro",
  shots: [
    {
      painting: "peace",
      camera: [[0, [0, 110, 1672, 700]], [1, [420, 150, 1100, 460]]],
      grade: PEACE,
      // The picture from the first second (a black opening reads as the old card); the note that this is a
      // work of fiction is its first line.
      caption: "CINE_PLACE_BAGHDAD", lines: ["INTRO_4", "CINE_INTRO_SEAT"],
      lead: 1.4, tail: 1.0, minimum: 12, fadeIn: 1.2,
      fire: 0.3, water: 0.7, sway: 0.6, drift: [10, 0], birds: 3,
      ambience: "river",
    },
    {
      painting: "library",
      camera: [[0, [130, 160, 1300, 544]], [1, [520, 250, 820, 343]]],
      grade: PEACE,
      lines: ["CINE_INTRO_LEARNING"],
      lead: 1.0, tail: 1.0, minimum: 7, dissolve: 1.4,
      fire: 0.35, water: 0.5, sway: 0.4, motes: 26,
    },
    {
      painting: "map",
      camera: [[0, [46, 110, 1578, 660]], [0.72, [90, 128, 1490, 623]], [1, [400, 330, 700, 293]]],
      grade: LAMP,
      lines: ["CINE_INTRO_EAST", "CINE_INTRO_HULEGU"],
      lead: 2.8, tail: 2.8, minimum: 14, dissolve: 1.2,
      fire: 0.4,
      map: { rect: [262, 136, 1146, 630], west: 26, east: 78, south: 22, north: 46 },
      ambience: "wind",
      cues: [[0.01, "manuscript"]],
    },
    {
      painting: "host",
      camera: [[0, [0, 60, 1672, 700]], [1, [180, 210, 1100, 460]]],
      grade: COLD,
      caption: "CINE_PLACE_ROAD", lines: ["CINE_INTRO_WINTER", "CINE_INTRO_REFUSAL"],
      lead: 1.2, tail: 1.0, minimum: 11, dissolve: 1.2,
      sway: 0.8, snow: 90,
    },
    {
      painting: "siege",
      camera: [[0, [200, 250, 1000, 418]], [1, [0, 120, 1672, 700]]],
      grade: FIRE,
      caption: "CINE_PLACE_WALLS", lines: ["CINE_INTRO_SIEGE"],
      lead: 1.2, tail: 1.2, minimum: 9, dissolve: 1.0,
      fire: 0.5, sway: 0.5, smoke: 0.35, smokeArea: [0, 0, 1672, 360],
      embers: 40, ash: 26,
      impacts: [[0.36, [1185, 430]], [0.72, [1430, 410]]],
      ambience: "fire_wind",
      cues: [[0.355, "siege_impact"], [0.715, "siege_impact"]],
    },
    {
      painting: "keyart",
      camera: [[0, [880, 40, 760, 318]], [1, [250, 120, 1000, 418]]],
      grade: FIRE,
      lines: ["INTRO_1", "INTRO_2"],
      lead: 1.0, tail: 1.0, minimum: 11, dissolve: 1.0,
      fire: 0.5, sway: 0.5, smoke: 0.3, smokeArea: [700, 0, 972, 230],
      embers: 50, ash: 30,
    },
    {
      painting: "hero",
      camera: [[0, [0, 500, 760, 318]], [1, [0, 40, 760, 318]]],
      grade: FIRE,
      lines: ["INTRO_3"],
      lead: 1.0, tail: 1.2, minimum: 8, dissolve: 1.0,
      fire: 0.45, sway: 0.6, smoke: 0.3, smokeArea: [450, 0, 315, 500],
      embers: 40, ash: 20,
    },
    // The title over black, the chapter's name under it, embers rising.
    { title: "GAME_TITLE", lead: 0.8, tail: 0.6, minimum: 4.5, dissolve: 1.2, embers: 34 },
  ],
};
