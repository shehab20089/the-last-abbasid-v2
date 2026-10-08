// A level's far layers, far to near: the sky over the burning city, the far skyline of Baghdad,
// the nearer city and, for a level by the Tigris, the river with its far bank. Each level picks a
// look (the hour of the night it is set in); every layer is darker and cooler with distance, and
// the fires and the coming dawn light what faces them.
import { join } from "node:path";
import {
  Canvas, P, bayer, dome, fbm, fillShape, glow, hash2, haze, hex, lattice, minaret, mix, muqarnasCone, palm, pick,
  rimLight, smokeColumn,
} from "./env_lib.mjs";
import { rng } from "../lib/noise.mjs";

export const VIEW = [640, 360];

/** A parallax layer's width for scroll factor s: it must span the whole camera travel. */
export function layerWidth(scale, levelWidth) {
  return Math.ceil((scale * (levelWidth - VIEW[0]) + VIEW[0]) / 16) * 16;
}

const ramp = (...codes) => codes.map((c) => hex(c));

/**
 * The hours of the chapter. sky: bands from overhead to the horizon; far/city: silhouette ramps;
 * rim: the light catching every top edge; windows: the chance a window is lit.
 */
export const LOOKS = {
  // The Fallen Market: deep night, the city burning to the horizon.
  night: {
    seed: 0, sky: [P.night[1], P.night[2], P.night[3], P.night[4], P.glow[0], P.glow[1], P.glow[2], P.glow[3]],
    skyCurve: 1.6, moon: [118, 64, 13], stars: 70, smoke: 1, far: P.night, rim: P.glow[3], rimAmount: 0.5,
    city: [P.night[1], P.night[2], P.night[3], hex("#2a2131"), hex("#35283a"), hex("#433040")],
    cityRim: [[P.glow[3], 0.45, 0, -1], [P.glow[2], 0.35, 1, 0]], windows: 0.25, horizonFires: 7, roofFires: 7,
    haze: [P.night[3], 0.18], cityHaze: [P.night[2], 0.1],
  },
  // The Streets of Ash: later in the night, the smoke thicker and lower, the glow redder.
  smoke: {
    seed: 40, sky: [P.night[2], P.night[3], P.night[4], P.glow[0], P.glow[1], P.glow[1], P.glow[2], P.glow[3], P.glow[4]],
    skyCurve: 1.25, moon: [470, 52, 10], stars: 25, smoke: 1.45, far: P.night, rim: P.glow[4], rimAmount: 0.55,
    city: [P.night[1], P.night[2], hex("#1d1420"), hex("#2b1b24"), hex("#3a222a"), hex("#4a2b2e")],
    cityRim: [[P.glow[4], 0.5, 0, -1], [P.glow[3], 0.4, 1, 0]], windows: 0.18, horizonFires: 10, roofFires: 10,
    haze: [P.glow[0], 0.2], cityHaze: [P.glow[0], 0.12],
  },
  // The Scholars' Quarter: the last hour before dawn, the sky turning from indigo to rose.
  predawn: {
    seed: 80,
    sky: ramp("#0d0b1c", "#141230", "#1d1a3e", "#2a2349", "#3b2b52", "#523356", "#6e3d55", "#8a4a52", "#a35a4e"),
    skyCurve: 1.35, moon: [520, 96, 9], stars: 45, smoke: 0.8,
    far: ramp("#07060d", "#0c0b16", "#131122", "#1b182d", "#251f37", "#302841"),
    rim: hex("#c27a6a"), rimAmount: 0.45,
    city: ramp("#09080f", "#100e1b", "#181528", "#221d33", "#2d263e", "#3a3049"),
    cityRim: [[hex("#b06a62"), 0.4, 0, -1], [P.glow[3], 0.25, 1, 0]], windows: 0.15, horizonFires: 5, roofFires: 4,
    haze: [hex("#2a2346"), 0.2], cityHaze: [hex("#1d1a33"), 0.12],
  },
  // The Last Gate: first light. A cold grey-blue sky, the horizon gold behind the smoke.
  dawn: {
    seed: 120,
    sky: ramp("#1a2133", "#232c42", "#2f3a52", "#3e4861", "#565970", "#776c78", "#9a7f7c", "#bd927a", "#dcab7c"),
    skyCurve: 1.15, moon: null, sun: [452, 292, 15], stars: 0, smoke: 0.9,
    far: ramp("#0c0d14", "#13151f", "#1b1e2b", "#252836", "#2f3241", "#3b3d4c"),
    rim: hex("#e6b27a"), rimAmount: 0.55,
    city: ramp("#0e0f17", "#151722", "#1e202d", "#282a38", "#333444", "#403f50"),
    cityRim: [[hex("#d8a274"), 0.5, 0, -1], [hex("#a87c6c"), 0.25, 1, 0]], windows: 0.08, horizonFires: 4, roofFires: 3,
    haze: [hex("#4a4c62"), 0.22], cityHaze: [hex("#2c2e40"), 0.14],
  },
};

