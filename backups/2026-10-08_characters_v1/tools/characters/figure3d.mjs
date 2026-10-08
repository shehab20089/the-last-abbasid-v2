// Part builders shared by every 3D character: a padded torso, bands at the waist, a coat's skirt
// that follows the legs, sleeves and fists, trousers, boots and feet, all modelled around the rest
// pose of body3d.mjs and bound to its bones. A character module picks the shapes' sizes and the
// materials; this module knows only how cloth and limbs bend.
import { add, clamp, scale, smoothstep, sub, toParent } from "../lib/space.mjs";
import { ellipsoid, place, roundedBox, tube } from "../lib/meshes.mjs";
import { BUILD, REST, jointBlend, solveBody } from "./body3d.mjs";

export const rest = solveBody(REST);

/** Rings for a torso: [z, front, back, half-width, forward offset]. */
export const torsoRings = (spec) => spec.map(([z, rf, rb, ry, x = 0]) => ({ c: [x, 0, z], rf, rb, ry }));

/** A torso ring interpolated at height z and grown outward (a sash, a belt, armour over cloth). */
export function ringAt(rings, z, grow = 0) {
  const below = [...rings].reverse().find((r) => r.c[2] <= z) ?? rings[0];
  const above = rings.find((r) => r.c[2] >= z) ?? rings[rings.length - 1];
  const k = above === below ? 0 : (z - below.c[2]) / (above.c[2] - below.c[2]);
  const mix = (a, b) => a + (b - a) * k;
  return {
    c: [mix(below.c[0], above.c[0]), 0, z], rf: mix(below.rf, above.rf) + grow,
    rb: mix(below.rb, above.rb) + grow, ry: mix(below.ry, above.ry) + grow,
  };
}

/** Torso weights: the pelvis below the waist, the spine through the belly, the chest above. */
export function torsoWeights(p) {
  const chest = smoothstep(47.5, 53, p[2]);
  const pelvis = 1 - smoothstep(41.5, 45.5, p[2]);
  return [["pelvis", pelvis], ["spine", Math.max(0, 1 - pelvis - chest)], ["chest", chest]];
}

/** A band round the body between heights (a sash, a belt, a lamellar girdle). */
export function band(rings, heights, grow, { sides = 20 } = {}) {
  return tube(heights.map((z) => ringAt(rings, z, grow)), { sides, caps: "none" });
}

/**
 * A coat's skirt from the waist (rings: [z, front, back, half-width], top first), open down the
 * front by `open` radians. The waist rides the pelvis; lower down, the panels follow the thigh on
 * their side and the back sways on its own bone (skirtBack). `free` is how far the hem follows.
 */
export function skirt(spec, { open = 0.95, free = 0.8, sides = 22 } = {}) {
  const rings = spec.map(([z, rf, rb, ry]) => ({ c: [0, 0, z], rf, rb, ry }));
  const top = spec[0][0];
  const length = top - spec[spec.length - 1][0];
  const mesh = tube(rings, { sides, open });
  const bind = (p) => {
    const h = smoothstep(0, 1, clamp((top - p[2]) / length, 0, 1));
    const angle = Math.atan2(-p[1], p[0]); // 0 front, + toward the near side
    const g = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
    const near = g(angle, 1.0, 1.0);
    const far = g(angle, -1.0, 1.0);
    const back = g(Math.abs(angle), Math.PI, 1.1);
    const total = near + far + back;
    const f = free * h ** 1.3;
    return [["pelvis", 1 - f], ["thighN", (f * near) / total], ["thighF", (f * far) / total], ["skirtBack", (f * back) / total]];
  };
  return { mesh, bind, length, edge: open / (4 * Math.PI) };
}

/** Points along a rest limb: shoulder to wrist, or hip to ankle. */
function chain(side, upper, lower, lowerLength) {
  const a = rest[`${upper}${side}`];
  const b = rest[`${lower}${side}`];
  const end = add(b.o, scale(b.z, lowerLength));
  const along = (p, q, k) => add(p, scale(sub(q, p), k));
  return { a, b, root: a.o, joint: b.o, end, along };
}

/**
 * A sleeve from shoulder to wrist bending at the elbow; radii are at
 * [shoulder, upper arm, above the elbow, elbow, below the elbow, forearm, near the wrist, wrist].
 */
