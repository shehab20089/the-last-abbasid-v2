// The human skeleton behind every 3D-rendered character: a pose (hips, a twisting torso, a head,
// ankle and wrist targets, the blade's direction and the shield's facing) is solved into bone
// frames with two-bone IK for the limbs. Parts are meshes modelled around the rest pose and bound
// to bones (rigidly, or with blended weights for cloth that bends), so posing the skeleton poses
// the whole figure.
//
// Character space: x forward, y away from the camera (the far side), z up; pixels; ground z = 0.
// Suffix N is the near side (the character's right: the sword arm), F the far side (the shield).
import {
  D2R, add, clamp, compose, cross, dirToParent, dot, euler, frameAlong, frameXZ, length, madd,
  normalize, rotate, scale, solveTwoBone, sub, toLocal, toParent, turn,
} from "../lib/space.mjs";

/** Body proportions in pixels. Yusuf stands about 80 px to the crown of his helmet. */
export const BUILD = {
  hipHalf: 4.4,
  thigh: 18.5,
  shin: 17.5,
  ankle: 4.2,
  spineBase: 3,
  spine: 7,
  chest: 12,
  neck: 3.6,
  shoulderHalf: 8.6,
  shoulderDrop: 2.2,
  shoulderBack: -0.6,
  upperArm: 13.6,
  forearm: 12.2,
  hand: 2.6,
};

/** The pose every part is modelled around: standing straight, arms a little away from the body. */
export const REST = {
  pelvis: [0, 39.9],
  hips: { yaw: 0, pitch: 0, roll: 0 },
  torso: { yaw: 0, pitch: 0, roll: 0 },
  head: { yaw: 0, pitch: 0, roll: 0 },
  footN: [0, -4.4, 4.2],
  footF: [0, 4.4, 4.2],
  toeN: 0,
  toeF: 0,
  handN: [-1.2, -11.6, 34.5],
  handF: [-1.2, 11.6, 34.5],
  sword: [90, 0],
  shield: [0, 0],
};

const FORWARD = [1, 0, 0];
const UP = [0, 0, 1];

const rot = (r) => ({ yaw: r?.yaw ?? 0, pitch: r?.pitch ?? 0, roll: r?.roll ?? 0 });
const part = (r, k) => ({ yaw: r.yaw * k, pitch: r.pitch * k, roll: r.roll * k });

/** The blade's direction from [angle, yaw]: angle in the side plane (0 down, 90 forward, 180 up,
 * -90 back), yaw turning it toward the camera (positive) or away. */
export function bladeDirection([angle, yaw = 0]) {
  const a = angle * D2R;
  const y = yaw * D2R;
  return normalize([Math.sin(a) * Math.cos(y), -Math.sin(y), -Math.cos(a) * Math.cos(y)]);
}

/** The shield's facing from [facing, tilt]: degrees from forward toward the camera, then up. */
export function shieldDirection([facing, tilt = 0]) {
  const f = facing * D2R;
  const t = tilt * D2R;
  return normalize([Math.cos(f) * Math.cos(t), -Math.sin(f) * Math.cos(t), Math.sin(t)]);
}

/**
 * Solves a pose into bone frames (character space). Hand targets may be functions of the torso's
 * frames ((frames) => point) so they ride along with the chest.
 */
