// Renders a 3D character's animation into sprite frames: every pose is solved into bones, the
// cloth is simulated through the whole run of frames (so it trails and settles), the posed parts
// are rasterised into a G-buffer at four samples a pixel and shaded into pixel art, and the blade
// is drawn on top as a crisp two-pixel line, hidden where the body passes in front of it.
import { Canvas, hex } from "../lib/canvas.mjs";
import { ribbon } from "../lib/meshes.mjs";
import { rasterize, spriteCamera } from "../lib/raster.mjs";
import { clamp, dot, normalize, sub, toParent } from "../lib/space.mjs";
import { shadeSprite } from "../lib/sprite_shader.mjs";
import { drawSmear } from "../lib/smear.mjs";
import { bindPart, posePart, ribbonSides, simulateChains, solveBody } from "./body3d.mjs";

const SAMPLES = 4;
const SMEAR = [hex("#6f7a86"), hex("#b9c4cf"), hex("#eef4f8")];

/** Binds a character's parts once: { parts, chains, blade, colliders, rest, build?, yaw? }. */
export function prepareCharacter(def) {
  return { ...def, bound: def.parts.map((p) => bindPart(p, def.rest)) };
}

/** Sets a pose marked ground: true down on the ground (a body curled in a roll). */
function grounded(character, pose) {
  if (!pose.ground) return pose;
  const frames = solveBody(pose, character.build);
  let low = Infinity;
  for (const part of character.bound) {
    if (part.group === "sword") continue;
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
  for (const { x, y, color } of painted.values()) canvas.set(x, y, color);
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
 * smear?: frame indices that sweep the blade from the frame before }. Returns frames with the
 * canvas and the blade (body space: x forward, y down, origin at the feet).
 */
export function renderPoses(character, animation) {
  const [width, height] = animation.size;
  const camera = spriteCamera({ width, height, scale: SAMPLES, yaw: character.yaw ?? 20 });
  const fps = animation.fps;
  const dt = animation.durations ? animation.durations.map((d) => d / fps) : 1 / fps;
  const motion = animation.motion ?? [0, 0, 0];
  const loop = Boolean(animation.loop);
  const poses = animation.poses.map((pose) => grounded(character, pose));
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
      items.push({ id: parts.length, v: grow(posePart(part, frames)), uv: part.mesh.uv, t: part.mesh.t,
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
    return { canvas, blade, frames, shaded };
  });
  // Smears: the sweep of the blade since the frame before, drawn behind the figure.
  const anchor = [width / 2, height - camera.baseline];
  const up = (p) => [p[0], -p[1]];
  for (const i of animation.smear ?? []) {
    const from = rendered[(i - 1 + rendered.length) % rendered.length].blade;
    const to = rendered[i].blade;
    if (!from || !to) continue;
    drawSmear(rendered[i].canvas, anchor, { hilt: up(from.hilt), tip: up(from.tip) }, { hilt: up(to.hilt), tip: up(to.tip) },
      character.smearColors ?? SMEAR, { minT: animation.smearMin ?? 0.3 });
  }
  return rendered.map(({ canvas, blade }) => ({ canvas, blade }));
}

export { Canvas, dot, sub };
