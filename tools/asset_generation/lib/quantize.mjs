// Palette reduction: maps the colours of one or more canvases to a shared palette of k colours chosen
// by k-means in the Oklab perceptual space (seeded by k-means++), so a painting resampled to the
// game's pixel grid keeps its look in a limited, pixel-art palette.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const toLinear = (c) => Math.pow(clamp(c, 0, 255) / 255, 2.2);

function srgbToOklab(r, g, b) {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * Reduces every opaque pixel of the canvases to one shared palette of `k` colours, in place.
 * Each cluster is represented by its most common actual colour, so no in-between hue is invented.
 * Returns the palette.
 */
export function quantize(canvases, k = 48, { seed = 1 } = {}) {
  const hist = new Map();
  for (const c of canvases) {
    for (let i = 0; i < c.width * c.height; i++) {
      if (c.data[i * 4 + 3] === 0) continue;
      const key = (c.data[i * 4] << 16) | (c.data[i * 4 + 1] << 8) | c.data[i * 4 + 2];
      hist.set(key, (hist.get(key) ?? 0) + 1);
    }
  }
  const colors = [...hist.entries()].map(([key, count]) => {
    const r = (key >> 16) & 255;
    const g = (key >> 8) & 255;
    const b = key & 255;
    return { rgb: [r, g, b], lab: srgbToOklab(r, g, b), count };
  });
  if (colors.length <= k) return colors.map((c) => c.rgb);
  let state = seed >>> 0 || 1;
  const random = () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  // k-means++ seeding, weighted by pixel counts.
  const centres = [colors.reduce((best, c) => (c.count > best.count ? c : best)).lab.slice()];
  const dist = colors.map((c) => d2(c.lab, centres[0]));
  while (centres.length < k) {
    let total = 0;
    for (let i = 0; i < colors.length; i++) total += dist[i] * Math.sqrt(colors[i].count);
    let pickAt = random() * total;
    let chosen = colors.length - 1;
    for (let i = 0; i < colors.length; i++) {
      pickAt -= dist[i] * Math.sqrt(colors[i].count);
      if (pickAt <= 0) { chosen = i; break; }
    }
    centres.push(colors[chosen].lab.slice());
    for (let i = 0; i < colors.length; i++) dist[i] = Math.min(dist[i], d2(colors[i].lab, centres[centres.length - 1]));
  }
  const assign = new Int32Array(colors.length);
  for (let iteration = 0; iteration < 14; iteration++) {
    for (let i = 0; i < colors.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = d2(colors[i].lab, centres[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      assign[i] = best;
    }
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < colors.length; i++) {
      const s = sums[assign[i]];
      const w = colors[i].count;
      s[0] += colors[i].lab[0] * w; s[1] += colors[i].lab[1] * w; s[2] += colors[i].lab[2] * w; s[3] += w;
    }
    sums.forEach((s, c) => { if (s[3] > 0) centres[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  const representative = centres.map(() => ({ rgb: null, count: -1 }));
  const lookup = new Map();
  colors.forEach((c, i) => {
    const r = representative[assign[i]];
    if (c.count > r.count) { r.count = c.count; r.rgb = c.rgb; }
  });
  colors.forEach((c, i) => {
    lookup.set((c.rgb[0] << 16) | (c.rgb[1] << 8) | c.rgb[2], representative[assign[i]].rgb);
  });
  for (const canvas of canvases) {
    for (let i = 0; i < canvas.width * canvas.height; i++) {
      if (canvas.data[i * 4 + 3] === 0) continue;
      const key = (canvas.data[i * 4] << 16) | (canvas.data[i * 4 + 1] << 8) | canvas.data[i * 4 + 2];
      const to = lookup.get(key);
      if (to) canvas.data.set(to, i * 4);
    }
  }
  return representative.map((r) => r.rgb).filter(Boolean);
}