export function solveBody(pose, build = BUILD) {
  const p = { ...REST, ...pose };
  const hips = rot(p.hips);
  const torso = rot(p.torso);
  const head = rot(p.head);
  const pelvisAt = [p.pelvis[0], p.pelvisY ?? 0, p.pelvis[1]];
  const f = {};
  f.pelvis = euler(pelvisAt, hips);
  f.spine = compose(f.pelvis, euler([0, 0, build.spineBase], part(torso, 0.45)));
  f.chest = compose(f.spine, euler([0, 0, build.spine], part(torso, 0.55)));
  f.neck = compose(f.chest, euler([0.4, 0, build.chest], part(head, 0.35)));
  f.head = compose(f.neck, euler([0.3, 0, build.neck], part(head, 0.65)));
  f.skirtFollow = p.skirtFollow ?? 1;

  // The back of the coat's skirt swings about the back of the waist (the renderer springs it).
  {
    const pivot = toParent(f.pelvis, [-4, 0, 4]);
    const lag = p.skirt ?? 0;
    const swung = turn(f.pelvis, f.pelvis.y, lag);
    f.skirtBack = { ...swung, o: add(pivot, rotate(sub(f.pelvis.o, pivot), f.pelvis.y, lag)) };
  }

  // Limb targets are in character space, or in the pelvis's own frame for poses that turn the
  // whole curled body (a somersault).
  const body = p.limbSpace === "pelvis" ? f.pelvis : null;
  const point = (q) => (body ? toParent(body, q) : q);
  const direction = (d) => (body ? dirToParent(body, d) : d);

  // Legs: hip joints on the pelvis, knees bending forward over the feet.
  for (const side of ["N", "F"]) {
    const sign = side === "N" ? -1 : 1;
    const hip = toParent(f.pelvis, [0, sign * build.hipHalf, 0]);
    const ankle = p[`foot${side}`];
    const target = point([ankle[0], ankle[1] ?? sign * build.hipHalf, ankle[2] ?? build.ankle]);
    const footYaw = (p[`footYaw${side}`] ?? hips.yaw * 0.5) + sign * -6;
    const forward = direction(rotate(FORWARD, UP, footYaw));
    const up = direction(UP);
    const knee = p[`knee${side}`];
    const pole = knee ? direction(knee) : normalize(add(forward, direction([0, sign * 0.25, 0.1])));
    const ik = solveTwoBone(hip, target, build.thigh, build.shin, pole);
    f[`thigh${side}`] = frameAlong(hip, sub(ik.mid, hip), ik.bend);
    f[`shin${side}`] = frameAlong(ik.mid, sub(ik.end, ik.mid), ik.bend);
    const toe = (p[`toe${side}`] ?? 0) * D2R;
    const footDir = normalize(add(scale(forward, Math.cos(toe)), scale(up, Math.sin(toe))));
    f[`foot${side}`] = frameXZ(ik.end, footDir, up);
    f[`foot${side}`].reached = ik.reached;
  }

  // Arms: shoulders on the chest, elbows bending back and out, hands on their targets.
  for (const side of ["N", "F"]) {
    const sign = side === "N" ? -1 : 1;
    const shoulder = toParent(f.chest, [build.shoulderBack, sign * build.shoulderHalf, build.chest - build.shoulderDrop]);
    const raw = p[`hand${side}`];
    const target = typeof raw === "function" ? raw(f) : point(raw);
    const elbow = p[`elbow${side}`];
    const pole = elbow ? direction(elbow) : normalize(add(scale(f.chest.x, -1), add(scale(f.chest.y, sign * 0.7), scale(f.chest.z, -0.5))));
    const ik = solveTwoBone(shoulder, target, build.upperArm, build.forearm, pole);
    f[`upperArm${side}`] = frameAlong(shoulder, sub(ik.mid, shoulder), ik.bend);
    f[`forearm${side}`] = frameAlong(ik.mid, sub(ik.end, ik.mid), ik.bend);
    f[`forearm${side}`].reached = ik.reached;
  }

  // The sword hand: the grip runs along the blade; the fist hangs from the wrist toward it.
  {
    const wrist = f.forearmN.o === undefined ? null : add(f.forearmN.o, scale(f.forearmN.z, build.forearm));
    const blade = direction(bladeDirection(p.sword));
    const along = f.forearmN.z;
    // The hand's long axis: the forearm's direction, kept clear of the blade so the grip is square.
    let down = sub(along, scale(blade, dot(along, blade)));
    if (length(down) < 0.25) down = madd(down, rotate(blade, f.chest.y, 90), 0.5);
    f.handN = frameXZ(wrist, blade, down);
    const edge = p.edge ? normalize(p.edge) : f.handN.z;
    f.sword = frameXZ(toParent(f.handN, [0, 0, build.hand]), blade, edge);
  }

  // The shield hand: a centre grip, so the shield's boss sits just in front of the fist and its
  // face turns as asked, whatever the forearm's angle.
  {
    const wrist = add(f.forearmF.o, scale(f.forearmF.z, build.forearm));
    const arm = f.forearmF.z;
    const face = direction(shieldDirection(p.shield));
    f.handF = frameXZ(wrist, arm, face);
    const fist = add(wrist, scale(arm, build.hand));
    const centre = add(fist, scale(face, 1.6));
    // The pattern stays upright: the shield's x axis runs up its face.
    const upright = sub(UP, scale(face, dot(UP, face)));
    f.shield = frameXZ(centre, length(upright) > 0.3 ? upright : arm, face);
  }
  return f;
}

