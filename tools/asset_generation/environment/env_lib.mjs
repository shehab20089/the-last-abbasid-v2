// Painting primitives for Baghdad's architecture: fired-brick walls, plaster, pointed arches,
// domes (ribbed, onion and the stepped muqarnas cone), minarets, lattice screens, awnings, beams,
// date palms, smoke and firelight. Everything writes whole pixels from the master palette; depth
// comes from choosing darker, cooler ramps for distant layers.
import { Canvas, hex, mix } from "../lib/canvas.mjs";
import { P } from "../lib/palette.mjs";
import { bayer, fbm, hash2, valueNoise } from "../lib/noise.mjs";

export { Canvas, hex, mix, P, bayer, fbm, hash2, valueNoise };

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const pick = (ramp, i) => ramp[clamp(Math.round(i), 0, ramp.length - 1)];

/** Fills a shape given by a predicate over pixel centres. */
export function fillShape(c, x0, y0, x1, y1, inside, color) {
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      if (inside(x + 0.5, y + 0.5)) c.set(x, y, typeof color === "function" ? color(x, y) : color);
    }
  }
}

/** True inside a pointed (two-centred) arch: a rectangle below springY and two arcs above. */
export function inPointedArch(px, py, cx, springY, halfWidth, rise, baseY) {
  if (py > baseY || px < cx - halfWidth || px > cx + halfWidth) return false;
  if (py >= springY) return true;
  // Each arc's centre sits inside the opposite jamb so the two meet at the apex.
  const apexY = springY - rise;
  const r = (halfWidth * halfWidth + rise * rise) / (2 * halfWidth);
  const leftCentre = cx - halfWidth + r;
  const rightCentre = cx + halfWidth - r;
  if (py < apexY) return false;
  const dy = py - springY;
  const inLeft = (px - leftCentre) ** 2 + dy * dy <= r * r;
  const inRight = (px - rightCentre) ** 2 + dy * dy <= r * r;
  return px <= cx ? inLeft : inRight;
}

/**
 * A fired-brick wall over a rectangle: running bond, each brick a slightly different tone,
 * mortar lines, light from above, scattered damage and soot climbing from below or above. Given a
 * `relief` (relief.mjs), it lays the bricks' faces at `depth`, the mortar a little behind them and the
 * chipped bricks sunk, so a grazing light picks out the courses. A `calm` wall varies less from brick to brick, so
 * a great sheet of it reads by its big shapes and its light rather than as noise.
 */
export function brickWall(c, x0, y0, w, h, { ramp = P.brick, base = 3, seed = 1, brickW = 8, brickH = 4,
  soot = 0, sootFrom = "top", damage = 0.04, light = 0.0, mortar = null, relief = null, depth = 0, joint = 0.8,
  calm = false } = {}) {
  const mortarColor = mortar ?? ramp[Math.max(0, base - 2)];
  for (let y = y0; y < y0 + h; y++) {
    const row = Math.floor((y - y0) / brickH);
    const inRow = (y - y0) % brickH;
    for (let x = x0; x < x0 + w; x++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      const col = Math.floor((x - x0 + offset) / brickW);
      const inCol = (x - x0 + offset) % brickW;
      const odd = hash2(col, row, seed);
      let tone = base + (odd < (calm ? 0.12 : 0.3) ? -1 : odd > (calm ? 0.94 : 0.85) ? 1 : 0);
      if (inRow === 0 || inCol === 0) {
        c.set(x, y, mortarColor);
        relief?.set(x, y, depth - joint);
        continue;
      }
      if (inRow === 1 && light > 0) tone += 1; // the lit top face of each brick
      if (inRow === brickH - 1) tone -= 1;
      // Damage: chipped bricks show darker hollows.
      const chipped = hash2(col, row, seed + 7) < damage;
      if (chipped) tone -= 2;
      relief?.set(x, y, depth + (chipped ? -1.4 : (hash2(col, row, seed + 11) - 0.5) * 0.4));
      // Soot from fire.
      const fy = sootFrom === "top" ? (y - y0) / h : 1 - (y - y0) / h;
      const sootAmount = soot * (1 - fy) * (0.6 + 0.6 * fbm(x * 0.05, y * 0.08, { seed: seed + 3, octaves: 2 }));
      if (sootAmount > 0.5) tone -= sootAmount > 0.8 ? 2 : 1;
      c.set(x, y, pick(ramp, tone));
    }
  }
}

