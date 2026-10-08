// Renders a 3D character's animation into sprite frames: every pose is solved into bones, the
// cloth is simulated through the whole run of frames (so it trails and settles), the posed parts
// are rasterised into a G-buffer at four samples a pixel and shaded into pixel art, and the blade
// is drawn on top as a crisp two-pixel line, hidden where the body passes in front of it. Sword
// trails are not drawn here: the game draws them at runtime (features/combat/sword_trail.gd).
import { Canvas } from "../lib/canvas.mjs";
import { ribbon } from "../lib/meshes.mjs";
import { rasterize, spriteCamera } from "../lib/raster.mjs";
import { clamp, dot, normalize, rotate, sub, toParent } from "../lib/space.mjs";
import { shadeSprite } from "../lib/sprite_shader.mjs";
import { bindPart, posePart, ribbonSides, simulateChains, solveBody } from "./body3d.mjs";
import { plantFeet } from "../lib/root_motion.mjs";

const SAMPLES = 4;

/** Binds a character's parts once: { parts, chains, blade, colliders, rest, build?, yaw? }. */
export function prepareCharacter(def) {
  return { ...def, bound: def.parts.map((p) => bindPart(p, def.rest)) };
}

/**
 * Sets a pose marked ground: true down on the ground (a body curled in a roll, a body lying dead).
 * Skirts do not hold it up: on the ground their cloth lies flat (see renderPoses).
 */
function grounded(character, pose) {
  if (!pose.ground) return pose;
  const frames = solveBody(pose, character.build);
  let low = Infinity;
  for (const part of character.bound) {
    if (part.group === "sword" || part.skirt || (part.optional && !pose.show?.includes(part.name))) continue;
    if (pose.hide?.includes(part.name)) continue;
    for (const v of posePart(part, frames)) low = Math.min(low, v[2]);
  }
  return { ...pose, pelvis: [pose.pelvis[0], pose.pelvis[1] - low + 0.4] };
}

/** Springs the back of the coat's skirt behind the body as it moves. */
function skirtLags(framesList, { dt, loop, motion }) {
  const count = framesList.length;
  const step = (i) => (Array.isArray(dt) ? dt[i] : dt);
  let angle = 0;
  let speed = 0;
  const out = new Array(count).fill(0);
  const run = (record) => {
    for (let i = 0; i < count; i++) {
      const next = loop ? (i + 1) % count : Math.min(count - 1, i + 1);
      const h = step(i);
      const vx = motion[0] + (framesList[next].pelvis.o[0] - framesList[i].pelvis.o[0]) / h;
      const vz = (framesList[next].pelvis.o[2] - framesList[i].pelvis.o[2]) / h;
      const target = clamp(vx * 0.16 + Math.max(0, vz) * 0.05, -14, 34);
      if (record) out[i] = angle;
      const sub = 6;
      for (let s = 0; s < sub; s++) {
        const k = h / sub;
        speed += ((target - angle) * 160 - speed * 13) * k;
        angle += speed * k;
      }
    }
  };
  if (loop) {
    run(false);
    run(false);
  } else {
    angle = clamp(motion[0] * 0.16, -14, 34);
  }
  run(true);
  return out;
}

/** Points along the blade in character space, from the guard to the tip. */
function bladePoints(sword, blade, steps = 24) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    pts.push(toParent(sword, [blade.from + k * blade.length, 0, -blade.curve * k * k]));
  }
  return pts;
}

/**
 * Draws the blade: a line of the bright edge with a darker line along its spine, tapering to the
 * tip, kept behind whatever part of the body is nearer the camera.
 */
