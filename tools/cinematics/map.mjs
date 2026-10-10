// The opening's map, drawn in ink on the parchment of 13_Map_Table, and the river's spreading ink. A map is
// an ink image (colour and alpha) and a times image over a rect of the painting: red, when each stroke is
// drawn (the map draws itself as the shot opens); green, when the spreading ink reaches each pixel; blue,
// when Hülegü's road does. The shader (features/cinematics/cinematic.gdshader) shows each as its moment
// comes. Places are [longitude, latitude]; the projection is equirectangular, longitude scaled by
// cos 33 degrees. Outlines are simplified by hand: an illustration, not a survey.
import { join } from "node:path";
import { Canvas } from "../asset_generation/lib/canvas.mjs";
import { writePng } from "../asset_generation/lib/png.mjs";

// --- Geography -------------------------------------------------------------------------------------------
const MEDITERRANEAN = [[26, 31.2], [29.9, 31.2], [31.0, 31.6], [32.3, 31.3], [34.2, 31.3], [34.8, 32.1], [35.0, 33.0],
  [35.5, 33.9], [35.9, 35.1], [36.0, 36.0], [36.2, 36.7], [35.0, 36.8], [34.0, 36.3], [32.5, 36.1], [30.6, 36.8],
  [29.0, 36.6], [28.0, 36.8], [27.3, 37.4], [26.3, 38.3], [26.0, 39.0]];
const CYPRUS = [[32.3, 35.0], [33.0, 35.4], [34.6, 35.7], [34.0, 35.0], [33.0, 34.6], [32.4, 34.8]];
const BLACK_SEA = [[28.9, 41.2], [28.0, 41.9], [27.9, 42.7], [28.6, 43.6], [28.8, 44.4], [29.7, 45.1], [30.3, 45.9],
  [31.2, 46.0], [32.6, 45.9], [32.6, 45.4], [33.4, 44.6], [34.4, 44.5], [35.5, 45.0], [36.5, 45.3], [37.4, 45.1],
  [38.2, 44.6], [39.7, 43.6], [41.0, 42.6], [41.6, 41.6], [40.2, 41.0], [38.4, 40.9], [36.4, 41.3], [35.2, 42.0],
  [33.4, 41.9], [31.5, 41.3], [29.2, 41.2]];
const CASPIAN = [[47.6, 46.0], [47.4, 45.0], [47.0, 44.4], [47.5, 43.0], [48.3, 42.0], [49.2, 41.1], [49.9, 40.4],
  [49.4, 39.5], [48.9, 38.8], [48.9, 38.4], [49.5, 37.5], [50.4, 37.1], [51.5, 36.8], [52.6, 36.7], [54.0, 36.9],
  [53.9, 38.0], [53.2, 39.3], [52.9, 40.2], [53.2, 41.0], [52.5, 42.2], [51.3, 43.6], [50.8, 44.6], [52.0, 45.4],
  [53.0, 46.0]];
const ARAL = [[58.2, 44.5], [58.4, 45.6], [59.3, 46.0], [61.2, 46.0], [61.6, 45.0], [60.8, 44.2], [59.5, 43.7]];
// The Gulf, the Gulf of Oman and the Arabian Sea, closed along the map's foot.
const GULF = [[59.8, 22.0], [58.6, 23.6], [57.0, 24.0], [56.4, 24.8], [56.4, 26.4], [56.1, 26.1], [55.5, 25.4],
  [54.4, 24.3], [52.6, 24.2], [51.4, 24.6], [51.6, 25.3], [51.2, 26.1], [50.8, 25.5], [50.0, 26.2], [49.7, 26.8],
  [48.6, 27.9], [48.0, 29.3], [48.5, 29.9], [49.4, 30.1], [50.3, 29.9], [50.8, 28.9], [51.5, 27.9], [53.0, 27.0],
  [54.8, 26.6], [56.6, 27.1], [57.3, 25.8], [58.8, 25.5], [61.5, 25.1], [63.0, 25.2], [66.5, 25.4], [67.3, 24.8],
  [68.4, 23.6], [69.0, 22.6], [70.2, 22.0]];
