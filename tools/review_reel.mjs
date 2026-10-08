// Writes captures/animation_reel.html: every character's animations playing at their in-game
// timing (frame rate and per-frame holds), with the attacks' live frames marked, for review on any
// screen. The sprite strips are embedded, so the page stands alone.
// Usage: node tools/review_reel.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CAST = [
  { id: "yusuf", name: "Yusuf", role: "Guardsman of the Caliph", dir: "assets/characters/warrior", prefix: "warrior",
    defs: "features/warrior/definitions", side: "hero" },
  { id: "swordsman", name: "Swordsman", role: "Mongol, sabre and shield", dir: "assets/enemies/swordsman", prefix: "swordsman",
    defs: "features/enemies/definitions", side: "foe" },
  { id: "spearman", name: "Spearman", role: "Mongol, spear and shield", dir: "assets/enemies/spearman", prefix: "spearman",
    defs: "features/enemies/definitions", side: "foe" },
  { id: "archer", name: "Archer", role: "Mongol, composite bow", dir: "assets/enemies/archer", prefix: "archer",
    defs: "features/enemies/definitions", side: "foe" },
  { id: "captain", name: "Toqto Noyan", role: "Captain of a thousand", dir: "assets/enemies/captain", prefix: "captain",
    defs: "features/enemies/definitions", side: "foe" },
  ...[["scholar", "Shaykh Ibrahim", "Bookseller"], ["guard", "Hamid", "Wounded guardsman"], ["mother", "Mother", "Sheltering her child"],
    ["salim", "Salim", "The man in the saffron sash"], ["librarian", "Abd al-Latif", "Keeper of the library"],
    ["copyist", "Copyist", "Hiding among the books"], ["refugee_man", "Townsman", "Fleeing the fires"],
    ["refugee_woman", "Townswoman", "Fleeing the fires"]].map(([id, name, role]) => ({
    id, name, role, dir: `assets/npcs/${id}`, prefix: id, defs: null, side: "town" })),
];

/** The live frames of every attack definition, by animation name. */
function liveFrames(dir) {
  const out = {};
  if (!dir) return out;
  const folder = join(ROOT, dir);
  for (const file of existsSync(folder) ? readdirSync(folder) : []) {
    if (!file.endsWith(".tres")) continue;
    const text = readFileSync(join(folder, file), "utf8");
    const anim = /animation = &"([^"]+)"/.exec(text)?.[1];
    if (!anim) continue;
    const num = (key, fallback) => Number(new RegExp(`^${key} = (-?\\d+)`, "m").exec(text)?.[1] ?? fallback);
    out[anim] = {
      name: /display_name = "([^"]+)"/.exec(text)?.[1] ?? anim,
      from: num("active_from", 2), to: num("active_to", 3), telegraph: num("telegraph_frame", -1),
      projectile: num("projectile_frame", -1), recovery: num("recovery_from", 4),
      dire: /^unblockable = true/m.test(text) || /^parryable = false/m.test(text),
      sweep: !/^use_blade_sweep = false/m.test(text),
    };
  }
  return out;
}

const cast = CAST.map((c) => {
  const meta = JSON.parse(readFileSync(join(ROOT, c.dir, `${c.prefix}_frames.json`), "utf8"));
  const live = liveFrames(c.defs);
  const animations = Object.values(meta).map((m) => ({
    name: m.name,
    frames: m.frames,
    width: m.width,
    height: m.height,
    fps: m.fps,
    loop: m.loop,
    durations: m.durations ?? Array(m.frames).fill(1),
    live: live[m.name] ?? null,
    blades: m.blades ?? null,
    src: `data:image/png;base64,${readFileSync(join(ROOT, c.dir, m.file)).toString("base64")}`,
  }));
  return { id: c.id, name: c.name, role: c.role, side: c.side, animations };
});