/** A plastered surface: mostly even, with sparse pitting, water stains and a grimy base. Given a `relief`,
 * plaster that has fallen away (`fallen`, the share of the wall) shows the brick behind it, sunk a pixel. */
export function plasterWall(c, x0, y0, w, h, { ramp = P.plaster, base = 3, seed = 2, stain = 0.4, relief = null,
  depth = 0, fallen = 0 } = {}) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (relief && fallen > 0) {
        // Where the plaster has come away, in ragged patches: the brick behind it.
        const bare = fbm(x * 0.06, y * 0.09, { seed: seed + 21, octaves: 3 });
        if (bare > 1 - fallen) {
          const row = Math.floor(y / 4);
          const inRow = y % 4;
          const inCol = (x + (row % 2) * 4) % 8;
          const edge = bare < 1 - fallen + 0.025;
          // The brick behind is warmer and lighter than the grime on the plaster around it.
          c.set(x, y, edge ? pick(ramp, base - 2) : inRow === 0 || inCol === 0 ? P.brick[2] : pick(P.brick, base + 1 +
            (hash2(Math.floor((x + (row % 2) * 4) / 8), row, seed) > 0.7 ? 1 : 0)));
          relief.set(x, y, depth - (edge ? 0.6 : inRow === 0 || inCol === 0 ? 1.8 : 1.1));
          continue;
        }
        relief.set(x, y, depth);
      }
      const n = fbm(x * 0.045, y * 0.045, { seed, octaves: 3 });
      let tone = base;
      // Broad, faint unevenness only where the noise is strongest (on a street with relief, calmer still: the
      // light does the modelling, and no blotches pattern the wall).
      if (relief) {
        if (n < 0.2) tone -= 1;
        else if (n > 0.78) tone += 1;
      } else if (n < 0.3) tone -= 1;
      else if (n > 0.7 && bayer(x, y) < 0.5) tone += 1;
      // Pitting and chips.
      if (hash2(x, y, seed) < 0.012) tone -= 1;
      // Rain streaks running down from the parapet.
      const streak = fbm(x * 0.5, 0, { seed: seed + 3 });
      if (streak > 0.72 && (y - y0) < h * 0.35 * (1 + stain)) tone -= 1;
      // A grimy band near the street.
      if ((y - y0) / h > 0.88 && fbm(x * 0.12, y * 0.4, { seed: seed + 5 }) < 0.55) tone -= 1;
      c.set(x, y, pick(ramp, tone));
    }
  }
}
/** A pointed archway: its opening filled (shadowed interior or a fill function) and a brick ring. */
export function archway(c, cx, baseY, width, height, { ring = 2, ringRamp = P.brick, ringTone = 4,
  interior = null, seed = 4 } = {}) {
  const half = width / 2;
  const rise = half * 0.9;
  const springY = baseY - height + rise;
  const inOuter = (px, py) => inPointedArch(px, py, cx, springY, half + ring, rise + ring, baseY);
  const inInner = (px, py) => inPointedArch(px, py, cx, springY, half, rise, baseY);
  fillShape(c, cx - half - ring - 1, baseY - height - ring - 1, cx + half + ring + 1, baseY, (px, py) =>
    inOuter(px, py) && !inInner(px, py), (x, y) => {
    // Voussoirs: alternate tones radially so the ring reads as cut brick.
    const angle = Math.atan2(y - springY, x - cx);
    const step = Math.floor((angle + Math.PI) * 9);
    const tone = ringTone + (step % 2 === 0 ? 0 : -1) + (y < springY - rise * 0.5 && x > cx ? 1 : 0);
    return pick(ringRamp, tone + (hash2(step, 1, seed) < 0.2 ? -1 : 0));
  });
  fillShape(c, cx - half, baseY - height, cx + half, baseY, inInner, (x, y) => {
    if (interior) return interior(x, y);
    const depth = (y - (baseY - height)) / height;
    return depth < 0.25 ? P.night[1] : P.night[0];
  });
}