// --- Sky -----------------------------------------------------------------------------------------

function paintSky(look) {
  const [w, h] = VIEW;
  const c = new Canvas(w, h);
  const bands = look.sky;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    // Overhead dark, then the glow of the burning city (or the dawn) toward the horizon: a smooth
    // gradient through the look's bands, gently uneven like a real sky.
    const f = Math.pow(t, look.skyCurve) * (bands.length - 1);
    for (let x = 0; x < w; x++) {
      const wobble = (fbm(x * 0.01, y * 0.02, { seed: 2 + look.seed }) - 0.5) * 1.1;
      const k = Math.max(0, Math.min(bands.length - 1.001, f + wobble));
      const i = Math.floor(k);
      c.set(x, y, mix(bands[i], bands[i + 1], k - i));
    }
  }
  if (look.moon) {
    // A pale moon veiled by smoke.
    const [mx, my, mr] = look.moon;
    for (let y = my - mr; y <= my + mr; y++) {
      for (let x = mx - mr; x <= mx + mr; x++) {
        const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my) / mr;
        if (d > 1) continue;
        const crater = fbm(x * 0.3, y * 0.3, { seed: 4 }) > 0.62;
        c.set(x, y, d > 0.85 ? hex("#8f8a8c") : crater ? hex("#a8a2a0") : hex("#c9c2b8"));
      }
    }
    glow(c, mx, my, mr * 2.6, hex("#6a6370"), 0.35, { steps: 3 });
  }
  if (look.sun) {
    // The sun just clearing the horizon, banded and pale through the smoke.
    const [sx, sy, sr] = look.sun;
    glow(c, sx, sy, sr * 4, hex("#f0c48a"), 0.4, { steps: 4 });
    for (let y = sy - sr; y <= sy + sr; y++) {
      for (let x = sx - sr; x <= sx + sr; x++) {
        const d = Math.hypot(x + 0.5 - sx, y + 0.5 - sy) / sr;
        if (d > 1) continue;
        const band = (y - (sy - sr)) % 5 === 4 && y > sy;
        c.set(x, y, band ? hex("#e8a868") : d > 0.82 ? hex("#f6d49a") : hex("#fbe6bc"));
      }
    }
  }
  // Stars where the smoke is thin.
  const r = rng(7 + look.seed);
  for (let i = 0; i < look.stars; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h * 0.35);
    if (fbm(x * 0.02, y * 0.03, { seed: 9 }) > 0.5) continue;
    c.set(x, y, r() > 0.8 ? hex("#c8c0d6") : hex("#6e6680"));
  }
  // Drifting smoke banks across the sky, lit from below near the horizon.
  const dark = look.far[2];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(x * 0.006 + y * 0.002, y * 0.018, { seed: 12 + look.seed, octaves: 5 });
      const band = Math.sin(y * 0.035 + n * 4) * 0.5 + 0.5;
      const amount = (n * 1.4 - 0.62 + band * 0.12) * look.smoke + (look.smoke - 1) * 0.12;
      if (amount < 0.05) continue;
      const t = y / h;
      const lit = t > 0.45 ? pick(bands, Math.round(t * (bands.length - 1))) : bands[3];
      const base = c.get(x, y);
      const tone = mix(mix(P.smoke[1], dark, 0.3), lit, 0.35 + t * 0.4);
      const k = Math.min(1, amount * 1.6);
      c.set(x, y, mix(base, tone, Math.min(0.88, k * 0.95)));
    }
  }
  return c;
}

