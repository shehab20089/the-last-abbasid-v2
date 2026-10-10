// Turns a character's G-buffer into pixel art. Each sprite pixel takes the part that covers most
// of its samples (small details win ties, so straps and studs survive), then that part's material
// picks a colour from its ramp by the light on the surface. Finishing passes: dark lines where a
// part passes in front of another, a warm rim of firelight along the back edges, a dark outline
// and cleanup of lone pixels.
import { Canvas, mix } from "./canvas.mjs";
import { clamp, dot, normalize } from "./space.mjs";

/** The key light, in view space (x right = the character's front, y up, z toward the viewer). */
export const KEY = normalize([0.55, 0.62, 0.56]);
const HALF = normalize([KEY[0], KEY[1], KEY[2] + 1]);

/** Light on a surface in 0..1: wrapped diffuse from the key over a little ambient. */
export function lightOf(n, wrap = 0.35) {
  const d = (dot(n, KEY) + wrap) / (1 + wrap);
  return clamp(0.12 + 0.88 * Math.max(0, d), 0, 1);
}

/** How strongly a metal surface throws the key back at the viewer (0..1). */
export const glintOf = (n, power = 24) => Math.max(0, dot(n, HALF)) ** power;

/**
 * How a material takes the light (`material.feel`): the smooth light gathered into a few levels, so a surface shades
 * in a few deliberate clusters, as a hand would place them, rather than across its whole ramp in even bands. Cloth is
 * matte and soft, never reaching its brightest; leather a little fuller; skin warm and soft; hair dark; metal hard,
 * with a band of dark reflection between its lit face and its highlight (the highlight itself comes from the glint).
 * Each is { cuts (light thresholds), levels (the light each step is given) }.
 */
export const FEELS = {
  cloth: { cuts: [0.3, 0.52, 0.76], levels: [0.26, 0.44, 0.6, 0.72] },
  leather: { cuts: [0.3, 0.5, 0.74], levels: [0.22, 0.42, 0.6, 0.78] },
  skin: { cuts: [0.32, 0.52, 0.74], levels: [0.3, 0.48, 0.64, 0.8] },
  hair: { cuts: [0.36, 0.62], levels: [0.24, 0.44, 0.62] },
  metal: { cuts: [0.3, 0.48, 0.62, 0.7], levels: [0.12, 0.34, 0.6, 0.38, 0.74] },
};

/** The light a material of the given feel takes (the smooth light if it has none). */
export function respond(light, feel) {
  const f = FEELS[feel];
  if (!f) return light;
  let k = 0;
  while (k < f.cuts.length && light >= f.cuts[k]) k++;
  return f.levels[k];
}

/** A ramp colour for a light value, shifted by bias (in ramp steps). */
export function pick(ramp, light, bias = 0) {
  const i = Math.floor(clamp(light, 0, 0.999) * ramp.length + bias);
  return ramp[clamp(i, 0, ramp.length - 1)];
}

export function rampIndex(ramp, light, bias = 0) {
  return clamp(Math.floor(clamp(light, 0, 0.999) * ramp.length + bias), 0, ramp.length - 1);
}

/**
 * Shades a G-buffer rendered at `scale` samples per pixel. parts[id] = { material, group, prio }.
 * A material: { shade(s) -> colour, outline, line, rim (0..1) }, where s carries the surface:
 * { n, u, v, depth, x, y, light, glint, part }.
 */
