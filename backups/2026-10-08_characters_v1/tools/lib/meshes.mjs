// Mesh builders for the character renderer. A mesh is { v: [[x,y,z]], uv: [[u,v,w]], t: [[a,b,c]] }
// plus flags: smooth (vertex normals, welded across seams) and twoSided (thin cloth seen from both
// faces). UVs are laid along the surface in pixels (u around, v along) so patterns keep their
// size; w is the normalised position around a tube or lathe (0 at its front, 1 all the way round).
import { add, cross, length, normalize, rotate, scale, sub, toParent, dot } from "./space.mjs";

const TAU = Math.PI * 2;

export function mesh(v, uv, t, flags = {}) {
  return { v, uv, t, smooth: true, twoSided: false, ...flags };
}

/** Joins meshes (flags from the first). */
export function merge(...meshes) {
  const out = mesh([], [], [], { smooth: meshes[0].smooth, twoSided: meshes[0].twoSided });
  for (const m of meshes) {
    const base = out.v.length;
    out.v.push(...m.v);
    out.uv.push(...m.uv);
    for (const [a, b, c] of m.t) out.t.push([a + base, b + base, c + base]);
  }
  return out;
}

/** Carries a mesh from a frame's coordinates into its parent space. */
export function place(m, frame) {
  return { ...m, v: m.v.map((p) => toParent(frame, p)) };
}

export function translate(m, offset) {
  return { ...m, v: m.v.map((p) => add(p, offset)) };
}

export function rotated(m, axis, degrees, pivot = [0, 0, 0]) {
  return { ...m, v: m.v.map((p) => add(pivot, rotate(sub(p, pivot), axis, degrees))) };
}

/** Moves every vertex with a function (p, uv, index) -> p. */
export function warp(m, fn) {
  return { ...m, v: m.v.map((p, i) => fn(p, m.uv[i], i)) };
}

/** Joins a grid of rows x columns vertices into quads (no wrap: seams are duplicated columns). */
function quads(t, rows, columns, base = 0) {
  for (let i = 0; i < rows - 1; i++) {
    for (let k = 0; k < columns - 1; k++) {
      const a = base + i * columns + k;
      const b = a + 1;
      const c = a + columns + 1;
      const d = a + columns;
      t.push([a, b, c], [a, c, d]);
    }
  }
}

/**
 * A lofted tube through rings. Each ring: { c: centre, rx (or rf front / rb back), ry, front? }.
 * The cross-section is two half-ellipses: rf toward the ring's front vector, rb away from it, ry
 * across. The tube's axis follows the centres. Options: sides, caps ("both", "start", "end",
 * "none"), dome (how far caps bulge, in radii), open (a gap in radians centred on the front: a
 * coat open down its front).
 */
