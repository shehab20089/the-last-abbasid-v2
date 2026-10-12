// What the tools that look at sound share: reading a WAV, decoding any recording through ffmpeg, a spectrum by FFT,
// the measures (loudness, spectral flatness, how much of a sound is a clean sine line), drawing a sound as its
// waveform over a log-frequency spectrogram, and a tiny pixel font for numbering what is drawn.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Canvas } from "../lib/canvas.mjs";

/** A 16-bit PCM WAV, mixed to mono: { rate, data } (data as -1..1 floats). */
export function readWav(path) {
  const buf = readFileSync(path);
  const rate = buf.readUInt32LE(24);
  const channels = buf.readUInt16LE(22);
  let offset = 12;
  while (offset < buf.length - 8 && buf.toString("ascii", offset, offset + 4) !== "data") offset += 8 + buf.readUInt32LE(offset + 4);
  const bytes = buf.readUInt32LE(offset + 4);
  const n = Math.floor(bytes / 2 / channels);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let ch = 0; ch < channels; ch++) v += buf.readInt16LE(offset + 8 + (i * channels + ch) * 2) / 32768;
    data[i] = v / channels;
  }
  return { rate, data };
}

/** Any recording ffmpeg reads (wav at any rate, ogg, flac), decoded to mono floats at `rate`. */
export function decode(path, rate = 44100) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", "-"],
    { maxBuffer: 1 << 30 });
  return { rate, data: new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4).slice() };
}

/** Magnitudes of a real frame by FFT (radix 2), the frame Hann-windowed. */
export function spectrum(frame) {
  const n = frame.length;
  const re = Float64Array.from(frame, (v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))));
  const im = new Float64Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [re[i], re[j]] = [re[j], re[i]];
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(a * k);
        const wi = Math.sin(a * k);
        const xr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const xi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k + len / 2] = re[i + k] - xr;
        im[i + k + len / 2] = im[i + k] - xi;
        re[i + k] += xr;
        im[i + k] += xi;
      }
    }
  }
  return Float64Array.from({ length: n / 2 }, (_, k) => Math.hypot(re[k], im[k]));
}

/**
 * The measures of a sound: its frames' spectra (for drawing), its RMS, its peak, its loudest 50 ms (the level the ear
 * judges a short sound by), its spectral flatness (noise near 0.3 and above, tone near 0) and the share of its frames
 * where one clean line stands far above the rest (a sine).
 */
export function analyse({ rate, data }) {
  const N = 1024;
  const hop = 256;
  const frames = [];
  for (let s = 0; s + N <= Math.max(N, data.length); s += hop) {
    const frame = new Float64Array(N);
    for (let i = 0; i < N; i++) frame[i] = data[s + i] ?? 0;
    frames.push(spectrum(frame));
  }
  let sum = 0;
  let peak = 0;
  for (const v of data) {
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  const rms = Math.sqrt(sum / Math.max(1, data.length));
  const w = Math.max(1, Math.round(rate * 0.05));
  let windowSum = 0;
  let loudest = 0;
  for (let i = 0; i < data.length; i++) {
    windowSum += data[i] * data[i];
    if (i >= w) windowSum -= data[i - w] * data[i - w];
    loudest = Math.max(loudest, windowSum);
  }
  const short = Math.sqrt(loudest / Math.min(w, Math.max(1, data.length)));
  const energy = frames.map((m) => m.reduce((a, b) => a + b * b, 0));
  const top = Math.max(...energy);
  let flat = 0;
  let counted = 0;
  let lines = 0;
  for (let f = 0; f < frames.length; f++) {
    if (energy[f] < top * 1e-3) continue;
    const m = frames[f];
    const from = Math.floor((80 / rate) * N);
    const to = Math.floor((Math.min(12000, rate / 2 - 100) / rate) * N);
    let logSum = 0;
    let linSum = 0;
    const band = [];
    for (let k = from; k < to; k++) {
      const p = m[k] * m[k] + 1e-12;
      logSum += Math.log(p);
      linSum += p;
      band.push(m[k]);
    }
    flat += Math.exp(logSum / band.length) / (linSum / band.length);
    counted++;
    band.sort((a, b) => a - b);
    if (20 * Math.log10(band[band.length - 1] / (band[Math.floor(band.length / 2)] + 1e-9)) > 32) lines++;
  }
  return { frames, rms, peak, short, flatness: counted ? flat / counted : 0, lineShare: counted ? lines / counted : 0, rate, N };
}

export const db = (v) => 20 * Math.log10(v + 1e-9);

const heat = (t) => {
  const stops = [[0, [8, 8, 14]], [0.35, [60, 20, 70]], [0.6, [170, 50, 40]], [0.82, [240, 160, 40]], [1, [255, 250, 220]]];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const u = (t - t0) / (t1 - t0);
      return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * u)).concat(255);
    }
  }
  return [255, 250, 220, 255];
};

/**
 * A sound drawn: its waveform over its spectrogram (log frequency, 60 Hz at the foot to 16 kHz at the top). With
 * `normalize` both are drawn against the sound's own peak, so a quiet recording can be judged by its shape.
 */
export function panel(sound, a, { width = 260, height = 110, normalize = false } = {}) {
  const c = new Canvas(width, height);
  c.fillRect(0, 0, width, height, [16, 16, 20, 255]);
  const { data, rate } = sound;
  const gain = normalize ? 1 / Math.max(1e-6, a.peak) : 1;
  let lift = 0;
  if (normalize) {
    let loudest = 1e-12;
    for (const f of a.frames) for (const m of f) loudest = Math.max(loudest, m);
    lift = -20 * Math.log10(loudest / (a.N / 4));
  }
  for (let x = 0; x < width; x++) {
    const s0 = Math.floor((x / width) * data.length);
    const s1 = Math.max(s0 + 1, Math.floor(((x + 1) / width) * data.length));
    let lo = 0;
    let hi = 0;
    for (let i = s0; i < s1; i++) {
      lo = Math.min(lo, data[i]);
      hi = Math.max(hi, data[i]);
    }
    for (let y = Math.round(14 - hi * gain * 12); y <= Math.round(14 - lo * gain * 12); y++) c.set(x, y, [150, 190, 220, 255]);
  }
  const top = 30;
  const rows = height - top;
  const fmin = Math.log(60);
  const fmax = Math.log(Math.min(16000, rate / 2));
  for (let x = 0; x < width; x++) {
    const f = a.frames[Math.min(a.frames.length - 1, Math.floor((x / width) * a.frames.length))];
    for (let r = 0; r < rows; r++) {
      const hz = Math.exp(fmin + ((rows - 1 - r) / (rows - 1)) * (fmax - fmin));
      const k = Math.min(f.length - 1, Math.round((hz / rate) * a.N));
      const level = 20 * Math.log10(f[k] / (a.N / 4) + 1e-9) + lift;
      c.set(x, top + r, heat(Math.min(1, Math.max(0, (level + 80) / 80))));
    }
  }
  return c;
}

// A 3x5 pixel font for the digits (and a few letters), to number what a sheet draws.
const GLYPHS = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
  5: "111100111001111", 6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111",
  "-": "000000111000000", ".": "000000000000010", " ": "000000000000000",
};

/** Writes `text` (digits, '-', '.') at (x, y), each pixel `scale` wide. */
export function label(c, text, x, y, color = [255, 255, 255, 255], scale = 2) {
  let cx = x;
  for (const ch of String(text)) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let i = 0; i < 15; i++) {
      if (g[i] !== "1") continue;
      c.fillRect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale, color);
    }
    cx += 4 * scale;
  }
}