export function shadeSprite(g, { width, height, scale }, parts, options = {}) {
  const {
    coverage = 0.45, rimColor = [242, 132, 66, 255], rimScale = 0.6, lineDepth = 2.2, rimDepth = 5, cleanup = true,
  } = options;
  const S = scale;
  const n1 = width * height;
  const ids = new Int16Array(n1).fill(-1);
  const depth = new Float32Array(n1).fill(Infinity);
  const normal = new Array(n1).fill(null);
  const colors = new Array(n1).fill(null);
  const need = coverage * S * S;
  const counts = new Map();
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      counts.clear();
      let covered = 0;
      for (let sy = 0; sy < S; sy++) {
        const row = (py * S + sy) * g.width + px * S;
        for (let sx = 0; sx < S; sx++) {
          const id = g.id[row + sx];
          if (id < 0) continue;
          covered++;
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
      if (covered === 0) continue;
      let best = -1;
      let bestScore = 0;
      for (const [id, count] of counts) {
        const score = count * (parts[id].prio ?? 1);
        if (score > bestScore || (score === bestScore && id > best)) {
          best = id;
          bestScore = score;
        }
      }
      if (covered < need && bestScore < need) continue;
      // The chosen part's surface: normals averaged, everything else from the sample nearest the
      // pixel's centre (averaging UVs across a seam would scramble patterns).
      let nx = 0;
      let ny = 0;
      let nz = 0;
      let near = -1;
      let nearD = Infinity;
      let front = Infinity;
      const c = (S - 1) / 2;
      for (let sy = 0; sy < S; sy++) {
        const row = (py * S + sy) * g.width + px * S;
        for (let sx = 0; sx < S; sx++) {
          const i = row + sx;
          if (g.id[i] !== best) continue;
          nx += g.nx[i];
          ny += g.ny[i];
          nz += g.nz[i];
          front = Math.min(front, g.depth[i]);
          const d = (sx - c) ** 2 + (sy - c) ** 2;
          if (d < nearD) {
            nearD = d;
            near = i;
          }
        }
      }
      const n = normalize([nx, ny, nz]);
      const o = py * width + px;
      ids[o] = best;
      depth[o] = front;
      normal[o] = n;
      const part = parts[best];
      const smooth = lightOf(n, part.material.wrap ?? 0.35);
      const s = {
        n, u: g.u[near], v: g.v[near], w: g.w[near], depth: front, x: px, y: py, part,
        light: respond(smooth, part.material.feel), smooth, glint: glintOf(n, part.material.glintPower ?? 24),
      };
      const color = part.material.shade(s);
      if (!color) {
        // A material may leave a pixel out (a frayed hem).
        ids[o] = -1;
        depth[o] = Infinity;
        normal[o] = null;
        continue;
      }
      colors[o] = color;
    }
  }

  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? -1 : ids[y * width + x]);
  const dAt = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? Infinity : depth[y * width + x]);
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // Separation: a pixel of a part lying behind another (by more than lineDepth) darkens into a line.
  const lined = colors.slice();
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const o = py * width + px;
      const id = ids[o];
      if (id < 0 || parts[id].separate === false) continue;
      for (const [dx, dy] of N4) {
        const other = at(px + dx, py + dy);
        if (other < 0 || other === id) continue;
        const front = parts[other];
        if (front.group !== undefined && front.group === parts[id].group) continue;
        if (front.casts === false) continue;
        if (dAt(px + dx, py + dy) < depth[o] - lineDepth) {
          lined[o] = parts[id].material.line ?? mix(colors[o], [0, 0, 0, 255], 0.5);
          break;
        }
      }
    }
  }

  // Cleanup: a lone pixel whose four neighbours share one other colour of the same part joins them.
  if (cleanup) {
    const before = lined.slice();
    for (let py = 1; py < height - 1; py++) {
      for (let px = 1; px < width - 1; px++) {
        const o = py * width + px;
        const id = ids[o];
        if (id < 0 || parts[id].keepDetail) continue;
        let shared = null;
        let same = true;
        for (const [dx, dy] of N4) {
          const q = (py + dy) * width + px + dx;
          if (ids[q] !== id) { same = false; break; }
          const col = before[q];
          if (!shared) shared = col;
          else if (col[0] !== shared[0] || col[1] !== shared[1] || col[2] !== shared[2]) { same = false; break; }
        }
        const own = before[o];
        if (same && shared && (shared[0] !== own[0] || shared[1] !== own[1] || shared[2] !== own[2])) lined[o] = shared;
      }
    }
  }

  const canvas = new Canvas(width, height);
  for (let o = 0; o < n1; o++) if (lined[o]) canvas.data.set(lined[o], o * 4);

  // Rim light: surfaces turned away toward the fires behind, along the back of the silhouette.
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const o = py * width + px;
      const id = ids[o];
      if (id < 0) continue;
      const amount = parts[id].material.rim ?? 0;
      if (!amount) continue;
      const open = at(px - 1, py) < 0 || dAt(px - 1, py) > depth[o] + rimDepth;
      if (!open) continue;
      const n = normal[o];
      const facing = clamp((-n[0] + 0.15) / 0.75, 0, 1) * clamp(1.15 - n[2], 0, 1);
      if (facing <= 0.05) continue;
      canvas.set(px, py, mix(canvas.get(px, py), rimColor, amount * facing * rimScale));
    }
  }

  // Outline: empty pixels touching the silhouette take the dark of the part they touch.
  const out = new Canvas(width, height);
  out.data.set(canvas.data);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (at(px, py) >= 0) continue;
      for (const [dx, dy] of N4) {
        const other = at(px + dx, py + dy);
        if (other < 0 || parts[other].outline === false) continue;
        out.set(px, py, parts[other].material.outline);
        break;
      }
    }
  }
  return { canvas: out, ids, depth, normal };
}