/** A dome on a drum: ribbed or plain, hemispherical, onion or pointed. Given a `relief`, it swells out from
 * `depth` as a dome does (each course a circle about its axis), so the street's light models it; its painted
 * shading is then kept light. */
export function dome(c, cx, baseY, radius, { ramp = P.brick, tone = 3, shape = "pointed", ribs = 0,
  tile = null, light = -0.4, finial = true, relief = null, depth = 0 } = {}) {
  if (relief) light *= 0.35;
  const h = shape === "onion" ? radius * 1.5 : shape === "pointed" ? radius * 1.25 : radius;
  const profileAt = (t) => {
    // t: 0 at the base, 1 at the top. Returns the half-width.
    if (shape === "onion") return radius * Math.sin(Math.PI * (0.18 + t * 0.82)) * (1.12 - t * 0.12) * (1 - t ** 3);
    if (shape === "pointed") return radius * Math.sqrt(Math.max(0, 1 - t ** 1.6)) * (1 - t * 0.15);
    return radius * Math.sqrt(Math.max(0, 1 - t * t));
  };
  for (let y = Math.floor(baseY - h); y <= baseY; y++) {
    const t = (baseY - y - 0.5) / h;
    if (t < 0 || t > 1) continue;
    const half = profileAt(t);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / Math.max(1, half);
      if (Math.abs(u) > 1) continue;
      let shade = -u * light + (t - 0.5) * 0.2;
      let k = tone + (shade > 0.35 ? 1 : shade < -0.35 ? -1 : 0);
      if (ribs > 0) {
        const rib = Math.abs(Math.sin(Math.asin(clamp(u, -1, 1)) * ribs));
        if (rib < 0.18) k += 1;
      }
      const ramp2 = tile && t > 0.05 ? tile : ramp;
      c.set(x, y, pick(ramp2, k));
      relief?.set(x, y, depth + Math.sqrt(Math.max(0, half * half - (x + 0.5 - cx) ** 2)) * 0.6);
    }
  }
  if (finial) {
    const top = Math.floor(baseY - h);
    c.set(Math.floor(cx), top - 1, pick(P.gold, 2));
    c.set(Math.floor(cx), top - 2, pick(P.gold, 3));
    c.set(Math.floor(cx), top - 3, pick(P.gold, 2));
  }
  return h;
}

/** The stepped muqarnas cone of a tomb (like Sitt Zumurrud Khatun's), on an octagonal drum. */
export function muqarnasCone(c, cx, baseY, width, height, { ramp = P.brick, tone = 3, light = -0.5 } = {}) {
  const tiers = Math.floor(height / 5);
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const y1 = baseY - Math.floor(t0 * height);
    const y0 = baseY - Math.floor(((i + 1) / tiers) * height);
    const halfBottom = (width / 2) * (1 - t0 * 0.92);
    for (let y = y0; y < y1; y++) {
      const ty = (y1 - y) / Math.max(1, y1 - y0);
      const half = halfBottom * (1 - ty * 0.06);
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        const u = (x + 0.5 - cx) / Math.max(1, half);
        if (Math.abs(u) > 1) continue;
        // Each tier is a row of small niches: dark hollows with lit lips.
        const cell = Math.floor((u + 1) * (6 - i * 0.3));
        const inCell = ((u + 1) * (6 - i * 0.3)) % 1;
        let k = tone + (-u * light > 0.3 ? 1 : -u * light < -0.3 ? -1 : 0);
        if (ty < 0.3) k += 1;
        else if (inCell > 0.2 && inCell < 0.8 && ty > 0.35) k -= 1;
        void cell;
        c.set(x, y, pick(ramp, k));
      }
    }
  }
  c.set(Math.floor(cx), baseY - height - 1, pick(P.gold, 3));
}