const RED_SEA = [[32.5, 30.0], [33.0, 28.8], [33.8, 27.6], [34.2, 27.8], [34.4, 28.4], [34.9, 29.5], [35.0, 28.2],
  [35.5, 27.4], [36.5, 25.8], [38.0, 24.2], [39.1, 22.0], [36.9, 22.0], [35.6, 23.9], [34.6, 25.5], [33.9, 26.9],
  [33.2, 28.0], [32.6, 29.4]];
// Each sea and its coasts (the rest of its outline lies along the map's edge).
const SEAS = [
  { poly: [...MEDITERRANEAN, [26, 31.2]], coasts: [MEDITERRANEAN] },
  { poly: BLACK_SEA, coasts: [BLACK_SEA.slice(0, 7), [...BLACK_SEA.slice(8), BLACK_SEA[0]]] },
  { poly: CASPIAN, coasts: [CASPIAN] },
  { poly: ARAL, coasts: [[...ARAL.slice(3), ...ARAL.slice(0, 3)]] },
  { poly: GULF, coasts: [GULF] },
  { poly: RED_SEA, coasts: [RED_SEA.slice(0, 11), [...RED_SEA.slice(11), RED_SEA[0]]] },
];
const RIVERS = [
  // The Tigris, through Mosul and Baghdad to the Shatt al-Arab.
  [[39.8, 38.4], [40.2, 37.9], [42.2, 37.3], [43.1, 36.3], [43.7, 34.6], [43.9, 34.2], [44.4, 33.3], [45.8, 32.5],
    [47.2, 31.8], [47.4, 31.0], [48.5, 29.9]],
  // The Euphrates, from Anatolia past Raqqa to its meeting with the Tigris.
  [[39.0, 39.7], [38.4, 38.3], [38.0, 37.0], [39.0, 35.95], [40.1, 35.3], [41.0, 34.4], [42.4, 34.1], [43.3, 33.4],
    [43.8, 33.35], [44.3, 32.5], [45.3, 31.3], [46.3, 31.05], [47.4, 31.0]],
  // The Oxus to the Aral Sea, and the Nile through Cairo.
  [[71.5, 37.0], [69.0, 37.2], [67.3, 37.2], [65.2, 37.8], [63.6, 39.1], [61.0, 41.0], [59.5, 42.5], [59.6, 43.7]],
  [[31.0, 31.5], [31.2, 30.1], [31.3, 29.0], [30.9, 27.6], [31.2, 26.6], [32.7, 25.7], [32.9, 24.1], [32.4, 22.0]],
];
const MOUNTAINS = [
  [[31.0, 37.3], [33.5, 37.4], [36.0, 37.9], [39.0, 38.2]],
  [[40.0, 43.5], [43.0, 42.8], [46.0, 42.0], [49.0, 41.3]],
  [[45.2, 36.4], [46.8, 34.9], [48.6, 33.4], [50.6, 31.6], [52.6, 30.0], [55.0, 28.6], [57.0, 27.8]],
  [[48.7, 37.2], [51.0, 36.2], [53.5, 36.3], [55.6, 36.7]],
  [[66.0, 35.0], [68.5, 35.6], [71.0, 36.2], [73.0, 36.8]],
];
const TOWNS = [[31.24, 30.04], [36.29, 33.51], [37.16, 36.2], [43.13, 36.34], [47.8, 30.5], [46.3, 38.07],
  [51.67, 32.65], [52.5, 29.6], [61.8, 37.6], [64.4, 39.8], [59.6, 36.3], [48.5, 34.8], [66.97, 39.65]];
const BAGHDAD = [44.4, 33.3];
const ALAMUT = [50.58, 36.44];
// The caliph's own lands: lower Iraq, from Tikrit to Basra.
const CALIPH = [[42.5, 35.0], [44.0, 35.2], [45.5, 34.4], [46.2, 33.0], [47.5, 31.8], [48.5, 30.2], [47.8, 29.9],
  [46.5, 30.6], [45.0, 31.5], [43.6, 32.5], [42.4, 33.6], [41.6, 34.4]];
