// A small software rasteriser for the character renderer. Posed meshes are drawn through an
// orthographic camera into a G-buffer at a multiple of the sprite's resolution: for every sample,
// which part covers it, its depth, its surface normal (in view space) and its surface UV. The
// sprite shader then turns that buffer into pixel art.
import { D2R, cross, dot, normalize, sub } from "./space.mjs";
import { vertexNormals } from "./meshes.mjs";

/**
 * The sprite camera: it looks along +y turned `yaw` degrees toward the character's front, so the
 * near side and a little of the chest show. The character's origin sits at the canvas's centre
 * column, `baseline` pixels above its bottom edge.
 */
export function spriteCamera({ width, height, scale = 4, yaw = 20, baseline = 4 }) {
  const a = yaw * D2R;
  const right = [Math.cos(a), Math.sin(a), 0];
  const into = [-Math.sin(a), Math.cos(a), 0];
  return {
    width,
    height,
    scale,
    baseline,
    right,
    into,
    /** Canvas pixel coordinates (continuous, y down) and depth (larger is farther). */
    project(p) {
      return [width / 2 + dot(p, right), height - baseline - p[2], dot(p, into)];
    },
    /** A normal in view space: x right, y up, z toward the viewer. */
    view(n) {
      return [dot(n, right), n[2], -dot(n, into)];
    },
  };
}

export function gbuffer(width, height) {
  const n = width * height;
  return {
    width,
    height,
    id: new Int16Array(n).fill(-1),
    depth: new Float32Array(n).fill(Infinity),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
    nz: new Float32Array(n),
    u: new Float32Array(n),
    v: new Float32Array(n),
    w: new Float32Array(n),
  };
}

/**
 * Draws items into a G-buffer of (width * scale) x (height * scale) samples. Each item:
 * { id, v (posed vertices), uv, t, smooth, twoSided, bias? } where bias nudges its depth (a strap
 * painted onto a coat wins against the coat without z-fighting).
 */
export function rasterize(camera, items) {
  const S = camera.scale;
  const W = camera.width * S;
  const H = camera.height * S;
  const g = gbuffer(W, H);
  for (const item of items) {
    const screen = item.v.map((p) => {
      const [x, y, z] = camera.project(p);
      return [x * S, y * S, z - (item.bias ?? 0)];
    });
    const normals = item.smooth === false ? null : vertexNormals(item.v, item.t).map((n) => camera.view(n));
    for (const [ia, ib, ic] of item.t) {
      const A = screen[ia];
      const B = screen[ib];
      const C = screen[ic];
      const area = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]);
      if (Math.abs(area) < 1e-6) continue;
      let faceNormal = null;
      if (!normals) {
        faceNormal = camera.view(normalize(cross(sub(item.v[ib], item.v[ia]), sub(item.v[ic], item.v[ia]))));
      }
      const minX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
      const minY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
      const inv = 1 / area;
      for (let y = minY; y <= maxY; y++) {
        const py = y + 0.5;
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5;
          const w0 = ((B[0] - px) * (C[1] - py) - (C[0] - px) * (B[1] - py)) * inv;
          const w1 = ((C[0] - px) * (A[1] - py) - (A[0] - px) * (C[1] - py)) * inv;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-7 || w1 < -1e-7 || w2 < -1e-7) continue;
          const depth = w0 * A[2] + w1 * B[2] + w2 * C[2];
          const i = y * W + x;
          if (depth >= g.depth[i]) continue;
          let n;
          if (normals) {
            const na = normals[ia];
            const nb = normals[ib];
            const nc = normals[ic];
            n = normalize([
              w0 * na[0] + w1 * nb[0] + w2 * nc[0],
              w0 * na[1] + w1 * nb[1] + w2 * nc[1],
              w0 * na[2] + w1 * nb[2] + w2 * nc[2],
            ]);
          } else {
            n = faceNormal;
          }
          // Thin cloth and the inside of anything turn their visible face toward the viewer.
          if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
          g.depth[i] = depth;
          g.id[i] = item.id;
          g.nx[i] = n[0];
          g.ny[i] = n[1];
          g.nz[i] = n[2];
          const ua = item.uv[ia];
          const ub = item.uv[ib];
          const uc = item.uv[ic];
          g.u[i] = w0 * ua[0] + w1 * ub[0] + w2 * uc[0];
          g.v[i] = w0 * ua[1] + w1 * ub[1] + w2 * uc[1];
          g.w[i] = w0 * (ua[2] ?? 0) + w1 * (ub[2] ?? 0) + w2 * (uc[2] ?? 0);
        }
      }
    }
  }
  return g;
}
