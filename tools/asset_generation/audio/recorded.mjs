// What building a cue from recordings needs: the kit's takes (assets/audio/kit/, cut by build_kit.mjs), speed
// changed as a sampler would (pitch and length together), excerpts, filters, layering at a level in dB, and levelling
// a finished sound by how loud it is to the ear (its loudest 50 ms) with a look-ahead limiter keeping its peaks under
// the ceiling, so takes of one cue match each other and cues keep their places in the mix.
import { existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readWav } from "./analysis.mjs";
import { biquad, buffer, mixInto } from "./dsp.mjs";

const KIT = join(resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."), "assets", "audio", "kit");
const takes = new Map();

/** How many takes the kit holds of a family. */
export function kitCount(family) {
  if (!existsSync(KIT)) throw new Error("assets/audio/kit is missing: run build_kit.mjs");
  return readdirSync(KIT).filter((f) => new RegExp(`^${family}_\\d+\\.wav$`).test(f)).length;
}

/** A take of the kit (1-based, wrapping round the family), as a fresh buffer. */
export function take(family, n) {
  const count = kitCount(family);
  if (count === 0) throw new Error(`the kit has no ${family}`);
  const k = ((n - 1) % count + count) % count + 1;
  const key = `${family}_${k}`;
  if (!takes.has(key)) takes.set(key, readWav(join(KIT, `${key}.wav`)));
  const t = takes.get(key);
  return { rate: t.rate, data: t.data.slice() };
}

/** Played faster (ratio > 1: higher and shorter) or slower (lower and longer), by cubic interpolation. */
export function speed(b, ratio) {
  if (ratio === 1) return b;
  const n = Math.max(1, Math.floor((b.data.length - 1) / ratio));
  const out = new Float32Array(n);
  const d = b.data;
  const at = (i) => d[Math.max(0, Math.min(d.length - 1, i))];
  for (let i = 0; i < n; i++) {
    const p = i * ratio;
    const k = Math.floor(p);
    const f = p - k;
    const y0 = at(k - 1);
    const y1 = at(k);
    const y2 = at(k + 1);
    const y3 = at(k + 2);
    const c1 = 0.5 * (y2 - y0);
    const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    out[i] = ((c3 * f + c2) * f + c1) * f + y1;
  }
  return { rate: b.rate, data: out };
}

/** The part of a sound from `from` to `to` seconds, faded at its ends (1 ms in, `fade` s out). */
export function excerpt(b, from, to, fade = 0.02) {
  const a = Math.max(0, Math.round(from * b.rate));
  const z = Math.min(b.data.length, Math.round(to * b.rate));
  const data = b.data.slice(a, Math.max(a + 1, z));
  const fi = Math.min(data.length, Math.round(0.001 * b.rate));
  for (let i = 0; i < fi; i++) data[i] *= i / fi;
  const fo = Math.min(data.length, Math.round(fade * b.rate));
  for (let i = 0; i < fo; i++) data[data.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fo);
  return { rate: b.rate, data };
}

export const highpass = (b, f, q = 0.7) => biquad(b, "highpass", f, q);
export const lowpass = (b, f, q = 0.7) => biquad(b, "lowpass", f, q);
/** A peaking filter: `db` up (or down) about `f`. */
export const peak = (b, f, q, db) => biquad(b, "peak", f, q, { gainDb: db });

/** Adds `src` into `dst` at `at` seconds, `db` decibels up or down. */
export function layer(dst, src, at, db = 0) {
  return mixInto(dst, src, at, 10 ** (db / 20));
}

/** A silent buffer long enough for every layer laid in it: the longest of (start + length). */
export function room(rate, ...spans) {
  return buffer(Math.max(...spans.map(([at, b]) => at + b.data.length / b.rate)) + 0.01, rate);
}

/** How loud a sound is to the ear: the RMS of its loudest 50 ms, in dBFS. */
export function loudness(b) {
  const w = Math.max(1, Math.round(b.rate * 0.05));
  let sum = 0;
  let loudest = 0;
  for (let i = 0; i < b.data.length; i++) {
    sum += b.data[i] * b.data[i];
    if (i >= w) sum -= b.data[i - w] * b.data[i - w];
    loudest = Math.max(loudest, sum);
  }
  return 10 * Math.log10(loudest / Math.min(w, b.data.length) + 1e-12);
}

/**
 * A look-ahead peak limiter: the gain each sample needs to stay under `ceiling`, held for 1.5 ms before it (so the
 * gain is already down when the peak comes), smoothed over that time and let back up over `release` seconds.
 */
export function limit(b, ceiling = 0.944, release = 0.06) {
  const d = b.data;
  const n = d.length;
  const look = Math.max(1, Math.round(0.0015 * b.rate));
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) need[i] = Math.min(1, ceiling / Math.max(1e-9, Math.abs(d[i])));
  const held = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let g = 1;
    for (let k = i; k < Math.min(n, i + 2 * look); k++) g = Math.min(g, need[k]);
    held[i] = g;
  }
  const back = 1 - Math.exp(-1 / (release * b.rate));
  let g = 1;
  let sum = look;
  const box = new Float32Array(look).fill(1);
  for (let i = 0; i < n; i++) {
    g = held[i] < g ? held[i] : g + (held[i] - g) * back;
    sum += g - box[i % look];
    box[i % look] = g;
    d[i] *= sum / look;
  }
  return b;
}

const CEILING = 0.944;

/** The sound `g` times louder, its peaks then limited (with `release`). */
function gained(b, g, release) {
  return limit({ rate: b.rate, data: Float32Array.from(b.data, (v) => v * g) }, CEILING, release);
}

/**
 * The loudness a sound can reach (its loudest 50 ms, dBFS) with its peak limited by no more than `most` dB: a
 * transient's first milliseconds may be held down a little (the ear judges the 50 ms after them), not crushed.
 */
export function reach(b, { most = 4, release = 0.04 } = {}) {
  let top = 0;
  for (const v of b.data) top = Math.max(top, Math.abs(v));
  return loudness(gained(b, (CEILING / Math.max(1e-9, top)) * 10 ** (most / 20), release));
}

/**
 * Brought to `target` dBFS of loudness (its loudest 50 ms) and its peaks held under -0.5 dBFS by the limiter; the
 * gain is found by a few trials, since limiting the peak takes a little from the loudness, and never pushes the peak
 * more than `most` dB into the limiter (a sound that cannot reach the target stays as loud as it can).
 */
export function level(b, target, { most = 4, release = 0.04 } = {}) {
  let top = 0;
  for (const v of b.data) top = Math.max(top, Math.abs(v));
  const highest = (CEILING / Math.max(1e-9, top)) * 10 ** (most / 20);
  let g = Math.min(highest, 10 ** ((target - loudness(b)) / 20));
  for (let k = 0; k < 4; k++) {
    const missing = target - loudness(gained(b, g, release));
    if (Math.abs(missing) < 0.1) break;
    g = Math.min(highest, g * 10 ** (missing / 20));
  }
  return gained(b, g, release);
}
