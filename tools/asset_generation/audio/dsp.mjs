// A small synthesis toolkit for the game's sounds: buffers, oscillators, noise, envelopes,
// biquad filters, a plucked string (Karplus-Strong with fractional, slidable delay), a reverb in
// the manner of Freeverb, and a 16-bit WAV writer that can embed loop points (a "smpl" chunk,
// which Godot's importer reads). Everything is deterministic for a given seed.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { rng } from "../lib/noise.mjs";

export const TAU = Math.PI * 2;

export function buffer(seconds, rate) {
  return { rate, data: new Float32Array(Math.max(1, Math.round(seconds * rate))) };
}

export const length = (b) => b.data.length / b.rate;

/** Adds `src` into `dst` starting at `at` seconds, scaled by gain. */
export function mixInto(dst, src, at = 0, gain = 1) {
  const offset = Math.round(at * dst.rate);
  for (let i = 0; i < src.data.length; i++) {
    const j = i + offset;
    if (j >= 0 && j < dst.data.length) dst.data[j] += src.data[i] * gain;
  }
  return dst;
}

/** Fills a buffer from a function of (time, index). */
export function render(seconds, rate, fn) {
  const b = buffer(seconds, rate);
  for (let i = 0; i < b.data.length; i++) b.data[i] = fn(i / rate, i);
  return b;
}

export function gain(b, g) {
  for (let i = 0; i < b.data.length; i++) b.data[i] *= g;
  return b;
}

export function normalize(b, peak = 0.9) {
  let max = 0;
  for (const v of b.data) max = Math.max(max, Math.abs(v));
  if (max > 0) gain(b, peak / max);
  return b;
}

/** Soft saturation (tanh), for crunch. */
export function drive(b, amount) {
  for (let i = 0; i < b.data.length; i++) b.data[i] = Math.tanh(b.data[i] * amount) / Math.tanh(amount);
  return b;
}

/** Short fades at both ends so nothing clicks. */
export function fadeEdges(b, inTime = 0.002, outTime = 0.01) {
  const ni = Math.round(inTime * b.rate);
  const no = Math.round(outTime * b.rate);
  for (let i = 0; i < ni && i < b.data.length; i++) b.data[i] *= i / ni;
  for (let i = 0; i < no && i < b.data.length; i++) b.data[b.data.length - 1 - i] *= i / no;
  return b;
}

// --- Sources ---------------------------------------------------------------------------------------

export function whiteNoise(seed) {
  const r = rng(seed);
  return () => r() * 2 - 1;
}

/** Pink noise (Paul Kellet's filter). */
export function pinkNoise(seed) {
  const white = whiteNoise(seed);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = white();
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return out * 0.11;
  };
}

/** Brown (red) noise: integrated white noise, kept from drifting. */
export function brownNoise(seed) {
  const white = whiteNoise(seed);
  let last = 0;
  return () => {
    last = (last + white() * 0.02) * 0.998;
    return last * 3.5;
  };
}

/** An oscillator whose frequency is a function of time. shape: sine, saw, square, tri. */
export function oscillator(freq, shape = "sine") {
  let phase = 0;
  return (t, rate) => {
    phase += (typeof freq === "function" ? freq(t) : freq) / rate;
    phase -= Math.floor(phase);
    switch (shape) {
      case "saw": return phase * 2 - 1;
      case "square": return phase < 0.5 ? 1 : -1;
      case "tri": return 1 - 4 * Math.abs(phase - 0.5);
      default: return Math.sin(phase * TAU);
    }
  };
}

/** Inharmonic ringing partials (bells, metal): [[freq, amp, decay]...]. */
export function partials(seconds, rate, list, { attack = 0.001 } = {}) {
  return render(seconds, rate, (t) => {
    let v = 0;
    for (const [f, a, d] of list) v += Math.sin(TAU * f * t) * a * Math.exp(-t / d);
    return v * Math.min(1, t / attack);
  });
}

// --- Envelopes ------------------------------------------------------------------------------------

export const expDecay = (t, tau) => Math.exp(-t / tau);

/** Attack then exponential decay. */
export const percussive = (t, attack, tau) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));

export function adsr(t, a, d, s, r, hold) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < hold) return s;
  return Math.max(0, s * (1 - (t - hold) / r));
}

// --- Filters -------------------------------------------------------------------------------------

/** RBJ biquad. type: lowpass, highpass, bandpass, peak. freq may be a function of time. */
export function biquad(b, type, freq, q = 0.707, { gainDb = 0 } = {}) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  const update = (f) => {
    const w0 = (TAU * Math.min(f, b.rate * 0.45)) / b.rate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    let a0;
    if (type === "lowpass") {
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
    } else if (type === "highpass") {
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
    } else if (type === "bandpass") {
      b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
    } else {
      const A = Math.pow(10, gainDb / 40);
      b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
    }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  };
  const dynamic = typeof freq === "function";
  if (!dynamic) update(freq);
  for (let i = 0; i < b.data.length; i++) {
    if (dynamic && i % 32 === 0) update(freq(i / b.rate));
    const x = b.data[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    b.data[i] = y;
  }
  return b;
}

// --- The plucked string (an oud's voice) -----------------------------------------------------------

/**
 * Karplus-Strong string. freq may be a function of time (slides). brightness 0..1 shapes the
 * pluck; decay is the loop's loss per period (closer to 1 rings longer).
 */
