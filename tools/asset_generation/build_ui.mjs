// Builds the interface art: the HUD after the concept (a crescent medallion, slender bronze-framed
// health, stamina and boss bars ending in arrowheads, as under / fill / frame for
// TextureProgressBar), dark panels trimmed in brass with eight-pointed star corners, icons, menu
// button frames, the dialogue frame and the application icon.
// Usage: node tools/asset_generation/build_ui.mjs
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas, hex, mix } from "./lib/canvas.mjs";
import { P } from "./lib/palette.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "assets", "ui");
const review = [];
const save = (name, c) => {
  c.save(join(OUT, `${name}.png`));
  review.push(c);
  return c;
};

/** A tiny eight-pointed star (two overlapping squares) centred on (cx, cy). */
function star(c, cx, cy, r, color, inner = null) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const square = Math.max(Math.abs(x), Math.abs(y)) <= r * 0.72;
      const diamond = Math.abs(x) + Math.abs(y) <= r;
      if (square || diamond) c.set(cx + x, cy + y, color);
    }
  }
  if (inner) c.set(cx, cy, inner);
}

/** A 9-slice panel: dark fill, a brass rim with a lit top edge, star studs at the corners. */
function panel(size, { fill = P.panel[1], rim = P.brass, corners = true } = {}) {
  const c = new Canvas(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edge === 0) c.set(x, y, P.outline);
      else if (edge === 1) c.set(x, y, y === 1 || x === 1 ? rim[3] : rim[1]);
      else if (edge === 2) c.set(x, y, P.panel[0]);
      else c.set(x, y, (x + y) % 7 === 0 ? P.panel[2] : fill);
    }
  }
  if (corners) {
    for (const [x, y] of [[3, 3], [size - 4, 3], [3, size - 4], [size - 4, size - 4]]) star(c, x, y, 2, rim[3], rim[4]);
  }
  return c;
}


/**
 * A bar in the concept's style: a slender body framed in bronze (lit along the top), its fill a
 * glossy gradient. The frame is drawn separately from the fill so a progress bar can clip the fill.
 */
function ornateBar(width, height, fillRamp) {
  const under = new Canvas(width, height);
  const fill = new Canvas(width, height);
  const frame = new Canvas(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (edge === 0) {
        frame.set(x, y, y === 0 ? P.brass[3] : y === height - 1 ? P.brass[0] : P.brass[1]);
        continue;
      }
      under.set(x, y, mix(P.panel[0], fillRamp[0], 0.35));
      const t = (y - 1) / Math.max(1, height - 3);
      const tone = t < 0.2 ? 4 : t < 0.45 ? 3 : t < 0.8 ? 2 : 1;
      // A glint travelling along the top of the fill every so often.
      const glint = y === 1 && x % 23 < 3;
      fill.set(x, y, glint ? mix(fillRamp[4], hex("#ffffff"), 0.35) : fillRamp[tone]);
    }
  }
  return { under, fill, frame };
}

/** The bronze arrowhead that ends a bar on its right. */
function barCap(height) {
  const w = Math.ceil(height * 0.9) + 2;
  const c = new Canvas(w, height + 2);
  const mid = (height + 1) / 2;
  for (let y = 0; y < height + 2; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.abs(y - mid) + x * 0.95;
      if (d > mid + 0.6) continue;
      const outer = d > mid - 0.6;
      c.set(x, y, outer ? P.brass[0] : y < mid ? P.brass[4] : P.brass[2]);
    }
  }
  return c;
}

/** The hero's medallion: a bronze ring with eight points about a dark field and a gold crescent. */
function medallion(size) {
  const c = new Canvas(size, size);
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      // Eight short points around the ring.
      const point = r - 1 + Math.max(0, Math.cos(a * 8)) * 2.2 - 2;
      if (d > Math.max(r - 3, point)) continue;
      if (d > r - 4.2) c.set(x, y, d > r - 3.2 ? P.brass[1] : dy < 0 ? P.brass[4] : P.brass[2]);
      else if (d > r - 5.2) c.set(x, y, P.outline);
      else c.set(x, y, mix(P.panel[2], P.teal[0], 0.35 + (dy / r) * 0.2));
    }
  }
  // The crescent.
  const cr = r * 0.46;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inOuter = Math.hypot(x + 0.5 - r, y + 0.5 - r) <= cr;
      const inInner = Math.hypot(x + 0.5 - (r + cr * 0.42), y + 0.5 - (r - cr * 0.3)) <= cr * 0.82;
      if (inOuter && !inInner) c.set(x, y, y < r ? P.gold[4] : P.gold[3]);
    }
  }
  return c;
}

// The title screen's backdrop: the concept key art, pixel-converted, a little wider than the screen
// so it can drift.
{
  const { paintedLayer } = await import("./environment/painted.mjs");
  // A touch more saturation and contrast, so the fire keeps its heat through the palette.
  const grade = ([r, g, b]) => {
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    return [r, g, b].map((v) => (l + (v - l) * 1.22 - 128) * 1.06 + 128);
  };
  const { canvas } = paintedLayer(join(ROOT, "docs", "concept_art", "02_Burning_Baghdad_Key_Art.png"),
    { crop: [0, 0, 1672, 941], width: 700, height: 394, colors: 192, grade });
  canvas.save(join(OUT, "title_art.png"));
}