// --- Far skyline ---------------------------------------------------------------------------------

/** A crenellated round tower of the city wall. */
function wallTower(c, x, base, height, width, shades, tone) {
  fillShape(c, x - width / 2, base - height, x + width / 2, base, () => true, (px) =>
    pick(shades, tone + (px > x + width * 0.15 ? -1 : 0)));
  for (let px = Math.floor(x - width / 2); px < x + width / 2; px += 3) {
    fillShape(c, px, base - height - 2, px + 1, base - height, () => true, pick(shades, tone));
  }
}

function paintSkyline(look, levelWidth) {
  const w = layerWidth(0.12, levelWidth);
  const h = 360;
  const c = new Canvas(w, h);
  const ground = 304;
  const r = rng(31 + look.seed);
  const far = look.far;
  const tone = 2;
  // Smoke first, behind the city.
  const columns = Math.round(7 * look.smoke);
  for (let i = 0; i < columns; i++) {
    const x = 70 + i * (w / columns) + r() * 50;
    smokeColumn(c, x, ground - 10, 210 + r() * 50, 9 + r() * 5, { seed: i * 13 + 2 + look.seed, density: 0.85,
      lit: look.moon === null ? [far[3], far[4], far[5], look.rim, look.rim] : P.glow });
  }
  // A ragged line of flat roofs along the whole horizon.
  for (let x = 0; x < w; x++) {
    const block = Math.floor(x / 9);
    const roof = ground - 10 - Math.floor(hash2(block, look.seed, 5) * 12) - Math.floor(fbm(x * 0.01, 0, { seed: 6 }) * 10);
    for (let y = roof; y < h; y++) c.set(x, y, pick(far, tone));
  }
  // The city wall and its towers in front of the roofs.
  for (let x = 0; x < w; x += 1) {
    for (let y = ground - 6; y < h; y++) c.set(x, y, pick(far, tone - (y > ground + 4 ? 1 : 0)));
    if (x % 4 < 2) c.set(x, ground - 7, pick(far, tone));
  }
  for (let x = 24; x < w; x += 96 + Math.floor(r() * 30)) wallTower(c, x, ground + 2, 22, 12, far, tone);
  // Landmarks: domes with minarets, the muqarnas tomb, palm groves.
  let x = 50;
  let i = look.seed % 5;
  while (x < w - 40) {
    const kind = i % 5;
    const base = ground - 12;
    if (kind === 0 || kind === 3) {
      const rad = 12 + r() * 8;
      fillShape(c, x - rad - 4, base - 10, x + rad + 4, base, () => true, pick(far, tone));
      dome(c, x, base - 10, rad, { ramp: far, tone: tone + 1, shape: r() > 0.4 ? "pointed" : "onion", light: 0.6 });
      minaret(c, x + rad + 12, base + 2, 66 + r() * 34, 6, { ramp: far, tone: tone + 1, light: 0.6, bands: false });
    } else if (kind === 1) {
      fillShape(c, x - 11, base - 18, x + 11, base, () => true, pick(far, tone + 1));
      muqarnasCone(c, x, base - 18, 24, 46, { ramp: far, tone: tone + 1, light: 0.6 });
    } else {
      for (let p = 0; p < 4; p++) {
        palm(c, x + p * 8 - 12, ground - 2, 30 + r() * 16, { ramp: far, tone, lean: (r() - 0.5) * 0.5, seed: x + p });
      }
    }
    x += 120 + Math.floor(r() * 70);
    i += 1;
  }
  // Backlit edges: the burning horizon (or the dawn) catches every top edge.
  rimLight(c, look.rim, look.rimAmount, 0, -1);
  // Flames along the horizon at the foot of the smoke.
  for (let k = 0; k < look.horizonFires; k++) {
    const fx = 70 + k * (w / look.horizonFires) + (k * 37) % 50;
    for (let f = 0; f < 5; f++) {
      const px = fx + (f - 2) * 3 + (hash2(k, f, 3) - 0.5) * 3;
      const fh = 3 + Math.floor(hash2(k, f, 4) * 6);
      for (let yy = 0; yy < fh; yy++) {
        c.set(Math.round(px), ground - 10 - yy, yy > fh - 2 ? P.fire[3] : P.fire[4]);
      }
    }
  }
  haze(c, look.haze[0], look.haze[1]);
  return c;
}

