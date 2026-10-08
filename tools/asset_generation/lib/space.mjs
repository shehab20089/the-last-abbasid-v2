// Small 3D vector and frame helpers for the character renderer.
//
// Character space: x points the way the character faces, y points away from the camera (the far
// side), z points up; units are sprite pixels and the ground is z = 0. A frame is an origin and
// three orthonormal axes { o, x, y, z } given in the space of its parent (usually character space).

export const D2R = Math.PI / 180;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
};
export const mixv = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** a + b * k */
export const madd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** Rotates v about a unit axis by an angle in degrees (right-handed). */
export function rotate(v, axis, degrees) {
  const a = degrees * D2R;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const k = normalize(axis);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
}

export const IDENTITY = Object.freeze({ o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] });

/** A frame at `o` whose z axis runs along `along` and whose x axis leans toward `hint`. */
export function frameAlong(o, along, hint, fallback = [0, 0, 1]) {
  const z = normalize(along);
  let x = sub(hint, scale(z, dot(hint, z)));
  if (length(x) < 1e-4) x = sub(fallback, scale(z, dot(fallback, z)));
  if (length(x) < 1e-4) x = Math.abs(z[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  x = normalize(sub(x, scale(z, dot(x, z))));
  return { o: [...o], x, y: cross(z, x), z };
}

/** A frame at `o` from an x axis and a hint for its z axis. */
export function frameXZ(o, xAxis, zHint) {
  const x = normalize(xAxis);
  let z = sub(zHint, scale(x, dot(zHint, x)));
  if (length(z) < 1e-4) z = Math.abs(x[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  z = normalize(sub(z, scale(x, dot(z, x))));
  return { o: [...o], x, y: cross(z, x), z };
}

/** Turns a frame's axes about one of its own axes (or any vector) by degrees. */
export function turn(frame, axis, degrees) {
  if (!degrees) return frame;
  return {
    o: frame.o,
    x: rotate(frame.x, axis, degrees),
    y: rotate(frame.y, axis, degrees),
    z: rotate(frame.z, axis, degrees),
  };
}

/** A local point (in the frame's coordinates) carried into the parent space. */
export const toParent = (f, p) => [
  f.o[0] + f.x[0] * p[0] + f.y[0] * p[1] + f.z[0] * p[2],
  f.o[1] + f.x[1] * p[0] + f.y[1] * p[1] + f.z[1] * p[2],
  f.o[2] + f.x[2] * p[0] + f.y[2] * p[1] + f.z[2] * p[2],
];
/** A local direction carried into the parent space (no translation). */
export const dirToParent = (f, d) => [
  f.x[0] * d[0] + f.y[0] * d[1] + f.z[0] * d[2],
  f.x[1] * d[0] + f.y[1] * d[1] + f.z[1] * d[2],
  f.x[2] * d[0] + f.y[2] * d[1] + f.z[2] * d[2],
];
/** A parent-space point expressed in the frame's coordinates. */
export const toLocal = (f, p) => {
  const d = sub(p, f.o);
  return [dot(d, f.x), dot(d, f.y), dot(d, f.z)];
};
export const dirToLocal = (f, d) => [dot(d, f.x), dot(d, f.y), dot(d, f.z)];

/** Composes frames: `child` is given in `parent`'s coordinates; the result is in parent's parent. */
export const compose = (parent, child) => ({
  o: toParent(parent, child.o),
  x: dirToParent(parent, child.x),
  y: dirToParent(parent, child.y),
  z: dirToParent(parent, child.z),
});

/** A frame turned by yaw (about z), then pitch (about its new y), then roll (about its new x). */
export function euler(o, { yaw = 0, pitch = 0, roll = 0 } = {}) {
  let f = { o: [...o], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  f = turn(f, f.z, yaw);
  f = turn(f, f.y, pitch);
  f = turn(f, f.x, roll);
  return f;
}

/**
 * Two-bone inverse kinematics in 3D: the middle joint of a chain of lengths l1, l2 from `root`
 * reaching for `target`, bending toward `pole` (a direction). The reach is clamped just short of
 * straight so a knee never snaps.
 */
export function solveTwoBone(root, target, l1, l2, pole) {
  const delta = sub(target, root);
  const full = l1 + l2;
  const d = clamp(length(delta), Math.abs(l1 - l2) + 0.05, full * 0.999);
  const e = normalize(delta);
  let q = sub(pole, scale(e, dot(pole, e)));
  if (length(q) < 1e-5) q = Math.abs(e[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  q = normalize(sub(q, scale(e, dot(q, e))));
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const mid = add(root, add(scale(e, l1 * cosA), scale(q, l1 * sinA)));
  const end = add(root, scale(e, d));
  return { mid, end, reached: length(delta) <= full * 0.999 + 1e-6, bend: q };
}