export function sleeve(side, radii = [3.5, 3.35, 3.0, 2.8, 2.95, 2.75, 2.45, 2.2]) {
  const { a, root, joint, end, along } = chain(side, "upperArm", "forearm", BUILD.forearm);
  const at = [root, along(root, joint, 0.3), along(root, joint, 0.7), joint, along(joint, end, 0.18),
    along(joint, end, 0.55), along(joint, end, 0.92), end];
  const mesh = tube(at.map((c, i) => ({ c, rx: radii[i] })), { sides: 12, front: [-1, 0, 0] });
  return { mesh, bind: (p) => jointBlend(p, joint, a.z, `upperArm${side}`, `forearm${side}`, 2.0) };
}

/** A padded shoulder that moves halfway with the arm. */
export function shoulderCap(side, radii = [3.7, 3.8, 3.4], lift = 0.9) {
  const at = add(rest[`upperArm${side}`].o, [0, side === "N" ? -0.5 : 0.5, lift]);
  return { mesh: ellipsoid(at, radii, { rings: 8, segments: 14 }), bind: () => [["chest", 0.45], [`upperArm${side}`, 0.55]] };
}

/** A fist on the wrist (gripping along the hand frame's x). */
export function fist(side, size = [3.4, 3.0, 3.6]) {
  return { mesh: place(roundedBox([0, 0, 2.5], size, { roundness: 0.5 }), rest[`hand${side}`]), bind: `hand${side}` };
}

/**
 * Trousers from hip to mid-shin, bending at the knee; radii at
 * [hip, upper thigh, lower thigh, knee, upper shin, shin, cuff].
 */
export function trousers(side, radii = [4.9, 5.2, 4.9, 4.3, 4.15, 3.9, 3.2], cuff = 0.52) {
  const { a, root, joint, end, along } = chain(side, "thigh", "shin", BUILD.shin);
  const at = [root, along(root, joint, 0.3), along(root, joint, 0.65), joint, along(joint, end, 0.22),
    along(joint, end, cuff - 0.1), along(joint, end, cuff)];
  const mesh = tube(at.map((c, i) => ({ c, rx: radii[i] })), { sides: 12 });
  return { mesh, bind: (p) => jointBlend(p, joint, a.z, `thigh${side}`, `shin${side}`, 2.6) };
}

/** A boot shaft from mid-shin to the ankle. */
export function bootShaft(side, radii = [3.25, 3.0, 2.75, 2.6], top = 0.46) {
  const { joint, end, along } = chain(side, "thigh", "shin", BUILD.shin);
  const at = [along(joint, end, top), along(joint, end, top + (1 - top) * 0.48), along(joint, end, 0.95), end];
  return { mesh: tube(at.map((c, i) => ({ c, rx: radii[i] })), { sides: 12 }), bind: `shin${side}` };
}

/** A foot in its boot. */
export function foot(side, size = [8.8, 3.5, 4.2]) {
  return {
    mesh: place(roundedBox([2.1, 0, -2.1], size, { roundness: 0.45 }), rest[`foot${side}`]),
    bind: `foot${side}`,
  };
}

/** A mesh built in the head's own frame, carried to the rest pose. */
export const onHead = (mesh) => place(mesh, rest.head);
/** Points on the rest head and chest. */
export const headPoint = (p) => toParent(rest.head, p);

/** Hood or aventail weights: the top rides the head, the hem settles on the shoulders. */
export function hangingFromHead(drop = 0.55) {
  return (p) => {
    const k = smoothstep(rest.head.o[2] + 5, rest.head.o[2] - 3, p[2]);
    return [["head", 1 - k * drop], ["chest", k * drop]];
  };
}

/** Capsules the cloth drapes over. */
export function bodyColliders(f, { torso = 6.6, thigh = 5.6, hips = 7.8 } = {}) {
  const cap = (a, b, r) => ({ a, b, r });
  return [
    cap(toParent(f.pelvis, [-0.6, 0, -2]), toParent(f.chest, [-0.6, 0, 9.5]), torso),
    cap(f.thighN.o, f.shinN.o, thigh),
    cap(f.thighF.o, f.shinF.o, thigh),
    cap(toParent(f.pelvis, [0, 0, -2]), toParent(f.pelvis, [0, 0, 5]), hips),
  ];
}

export { BUILD, REST };