// --- The nearer city ------------------------------------------------------------------------------

/** A courtyard house seen from the lane: mostly blank walls, a few small windows, perhaps a timber
 * balcony, a parapet and sometimes a windcatcher. */
function house(c, x, base, width, height, shades, tone, r, look, { windcatcher = false, balcony = false } = {}) {
  fillShape(c, x, base - height, x + width - 1, base, () => true, (px, py) => {
    const n = fbm(px * 0.06, py * 0.06, { seed: x });
    return pick(shades, tone + (n > 0.64 ? 1 : n < 0.33 ? -1 : 0) + (px > x + width - 3 ? -1 : 0));
  });
  for (let px = x; px < x + width - 1; px += 4) {
    fillShape(c, px, base - height - 3, px + 1, base - height, () => true, pick(shades, tone + 1));
  }
  // A few small arched windows high on the wall.
  const count = Math.max(1, Math.floor(width / 26));
  for (let k = 0; k < count; k++) {
    if (r() < 0.3) continue;
    const wx = x + Math.floor(((k + 0.5) / count) * width) - 2;
    const wy = base - height + 8 + Math.floor(r() * 10);
    const on = r() < look.windows;
    fillShape(c, wx, wy + 1, wx + 3, wy + 6, () => true, on ? P.fire[3] : shades[0]);
    c.set(wx + 1, wy, on ? P.fire[3] : shades[0]);
    c.set(wx + 2, wy, on ? P.fire[3] : shades[0]);
    if (on) glow(c, wx + 2, wy + 3, 10, P.glow[4], 0.4, { steps: 3 });
  }
  if (balcony && width > 34) {
    const bx = x + Math.floor(width * 0.45);
    const by = base - height + 18;
    lattice(c, bx, by, 14, 12, { ramp: P.wood.map((col) => mix(col, shades[2], 0.55)), tone: 2,
      glow: r() < 0.5 ? () => P.fire[2] : null });
    fillShape(c, bx - 1, by + 12, bx + 14, by + 13, () => true, pick(shades, tone + 1));
  }
  if (windcatcher) {
    const wx = x + Math.floor(width * 0.25);
    fillShape(c, wx, base - height - 20, wx + 8, base - height, () => true, pick(shades, tone));
    fillShape(c, wx + 2, base - height - 16, wx + 6, base - height - 7, () => true, shades[0]);
    fillShape(c, wx - 1, base - height - 22, wx + 9, base - height - 20, () => true, pick(shades, tone + 1));
  }
}

function paintCity(look, levelWidth) {
  const w = layerWidth(0.3, levelWidth);
  const h = 400;
  const c = new Canvas(w, h);
  const r = rng(53 + look.seed);
  const base = 392;
  const shades = look.city;
  // Smoke behind the houses.
  const columns = Math.round(7 * look.smoke);
  for (let i = 0; i < columns; i++) {
    const fx = 90 + i * (w / columns) + r() * 70;
    smokeColumn(c, fx, base - 120, 230, 14, { seed: 100 + i + look.seed, density: 0.95,
      lit: look.moon === null ? [shades[3], shades[4], shades[5], look.rim, look.rim] : P.glow });
  }
  let x = -10;
  let n = 0;
  while (x < w) {
    const width = 36 + Math.floor(r() * 44);
    const height = 60 + Math.floor(r() * 46) + (n % 4 === 0 ? 20 : 0);
    house(c, x, base, width, height, shades, 2, r, look, { windcatcher: r() < 0.3, balcony: r() < 0.35 });
    if (n % 6 === 2) {
      dome(c, x + width / 2, base - height, 13 + r() * 6, { ramp: shades, tone: 3, shape: "pointed", ribs: 5, light: 0.5 });
    }
    if (n % 9 === 5) minaret(c, x + width - 7, base - height + 2, 70 + r() * 24, 8, { ramp: shades, tone: 3, light: 0.5 });
    if (n % 7 === 3) palm(c, x + width + 4, base - 30, 70, { ramp: shades, tone: 2, lean: 0.15, seed: n });
    x += width + (r() < 0.18 ? 4 + Math.floor(r() * 8) : 0);
    n += 1;
  }
  for (const [color, amount, dx, dy] of look.cityRim) rimLight(c, color, amount, dx, dy);
  // Fires on a few roofs.
  for (let i = 0; i < look.roofFires; i++) {
    const fx = 90 + i * (w / look.roofFires) + ((i * 53) % 70);
    const fy = base - 118;
    glow(c, fx, fy, 60, P.glow[4], 0.45);
  }
  haze(c, look.cityHaze[0], look.cityHaze[1]);
  return c;
}

