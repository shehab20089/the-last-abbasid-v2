// Relief for the street-side facades: how far each painted pixel stands out from its wall (+) or sinks into it
// (-), in pixels, kept beside the colour; and the light that relief catches. The painter writes depth where the
// architecture has it (a door's recess, a window's reveal, a cornice, a balcony on its brackets, an awning, the
// mortar between bricks); everything else lies on its wall at 0. The light then comes as it would at night in a
// burning street: a faint cool sky from above, which a balcony or a lintel shuts out of what lies under it; the
// street's fires and lanterns, each a warm light standing out in the street, which lights the faces turned toward
// it and is shut out of what lies behind a projection; recesses dark where they are deep and close under a rim.
// What burns or glows (fire, a lit window) keeps its own colour. The colours of the paint are the surfaces'
// own; the light is multiplied into them.
import { P, fbm, hex, mix } from "./env_lib.mjs";

export class Relief {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.depth = new Float32Array(width * height);
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.depth[y * this.width + x];
  }

  set(x, y, d) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.depth[y * this.width + x] = d;
  }

  /** Sets the depth over a shape (a predicate over pixel centres), a value or a function of (x, y). */
  fill(x0, y0, x1, y1, inside, d) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        if (inside(x + 0.5, y + 0.5)) this.set(x, y, typeof d === "function" ? d(x, y) : d);
      }
    }
  }

  /** A rectangle at a depth, inclusive. */
  rect(x0, y0, x1, y1, d) {
    this.fill(x0, y0, x1, y1, () => true, d);
  }

  /** The depths of a region as they are now, read back as (x, y) relative to it (what stood behind a ruin). */
  copy(x0, y0, w, h) {
    const kept = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) kept[y * w + x] = this.get(x0 + x, y0 + y);
    return (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : kept[y * w + x]);
  }
}

/** A colour as linear light (0..1 per channel). */
export const linear = (rgb) => rgb.slice(0, 3).map((v) => (v / 255) ** 2.2);
export const display = (lin) => lin.map((v) => Math.round(255 * Math.min(1, Math.max(0, v)) ** (1 / 2.2)));

/** The colours that are themselves light (fire, embers, a lit window's glow): never darkened. */
export function emissiveSet() {
  const set = new Set();
  for (const ramp of [P.fire, P.glow]) {
    for (const rgb of ramp) set.add((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]);
  }
  return set;
}

/**
 * Lights the painted street from its relief.
 * - `ambient`: the night sky's colour and strength (it reaches every face, less where deep or overhung).
 * - `lights`: warm lights standing in the street: { x, y, z (how far before the wall), radius, color, strength }.
 * - `key`: the hour's low sun, if it has one: { dir (toward it), color, strength, steps }: it rakes along the street,
 *   lighting the faces turned to it and laying long shadows from whatever stands out (a tower across the wall).
 * - `haze`: how much the highest storeys sink into the night's tint (0 at the street, `haze.top` at the top); or, given
 *   `haze.veil` (a function of the canvas row), that much on each row (a facade or the ground, placed in the street).
 */