function drawBlade(canvas, camera, shaded, sword, blade, size = 1) {
  const pts = bladePoints(sword, blade).map((p) => camera.project(scale3(p, size)));
  const edgeDir = camera.view(sword.z);
  const edge2 = normalize([edgeDir[0], -edgeDir[1], 0]);
  const painted = new Map();
  const put = (x, y, depth, color, rank) => {
    if (x < 0 || y < 0 || x >= camera.width || y >= camera.height) return;
    const o = y * camera.width + x;
    const id = shaded.ids[o];
    if (id >= 0 && shaded.depth[o] < depth - 0.6) return;
    const key = o;
    const prev = painted.get(key);
    if (prev && prev.rank >= rank) return;
    painted.set(key, { x, y, color, rank });
  };
  const total = pts.length - 1;
  for (let i = 0; i < total; i++) {
    const [ax, ay, ad] = pts[i];
    const [bx, by, bd] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(len * 4));
    for (let s = 0; s <= n; s++) {
      const k = s / n;
      const x = ax + (bx - ax) * k;
      const y = ay + (by - ay) * k;
      const d = ad + (bd - ad) * k;
      const along = (i + k) / total;
      const px = Math.floor(x);
      const py = Math.floor(y);
      put(px, py, d, along > 0.93 ? blade.colors.edge : blade.colors.edge, 2);
      if (along > 0.9) continue;
      // The spine: one pixel off the edge line, across the blade's major axis.
      const dx = bx - ax;
      const dy = by - ay;
      let ox = 0;
      let oy = 0;
      if (Math.abs(dx) >= Math.abs(dy)) oy = edge2[1] > 0 ? -1 : 1;
      else ox = edge2[0] > 0 ? -1 : 1;
      put(px + ox, py + oy, d, along < 0.08 ? blade.colors.spine : blade.colors.flat, 1);
    }
  }
  if (!blade.hidden) for (const { x, y, color } of painted.values()) canvas.set(x, y, color);
  const [hx, hy] = pts[0];
  const [tx, ty] = pts[pts.length - 1];
  const ax = camera.width / 2;
  const ay = camera.height - camera.baseline;
  return { hilt: [hx - ax, hy - ay], tip: [tx - ax, ty - ay] };
}

const scale3 = (p, k) => [p[0] * k, p[1] * k, p[2] * k];

/** Draws a one-pixel polyline (a bowstring, an arrow), hidden behind nearer parts of the body. */
function drawLine(canvas, camera, shaded, points, color) {
  const pts = points.map((p) => camera.project(p));
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, ad] = pts[i];
    const [bx, by, bd] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 3));
    for (let s = 0; s <= n; s++) {
      const k = s / n;
      const x = Math.floor(ax + (bx - ax) * k);
      const y = Math.floor(ay + (by - ay) * k);
      if (x < 0 || y < 0 || x >= camera.width || y >= camera.height) continue;
      const o = y * camera.width + x;
      if (shaded.ids[o] >= 0 && shaded.depth[o] < ad + (bd - ad) * k - 0.6) continue;
      canvas.set(x, y, color);
    }
  }
}

/**
 * Renders an animation: { size: [w, h], poses: [...], fps, durations?, loop, motion?, wind?,
 * limp? }. Returns frames with the
 * canvas and the blade (body space: x forward, y down, origin at the feet).
 */
export function renderPoses(character, animation) {
  const [width, height] = animation.size;
  const camera = spriteCamera({ width, height, scale: SAMPLES, yaw: character.yaw ?? 20 });
  const fps = animation.fps;
  const dt = animation.durations ? animation.durations.map((d) => d / fps) : 1 / fps;
  const motion = animation.motion ?? [0, 0, 0];
  const loop = Boolean(animation.loop);
  // An attack that carries the body forward keeps its planted feet still on the ground.
  const planted = animation.travel
    ? plantFeet(animation.poses, animation.travel, Math.cos(((character.yaw ?? 20) * Math.PI) / 180) * (character.scale ?? 1))
    : animation.poses;
  const poses = planted.map((pose) => grounded(character, pose));
  let framesList = poses.map((pose) => solveBody(pose, character.build));
  // The coat's back panel lags behind the body's motion.
  const lags = skirtLags(framesList, { dt, loop, motion });
  framesList = poses.map((pose, i) => solveBody({ ...pose, skirt: (pose.skirt ?? 0) + lags[i] },
    character.build));
  const cloth = simulateChains(character.chains, framesList, {
    dt, loop, motion, wind: animation.wind ?? [-46, 0, 8], colliders: character.colliders,
    limpness: animation.limp ?? 0, flutter: animation.limp ? 0.1 : 0.5,
  });
  // A bigger man (the captain) is the same figure scaled about his feet.
  const size = character.scale ?? 1;
  const grow = (points) => (size === 1 ? points : points.map((p) => scale3(p, size)));
  const rendered = framesList.map((frames, i) => {
    const pose = poses[i];
    const items = [];
    const parts = [];
    for (const part of character.bound) {
      if (pose.hide?.includes(part.name)) continue;
      if (part.optional && !pose.show?.includes(part.name)) continue;
      // A skirt on a body lying on the ground spreads flat on it instead of hanging through it.
      let v = grow(posePart(part, frames));
      if (pose.ground && part.skirt) v = v.map((p) => (p[2] < 0.6 ? [p[0], p[1], 0.6] : p));
      items.push({ id: parts.length, v, uv: part.mesh.uv, t: part.mesh.t,
        smooth: part.mesh.smooth, twoSided: part.mesh.twoSided, bias: part.bias });
      parts.push(part);
    }
    character.chains.forEach((chain, c) => {
      if (pose.hide?.includes(chain.name)) return;
      const pts = cloth[i][c];
      const m = ribbon(pts, chain.widths, ribbonSides(pts, chain.twist ?? 0));
      items.push({ id: parts.length, v: grow(m.v), uv: m.uv, t: m.t, twoSided: true });
      parts.push({ name: chain.name, material: chain.material, group: chain.group, prio: chain.prio ?? 1 });
    });
    const g = rasterize(camera, items);
    const shaded = shadeSprite(g, camera, parts, character.shading ?? {});
    const canvas = shaded.canvas;
    const blade = pose.noBlade || !character.blade ? null
      : drawBlade(canvas, camera, shaded, frames.sword, character.blade, size);
    for (const line of character.lines?.(frames, pose) ?? []) drawLine(canvas, camera, shaded, grow(line.points), line.color);
    // Where the wound is, for the blood the game spurts from it (body space, like the blade).
    // (A pose may move it: a second cut opens a second wound.)
    let wound = null;
    const woundAt = pose.woundAt ?? animation.wound;
    if (woundAt) {
      const [x, y] = camera.project(scale3(woundAt(frames), size));
      wound = [x - camera.width / 2, y - (camera.height - camera.baseline)];
    }
    return { canvas, blade, wound };
  });
  return rendered;
}

