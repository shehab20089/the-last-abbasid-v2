// Sword smears: the band a blade sweeps between two frames, drawn into a sprite behind the figure.
// Blades are { hilt: [x, y], tip: [x, y] } in character space (x forward, y up).

const lerp = (a, b, t) => a + (b - a) * t;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const scale = (a, k) => [a[0] * k, a[1] * k];
const length = (a) => Math.hypot(a[0], a[1]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

/**
 * Draws a sword smear between two blade positions: the swept band between the previous and
 * current blade, brightest at the tip and fading toward the hilt with a dithered tail.
 * Blades are { hilt: [x, y], tip: [x, y] } in character space.
 */
export function drawSmear(canvas, anchor, from, to, colors, { minT = 0.35 } = {}) {
  const [ax, ay] = anchor;
  const a0 = Math.atan2(from.tip[1] - from.hilt[1], from.tip[0] - from.hilt[0]);
  let a1 = Math.atan2(to.tip[1] - to.hilt[1], to.tip[0] - to.hilt[0]);
  while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
  while (a1 - a0 < -Math.PI) a1 += Math.PI * 2;
  const l0 = length(sub(from.tip, from.hilt));
  const l1 = length(sub(to.tip, to.hilt));
  const moved = length(sub(to.hilt, from.hilt));
  const toPixel = (p) => [Math.floor(p[0] + ax), Math.floor(ay - p[1])];
  const paint = (px, py, strength) => {
    if (canvas.alpha(px, py) > 0) return;
    const color = strength > 0.74 ? colors[2] : strength > 0.46 ? colors[1] : colors[0];
    canvas.set(px, py, color);
  };

  // A thrust barely turns the blade: draw speed streaks along it instead of a sweep.
  if (Math.abs(a1 - a0) < 0.16 && moved > 2) {
    const dir = [Math.cos(a1), Math.sin(a1)];
    const side = [-dir[1], dir[0]];
    for (const [offset, start, strength] of [[0, 0.1, 0.9], [2.5, 0.35, 0.55], [-2.5, 0.45, 0.5]]) {
      const begin = add(from.tip, scale(dir, -l0 * (1 - start) * 0.6));
      const end = add(to.tip, scale(dir, -3));
      const steps = Math.ceil(length(sub(end, begin)) * 2);
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const p = add(add(begin, scale(sub(end, begin), k)), scale(side, offset));
        const [px, py] = toPixel(p);
        if (k < 0.3 && (px + py) % 2 === 0) continue;
        paint(px, py, strength * (0.5 + 0.5 * k));
      }
    }
    return;
  }

  // A cut: the band the blade swept, crescent shaped (older positions show only near the tip),
  // brightest along the leading edge.
  const samples = Math.max(24, Math.ceil(Math.abs(a1 - a0) * Math.max(l0, l1) * 1.6));
  const blades = [];
  for (let i = 0; i <= samples; i++) {
    const k = i / samples;
    const angle = lerp(a0, a1, k);
    blades.push({
      k,
      hilt: [lerp(from.hilt[0], to.hilt[0], k), lerp(from.hilt[1], to.hilt[1], k)],
      dir: [Math.cos(angle), Math.sin(angle)],
      len: lerp(l0, l1, k),
    });
  }
  const xs = [from.hilt[0], from.tip[0], to.hilt[0], to.tip[0]];
  const ys = [from.hilt[1], from.tip[1], to.hilt[1], to.tip[1]];
  const reach = Math.max(l0, l1);
  const minX = Math.floor(Math.min(...xs, to.hilt[0] - reach));
  const maxX = Math.ceil(Math.max(...xs, to.hilt[0] + reach));
  const minY = Math.floor(Math.min(...ys, to.hilt[1] - reach));
  const maxY = Math.ceil(Math.max(...ys, to.hilt[1] + reach));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = [x + 0.5, y + 0.5];
      let best = 0;
      for (const b of blades) {
        const rel = sub(p, b.hilt);
        const t = dot(rel, b.dir) / b.len;
        const tMin = minT + (1 - b.k) * (1 - minT) * 0.6;
        if (t < tMin || t > 1.04) continue;
        const across = Math.abs(rel[0] * b.dir[1] - rel[1] * b.dir[0]);
        if (across > 0.9) continue;
        const strength = ((t - tMin) / Math.max(0.05, 1 - tMin)) * (0.3 + 0.7 * b.k);
        if (strength > best) best = strength;
      }
      if (best < 0.12) continue;
      const [px, py] = toPixel(p);
      if (best < 0.3 && (px + py) % 2 === 0) continue;
      paint(px, py, best);
    }
  }
}