export function tube(rings, { sides = 12, caps = "both", dome = 0.5, front = [1, 0, 0], open = 0 } = {}) {
  const v = [];
  const uv = [];
  const t = [];
  const n = rings.length;
  const frames = rings.map((ring, i) => {
    const prev = rings[Math.max(0, i - 1)].c;
    const next = rings[Math.min(n - 1, i + 1)].c;
    const tangent = normalize(sub(next, prev));
    const hint = ring.front ?? front;
    let e1 = sub(hint, scale(tangent, dot(hint, tangent)));
    if (length(e1) < 1e-5) e1 = Math.abs(tangent[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    e1 = normalize(sub(e1, scale(tangent, dot(e1, tangent))));
    return { tangent, e1, e2: cross(tangent, e1) };
  });
  const columns = sides + 1;
  let along = 0;
  for (let i = 0; i < n; i++) {
    const ring = rings[i];
    if (i > 0) along += length(sub(ring.c, rings[i - 1].c));
    const { e1, e2 } = frames[i];
    const rf = ring.rf ?? ring.rx;
    const rb = ring.rb ?? ring.rx;
    const ry = ring.ry ?? ring.rx;
    const meanR = (rf + rb + 2 * ry) / 4;
    for (let k = 0; k < columns; k++) {
      const a = open / 2 + (k / sides) * (TAU - open);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const p = add(ring.c, add(scale(e1, ca * (ca >= 0 ? rf : rb)), scale(e2, sa * ry)));
      v.push(p);
      uv.push([a * meanR, along, a / TAU]);
    }
  }
  quads(t, n, columns);
  if (!open && (caps === "both" || caps === "start")) {
    const r = rings[0];
    const ci = v.length;
    v.push(add(r.c, scale(frames[0].tangent, -dome * Math.min(r.rf ?? r.rx, r.ry ?? r.rx))));
    uv.push([0, -1, 0]);
    for (let k = 0; k < sides; k++) t.push([ci, k + 1, k]);
  }
  if (!open && (caps === "both" || caps === "end")) {
    const r = rings[n - 1];
    const ci = v.length;
    v.push(add(r.c, scale(frames[n - 1].tangent, dome * Math.min(r.rf ?? r.rx, r.ry ?? r.rx))));
    uv.push([0, along + 1, 0]);
    const base = (n - 1) * columns;
    for (let k = 0; k < sides; k++) t.push([ci, base + k, base + k + 1]);
  }
  return mesh(v, uv, t, { twoSided: open > 0 || caps === "none" });
}

/** A limb from a to b tapering from r0 to r1, with an optional bulge (loose trousers, a calf). */
export function limb(a, b, r0, r1, { bulge = 0, bulgeAt = 0.5, flat = 1, front = [1, 0, 0], steps = 5, sides = 10,
  dome = 0.6, caps = "both" } = {}) {
  const rings = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const w = k < bulgeAt ? (0.5 * k) / bulgeAt : 0.5 + (0.5 * (k - bulgeAt)) / (1 - bulgeAt);
    const r = r0 + (r1 - r0) * k + bulge * Math.sin(Math.PI * w);
    rings.push({ c: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], rx: r * flat, ry: r });
  }
  return tube(rings, { sides, front, dome, caps });
}

/**
 * An ellipsoid about `centre` with radii along the given axes. `power` below 1 squares it off
 * toward a rounded box.
 */
export function ellipsoid(centre, radii, { axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], rings = 8, segments = 12,
  power = 1 } = {}) {
  const v = [];
  const uv = [];
  const t = [];
  const frame = { o: centre, x: axes[0], y: axes[1], z: axes[2] };
  const sp = (x, p) => Math.sign(x) * Math.abs(x) ** p;
  const columns = segments + 1;
  for (let i = 0; i <= rings; i++) {
    const lat = -Math.PI / 2 + (i / rings) * Math.PI;
    for (let k = 0; k < columns; k++) {
      const lon = (k / segments) * TAU;
      const cl = sp(Math.cos(lat), power);
      v.push(toParent(frame, [radii[0] * cl * sp(Math.cos(lon), power), radii[1] * cl * sp(Math.sin(lon), power),
        radii[2] * sp(Math.sin(lat), power)]));
      uv.push([(lon * (radii[0] + radii[1])) / 2, lat * radii[2], lon / TAU]);
    }
  }
  quads(t, rings + 1, columns);
  return mesh(v, uv, t);
}

/** A rounded box (a superellipsoid): size is the full extent along each axis. */
export function roundedBox(centre, size, { axes, roundness = 0.4, rings = 8, segments = 16 } = {}) {
  return ellipsoid(centre, [size[0] / 2, size[1] / 2, size[2] / 2], { axes, rings, segments, power: roundness });
}

/**
 * A surface of revolution about the frame's z axis: profile is [[radius, z], ...] from bottom to
 * top. squash scales the x and y radii (an oval helmet).
 */