// --- The river ------------------------------------------------------------------------------------

/**
 * The Tigris by night: the far bank's houses, palms and fires along the top, and below them the
 * water, streaked with the fires' reflections, dark with ink and strewn with drifting pages.
 */
export function paintRiver(look, levelWidth, height) {
  const w = layerWidth(0.55, levelWidth);
  const c = new Canvas(w, height);
  const r = rng(211 + look.seed);
  const water = Math.floor(height * 0.42);
  const bank = look.far.map((col) => mix(col, look.city[2], 0.5));
  // The far bank: low houses, palms and a few fires.
  let x = -6;
  let n = 0;
  while (x < w) {
    const bw = 18 + Math.floor(r() * 30);
    const bh = 10 + Math.floor(r() * 20);
    fillShape(c, x, water - bh, x + bw, water, () => true, (px) => pick(bank, 2 + (px > x + bw - 2 ? -1 : 0)));
    if (n % 5 === 2) palm(c, x + bw + 3, water, 26 + r() * 10, { ramp: bank, tone: 2, lean: 0.2, seed: n });
    if (n % 7 === 4) dome(c, x + bw / 2, water - bh, 7, { ramp: bank, tone: 3, shape: "pointed", light: 0.5 });
    x += bw + (r() < 0.2 ? 6 : 0);
    n += 1;
  }
  rimLight(c, look.rim, 0.4, 0, -1);
  const fires = [];
  for (let k = 0; k < 9; k++) fires.push(40 + k * (w / 9) + r() * 60);
  for (const fx of fires) {
    glow(c, fx, water - 14, 24, P.glow[4], 0.45, { steps: 3 });
    for (let f = 0; f < 4; f++) {
      const fh = 2 + Math.floor(hash2(fx, f, 5) * 5);
      for (let yy = 0; yy < fh; yy++) c.set(Math.round(fx + f * 2 - 3), water - 12 - yy, yy > fh - 2 ? P.fire[3] : P.fire[4]);
    }
  }
  // The water: dark, with long broken reflections under each fire and the paler sky between.
  const deep = ramp("#05050a", "#0a0a12", "#10101b", "#181726");
  for (let y = water; y < height; y++) {
    const t = (y - water) / (height - water);
    for (let px = 0; px < w; px++) {
      const ripple = fbm(px * 0.05, y * 0.6, { seed: 7 }) - 0.5;
      let color = pick(deep, 3 - t * 3 + ripple * 2);
      // Ink drifting in slicks.
      if (fbm(px * 0.012, y * 0.1, { seed: 19 }) > 0.62) color = mix(color, hex("#040406"), 0.6);
      // Each fire's reflection: short broken dashes that waver, fading as the water comes nearer.
      const near = fires.reduce((best, fx) => Math.min(best, Math.abs(px - fx + Math.sin(y * 0.9 + fx) * 2)), 999);
      const dash = fbm(px * 0.25, y * 0.9, { seed: 23 }) > 0.5;
      if (near < 2 + t * 4 && dash && (y - water) % 2 === 0) {
        color = mix(color, near < 1.5 ? P.fire[4] : P.glow[3], 0.7 - t * 0.45);
      } else if (ripple > 0.3 && y % 3 === 0) {
        color = mix(color, look.sky[look.sky.length - 3], 0.3);
      }
      c.set(px, y, color);
    }
  }
  // Pages adrift on the current.
  for (let k = 0; k < Math.floor(w / 26); k++) {
    const px = Math.floor(r() * w);
    const py = water + 4 + Math.floor(r() * (height - water - 8));
    const pw = 2 + Math.floor(r() * 3);
    fillShape(c, px, py, px + pw, py, () => true, mix(P.parchment[2], deep[1], 0.35 + r() * 0.3));
    if (r() < 0.5) c.set(px + 1, py - 1, mix(P.parchment[3], deep[1], 0.4));
  }
  return c;
}