export function lightRelief(c, relief, { ambient, lights = [], key = null, haze = { tint: P.night[1], top: 0.3, street: 0.1 } }) {
  const W = c.width;
  const H = c.height;
  const D = relief.depth;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : D[y * W + x]);
  const emissive = emissiveSet();
  const amb = linear(ambient.color).map((v) => v * ambient.strength);
  const lightList = lights.map((l) => ({ ...l, lin: linear(l.color).map((v) => v * l.strength) }));
  // Each pixel's light, summed over the sources.
  const light = new Float32Array(W * H * 3);
  const solid = (x, y) => c.alpha(x, y) > 0;

  // The sky: from above and a little behind the left shoulder, standing well out from the wall. It lights faces
  // turned up (the top of a cornice, a sill, a coping) and leaves those turned down (their undersides) to the
  // little that is everywhere.
  const SKY = { dx: -0.28, dy: -1, rise: 0.85, steps: 22 };
  const skyDir = SKY_DIR;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      const d = at(x, y);
      // The face's tilt, from the relief around it (clamped: a step of depth is an edge, not a cliff).
      const gx = Math.max(-2.5, Math.min(2.5, (at(x + 1, y) - at(x - 1, y)) * 0.5));
      const gy = Math.max(-2.5, Math.min(2.5, (at(x, y + 1) - at(x, y - 1)) * 0.5));
      const n = [-gx, -gy, 1];
      const len = Math.hypot(n[0], n[1], n[2]);
      n[0] /= len; n[1] /= len; n[2] /= len;
      // Occlusion: how far the relief around stands above this pixel (a recess darkens near its rim).
      let occ = 0;
      for (const [ox, oy, w] of OCCLUSION_TAPS) {
        const rise = at(x + ox, y + oy) - d;
        if (rise > 0) occ += Math.min(rise, 6) * w;
      }
      const ao = Math.max(0.25, 1 - occ);
      // Sky shadow: what stands out above and before this pixel shuts the sky from it.
      let sky = 1;
      for (let s = 1; s <= SKY.steps; s++) {
        const qx = Math.round(x + SKY.dx * s);
        const qy = Math.round(y + SKY.dy * s);
        const over = at(qx, qy) - (d + SKY.rise * s);
        if (over > 0) sky = Math.min(sky, Math.max(0.35, 1 - over * 0.25));
      }
      // Faces turned up catch the sky; those turned down, only what is everywhere.
      const lambert = Math.max(0, n[0] * skyDir[0] + n[1] * skyDir[1] + n[2] * skyDir[2]);
      const k = ao * (0.3 + 0.95 * lambert * sky);
      const i = (y * W + x) * 3;
      light[i] = amb[0] * k;
      light[i + 1] = amb[1] * k;
      light[i + 2] = amb[2] * k;
    }
  }

  // The hour's low sun: a far light raking along the street, its shadows long.
  if (key) {
    const len = Math.hypot(key.dir[0], key.dir[1], key.dir[2]);
    const kd = key.dir.map((v) => v / len);
    const flat = Math.hypot(kd[0], kd[1]);
    const sx = kd[0] / flat;
    const sy = kd[1] / flat;
    const rise = kd[2] / flat;
    const kl = linear(key.color).map((v) => v * key.strength);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!solid(x, y)) continue;
        const d = at(x, y);
        const gx = Math.max(-2.5, Math.min(2.5, (at(x + 1, y) - at(x - 1, y)) * 0.5));
        const gy = Math.max(-2.5, Math.min(2.5, (at(x, y + 1) - at(x, y - 1)) * 0.5));
        const nl = Math.hypot(gx, gy, 1);
        const lambert = Math.max(0, (-gx * kd[0] - gy * kd[1] + kd[2]) / nl);
        if (lambert <= 0) continue;
        let vis = 1;
        for (let s2 = 1; s2 <= (key.steps ?? 60); s2++) {
          const over = at(Math.round(x + sx * s2), Math.round(y + sy * s2)) - (d + rise * s2);
          if (over > 0.3) {
            vis = Math.min(vis, Math.max(0.1, 1 - (over - 0.3) * 0.4));
            if (vis <= 0.1) break;
          }
        }
        const k = lambert * vis;
        const i = (y * W + x) * 3;
        light[i] += kl[0] * k;
        light[i + 1] += kl[1] * k;
        light[i + 2] += kl[2] * k;
      }
    }
  }

  // The street's lights: each lights the faces turned toward it, falling off with distance, and is shut out of
  // what lies behind a projection on its way. A fire's light (`flame`) climbs the wall further than it spreads
  // along it, and the smoke breaks its edge, so it lies on a flat wall as firelight does, not as a disc.
  for (const l of lightList) {
    const tall = l.flame ? 1 / 0.72 : 1;
    const x0 = Math.max(0, Math.floor(l.x - l.radius));
    const x1 = Math.min(W - 1, Math.ceil(l.x + l.radius));
    const y0 = Math.max(0, Math.floor(l.y - l.radius * tall));
    const y1 = Math.min(H - 1, Math.ceil(l.y + l.radius * tall));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!solid(x, y)) continue;
        const dx = l.x - (x + 0.5);
        const dy = l.y - (y + 0.5);
        const reach = Math.hypot(dx, dy / tall);
        if (reach > l.radius) continue;
        const flat = Math.hypot(dx, dy);
        const d = at(x, y);
        const dz = l.z - d;
        const dist = Math.hypot(flat, dz);
        const lx = dx / dist;
        const ly = dy / dist;
        const lz = dz / dist;
        const gx = Math.max(-2.5, Math.min(2.5, (at(x + 1, y) - at(x - 1, y)) * 0.5));
        const gy = Math.max(-2.5, Math.min(2.5, (at(x, y + 1) - at(x, y - 1)) * 0.5));
        const nl = Math.hypot(gx, gy, 1);
        const lambert = Math.max(0, (-gx * lx - gy * ly + lz) / nl);
        if (lambert <= 0) continue;
        // Shadow: march toward the light; a projection that rises above the ray shuts it out.
        let vis = 1;
        const steps = Math.min(36, Math.floor(flat));
        for (let s = 1; s <= steps; s++) {
          const t = s / flat;
          const qx = Math.round(x + dx * t);
          const qy = Math.round(y + dy * t);
          const over = at(qx, qy) - (d + dz * t);
          if (over > 0.5) {
            vis = Math.min(vis, Math.max(0.12, 1 - (over - 0.5) * 0.35));
            if (vis <= 0.12) break;
          }
        }
        let fall = Math.pow(1 - reach / l.radius, 1.35);
        if (l.flame) fall *= 0.78 + 0.44 * fbm((x + l.x * 3) * 0.022, y * 0.03, { seed: 41, octaves: 3 });
        const k = lambert * vis * fall;
        const i = (y * W + x) * 3;
        light[i] += l.lin[0] * k;
        light[i + 1] += l.lin[1] * k;
        light[i + 2] += l.lin[2] * k;
      }
    }
  }

  // The light multiplied into the paint; the highest storeys sink into the night. What burns keeps its colour.
  const tint = linear(haze.tint);
  for (let y = 0; y < H; y++) {
    const veil = haze.veil ? haze.veil(y) : haze.top + (haze.street - haze.top) * (y / H);
    for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      const rgb = c.get(x, y);
      if (emissive.has((rgb[0] << 16) | (rgb[1] << 8) | rgb[2])) continue;
      const i = (y * W + x) * 3;
      const lin = linear(rgb);
      const lit = [lin[0] * light[i], lin[1] * light[i + 1], lin[2] * light[i + 2]];
      const out = display(lit.map((v, k) => v + (tint[k] - v) * veil));
      c.set(x, y, [out[0], out[1], out[2], rgb[3]]);
    }
  }
}

/** Where occlusion looks, and how much each look counts: rings at 1, 2, 4 and 6 px. */
const OCCLUSION_TAPS = (() => {
  const taps = [];
  for (const [r, w] of [[1, 0.045], [2, 0.035], [4, 0.022], [6, 0.014]]) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      taps.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r), w]);
    }
  }
  return taps;
})();

/** Toward the night sky's light: from above, a little behind the left shoulder, well out from the wall. */
export const SKY_DIR = (() => {
  const v = [-0.25, -1, 0.7];
  const len = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / len);
})();

/** A warm light of the street: the colour of firelight at full strength. */
export const FIRELIGHT = hex("#ff9a4a");
/** A lantern's or a lit window's: yellower, weaker. */
export const LAMPLIGHT = hex("#ffc070");
/** The night sky's light on the walls. */
export const SKYLIGHT = mix(hex("#7a7fa8"), hex("#a08a90"), 0.35);