/** A minaret: a tapering cylinder with a balcony and a small cap. Returns its top. */
export function minaret(c, cx, baseY, height, width, { ramp = P.brick, tone = 3, light = -0.5,
  bands = true } = {}) {
  const top = baseY - height;
  for (let y = top; y <= baseY; y++) {
    const t = (baseY - y) / height;
    const half = (width / 2) * (1 - t * 0.25);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half;
      if (Math.abs(u) > 1) continue;
      let k = tone + (-u * light > 0.3 ? 1 : -u * light < -0.4 ? -1 : 0);
      if (bands && Math.floor(y / 6) % 4 === 0) k += hash2(Math.floor(x / 2), Math.floor(y / 2), 3) > 0.5 ? 0 : -1;
      c.set(x, y, pick(ramp, k));
    }
  }
  // Balcony (sharafa) two thirds up, and the lantern cap.
  const balcony = Math.floor(baseY - height * 0.72);
  const bh = Math.max(2, Math.round(width * 0.22));
  for (let y = balcony; y < balcony + bh; y++) {
    const half = width * 0.72;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half;
      c.set(x, y, pick(ramp, tone + (y === balcony ? 1 : -1) + (u > 0.4 ? -1 : 0)));
    }
  }
  dome(c, cx, top + 1, width * 0.42, { ramp, tone, shape: "pointed", light, finial: true });
  return top;
}

/** A date palm: a ringed trunk leaning a little and a crown of drooping fronds. */
export function palm(c, x, baseY, height, { ramp = P.night, tone = 2, lean = 0.12, seed = 5, fronds = 9 } = {}) {
  let px = x;
  const topY = baseY - height;
  for (let y = baseY; y > topY; y--) {
    const t = (baseY - y) / height;
    px = x + lean * height * t * t;
    const half = 1.6 - t * 0.5;
    for (let xx = Math.floor(px - half); xx <= Math.ceil(px + half); xx++) {
      c.set(xx, y, pick(ramp, tone + ((y % 3 === 0) ? -1 : 0)));
    }
  }
  const crownX = px;
  for (let f = 0; f < fronds; f++) {
    const angle = -Math.PI / 2 + (f / (fronds - 1) - 0.5) * Math.PI * 1.15 + (hash2(f, 0, seed) - 0.5) * 0.3;
    const len = height * (0.32 + hash2(f, 1, seed) * 0.12);
    for (let s = 0; s < len; s += 0.5) {
      const droop = (s / len) ** 2 * len * 0.55;
      const fx = crownX + Math.cos(angle) * s;
      const fy = topY + Math.sin(angle) * s + droop;
      c.set(Math.round(fx), Math.round(fy), pick(ramp, tone + (s > len * 0.6 ? -1 : 0)));
      // Leaflets hanging from the frond.
      if (s > 2 && Math.floor(s * 2) % 2 === 0) {
        const leaf = 1 + Math.floor((1 - s / len) * 2.5);
        for (let l = 1; l <= leaf; l++) c.set(Math.round(fx), Math.round(fy) + l, pick(ramp, tone - 1));
      }
    }
  }
}