// Beyond this line, north and east, the Mongols ruled or were obeyed by 1256 (Rum, Lesser Armenia, Georgia,
// Persia, Khorasan, Transoxiana).
const MONGOL_EDGE = [[30.5, 41.2], [30.5, 39.5], [31.0, 37.0], [30.7, 36.6], [33.0, 36.0], [36.2, 36.6], [37.0, 37.0],
  [38.5, 37.2], [40.5, 37.2], [42.0, 36.6], [44.0, 35.6], [45.5, 35.0], [46.0, 33.5], [47.5, 32.0], [48.5, 30.3],
  [49.4, 30.1],
  // Down the Persian shore of the Gulf (Fars and Kerman obeyed them), then up the Indus frontier.
  [50.3, 29.9], [50.8, 28.9], [51.5, 27.9], [53.0, 27.0], [54.8, 26.6], [56.6, 27.1], [57.3, 25.8], [58.8, 25.5],
  [61.5, 25.1], [63.0, 25.2], [66.5, 25.4], [67.3, 24.8], [68.5, 27.0], [70.5, 30.5], [72.0, 33.0], [74.0, 34.5],
  [78.0, 35.5]];
// Hülegü's road: Samarkand, over the Oxus, Merv, Tus, the castles of the Elburz, Alamut, Qazvin, Hamadan.
const ROAD = [[66.97, 39.65], [66.8, 39.05], [64.5, 38.5], [61.8, 37.6], [59.6, 36.4], [55.0, 36.2], [52.5, 36.4],
  [50.58, 36.44], [49.5, 35.6], [48.5, 34.8]];

// --- Drawing ---------------------------------------------------------------------------------------------
const INK = [62, 40, 26];
const WATER_INK = [56, 66, 70];
const SEA = [150, 160, 158];
const GOLD = [214, 160, 72];
const RED = [128, 30, 22];

function inside(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** An ink layer over a w x h area: colour, alpha and the time each pixel shows, painted in order. */
class Sheet {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.rgba = new Float32Array(w * h * 4);
    this.drawn = new Float32Array(w * h).fill(1);
    this.road = new Float32Array(w * h).fill(1);
    this.wash = new Float32Array(w * h).fill(1);
  }

  /** Lays colour over a pixel with coverage `a`, shown at `time` (by the map's drawing, or the road's). */
  put(x, y, color, a, time, onRoad = false) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = y * this.w + x;
    const o = this.rgba[i * 4 + 3];
    const out = a + o * (1 - a);
    for (let c = 0; c < 3; c++) this.rgba[i * 4 + c] = (color[c] * a + this.rgba[i * 4 + c] * o * (1 - a)) / out;
    this.rgba[i * 4 + 3] = out;
    if (onRoad) {
      this.road[i] = Math.min(this.road[i], time);
      this.drawn[i] = 1;
    } else if (this.road[i] >= 1) {
      this.drawn[i] = Math.min(this.drawn[i], time);
    }
  }

  /** A line of `width` through points, its time from `timeAt(x, y, along)` (along: 0 to 1). */
  stroke(points, width, color, timeAt, { dash = 0, alpha = 1, onRoad = false } = {}) {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
    const total = lengths[lengths.length - 1] || 1;
    const r = width / 2;
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      const length = Math.hypot(bx - ax, by - ay);
      const steps = Math.max(1, Math.ceil(length * 2));
      for (let s = 0; s <= steps; s++) {
        const along = lengths[i - 1] + (length * s) / steps;
        if (dash > 0 && Math.floor(along / dash) % 2 === 1) continue;
        const x = ax + ((bx - ax) * s) / steps;
        const y = ay + ((by - ay) * s) / steps;
        const time = timeAt(x, y, along / total);
        for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) {
          for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
            const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y);
            const cover = Math.max(0, Math.min(1, r + 0.5 - d));
            if (cover > 0) this.putMax(xx, yy, color, cover * alpha, time, onRoad);
          }
        }
      }
    }
  }

  /** As `put`, but a stroke's own overlapping stamps do not darken each other. */
  putMax(x, y, color, a, time, onRoad) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (this.rgba[i * 4 + 3] >= a && this.rgba[i * 4] === color[0] && this.rgba[i * 4 + 1] === color[1]) {
      if (onRoad) this.road[i] = Math.min(this.road[i], time);
      else if (this.road[i] >= 1) this.drawn[i] = Math.min(this.drawn[i], time);
      return;
    }
    this.put(x, y, color, a, time, onRoad);
  }

  fill(poly, color, alpha, timeAt) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of poly) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, Math.ceil(maxY)); y++) {
      for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(this.w - 1, Math.ceil(maxX)); x++) {
        if (inside(poly, x + 0.5, y + 0.5)) this.put(x, y, color, alpha, timeAt(x, y));
      }
    }
  }
}

