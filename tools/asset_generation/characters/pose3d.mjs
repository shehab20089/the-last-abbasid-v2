// Pose helpers for the 3D characters: merging overrides, blending poses, layering offsets, and the
// locomotion cycles (breath, walk, run) every human shares. A cycle takes a stance and a `dress`
// callback that sets the arms and weapons for each frame from the cycle's swing.

export const TAU = Math.PI * 2;

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

/** Merges overrides onto a base pose (rotation objects merge key by key). */
export function pose(base, overrides = {}) {
  const out = { ...base };
  for (const [k, v] of Object.entries(overrides)) {
    out[k] = isObject(v) && isObject(base[k]) ? { ...base[k], ...v } : v;
  }
  return out;
}

/** Interpolates two poses: numbers, arrays and nested rotation objects. */
export function blend(a, b, t) {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * t;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => blend(v, b[i] ?? v, t));
  if (isObject(a) && isObject(b)) {
    const out = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (key in a && key in b) out[key] = blend(a[key], b[key], t);
      else if (key in b) out[key] = b[key];
      else out[key] = a[key];
    }
    return out;
  }
  return t < 0.5 ? a : b;
}

/** Adds offsets to a pose's numbers (cycles layered on a stance). */
export function nudge(p, d) {
  const r = (base, o = {}) => ({ yaw: (base?.yaw ?? 0) + (o.yaw ?? 0), pitch: (base?.pitch ?? 0) + (o.pitch ?? 0),
    roll: (base?.roll ?? 0) + (o.roll ?? 0) });
  const v = (base, o) => (o ? base.map((x, i) => x + (o[i] ?? 0)) : base);
  return {
    ...p,
    pelvis: v(p.pelvis, d.pelvis),
    hips: r(p.hips, d.hips),
    torso: r(p.torso, d.torso),
    head: r(p.head, d.head),
    handN: v(p.handN, d.handN),
    handF: v(p.handF, d.handF),
    footN: v(p.footN, d.footN),
    footF: v(p.footF, d.footF),
    sword: v(p.sword, d.sword),
    shield: v(p.shield, d.shield),
  };
}

/** Breathing in a stance: `count` frames; dress(i, breath, sink) adds the arms' share. */
export function breathCycle(base, count = 8, dress = () => ({})) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * TAU;
    const breath = Math.sin(a);
    const sink = (1 - Math.cos(a)) * 0.45;
    return nudge(base, {
      pelvis: [Math.sin(a) * 0.25, -sink],
      torso: { pitch: breath * 1.4, yaw: Math.sin(a) * 1.0 },
      head: { pitch: -breath * 1.0, yaw: Math.sin(a + 1) * 1.5 },
      handN: [0, 0, -sink * 0.9 + breath * 0.5],
      handF: [0, 0, -sink * 0.8 + breath * 0.6],
      ...dress(i, breath, sink),
    });
  });
}

/** Near ankle over a walk: [x, z, toe], heel strike to toe-off and through the swing. */
const WALK_FOOT = [
  [10.5, 4.7, 16], [5, 4.2, 0], [-1, 4.2, 0], [-7, 4.6, -16],
  [-11, 6.2, -38], [-5, 9.6, -18], [3.5, 9.2, 2], [9, 6.2, 12],
];
const WALK_HEIGHT = [0, -0.7, 0.4, 0.9, 0, -0.7, 0.4, 0.9];

/** A walk: eight frames, heel to toe; dress(i, swing, bob) sets arms and weapons. */
export function walkCycle(base, dress = () => ({}), { stride = 1, depth = [-4.5, 4.7] } = {}) {
  return Array.from({ length: 8 }, (_, i) => {
    const n = WALK_FOOT[i];
    const f = WALK_FOOT[(i + 4) % 8];
    const swing = Math.cos((i / 8) * TAU);
    const bob = WALK_HEIGHT[i];
    return pose(base, {
      pelvis: [base.pelvis[0], base.pelvis[1] + bob],
      hips: { yaw: (base.hips?.yaw ?? 0) + 6 + swing * 6, pitch: base.hips?.pitch ?? 4 },
      torso: { yaw: (base.torso?.yaw ?? 0) - swing * 6, pitch: base.torso?.pitch ?? 6 },
      footN: [n[0] * stride, depth[0], n[1]],
      toeN: n[2],
      footF: [f[0] * stride, depth[1], f[1]],
      toeF: f[2],
      footYawN: -10,
      footYawF: -6,
      ...dress(i, swing, bob),
    });
  });
}

/** Near ankle over a run: contact, down, passing, flight, then the swing. */
const RUN_FOOT = [
  [14.4, 4.4, 6], [4.8, 4.2, 0], [-4.8, 4.2, 0], [-10.5, 7.5, -42],
  [-19, 15, -70], [-8, 21, -40], [7, 17, 0], [16, 9.5, 14],
];
const RUN_HEIGHT = [37.4, 36.0, 37.6, 39.4, 37.4, 36.0, 37.6, 39.4];

/** A run: eight frames; dress(i, swing, lift) sets arms and weapons. */
export function runCycle(base, dress = () => ({}), { stride = 1, lean = 9, depth = [-4.4, 4.6] } = {}) {
  return Array.from({ length: 8 }, (_, i) => {
    const n = RUN_FOOT[i];
    const f = RUN_FOOT[(i + 4) % 8];
    const swing = Math.cos((i / 8) * TAU);
    const lift = Math.sin((i / 8) * TAU * 2);
    return pose(base, {
      pelvis: [0.6, RUN_HEIGHT[i]],
      hips: { yaw: -10 + swing * 9, pitch: lean },
      torso: { yaw: -swing * 12, pitch: lean + lift * 1.5 },
      head: { yaw: 8, pitch: -16 },
      footN: [n[0] * stride, depth[0], n[1]],
      toeN: n[2],
      footF: [f[0] * stride, depth[1], f[1]],
      toeF: f[2],
      footYawN: -8,
      footYawF: -4,
      ...dress(i, swing, lift),
    });
  });
}