/** A mashrabiya lattice: turned wooden spindles in a grid, lit from inside or dark. */
export function lattice(c, x0, y0, w, h, { ramp = P.wood, tone = 3, glow = null, frame = true } = {}) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const lx = x - x0;
      const ly = y - y0;
      const border = frame && (lx === 0 || ly === 0 || lx === w - 1 || ly === h - 1);
      const bar = lx % 3 === 0 || ly % 3 === 0;
      if (border) c.set(x, y, pick(ramp, tone + 1));
      else if (bar) c.set(x, y, pick(ramp, tone + ((lx + ly) % 6 === 0 ? 1 : 0)));
      else c.set(x, y, glow ? glow(x, y) : P.night[0]);
    }
  }
}

/** A cloth awning sagging between two points, striped, with a scalloped or torn edge. Given a `relief`, it stands
 * out from the wall from `out[0]` where it is fixed to `out[1]` at its hem, so it shades what is under it. */
export function awning(c, x0, y0, w, h, { colors = [P.awning, P.linen], stripe = 4, torn = 0, seed = 6,
  slope = 0.25, relief = null, out = [2, 14] } = {}) {
  for (let x = x0; x < x0 + w; x++) {
    const t = (x - x0) / w;
    const sag = Math.sin(t * Math.PI) * h * 0.18;
    const top = y0 + t * h * slope;
    const scallop = Math.abs(Math.sin(((x - x0) / 6) * Math.PI)) * 2;
    let bottom = y0 + h + sag - scallop;
    if (torn > 0) {
      const tear = fbm(x * 0.15, 0, { seed });
      if (tear < torn) bottom = top + (bottom - top) * (tear / torn) * 0.7;
    }
    for (let y = Math.floor(top); y <= bottom; y++) {
      const ramp = colors[Math.floor((x - x0) / stripe) % colors.length];
      const fy = (y - top) / Math.max(1, bottom - top);
      let k = ramp.length - 2;
      if (fy > 0.75) k -= 1;
      if ((x - x0) % stripe === 0) k -= 1;
      if (fy < 0.12) k += 1;
      c.set(x, y, pick(ramp, k));
      relief?.set(x, y, out[0] + (out[1] - out[0]) * fy);
    }
  }
}

/** A heavy timber: a plank or beam with grain and an outline. */
export function beam(c, x0, y0, w, h, { ramp = P.wood, tone = 3, seed = 8 } = {}) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const edge = y === y0 ? 1 : y === y0 + h - 1 ? -2 : 0;
      const grain = valueNoise(x * 0.25, y * 1.3, seed) > 0.62 ? -1 : 0;
      c.set(x, y, pick(ramp, tone + edge + grain));
    }
  }
}

/** Lays `color` over a pixel with `amount` opacity: over paint it blends, over nothing it leaves a
 * translucent pixel (so a layer's smoke shows what lies behind it). */
export function over(c, x, y, color, amount) {
  if (amount <= 0) return;
  const k = Math.min(1, amount);
  const a = c.alpha(x, y);
  if (a === 0) {
    c.set(x, y, [color[0], color[1], color[2], Math.round(255 * k)]);
    return;
  }
  const base = c.get(x, y);
  const out = mix(base, color, k);
  out[3] = Math.max(a, Math.round(255 * k));
  c.set(x, y, out);
}

/**
 * A column of smoke rising from a fire: billowing puffs that swell and darken as they climb,
 * their undersides lit orange near the flames, thinning smoothly toward the top.
 */