/**
 * The opening's map over `rect` of the painting [x, y, w, h], spanning `west`..`east` and `south`..`north`.
 * Writes map_ink.png and map_times.png into `dir`; returns their paths, the rect, the labels (keys, points
 * and phases: 0 to 1 as the map is drawn, 1 + n through line n) and the painting with the whole map laid on
 * it (for the palette).
 */
export function buildMap(source, dir, { rect, west, east, south, north }) {
  const [rx, ry, w, h] = rect;
  const sheet = new Sheet(w, h);
  const px = ([lon, lat]) => [((lon - west) / (east - west)) * w, ((north - lat) / (north - south)) * h];
  const pts = (list) => list.map(px);
  // The map draws itself from west to east as the shot opens (times 0.05 to 0.85 of its lead).
  const sweep = (x) => 0.05 + 0.8 * Math.max(0, Math.min(1, x / w)) + 0.04 * hash(Math.floor(x / 9), 3);
  const drawn = (x) => sweep(x);
  // Seas: a cool wash, then the coast in ink.
  for (const sea of SEAS) {
    sheet.fill(pts(sea.poly), SEA, 0.4, (x) => drawn(x));
  }
  sheet.fill(pts(CYPRUS), [205, 176, 132], 0.85, (x) => drawn(x));
  // The caliph's lands in gold.
  sheet.fill(pts(CALIPH), GOLD, 0.42, (x) => drawn(x));
  sheet.stroke(pts([...CALIPH, CALIPH[0]]), 2.2, RED, (x) => drawn(x), { dash: 7, alpha: 0.85 });
  // Mountains as rows of small peaks.
  for (const range of MOUNTAINS) {
    const line = pts(range);
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = line[i - 1];
      const [bx, by] = line[i];
      const n = Math.max(1, Math.floor(Math.hypot(bx - ax, by - ay) / 13));
      for (let k = 0; k < n; k++) {
        const x = ax + ((bx - ax) * (k + 0.5)) / n;
        const y = ay + ((by - ay) * (k + 0.5)) / n + (hash(k, i) - 0.5) * 6;
        sheet.stroke([[x - 5, y + 3], [x, y - 4], [x + 5, y + 3]], 1.8, INK, () => drawn(x), { alpha: 0.85 });
      }
    }
  }
  for (const river of RIVERS) sheet.stroke(pts(river), 2.6, WATER_INK, (x) => drawn(x));
  for (const sea of SEAS) for (const coast of sea.coasts) sheet.stroke(pts(coast), 2.6, INK, (x) => drawn(x));
  sheet.stroke(pts([...CYPRUS, CYPRUS[0]]), 2.2, INK, (x) => drawn(x));
  // Towns as dots; Baghdad ringed; Alamut a small tower.
  const dot = ([x, y], r, color, time) => {
    for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) {
      for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
        const cover = Math.max(0, Math.min(1, r + 0.5 - Math.hypot(xx + 0.5 - x, yy + 0.5 - y)));
        sheet.put(xx, yy, color, cover, time);
      }
    }
  };
  for (const town of TOWNS) dot(px(town), 3.2, INK, drawn(px(town)[0]));
  const baghdad = px(BAGHDAD);
  dot(baghdad, 6.5, RED, drawn(baghdad[0]));
  dot(baghdad, 3.5, GOLD, drawn(baghdad[0]));
  const alamut = px(ALAMUT);
  sheet.stroke([[alamut[0] - 5, alamut[1] + 6], [alamut[0] - 5, alamut[1] - 5], [alamut[0] - 2, alamut[1] - 5],
    [alamut[0] - 2, alamut[1] - 2], [alamut[0] + 2, alamut[1] - 2], [alamut[0] + 2, alamut[1] - 5],
    [alamut[0] + 5, alamut[1] - 5], [alamut[0] + 5, alamut[1] + 6], [alamut[0] - 5, alamut[1] + 6]], 2.2, INK,
  () => drawn(alamut[0]));
  // A double rule round the map.
  const frame = (inset, width) => sheet.stroke([[inset, inset], [w - inset, inset], [w - inset, h - inset],
    [inset, h - inset], [inset, inset]], width, INK, (x) => drawn(x), { alpha: 0.9 });
  frame(4, 2.6);
  frame(10, 1.4);
  // Hülegü's road, drawn as the second line is read; Alamut struck through as it reaches it.
  const road = pts(ROAD);
  sheet.stroke(road, 4.2, RED, (x, y, along) => 0.02 + along * 0.9, { dash: 10, onRoad: true });
  const end = road[road.length - 1];
  const before = road[road.length - 2];
  const angle = Math.atan2(end[1] - before[1], end[0] - before[0]);
  const head = (a) => [end[0] + Math.cos(angle + a) * 11, end[1] + Math.sin(angle + a) * 11];
  sheet.stroke([head(2.6), [end[0] + Math.cos(angle) * 4, end[1] + Math.sin(angle) * 4], head(-2.6)], 3.6, RED,
    () => 0.93, { onRoad: true });
  let alamutAlong = 0;
  {
    let total = 0;
    let upTo = 0;
    for (let i = 1; i < ROAD.length; i++) {
      const length = Math.hypot(road[i][0] - road[i - 1][0], road[i][1] - road[i - 1][1]);
      total += length;
      if (i <= ROAD.findIndex(([lon, lat]) => lon === ALAMUT[0] && lat === ALAMUT[1])) upTo += length;
    }
    alamutAlong = 0.02 + (upTo / total) * 0.9;
  }
  for (const [a, b] of [[[-8, -9], [8, 8]], [[8, -9], [-8, 8]]]) {
    sheet.stroke([[alamut[0] + a[0], alamut[1] + a[1]], [alamut[0] + b[0], alamut[1] + b[1]]], 3.2, RED,
      () => alamutAlong + 0.03, { onRoad: true });
  }
  // The Mongols' ink: over the land beyond the edge, spreading from the east, in ragged fingers.
  const beyond = pts([...MONGOL_EDGE, [east + 5, 35.5], [east + 5, north + 5], [MONGOL_EDGE[0][0], north + 5]]);
  const seas = SEAS.map((sea) => pts(sea.poly));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // The ink's edge is ragged, as ink on parchment is.
      const jx = (noise(x / 23, y / 23) - 0.5) * 34 + (noise(x / 7, y / 7) - 0.5) * 8;
      const jy = (noise(x / 23 + 40, y / 23) - 0.5) * 34;
      if (!inside(beyond, x + 0.5 + jx, y + 0.5 + jy)) continue;
      if (seas.some((sea) => inside(sea, x + 0.5, y + 0.5))) continue;
      if (x < 12 || y < 12 || x > w - 12 || y > h - 12) continue;
      const fromEast = 1 - x / w;
      const north = y / h;
      const ragged = (noise(x / 38, y / 38) - 0.5) * 0.22 + (noise(x / 11, y / 11) - 0.5) * 0.06;
      sheet.wash[y * w + x] = Math.max(0.01, Math.min(0.97, fromEast * 0.92 + north * 0.12 + ragged));
    }
  }
  // Out to images.
  const ink = new Uint8ClampedArray(w * h * 4);
  const times = new Uint8ClampedArray(w * h * 4);
  const level = (t) => (t >= 1 ? 255 : Math.round(Math.max(0, Math.min(0.99, t)) * 254));
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) ink[i * 4 + c] = Math.round(sheet.rgba[i * 4 + c]);
    ink[i * 4 + 3] = Math.round(sheet.rgba[i * 4 + 3] * 255);
    times[i * 4] = level(sheet.rgba[i * 4 + 3] > 0 ? sheet.drawn[i] : 1);
    times[i * 4 + 1] = level(sheet.wash[i]);
    times[i * 4 + 2] = level(sheet.rgba[i * 4 + 3] > 0 ? sheet.road[i] : 1);
    times[i * 4 + 3] = 255;
  }
  const inkPath = join(dir, "map_ink.png");
  const timesPath = join(dir, "map_times.png");
  writePng(inkPath, w, h, ink);
  writePng(timesPath, w, h, times);
  // The painting with the whole map laid on it, the ink spread: for the shot's palette.
  const finished = new Canvas(source.width, source.height);
  finished.data.set(source.data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const j = ((ry + y) * source.width + rx + x) * 4;
      let color = [finished.data[j], finished.data[j + 1], finished.data[j + 2]];
      if (sheet.wash[i] < 1) color = color.map((v, c) => v * (1 - 0.86 + 0.86 * [0.36, 0.3, 0.27][c]));
      const a = sheet.rgba[i * 4 + 3];
      color = color.map((v, c) => v + (sheet.rgba[i * 4 + c] - v) * a);
      finished.data[j] = color[0];
      finished.data[j + 1] = color[1];
      finished.data[j + 2] = color[2];
    }
  }
  // The names, where they stand and when they appear.
  const label = (key, place, phase, offset = [0, 0]) => {
    const [x, y] = px(place);
    return { key, at: [rx + x + offset[0], ry + y + offset[1]], phase };
  };
  const labels = [
    label("MAP_EUPHRATES", [40.9, 35.9], 0.55),
    label("MAP_TIGRIS", [42.9, 37.6], 0.6),
    label("MAP_EGYPT", [29.6, 27.6], 0.6),
    label("MAP_SYRIA", [36.9, 33.0], 0.65),
    label("MAP_ARABIA", [43.5, 26.0], 0.7),
    label("MAP_CASPIAN", [51.5, 41.3], 0.75),
    label("MAP_BAGHDAD", BAGHDAD, 0.8, [0, 16]),
    label("MAP_CALIPH", [44.5, 30.6], 0.88),
    label("MAP_MONGOLS", [62.0, 42.5], 1.35),
    label("MAP_PERSIA", [56.0, 31.5], 1.6),
    label("MAP_SAMARKAND", [67.0, 39.65], 2.03, [0, -16]),
    label("1256", [63.0, 37.4], 2.25),
    label("MAP_ALAMUT", ALAMUT, 2.5, [0, -18]),
    label("MAP_HAMADAN", [48.5, 34.8], 2.82, [30, 10]),
    label("1257", [50.6, 33.3], 2.9),
  ];
  return { ink: inkPath, times: timesPath, rect, labels, finished };
}