export function pluck(seconds, rate, freq, { seed = 1, brightness = 0.6, decay = 0.996, body = true } = {}) {
  const out = buffer(seconds, rate);
  const f0 = typeof freq === "function" ? freq(0) : freq;
  const size = Math.ceil(rate / 40) + 4;
  const line = new Float32Array(size);
  const r = rng(seed);
  // Excite with filtered noise of one period.
  const period = rate / f0;
  let lp = 0;
  for (let i = 0; i < Math.ceil(period); i++) {
    lp += (r() * 2 - 1 - lp) * (0.25 + brightness * 0.7);
    line[i % size] = lp;
  }
  let write = Math.ceil(period) % size;
  let prev = 0;
  for (let i = 0; i < out.data.length; i++) {
    const t = i / rate;
    const f = typeof freq === "function" ? freq(t) : freq;
    const delay = rate / f;
    // Read with linear interpolation at a fractional delay behind the write head.
    let readPos = write - delay;
    while (readPos < 0) readPos += size;
    const i0 = Math.floor(readPos) % size;
    const i1 = (i0 + 1) % size;
    const frac = readPos - Math.floor(readPos);
    const sample = line[i0] * (1 - frac) + line[i1] * frac;
    // Two-point average: the string's loss of high partials.
    const filtered = (sample + prev) * 0.5 * decay;
    prev = sample;
    line[write] = filtered;
    write = (write + 1) % size;
    out.data[i] = sample;
  }
  if (body) {
    // The oud's bowl: resonances low and mid.
    const low = biquad({ rate, data: out.data.slice() }, "peak", 220, 1.2, { gainDb: 5 });
    const mid = biquad(low, "peak", 1100, 1.5, { gainDb: 3 });
    out.data.set(mid.data);
  }
  return fadeEdges(out, 0.001, 0.05);
}

// --- Reverb --------------------------------------------------------------------------------------

/** A Freeverb-style mono reverb: parallel damped combs then series allpasses. */
export function reverb(b, { room = 0.82, damp = 0.35, wet = 0.3, dry = 1, tail = 1.5 } = {}) {
  const scale = b.rate / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => Math.round(n * scale));
  const allpasses = [556, 441, 341, 225].map((n) => Math.round(n * scale));
  const outLen = b.data.length + Math.round(tail * b.rate);
  const out = new Float32Array(outLen);
  const wetBuf = new Float32Array(outLen);
  const input = (i) => (i < b.data.length ? b.data[i] : 0);
  for (const size of combs) {
    const line = new Float32Array(size);
    let idx = 0;
    let store = 0;
    for (let i = 0; i < outLen; i++) {
      const y = line[idx];
      store = y * (1 - damp) + store * damp;
      line[idx] = input(i) * 0.015 + store * room;
      idx = (idx + 1) % size;
      wetBuf[i] += y;
    }
  }
  for (const size of allpasses) {
    const line = new Float32Array(size);
    let idx = 0;
    for (let i = 0; i < outLen; i++) {
      const bufOut = line[idx];
      const x = wetBuf[i];
      line[idx] = x + bufOut * 0.5;
      wetBuf[i] = bufOut - x;
      idx = (idx + 1) % size;
    }
  }
  for (let i = 0; i < outLen; i++) out[i] = input(i) * dry + wetBuf[i] * wet;
  return { rate: b.rate, data: out };
}

/** Makes a buffer loop seamlessly by crossfading its last `overlap` seconds into its start. */
export function makeLoop(b, overlap) {
  const n = Math.round(overlap * b.rate);
  const total = b.data.length - n;
  const out = buffer(total / b.rate, b.rate);
  for (let i = 0; i < total; i++) out.data[i] = b.data[i];
  for (let i = 0; i < n; i++) {
    const k = i / n;
    out.data[i] = b.data[i] * k + b.data[total + i] * (1 - k);
  }
  return out;
}

// --- WAV ---------------------------------------------------------------------------------------------

/** Writes 16-bit mono PCM. With loop = true, a smpl chunk marks the whole file as a forward loop. */
export function writeWav(path, b, { loop = false } = {}) {
  const n = b.data.length;
  const dataBytes = n * 2;
  const smplBytes = loop ? 8 + 36 + 24 : 0;
  const out = Buffer.alloc(44 + dataBytes + smplBytes);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataBytes + smplBytes, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(b.rate, 24);
  out.writeUInt32LE(b.rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, b.data[i]));
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  if (loop) {
    let o = 44 + dataBytes;
    out.write("smpl", o);
    out.writeUInt32LE(36 + 24, o + 4);
    o += 8;
    out.writeUInt32LE(0, o); // manufacturer
    out.writeUInt32LE(0, o + 4); // product
    out.writeUInt32LE(Math.round(1e9 / b.rate), o + 8); // sample period (ns)
    out.writeUInt32LE(60, o + 12); // MIDI unity note
    out.writeUInt32LE(0, o + 16);
    out.writeUInt32LE(0, o + 20);
    out.writeUInt32LE(0, o + 24);
    out.writeUInt32LE(1, o + 28); // one loop
    out.writeUInt32LE(0, o + 32); // sampler data
    o += 36;
    out.writeUInt32LE(0, o); // cue id
    out.writeUInt32LE(0, o + 4); // forward
    out.writeUInt32LE(0, o + 8); // start
    out.writeUInt32LE(n - 1, o + 12); // end
    out.writeUInt32LE(0, o + 16);
    out.writeUInt32LE(0, o + 20); // infinite
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, out);
}