export function smokeColumn(c, x, baseY, height, width, { seed = 9, ramp = P.smoke, lit = P.glow,
  drift = 0.16, density = 1, puffs = 0 } = {}) {
  puffs = puffs || Math.max(12, Math.round(height / 7));
  const shapes = [];
  for (let i = 0; i < puffs; i++) {
    const t = i / (puffs - 1);
    const wobble = Math.sin(t * 6 + seed) * width * 0.45 + (hash2(i, 3, seed) - 0.5) * width * 0.6;
    shapes.push({
      t,
      x: x + drift * height * t * t + wobble,
      y: baseY - t * height,
      r: width * (0.55 + t * 1.9) * (0.8 + hash2(i, 7, seed) * 0.4),
    });
  }
  // Paint the highest (oldest) puffs first so the newer, lower ones overlap them.
  for (const s of shapes.reverse()) {
    for (let yy = Math.floor(s.y - s.r); yy <= Math.ceil(s.y + s.r); yy++) {
      for (let xx = Math.floor(s.x - s.r); xx <= Math.ceil(s.x + s.r); xx++) {
        const dx = xx + 0.5 - s.x;
        const dy = yy + 0.5 - s.y;
        const n = fbm(xx * 0.07, yy * 0.07, { seed: seed + 1, octaves: 3 });
        const d = Math.hypot(dx, dy * 1.1) / s.r + (n - 0.5) * 0.55;
        if (d > 1) continue;
        // Thin out toward the top of the column and at each puff's soft rim.
        const thin = s.t * 0.9 + Math.max(0, d - 0.55) * 1.2 + (1 - density);
        const opacity = 1 - Math.max(0, Math.min(1, (thin - 0.4) * 1.05));
        if (opacity <= 0.02) continue;
        // Light from below: the lower edge of a low puff catches the fire.
        const under = (dy / s.r) * 0.8 - (dx / s.r) * 0.2;
        let color;
        const heat = (1 - s.t * 4) + under * 0.6 + (n - 0.5) * 0.6;
        if (heat > 0.95) color = pick(lit, heat > 1.25 ? 4 : 3);
        else if (heat > 0.6) color = pick(lit, 1);
        else color = pick(ramp, 2 + (under < -0.4 ? -1 : 0) + (n > 0.64 ? 1 : 0) - (s.t > 0.6 ? 1 : 0));
        over(c, xx, yy, color, opacity);
      }
    }
  }
}

/** Blends a soft radial glow of `color` over what is already painted (firelight on walls). */
export function glow(c, x, y, radius, color, strength = 0.5, { steps = 4 } = {}) {
  for (let yy = Math.floor(y - radius); yy <= y + radius; yy++) {
    for (let xx = Math.floor(x - radius); xx <= x + radius; xx++) {
      if (c.alpha(xx, yy) === 0) continue;
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y) / radius;
      if (d > 1) continue;
      // A smooth falloff, brightest at the heart (steps is kept for callers; light is continuous).
      void steps;
      const fall = Math.pow(1 - d, 1.7);
      const base = c.get(xx, yy);
      c.set(xx, yy, mix(base, [...color.slice(0, 3), base[3]], fall * strength));
    }
  }
}

/** Darkens toward a colour with distance-style haze, keeping alpha. */
export function haze(c, color, amount) {
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (c.alpha(x, y) === 0) continue;
      c.set(x, y, mix(c.get(x, y), [...color.slice(0, 3), c.alpha(x, y)], amount));
    }
  }
}

/** Adds a 1-px rim of `color` on the edges of solid shapes that face `dx` (translucent smoke and
 * haze neither catch nor cast it). */
export function rimLight(c, color, amount, dx = -1, dy = 0) {
  const marks = [];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (c.alpha(x, y) < 250) continue;
      if (c.alpha(x + dx, y + dy) < 128) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) c.set(x, y, mix(c.get(x, y), color, amount));
}

/** A rectangular window: dark, or lit from inside with a warm glow and a lattice. */
export function windowOpening(c, x, y, w, h, { lit = false, arched = true, seed = 10 } = {}) {
  const fill = (xx, yy) => {
    if (!lit) return P.night[0];
    const n = hash2(Math.floor(xx / 2), Math.floor(yy / 2), seed);
    return n > 0.5 ? P.fire[3] : P.fire[2];
  };
  if (arched) archway(c, x + w / 2, y + h, w, h, { ring: 1, interior: fill, ringTone: 4 });
  else fillShape(c, x, y, x + w - 1, y + h - 1, () => true, fill);
}