/**
 * The distant layer from the level's concept painting: its crop resampled to the layer's size
 * (wide enough for the slow parallax), the bottom fading into the dark of the city's foot, and its
 * palette saved for the nearer layers.
 */
async function buildDistant({ OUT, REVIEW, level }) {
  const { paintedLayer } = await import("./painted.mjs");
  const { writeFileSync } = await import("node:fs");
  const p = level.painting;
  const width = layerWidth(p.scroll ?? 0.06, level.cols * 16);
  const height = 360;
  const body = Math.round(height * (p.fill ?? 0.88));
  const { canvas, palette } = paintedLayer(join(process.cwd(), p.source), { crop: p.crop, width, height: body,
    colors: p.colors ?? 96, patches: p.patches ?? [] });
  const layer = new Canvas(width, height);
  layer.blit(canvas, 0, 0);
  // Below the painting: its last row, darkening into the shadowed foot of the city.
  for (let y = body; y < height; y++) {
    const k = (y - body) / Math.max(1, height - body);
    for (let x = 0; x < width; x++) {
      layer.set(x, y, mix(canvas.get(x, body - 1), [10, 8, 12, 255], Math.min(1, 0.35 + k)));
    }
  }
  layer.save(join(OUT, "distant.png"));
  writeFileSync(join(OUT, "palette.json"), JSON.stringify(palette));
  layer.crop(0, 0, Math.min(640, width), height).scaled(2).save(join(REVIEW, `${level.id}_distant.png`));
  console.log(`distant ${width}x${height} (${palette.length} colours)`);
}

export async function buildLayers({ OUT, REVIEW, want, level }) {
  const look = LOOKS[level.look ?? "night"];
  const width = level.cols * 16;
  const tag = level.id;
  if (level.painting && want("distant")) await buildDistant({ OUT, REVIEW, level });
  if (want("sky")) {
    const sky = paintSky(look);
    sky.save(join(OUT, "sky.png"));
    sky.scaled(2).save(join(REVIEW, `${tag}_sky.png`));
    console.log("sky");
  }
  if (want("skyline")) {
    const skyline = paintSkyline(look, width);
    skyline.save(join(OUT, "skyline.png"));
    skyline.crop(0, 0, 640, 360).scaled(2).save(join(REVIEW, `${tag}_skyline.png`));
    console.log(`skyline ${skyline.width}`);
  }
  if (want("city")) {
    const city = paintCity(look, width);
    city.save(join(OUT, "city.png"));
    city.crop(0, 0, 640, 400).scaled(2).save(join(REVIEW, `${tag}_city.png`));
    console.log(`city ${city.width}`);
  }
  if (want("river") && level.river) {
    const river = paintRiver(look, width, level.river.height);
    river.save(join(OUT, "river.png"));
    river.crop(0, 0, 640, river.height).scaled(2).save(join(REVIEW, `${tag}_river.png`));
    console.log(`river ${river.width}`);
  }
  if (want("preview")) {
    const { composite } = await import("./composite.mjs");
    const load = (name) => Canvas.fromPng(join(OUT, name));
    const layers = [
      { canvas: load("sky.png"), scale: [0, 0], at: [0, 0] },
      { canvas: load("skyline.png"), scale: [0.12, 0.05], at: [0, 40] },
      { canvas: load("city.png"), scale: [0.3, 0.15], at: [0, 70] },
    ];
    for (const camX of [0, 2000]) {
      composite(layers, [camX, 184]).scaled(2).save(join(REVIEW, `${tag}_preview_${camX}.png`));
    }
    console.log("preview");
  }
}