/**
 * Ink spreading through water: over `rect`, from the `sources` (painting points, where the books lie), only
 * within `water` (polygons). No strokes and no road: only the green times. Returns as buildMap does.
 */
export function buildInk(source, dir, { rect, sources, water, name = "ink" }) {
  const [rx, ry, w, h] = rect;
  const times = new Uint8ClampedArray(w * h * 4);
  const ink = new Uint8ClampedArray(w * h * 4);
  const finished = new Canvas(source.width, source.height);
  finished.data.set(source.data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = rx + x;
      const gy = ry + y;
      const i = y * w + x;
      times[i * 4] = 255;
      times[i * 4 + 2] = 255;
      times[i * 4 + 3] = 255;
      if (!water.some((poly) => inside(poly, gx, gy))) {
        times[i * 4 + 1] = 255;
        continue;
      }
      let nearest = Infinity;
      for (const [sx, sy] of sources) nearest = Math.min(nearest, Math.hypot((gx - sx) * 0.55, gy - sy));
      const ragged = (noise(gx / 30, gy / 14) - 0.5) * 0.25;
      const t = Math.max(0.01, Math.min(0.97, nearest / 260 + ragged));
      times[i * 4 + 1] = Math.round(t * 254);
      const j = (gy * source.width + gx) * 4;
      for (let c = 0; c < 3; c++) finished.data[j + c] = finished.data[j + c] * (1 - 0.86 + 0.86 * [0.36, 0.3, 0.27][c]);
    }
  }
  const inkPath = join(dir, `${name}_ink.png`);
  const timesPath = join(dir, `${name}_times.png`);
  writePng(inkPath, w, h, ink);
  writePng(timesPath, w, h, times);
  return { ink: inkPath, times: timesPath, rect, labels: [], finished };
}