export function lathe(profile, { frame = { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, segments = 16,
  closeBottom = true, closeTop = true, squash = [1, 1] } = {}) {
  const v = [];
  const uv = [];
  const t = [];
  const columns = segments + 1;
  let along = 0;
  const meanR = profile.reduce((s, p) => s + p[0], 0) / profile.length;
  profile.forEach(([r, z], i) => {
    if (i > 0) along += Math.hypot(r - profile[i - 1][0], z - profile[i - 1][1]);
    for (let k = 0; k < columns; k++) {
      const a = (k / segments) * TAU;
      v.push(toParent(frame, [Math.cos(a) * r * squash[0], Math.sin(a) * r * squash[1], z]));
      uv.push([a * meanR, along, a / TAU]);
    }
  });
  quads(t, profile.length, columns);
  if (closeBottom && profile[0][0] > 0) {
    const ci = v.length;
    v.push(toParent(frame, [0, 0, profile[0][1]]));
    uv.push([0, -1, 0]);
    for (let k = 0; k < segments; k++) t.push([ci, k + 1, k]);
  }
  const last = profile.length - 1;
  if (closeTop && profile[last][0] > 0) {
    const ci = v.length;
    v.push(toParent(frame, [0, 0, profile[last][1]]));
    uv.push([0, along + 1, 0]);
    for (let k = 0; k < segments; k++) t.push([ci, last * columns + k, last * columns + k + 1]);
  }
  return mesh(v, uv, t, { twoSided: !closeBottom || !closeTop });
}

/**
 * A round shield: a shallow dome of `radius` facing +z in `frame`, a rim and a flat back. UV is
 * the face's own plane in pixels (x, y from the centre); w is the distance from the centre.
 */
export function shieldDisc(radius, { frame = { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, dome = 2, thickness = 1.2, rings = 6, segments = 28 } = {}) {
  const v = [];
  const uv = [];
  const t = [];
  const columns = segments + 1;
  for (let i = 0; i <= rings; i++) {
    const r = (radius * i) / rings;
    const z = thickness / 2 + dome * (1 - (i / rings) ** 2);
    for (let k = 0; k < columns; k++) {
      const a = (k / segments) * TAU;
      const p = [Math.cos(a) * r, Math.sin(a) * r, z];
      v.push(toParent(frame, p));
      uv.push([p[0], p[1], r]);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let k = 0; k < segments; k++) {
      const a = i * columns + k;
      t.push([a, a + columns, a + columns + 1], [a, a + columns + 1, a + 1]);
    }
  }
  const back = v.length;
  for (let k = 0; k < columns; k++) {
    const a = (k / segments) * TAU;
    const p = [Math.cos(a) * radius, Math.sin(a) * radius, -thickness / 2];
    v.push(toParent(frame, p));
    uv.push([p[0], p[1], radius + 0.5]);
  }
  const rim = rings * columns;
  for (let k = 0; k < segments; k++) {
    t.push([rim + k, back + k, back + k + 1], [rim + k, back + k + 1, rim + k + 1]);
  }
  const ci = v.length;
  v.push(toParent(frame, [0, 0, -thickness / 2]));
  uv.push([0, 0, radius + 1]);
  for (let k = 0; k < segments; k++) t.push([ci, back + k + 1, back + k]);
  return mesh(v, uv, t);
}

/**
 * A ribbon (a scarf tail, a sash end) through points, `widths` per point, lying across `sides`
 * (unit vectors per point). Two-sided. UV: u across (pixels from the centre line), v along,
 * w the fraction of the way along.
 */
export function ribbon(points, widths, sides) {
  const v = [];
  const uv = [];
  const t = [];
  let along = 0;
  const total = points.reduce((s, p, i) => (i ? s + length(sub(p, points[i - 1])) : 0), 0) || 1;
  points.forEach((p, i) => {
    if (i > 0) along += length(sub(p, points[i - 1]));
    const w = widths[i] / 2;
    v.push(add(p, scale(sides[i], -w)), add(p, scale(sides[i], w)));
    uv.push([-w, along, along / total], [w, along, along / total]);
  });
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    t.push([a, a + 1, a + 3], [a, a + 3, a + 2]);
  }
  return mesh(v, uv, t, { twoSided: true });
}

/** Vertex normals (area weighted), welded so seams and duplicated columns shade smoothly. */
export function vertexNormals(v, t) {
  const n = v.map(() => [0, 0, 0]);
  for (const [a, b, c] of t) {
    const fn = cross(sub(v[b], v[a]), sub(v[c], v[a]));
    for (const i of [a, b, c]) {
      n[i][0] += fn[0];
      n[i][1] += fn[1];
      n[i][2] += fn[2];
    }
  }
  const groups = new Map();
  v.forEach((p, i) => {
    const key = `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)},${Math.round(p[2] * 1000)}`;
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  });
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const sum = [0, 0, 0];
    for (const i of members) {
      sum[0] += n[i][0];
      sum[1] += n[i][1];
      sum[2] += n[i][2];
    }
    for (const i of members) n[i] = [...sum];
  }
  return n.map(normalize);
}