// --- Parts and skinning -------------------------------------------------------------------------

/**
 * Binds a part to the rest pose. `bind` is a bone name (rigid) or a function
 * (restPoint, uv, index) -> [[bone, weight], ...] for parts that bend.
 */
export function bindPart(def, rest) {
  const { mesh, bind } = def;
  const influences = mesh.v.map((p, i) => {
    const weights = typeof bind === "string" ? [[bind, 1]] : bind(p, mesh.uv[i], i);
    const total = weights.reduce((s, [, w]) => s + w, 0) || 1;
    return weights.filter(([, w]) => w > 1e-4).map(([bone, w]) => {
      if (!rest[bone]) throw new Error(`unknown bone ${bone} in ${def.name}`);
      return { bone, w: w / total, local: toLocal(rest[bone], p) };
    });
  });
  return { ...def, influences };
}

/** The part's vertices in a solved pose. */
export function posePart(bound, frames) {
  // A skirt follows the thighs only as far as the pose allows (a seated robe lies in the lap).
  const follow = bound.skirt ? frames.skirtFollow : 1;
  return bound.influences.map((list) => {
    let x = 0;
    let y = 0;
    let z = 0;
    let spare = 0;
    for (const { bone, w, local } of list) {
      let weight = w;
      if (follow !== 1 && (bone === "thighN" || bone === "thighF")) {
        weight = w * follow;
        spare += w - weight;
      }
      const q = toParent(frames[bone], local);
      x += q[0] * weight;
      y += q[1] * weight;
      z += q[2] * weight;
    }
    if (spare > 0) {
      const pelvis = list.find((i) => i.bone === "pelvis");
      if (pelvis) {
        const q = toParent(frames.pelvis, pelvis.local);
        x += q[0] * spare;
        y += q[1] * spare;
        z += q[2] * spare;
      }
    }
    return [x, y, z];
  });
}

/** Weights that hand a limb over from one bone to the next around a joint. */
export function jointBlend(p, joint, axis, before, after, width = 2.5) {
  const t = dot(sub(p, joint), axis);
  const k = clamp((t + width) / (2 * width), 0, 1);
  const s = k * k * (3 - 2 * k);
  return [[before, 1 - s], [after, s]];
}

// --- Cloth chains -------------------------------------------------------------------------------

/**
 * Simulates hanging cloth (a scarf tail, sash ends) as chains of points, over a run of solved
 * frames. Each chain: { anchor: (frames) => point, dir: (frames) => initial direction, links,
 * length, stiffness }. `motion` is the body's own travel per second (the game moves the body, the
 * sprite stays put), so running streams the cloth behind. Colliders are capsules from the frames.
 */