// The HUD after the concept: a medallion, bronze-framed bars ending in arrowheads.
save("hud_medallion", medallion(30));
{
  const healthBar = ornateBar(104, 9, P.blood);
  save("hud_health_under", healthBar.under);
  save("hud_health_fill", healthBar.fill);
  save("hud_health_frame", healthBar.frame);
  save("hud_health_trail", ornateBar(104, 9, [P.parchment[0], P.parchment[1], P.parchment[2], P.parchment[3], P.parchment[4]]).fill);
  const staminaBar = ornateBar(80, 6, P.teal);
  save("hud_stamina_under", staminaBar.under);
  save("hud_stamina_fill", staminaBar.fill);
  save("hud_stamina_frame", staminaBar.frame);
  save("hud_cap_9", barCap(9));
  save("hud_cap_6", barCap(6));
  const bossBar = ornateBar(240, 9, P.blood);
  save("hud_boss_under", bossBar.under);
  save("hud_boss_fill", bossBar.fill);
  save("hud_boss_frame", bossBar.frame);
}

// Panels and buttons.
save("panel", panel(24));
save("panel_light", panel(24, { fill: P.panel[2] }));
save("button", panel(16, { corners: false }));
save("button_focus", panel(16, { fill: P.panel[3], rim: P.brass.map((c) => mix(c, hex("#ffe9b0"), 0.25)), corners: false }));
const dialogue = panel(32);
save("dialogue", dialogue);

// Icons.
{
  const c = new Canvas(10, 14);
  const glass = [hex("#12281e"), hex("#244f3a"), hex("#4a8c60"), hex("#a8dcaa")];
  for (let y = 5; y < 13; y++) {
    for (let x = 1; x < 9; x++) {
      const d = Math.hypot(x + 0.5 - 5, (y + 0.5 - 9) * 1.1);
      if (d > 4.2) continue;
      c.set(x, y, d > 3.4 ? glass[0] : x < 4 && y < 9 ? glass[3] : y > 9 ? glass[1] : glass[2]);
    }
  }
  for (let y = 2; y < 5; y++) for (let x = 4; x < 6; x++) c.set(x, y, glass[1]);
  for (let x = 3; x < 7; x++) c.set(x, 1, P.wood[3]);
  for (let x = 3; x < 7; x++) c.set(x, 0, P.wood[4]);
  save("icon_remedy", c);
  const empty = new Canvas(10, 14);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 10; x++) {
    const col = c.get(x, y);
    if (col[3] > 0) empty.set(x, y, mix(col, P.panel[2], 0.75));
  }
  save("icon_remedy_empty", empty);
}
{
  const c = new Canvas(14, 10);
  for (let y = 2; y < 10; y++) for (let x = 1; x < 13; x++) c.set(x, y, y < 4 ? P.parchment[3] : P.leather[x < 3 ? 2 : 3]);
  for (let x = 2; x < 12; x++) c.set(x, 3, P.parchment[2]);
  c.set(12, 6, P.gold[3]);
  for (let x = 1; x < 13; x++) c.set(x, 9, P.leather[1]);
  save("icon_manuscript", c);
}
{
  const c = new Canvas(11, 11);
  star(c, 5, 5, 5, P.brass[2]);
  star(c, 5, 5, 3, P.brass[4], hex("#fff3cc"));
  save("icon_objective", c);
}
{
  // Keyboard/gamepad prompt plate.
  const c = new Canvas(12, 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const edge = Math.min(x, y, 11 - x, 11 - y);
    if (edge === 0 && (x === 0 || x === 11) && (y === 0 || y === 11)) continue;
    c.set(x, y, edge === 0 ? P.brass[1] : y < 2 ? P.parchment[3] : P.parchment[2]);
  }
  save("key_plate", c);
}

// The application icon: the hero's helmet in an eight-pointed star.
{
  const c = new Canvas(64, 64);
  star(c, 32, 32, 30, P.brass[1]);
  star(c, 32, 32, 28, P.panel[1]);
  star(c, 32, 32, 26, P.teal[1]);
  // Helmet: a pointed dome over a turban band.
  for (let y = 12; y < 40; y++) {
    const t = (y - 12) / 28;
    const half = Math.round(2 + t * 12);
    for (let x = 32 - half; x <= 32 + half; x++) c.set(x, y, x > 32 + half * 0.3 ? P.steel[2] : x > 32 - half * 0.4 ? P.steel[3] : P.steel[4]);
  }
  for (let y = 38; y < 46; y++) for (let x = 16; x < 49; x++) c.set(x, y, (x + y) % 5 === 0 ? P.teal[2] : P.teal[3]);
  for (let y = 46; y < 54; y++) for (let x = 20; x < 45; x++) c.set(x, y, (x + y) % 2 === 0 ? P.mail[2] : P.mail[1]);
  c.set(32, 9, P.steel[5]); c.set(32, 10, P.steel[4]); c.set(32, 11, P.steel[4]);
  save("icon", c);
}

// Review sheet.
const width = review.reduce((s, c) => s + c.width + 4, 0);
const sheet = new Canvas(width, 70);
sheet.clear(hex("#3b3437"));
let x = 2;
for (const c of review) {
  sheet.blit(c, x, 2);
  x += c.width + 4;
}
sheet.scaled(3).save(join(ROOT, "captures", "art_review", "ui.png"));
console.log(`ui: ${review.length} images`);