/**
 * Renders a piece cut from a character (a head, an arm, a leg, the upper body) tumbling: the parts
 * named, posed as `pose`, turned in the picture plane about `pivot` through each of `angles`, so
 * the light moves over it as it turns. `clip` (restPoint, partName) => keep drops the triangles of
 * the far side of a cut. Each frame has the pivot at the canvas centre and knows `bottom`, how far
 * below the centre its lowest pixel lies (where it rests on the ground).
 */
export function renderPiece(character, { pose, parts, pivot, clip = null, blade = false, angles, size, chains = [] }) {
  const [width, height] = size;
  const camera = spriteCamera({ width, height, scale: SAMPLES, yaw: character.yaw ?? 20, baseline: height / 2 });
  const frames = solveBody(pose, character.build);
  const centre = pivot(frames);
  const grow = character.scale ?? 1;
  const chosen = character.bound.filter((part) => parts.includes(part.name));
  const meshes = chosen.map((part) => ({
    part,
    v: posePart(part, frames),
    t: clip ? part.mesh.t.filter((tri) => tri.every((i) => clip(part.mesh.v[i], part.name))) : part.mesh.t,
  }));
  // Cloth chains on the piece (a plume), hanging along their rest direction with a little droop.
  const shown = [...chosen];
  for (const chain of (character.chains ?? []).filter((c) => chains.includes(c.name))) {
    const anchor = chain.anchor(frames);
    const dir = normalize(chain.dir(frames));
    const pts = Array.from({ length: chain.links + 1 }, (_, i) => {
      const k = i / chain.links;
      return [anchor[0] + dir[0] * chain.length * k, anchor[1] + dir[1] * chain.length * k,
        anchor[2] + dir[2] * chain.length * k - k * k * chain.length * 0.25];
    });
    const m = ribbon(pts, chain.widths, ribbonSides(pts, chain.twist ?? 0));
    const part = { name: chain.name, material: chain.material, group: chain.group, prio: chain.prio ?? 1 };
    meshes.push({ part: { ...part, mesh: m }, v: m.v, t: m.t });
    shown.push(part);
  }
  const axis = camera.into;
  return angles.map((angle) => {
    const turn = (p) => rotate(sub(p, centre), axis, angle);
    const items = meshes.map(({ part, v, t }, id) => ({ id, v: v.map((p) => scale3(turn(p), grow)), uv: part.mesh.uv, t,
      smooth: part.mesh.smooth, twoSided: part.mesh.twoSided || part.name === "plume", bias: part.bias }));
    const g = rasterize(camera, items);
    const shaded = shadeSprite(g, camera, shown, character.shading ?? {});
    const canvas = shaded.canvas;
    if (blade && character.blade) {
      const sword = frames.sword;
      const turned = { o: turn(sword.o), x: rotate(sword.x, axis, angle), y: rotate(sword.y, axis, angle),
        z: rotate(sword.z, axis, angle) };
      drawBlade(canvas, camera, shaded, turned, character.blade, grow);
    }
    let lowest = -1;
    for (let y = height - 1; y >= 0 && lowest < 0; y--) {
      for (let x = 0; x < width; x++) {
        if (canvas.alpha(x, y) > 0) {
          lowest = y;
          break;
        }
      }
    }
    return { canvas, bottom: lowest < 0 ? 0 : lowest + 1 - height / 2 };
  });
}

export { Canvas, dot, sub };