export function simulateChains(chains, framesList, { dt, loop = false, motion = [0, 0, 0], wind = [-24, 0, 10],
  gravity = 380, drag = 2.2, colliders = () => [], warmup = 0.8, substeps = 6, flutter = 0.5, seed = 1, limpness = 0 } = {}) {
  const count = framesList.length;
  const results = framesList.map(() => []);
  // The sprite stays put while the game moves the body, so the cloth lives in the body's own
  // space and the air streams past it at the wind's speed less the body's.
  const airBase = sub(wind, motion);
  // Waves run down the cloth; for a loop their periods divide the loop so it closes seamlessly.
  const total = Array.isArray(dt) ? dt.reduce((a, b) => a + b, 0) : dt * count;
  const period = loop ? total : 0.64;
  const w1 = (2 * Math.PI * Math.max(1, Math.round(period / 0.34))) / period;
  const w2 = (2 * Math.PI * Math.max(2, Math.round(period / 0.2))) / period;
  for (const [ci, chain] of chains.entries()) {
    const n = chain.links;
    const linkLength = chain.length / n;
    const a0 = chain.anchor(framesList[0]);
    const d0 = normalize(chain.dir(framesList[0]));
    let pts = Array.from({ length: n + 1 }, (_, i) => madd(a0, d0, i * linkLength));
    let prev = pts.map((q) => [...q]);
    let time = 0;
    const step = (frames, nextFrames, k, h) => {
      const anchor = add(scale(chain.anchor(frames), 1 - k), scale(chain.anchor(nextFrames), k));
      const caps = colliders(frames);
      const air = airBase;
      const next = pts.map((q, i) => {
        if (i === 0) return anchor;
        const vel = scale(sub(q, prev[i]), 1 / h);
        const acc = add([0, 0, -gravity * (chain.weight ?? 1)], scale(sub(air, vel), drag * (chain.catch ?? 1)));
        // Flutter: waves travel down the cloth, growing toward its free end.
        const wave = Math.sin(w1 * time - i * 0.9 + ci * 1.7 + seed) * 0.65 + Math.sin(w2 * time - i * 1.6 + ci * 2.3) * 0.35;
        acc[2] += (i / n) * wave * flutter * (chain.flutter ?? 1) * 70;
        return add(add(q, scale(vel, h * 0.985)), scale(acc, h * h));
      });
      prev = pts;
      pts = next;
      const shape = chain.rest ? chain.rest(frames) : null;
      for (let iter = 0; iter < 4; iter++) {
        pts[0] = anchor;
        for (let i = 1; i < pts.length; i++) {
          const d = sub(pts[i], pts[i - 1]);
          const l = length(d) || 1e-6;
          const fix = scale(d, (l - linkLength) / l);
          if (i === 1) pts[i] = sub(pts[i], fix);
          else {
            pts[i] = sub(pts[i], scale(fix, 0.5));
            pts[i - 1] = add(pts[i - 1], scale(fix, 0.5));
          }
        }
        // Bending stiffness: each point leans toward continuing the line of the two before it.
        // (A limp body's cloth lets go of its shape and simply falls.)
        const stiffness = (chain.stiffness ?? 0) * (1 - limpness);
        if (stiffness) {
          for (let i = 2; i < pts.length; i++) {
            const straight = add(pts[i - 1], sub(pts[i - 1], pts[i - 2]));
            pts[i] = add(pts[i], scale(sub(straight, pts[i]), stiffness * 0.5));
          }
        }
        // A preferred hang relative to the body (cloth that keeps some shape).
        if (shape) {
          for (let i = 1; i < pts.length; i++) pts[i] = add(pts[i], scale(sub(shape[i], pts[i]), chain.restPull ?? 0.05));
        }
        for (const cap of caps) {
          for (let i = 1; i < pts.length; i++) pts[i] = pushOut(pts[i], cap);
        }
        if (chain.floor !== false) {
          for (let i = 1; i < pts.length; i++) if (pts[i][2] < 0.5) pts[i] = [pts[i][0], pts[i][1], 0.5];
        }
      }
      time += h;
    };
    const run = (record) => {
      for (let fi = 0; fi < count; fi++) {
        const frames = framesList[fi];
        const nextFrames = framesList[loop ? (fi + 1) % count : Math.min(count - 1, fi + 1)];
        const duration = Array.isArray(dt) ? dt[fi] : dt;
        const h = duration / substeps;
        if (record) results[fi][ci] = pts.map((q) => [...q]);
        for (let s = 0; s < substeps; s++) step(frames, nextFrames, s / substeps, h);
      }
    };
    // Settle first: run the loop twice, or hold the first pose for a moment.
    if (loop) {
      run(false);
      run(false);
    } else {
      const h = 1 / 60 / substeps;
      for (let s = 0; s < Math.round(warmup * 60 * substeps); s++) step(framesList[0], framesList[0], 0, h);
    }
    run(true);
  }
  return results;
}

/** Pushes a point out of a capsule { a, b, r }. */
function pushOut(q, { a, b, r }) {
  const ab = sub(b, a);
  const t = clamp(dot(sub(q, a), ab) / Math.max(1e-6, dot(ab, ab)), 0, 1);
  const c = add(a, scale(ab, t));
  const d = sub(q, c);
  const l = length(d);
  if (l >= r || l < 1e-6) return q;
  return add(c, scale(d, r / l));
}

/** Side vectors for a ribbon through points: across the chain, facing the camera, with a twist. */
export function ribbonSides(points, twist = 0) {
  return points.map((q, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const tangent = normalize(sub(b, a));
    let side = cross(tangent, [0, 1, 0]);
    if (length(side) < 1e-3) side = [1, 0, 0];
    side = normalize(side);
    return twist ? normalize(rotate(side, tangent, twist * (i / (points.length - 1)))) : side;
  });
}

export { compose, dirToParent, toParent, turn, frameAlong, frameXZ, euler, normalize, add, sub, scale, dot, cross, length, madd, rotate };