const html = `<title>Abbasid Animation Reel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Work+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
/* Layout: a night stage across the top, the cast and their actions as chips beneath, the frame strip last. */
:root {
  --night: #0d0a0f;
  --panel: #17121a;
  --panel-2: #211a25;
  --line: #3a2f3c;
  --parchment: #ece2cc;
  --muted: #a39682;
  --bronze: #d2a35a;
  --teal: #4a9a8c;
  --madder: #c0533a;
  --live: #e0563c;
  --tell: #f0d58c;
  --display: "Amiri", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --body: "Work Sans", "Segoe UI", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
  color-scheme: dark;
}
html { background: var(--night); }
body { background: var(--night); color: var(--parchment); font: 15px/1.5 var(--body); }
.wrap { max-width: 1040px; margin: 0 auto; padding-inline: 16px; padding-block: 28px 48px; display: grid; gap: 22px; }
header { display: grid; gap: 4px; }
h1 { font: 700 clamp(30px, 6vw, 46px)/1.05 var(--display); margin: 0; letter-spacing: 0.01em; text-wrap: balance; }
h1 span { color: var(--bronze); }
.lede { color: var(--muted); margin: 0; max-width: 62ch; }
.stage-wrap { display: grid; gap: 10px; }
.stage { position: relative; border: 1px solid var(--line); border-radius: 6px; overflow: hidden;
  background: radial-gradient(120% 90% at 70% 100%, #3a1a10 0%, #1a0f14 38%, var(--night) 75%); }
.stage canvas { display: block; width: 100%; height: auto; image-rendering: pixelated; image-rendering: crisp-edges; }
.readout { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; font: 13px/1.4 var(--mono); color: var(--muted); }
.readout b { color: var(--parchment); font-weight: 600; }
.readout .state { padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); }
.readout .state.live { color: #fff1e8; background: var(--live); border-color: var(--live); }
.readout .state.tell { color: #1d1408; background: var(--tell); border-color: var(--tell); }
.controls { display: flex; flex-wrap: wrap; gap: 8px; }
button { font: 500 14px/1 var(--body); color: var(--parchment); background: var(--panel-2); border: 1px solid var(--line);
  border-radius: 4px; padding: 9px 12px; cursor: pointer; }
button:hover { border-color: var(--bronze); }
button:focus-visible { outline: 2px solid var(--bronze); outline-offset: 2px; }
button[aria-pressed="true"] { background: var(--bronze); color: #1b1208; border-color: var(--bronze); }
section { display: grid; gap: 10px; }
h2 { font: 600 12px/1 var(--body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin: 0; }
.cast { display: flex; flex-wrap: wrap; gap: 8px; }
.cast button { display: grid; gap: 3px; text-align: left; padding: 9px 12px; min-width: 0; }
.cast button small { font: 400 12px/1.2 var(--body); color: var(--muted); }
.cast button[aria-pressed="true"] small { color: #3b2a12; }
.cast button[data-side="hero"] { border-left: 3px solid var(--teal); }
.cast button[data-side="foe"] { border-left: 3px solid var(--madder); }
.cast button[data-side="town"] { border-left: 3px solid var(--muted); }
.moves { display: flex; flex-wrap: wrap; gap: 6px; }
.moves button { font: 400 13px/1 var(--mono); padding: 8px 10px; }
.strip { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 6px; }
.strip canvas { flex: none; height: 96px; width: auto; image-rendering: pixelated; background: var(--panel); border: 1px solid var(--line);
  border-radius: 3px; cursor: pointer; }
.strip canvas.now { border-color: var(--bronze); box-shadow: 0 0 0 1px var(--bronze); }
.strip canvas.live { background: #3a1712; }
.strip canvas.tell { background: #3a3014; }
.legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; color: var(--muted); }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
</style>

<div class="wrap">
  <header>
    <h1>The Last <span>Abbasid</span></h1>
    <p class="lede">Every character, rebuilt in 3D, rigged and animated by hand, then rendered to pixel art. Each move plays at its in-game timing. Pick a character, then a move.</p>
  </header>

  <div class="stage-wrap">
    <div class="stage"><canvas id="stage" width="320" height="140" aria-label="Animation stage"></canvas></div>
    <div class="readout" id="readout"></div>
    <div class="controls">
      <button id="play" type="button" aria-pressed="true">Pause</button>
      <button id="step" type="button">Next frame</button>
      <button id="speed-1" type="button" aria-pressed="true" data-speed="1">1×</button>
      <button id="speed-2" type="button" aria-pressed="false" data-speed="0.5">½×</button>
      <button id="speed-4" type="button" aria-pressed="false" data-speed="0.25">¼×</button>
    </div>
  </div>

  <section>
    <h2>Cast</h2>
    <div class="cast" id="cast"></div>
  </section>
  <section>
    <h2>Moves</h2>
    <div class="moves" id="moves"></div>
  </section>
  <section>
    <h2>Frames</h2>
    <div class="strip" id="strip"></div>
    <div class="legend"><span><i style="background:#3a3014"></i>Wind-up glint (telegraph)</span><span><i style="background:#3a1712"></i>Blade live (hitbox open, trail drawn)</span></div>
  </section>
</div>

<script>
const CAST = ${JSON.stringify(cast)};
const stage = document.getElementById("stage");
const ctx = stage.getContext("2d");
const readout = document.getElementById("readout");
const castEl = document.getElementById("cast");
const movesEl = document.getElementById("moves");
const stripEl = document.getElementById("strip");
const playBtn = document.getElementById("play");
let person = CAST[0];
let anim = person.animations.find((a) => a.name.startsWith("attack")) || person.animations[0];
let image = null;
let frame = 0;
let clock = 0;
let playing = true;
let speed = 1;
let last = performance.now();
const images = new Map();

function load(a) {
  if (!images.has(a.src)) {
    const img = new Image();
    img.src = a.src;
    images.set(a.src, img);
  }
  return images.get(a.src);
}

function stateOf(a, f) {
  if (!a.live) return "";
  if (f === a.live.telegraph) return "tell";
  if (f >= a.live.from && f <= a.live.to) return "live";
  return "";
}

// Sword trails, as the game draws them (features/combat/sword_trail.gd): each live frame adds a
// crescent from the blade's last position to its new one, fading in 0.13 s, drawn behind the body.
const FADE = 0.13;
let crescents = [];

function addTrail(a, f) {
  if (!a.live || !a.live.sweep || !a.blades || f < a.live.from || f > a.live.to) return;
  const from = a.blades[f - 1];
  const to = a.blades[f];
  if (!from || !to) return;
  const tint = a.live.dire ? [255, 92, 51] : [230, 240, 255];
  const angle = (b) => Math.atan2(b.tip[1] - b.hilt[1], b.tip[0] - b.hilt[0]);
  const len = (b) => Math.hypot(b.tip[0] - b.hilt[0], b.tip[1] - b.hilt[1]);
  const a0 = angle(from);
  let turn = angle(to) - a0;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  if (Math.abs(turn) < 0.16) {
    const ax = to.tip[0] - to.hilt[0];
    const ay = to.tip[1] - to.hilt[1];
    const l = Math.hypot(ax, ay) || 1;
    const dir = [ax / l, ay / l];
    const side = [-dir[1], dir[0]];
    const start = [from.tip[0] - dir[0] * 10, from.tip[1] - dir[1] * 10];
    crescents.push({ age: 0, tint, edge: null, points: [start, [to.tip[0] + side[0] * 1.6, to.tip[1] + side[1] * 1.6],
      [to.tip[0] + dir[0] * 2, to.tip[1] + dir[1] * 2], [to.tip[0] - side[0] * 1.6, to.tip[1] - side[1] * 1.6]],
    alphas: [0, 0.7, 0.95, 0.7] });
    return;
  }
  const outer = [];
  const inner = [];
  const oa = [];
  const ia = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    const hx = from.hilt[0] + (to.hilt[0] - from.hilt[0]) * k;
    const hy = from.hilt[1] + (to.hilt[1] - from.hilt[1]) * k;
    const d = [Math.cos(a0 + turn * k), Math.sin(a0 + turn * k)];
    const l = len(from) + (len(to) - len(from)) * k;
    const reach = 0.8 + (0.32 - 0.8) * k;
    outer.push([hx + d[0] * l, hy + d[1] * l]);
    inner.push([hx + d[0] * l * reach, hy + d[1] * l * reach]);
    oa.push(0.95 * Math.pow(k, 1.4));
    ia.push(0.4 * k);
  }
  crescents.push({ age: 0, tint, edge: outer.slice(5), points: outer.concat(inner.reverse()), alphas: oa.concat(ia.reverse()) });
}

function drawTrails(ox, oy) {
  for (const c of crescents) {
    const life = Math.max(0, 1 - c.age / FADE);
    // A fan of triangles from the first point, each shaded by its vertices' mean alpha.
    const n = c.points.length;
    for (let i = 1; i < n - 1; i++) {
      const a = (c.alphas[0] + c.alphas[i] + c.alphas[i + 1]) / 3;
      if (a <= 0.01) continue;
      ctx.fillStyle = "rgba(" + c.tint.join(", ") + ", " + (a * life).toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(ox + c.points[0][0], oy + c.points[0][1]);
      ctx.lineTo(ox + c.points[i][0], oy + c.points[i][1]);
      ctx.lineTo(ox + c.points[i + 1][0], oy + c.points[i + 1][1]);
      ctx.closePath();
      ctx.fill();
    }
    if (c.edge) {
      ctx.strokeStyle = "rgba(255, 255, 245, " + life.toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      c.edge.forEach((p, i) => (i ? ctx.lineTo(ox + p[0], oy + p[1]) : ctx.moveTo(ox + p[0], oy + p[1])));
      ctx.stroke();
    }
  }
}

function draw() {
  const w = stage.width;
  const h = stage.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(90, 70, 60, 0.9)";
  ctx.fillRect(0, h - 12, w, 1);
  ctx.fillStyle = "rgba(20, 14, 18, 0.9)";
  ctx.fillRect(0, h - 11, w, 11);
  if (!image || !image.complete) return;
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(w / 2 - anim.width / 2);
  const y = h - 12 - (anim.height - 4);
  drawTrails(Math.round(w / 2), h - 12);
  ctx.drawImage(image, frame * anim.width, 0, anim.width, anim.height, x, y, anim.width, anim.height);
}

function renderReadout() {
  const s = stateOf(anim, frame);
  const label = s === "live" ? "blade live" : s === "tell" ? "wind-up glint" : "";
  const live = anim.live ? \` · <b>\${anim.live.name}</b> · live \${anim.live.from}–\${anim.live.to}\${anim.live.telegraph >= 0 ? \` · glint \${anim.live.telegraph}\` : ""}\` : "";
  const total = anim.durations.reduce((t, d) => t + d, 0) / anim.fps;
  readout.innerHTML = \`<b>\${anim.name}</b><span>frame \${frame + 1}/\${anim.frames}</span><span>\${anim.fps} fps · \${total.toFixed(2)} s\${anim.loop ? " loop" : ""}</span><span>\${live}</span>\${label ? \`<span class="state \${s}">\${label}</span>\` : ""}\`;
  [...stripEl.children].forEach((c, i) => c.classList.toggle("now", i === frame));
}

function pickAnim(a) {
  anim = a;
  crescents = [];
  image = load(a);
  frame = 0;
  clock = 0;
  [...movesEl.children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.name === a.name)));
  buildStrip();
  const fit = () => { draw(); renderReadout(); };
  if (image.complete) fit(); else image.onload = fit;
}

function pickPerson(p) {
  person = p;
  [...castEl.children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === p.id)));
  movesEl.innerHTML = "";
  for (const a of p.animations) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = a.name;
    b.dataset.name = a.name;
    b.addEventListener("click", () => pickAnim(a));
    movesEl.append(b);
  }
  pickAnim(p.animations.find((a) => a.name.startsWith("attack") || a.name === "slash_a" || a.name === "shoot" || a.name === "thrust")
    || p.animations[0]);
}

function buildStrip() {
  stripEl.innerHTML = "";
  const img = load(anim);
  const make = () => {
    for (let i = 0; i < anim.frames; i++) {
      const c = document.createElement("canvas");
      c.width = anim.width;
      c.height = anim.height;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.drawImage(img, i * anim.width, 0, anim.width, anim.height, 0, 0, anim.width, anim.height);
      const s = stateOf(anim, i);
      if (s) c.classList.add(s);
      c.title = \`frame \${i + 1}\`;
      c.addEventListener("click", () => { frame = i; clock = 0; setPlaying(false); draw(); renderReadout(); });
      stripEl.append(c);
    }
    renderReadout();
  };
  if (img.complete) make(); else img.addEventListener("load", make, { once: true });
}

function setPlaying(on) {
  playing = on;
  playBtn.textContent = on ? "Pause" : "Play";
  playBtn.setAttribute("aria-pressed", String(on));
}

function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing && image && image.complete) {
    clock += dt * speed;
    let hold = anim.durations[frame] / anim.fps;
    let changed = false;
    while (clock >= hold) {
      clock -= hold;
      if (frame + 1 < anim.frames) frame += 1;
      else if (anim.loop) frame = 0;
      else { frame = 0; clock = -0.45; }
      hold = anim.durations[frame] / anim.fps;
      changed = true;
      addTrail(anim, frame);
    }
    for (const c of crescents) c.age += dt * speed;
    const fading = crescents.length > 0;
    crescents = crescents.filter((c) => c.age < FADE);
    if (changed) renderReadout();
    if (changed || fading) draw();
  }
  requestAnimationFrame(tick);
}

for (const p of CAST) {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.id = p.id;
  b.dataset.side = p.side;
  b.innerHTML = \`<span>\${p.name}</span><small>\${p.role}</small>\`;
  b.addEventListener("click", () => pickPerson(p));
  castEl.append(b);
}
playBtn.addEventListener("click", () => setPlaying(!playing));
document.getElementById("step").addEventListener("click", () => {
  setPlaying(false);
  frame = (frame + 1) % anim.frames;
  clock = 0;
  draw();
  renderReadout();
});
for (const id of ["speed-1", "speed-2", "speed-4"]) {
  const b = document.getElementById(id);
  b.addEventListener("click", () => {
    speed = Number(b.dataset.speed);
    for (const other of ["speed-1", "speed-2", "speed-4"]) {
      document.getElementById(other).setAttribute("aria-pressed", String(other === id));
    }
  });
}
pickPerson(CAST[0]);
requestAnimationFrame(tick);
</script>
`;

writeFileSync(join(ROOT, "captures", "animation_reel.html"), html);
console.log(`animation reel: ${cast.length} characters, ${cast.reduce((n, c) => n + c.animations.length, 0)} animations,`
  + ` ${(html.length / 1024).toFixed(0)} KB`);
