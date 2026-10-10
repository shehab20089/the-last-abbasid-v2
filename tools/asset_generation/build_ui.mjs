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
  // Resolve: a slender amber bar under the stamina, a dark notch at its middle (one Art's worth).
  const resolveBar = ornateBar(64, 5, P.saffron);
  for (const y of [1, 2, 3]) resolveBar.frame.set(32, y, P.brass[0]);
  save("hud_resolve_under", resolveBar.under);
  save("hud_resolve_fill", resolveBar.fill);
  save("hud_resolve_frame", resolveBar.frame);
  const bossBar = ornateBar(240, 9, P.blood);
  save("hud_boss_under", bossBar.under);
  save("hud_boss_fill", bossBar.fill);
  save("hud_boss_frame", bossBar.frame);
}

// Panels and buttons.
save("panel", panel(24));
save("panel_light", panel(24, { fill: P.panel[2] }));
// Buttons: at rest a dim rim; under the mouse a warmer one; in focus (the one a key or a pad would press) a bright
// gold rim, a warm fill and a lit bar down its leading edge; disabled, almost lost in the panel.
save("button", panel(16, { rim: P.brass.map((c) => mix(c, P.panel[1], 0.3)), corners: false }));
save("button_hover", panel(16, { fill: P.panel[2], corners: false }));
{
  const focus = panel(16, { fill: mix(P.panel[3], P.brass[1], 0.3), rim: P.brass.map((c) => mix(c, hex("#ffe9b0"), 0.45)), corners: false });
  for (let y = 4; y < 12; y++) { focus.set(2, y, P.gold[4]); focus.set(3, y, P.gold[3]); }
  save("button_focus", focus);
}
save("button_disabled", panel(16, { fill: P.panel[0], rim: P.brass.map((c) => mix(c, P.panel[0], 0.6)), corners: false }));
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

// Signs drawn over the world (WorldMarkers): who has something to say, the one the story needs, a lamp not
// yet lit, the objective, and the arrow at the screen's edge that points to it when it is off the screen.
function pixels(rows, legend) {
  const c = new Canvas(rows[0].length, rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (legend[ch]) c.set(x, y, legend[ch]);
  }));
  return c;
}
const MARK = {
  "#": P.outline, B: P.brass[3], b: P.brass[1], p: P.parchment[3], P: P.parchment[4], d: P.panel[1],
  g: P.gold[3], G: P.gold[4], k: P.panel[1], R: P.fire[3], O: P.fire[4], Y: P.fire[5], W: P.fire[6],
};
// A speech bubble whose five inner rows (nine pixels each) are given.
const BUBBLE = (inner) => [
  "..#########..",
  ".#BBBBBBBBB#.",
  ...inner.map((row, i) => `#${i < 4 ? "B" : "b"}${row}b#`),
  ".#bbbbbbbbb#.",
  "..##b######..",
  "...#b#.......",
  "...##........",
];
// A word to be had: a parchment bubble with three dots.
save("marker_talk", pixels(BUBBLE(["PPPPPPPPP", "ppppppppp", "pdppdppdp", "ppppppppp", "ppppppppp"]), MARK));
// The one the story needs now: a gold bubble with a mark.
save("marker_story", pixels(BUBBLE(["GGGGdGGGG", "ggggdgggg", "ggggdgggg", "ggggggggg", "ggggdgggg"]), MARK));
// A lamp not yet lit: its flame in the niche's arch.
save("marker_lamp", pixels([
  "....###....",
  "...#BBB#...",
  "..#BkYkb#..",
  ".#BkkYkkb#.",
  ".#BkOYOkb#.",
  "#BkkOWOkkb#",
  "#BkRYWYRkb#",
  "#BkROYORkb#",
  "#BkkRORkkb#",
  "#BkBBBBBkb#",
  "#Bkkbbbkkb#",
  "#bbbbbbbbb#",
  "###########",
], MARK));
// The objective: the HUD's star, larger, outlined so it reads over fire and smoke.
{
  const c = new Canvas(15, 15);
  star(c, 7, 7, 6, P.gold[2]);
  star(c, 7, 7, 4, P.gold[4], hex("#fff3cc"));
  const filled = (x, y) => c.inside(x, y) && c.alpha(x, y) > 0;
  const rim = [];
  for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
    if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) rim.push([x, y]);
  }
  rim.forEach(([x, y]) => c.set(x, y, P.outline));
  save("marker_objective", c);
}
// The knives counter's icon: a throwing knife laid on the diagonal, steel blade, bronze guard, bound grip.
{
  const c = new Canvas(12, 12);
  const axis = [[1, 10], [2, 9], [3, 8], [4, 7], [5, 6], [6, 5], [7, 4], [8, 3], [9, 2], [10, 1]];
  axis.forEach(([x, y], i) => {
    if (i === 0) c.set(x, y, P.bronze[4]);
    else if (i < 3) c.set(x, y, P.leather[i === 1 ? 2 : 3]);
    else if (i === 3) c.set(x, y, P.bronze[3]);
    else c.set(x, y, i === 9 ? P.steel[5] : P.steel[4]);
  });
  // The guard across the blade's foot, and the blade's lower, shaded edge.
  c.set(3, 6, P.bronze[3]);
  c.set(5, 8, P.bronze[2]);
  for (const [x, y] of [[6, 6], [7, 5], [8, 4], [9, 3]]) c.set(x, y, P.steel[2]);
  const filled = (x, y) => c.inside(x, y) && c.alpha(x, y) > 0;
  const rim = [];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) rim.push([x, y]);
  }
  rim.forEach(([x, y]) => c.set(x, y, P.outline));
  save("icon_knife", c);
}
// The lamp tree's marks on a node: learned (a gold tick), not yet open (a small lock).
const outlined = (c) => {
  const filled = (x, y) => c.inside(x, y) && c.alpha(x, y) > 0;
  const rim = [];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) rim.push([x, y]);
  }
  rim.forEach(([x, y]) => c.set(x, y, P.outline));
  return c;
};
{
  const c = new Canvas(10, 9);
  [[1, 4], [2, 5], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2], [8, 1]].forEach(([x, y], i) => {
    c.set(x, y, i < 3 ? P.gold[3] : P.gold[4]);
    c.set(x, y + 1, P.gold[2]);
  });
  save("icon_tick", outlined(c));
}
{
  const c = new Canvas(9, 11);
  for (const [x, y] of [[3, 1], [4, 1], [5, 1], [2, 2], [6, 2], [2, 3], [6, 3], [2, 4], [6, 4]]) c.set(x, y, P.steel[3]);
  for (let y = 5; y <= 9; y++) for (let x = 1; x <= 7; x++) c.set(x, y, y === 5 ? P.bronze[4] : P.bronze[2]);
  c.set(4, 7, P.panel[0]);
  c.set(4, 8, P.panel[0]);
  save("icon_lock", outlined(c));
}
// The arrow at the screen's edge, pointing right (flipped to point left).
save("marker_arrow", pixels([
  "#.......",
  "##......",
  "#G#.....",
  "#GG#....",
  "#GGG#...",
  "#GGGG#..",
  "#GGGGG#.",
  "#gggg#..",
  "#ggg#...",
  "#gg#....",
  "#g#.....",
  "##......",
  "#.......",
], MARK));

// Icons for the Arts (and the techniques and keepsakes): 14 x 14, drawn on a dark disc ringed in brass,
// lit along its upper edge.
function iconDisc(draw, rim = P.brass) {
  const c = new Canvas(14, 14);
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 14; x++) {
      const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 7);
      if (d <= 6.9) c.set(x, y, d > 5.9 ? (y < 6 ? rim[3] : rim[1]) : P.panel[1]);
    }
  }
  draw(c);
  return c;
}
const dot = (c, points, color) => points.forEach(([x, y]) => c.set(x, y, color));

// The Storm of Blades: three blades chasing round a bright heart.
save("art_storm", iconDisc((c) => {
  for (let k = 0; k < 3; k++) {
    for (let s = 0; s < 6; s++) {
      const a = (k * 2 * Math.PI) / 3 + s * 0.3;
      const r = 4.2;
      c.set(Math.round(6.5 + Math.cos(a) * r), Math.round(6.5 + Math.sin(a) * r), s === 5 ? P.steel[5] : s > 2 ? P.steel[4] : P.steel[2]);
    }
  }
  dot(c, [[6, 6], [7, 7]], P.gold[4]);
  dot(c, [[7, 6], [6, 7]], P.gold[2]);
}));
// The Piercing Line: a blade driven level, the streaks of its passing behind it.
save("art_pierce", iconDisc((c) => {
  for (let x = 4; x <= 11; x++) c.set(x, 7, x === 11 ? P.steel[5] : P.steel[4]);
  for (let x = 4; x <= 10; x++) c.set(x, 8, P.steel[2]);
  dot(c, [[3, 6], [3, 7], [3, 8], [3, 9]], P.gold[3]);
  dot(c, [[2, 7], [2, 8]], P.leather[3]);
  for (let x = 2; x <= 6; x++) c.set(x, 4, x % 2 ? P.steel[1] : P.steel[2]);
  for (let x = 3; x <= 7; x++) c.set(x, 10, x % 2 ? P.steel[2] : P.steel[1]);
}));
// The Naft Flask: a clay flask, its wick alight.
save("art_naft", iconDisc((c) => {
  for (let y = 7; y <= 11; y++) {
    for (let x = 4; x <= 9; x++) {
      const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 9.3);
      if (d <= 2.9) c.set(x, y, x < 6 && y < 9 ? P.ochre[4] : d > 2.2 ? P.ochre[1] : P.ochre[2]);
    }
  }
  dot(c, [[6, 5], [7, 5], [6, 6], [7, 6]], P.ochre[3]);
  dot(c, [[6, 4], [7, 4]], P.linen[3]);
  dot(c, [[7, 3], [6, 2], [7, 2]], P.fire[4]);
  dot(c, [[7, 1]], P.fire[6]);
  dot(c, [[6, 3]], P.fire[5]);
}));
// The Second Wind: three breaths of air, curling.
save("art_second_wind", iconDisc((c) => {
  for (const [y, from, to] of [[4, 3, 9], [7, 2, 10], [10, 3, 8]]) {
    for (let x = from; x <= to; x++) c.set(x, y, x > to - 2 ? P.parchment[4] : P.parchment[2]);
    dot(c, [[to + 1, y - 1], [to + 1, y - 2], [to, y - 2]], P.parchment[3]);
  }
}));
// The Judgment of the Guard: the sabre held point-down before a crescent.
save("art_judgment", iconDisc((c) => {
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * (0.62 + k * 0.095);
    c.set(Math.round(7 + Math.cos(a) * 4.4), Math.round(6.6 - Math.sin(a) * 4.4), P.gold[3]);
  }
  for (let y = 5; y <= 11; y++) c.set(7, y, y === 11 ? P.steel[5] : P.steel[4]);
  for (let y = 5; y <= 10; y++) c.set(6, y, P.steel[2]);
  dot(c, [[4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4]], P.gold[4]);
  dot(c, [[6, 2], [7, 2], [6, 3], [7, 3]], P.leather[3]);
}));
// An empty slot: the disc alone.
save("art_none", iconDisc(() => {}));

// The technique tree: the Blade's nodes ringed in gold, the Shield's in steel, the Shadow's in indigo.
const BLADE = P.gold;
const SHIELD = P.steel.slice(1);
const SHADOW = P.indigo;
const line = (c, x0, y0, x1, y1, color) => c.line(x0, y0, x1, y1, color);
const sabre = (c, x0, y0, x1, y1) => {
  line(c, x0, y0, x1, y1, P.steel[4]);
  c.set(x1, y1, P.steel[5]);
};
save("tech_pommel", iconDisc((c) => {
  sabre(c, 3, 10, 8, 5);
  dot(c, [[8, 5], [9, 4], [10, 3]], P.leather[3]);
  dot(c, [[10, 2], [11, 2], [10, 3], [11, 3]], P.gold[4]);
  dot(c, [[11, 4], [12, 3]], P.parchment[4]);
}, BLADE));
save("tech_whirl", iconDisc((c) => {
  for (let s = 0; s < 14; s++) {
    const a = s * 0.42;
    c.set(Math.round(6.5 + Math.cos(a) * 4), Math.round(6.5 + Math.sin(a) * 4), s > 10 ? P.steel[5] : P.steel[3]);
  }
  dot(c, [[10, 9], [11, 8], [9, 10]], P.steel[5]);
}, BLADE));
save("tech_delayed_cut", iconDisc((c) => {
  sabre(c, 3, 3, 10, 10);
  dot(c, [[2, 9], [4, 11], [6, 12]], P.parchment[3]);
}, BLADE));
save("tech_executioner", iconDisc((c) => {
  for (let y = 2; y <= 10; y++) dot(c, [[6, y], [7, y]], y > 8 ? P.steel[5] : P.steel[3]);
  dot(c, [[4, 3], [5, 3], [8, 3], [9, 3]], P.gold[3]);
  for (let x = 3; x <= 10; x++) c.set(x, 12, P.blood[3]);
}, BLADE));
save("tech_judgment", iconDisc((c) => {
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * (0.62 + k * 0.095);
    c.set(Math.round(7 + Math.cos(a) * 4.4), Math.round(6.6 - Math.sin(a) * 4.4), P.gold[3]);
  }
  for (let y = 5; y <= 11; y++) c.set(7, y, y === 11 ? P.steel[5] : P.steel[4]);
  dot(c, [[5, 4], [6, 4], [7, 4], [8, 4], [9, 4]], P.gold[4]);
}, BLADE));
const roundShield = (c, cx, cy, r) => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y);
    if (d <= r + 0.3) c.set(cx + x, cy + y, d > r - 1 ? P.bronze[3] : (x + y < 0 ? P.teal[3] : P.teal[2]));
  }
  c.set(cx, cy, P.bronze[4]);
};
save("tech_steady_guard", iconDisc((c) => roundShield(c, 7, 7, 4), SHIELD));
save("tech_riposte_mastery", iconDisc((c) => {
  roundShield(c, 5, 8, 3);
  sabre(c, 6, 9, 11, 3);
}, SHIELD));
save("tech_bash_mastery", iconDisc((c) => {
  roundShield(c, 6, 7, 3);
  dot(c, [[10, 4], [11, 3], [10, 7], [11, 7], [10, 10], [11, 11]], P.parchment[4]);
}, SHIELD));
save("tech_iron_will", iconDisc((c) => {
  for (let y = 4; y <= 10; y++) for (let x = 4; x <= 9; x++) c.set(x, y, y === 4 ? P.iron[4] : x === 4 ? P.iron[3] : P.iron[2]);
  dot(c, [[5, 6], [6, 6], [7, 6], [8, 6]], P.iron[1]);
  dot(c, [[5, 8], [6, 8], [7, 8], [8, 8]], P.iron[1]);
}, SHIELD));
save("tech_wall_of_the_caliph", iconDisc((c) => {
  for (let y = 6; y <= 11; y++) for (let x = 2; x <= 11; x++) c.set(x, y, (x + y) % 3 === 0 ? P.brick[3] : P.brick[4]);
  for (const x of [2, 3, 6, 7, 10, 11]) dot(c, [[x, 4], [x, 5]], P.brick[5]);
  dot(c, [[6, 2], [7, 2]], P.gold[4]);
}, SHIELD));
save("tech_quiet_step", iconDisc((c) => {
  for (let y = 4; y <= 10; y++) for (let x = 5; x <= 8; x++) {
    if ((x - 6.5) ** 2 / 3 + (y - 7) ** 2 / 10 <= 1) c.set(x, y, P.linen[2]);
  }
  dot(c, [[5, 2], [6, 2], [7, 2], [8, 2]], P.linen[3]);
}, SHADOW));
save("tech_bandolier", iconDisc((c) => {
  for (const x of [4, 7, 10]) {
    line(c, x, 3, x, 8, P.steel[4]);
    c.set(x, 2, P.steel[5]);
    dot(c, [[x, 9], [x, 10]], P.leather[3]);
  }
  for (let x = 2; x <= 11; x++) c.set(x, 10 + (x % 2), P.leather[2]);
}, SHADOW));
save("tech_death_from_above", iconDisc((c) => {
  for (let y = 2; y <= 9; y++) c.set(7, y, y > 7 ? P.steel[5] : P.steel[3]);
  dot(c, [[5, 7], [6, 8], [8, 8], [9, 7]], P.steel[4]);
  for (let x = 2; x <= 11; x++) c.set(x, 11, P.stone[4]);
}, SHADOW));
save("tech_running_thrust", iconDisc((c) => {
  for (let x = 4; x <= 11; x++) c.set(x, 7, x === 11 ? P.steel[5] : P.steel[4]);
  dot(c, [[3, 6], [3, 7], [3, 8]], P.gold[3]);
  for (let x = 1; x <= 4; x++) dot(c, [[x, 4], [x + 1, 10]], P.indigo[3]);
}, SHADOW));
save("tech_unseen", iconDisc((c) => {
  for (let x = 3; x <= 10; x++) c.set(x, 7 + Math.round(Math.abs(x - 6.5) > 3 ? 0 : 1), P.linen[3]);
  dot(c, [[3, 6], [10, 6]], P.linen[2]);
  dot(c, [[5, 9], [7, 10], [9, 9]], P.linen[1]);
}, SHADOW));

// Keepsakes, ringed in bronze.
const KEEP = P.bronze;
save("keep_red_thread", iconDisc((c) => {
  for (let s = 0; s < 18; s++) {
    const a = s * 0.7;
    const r = 1.5 + s * 0.17;
    c.set(Math.round(6.5 + Math.cos(a) * r), Math.round(6.5 + Math.sin(a) * r), s % 3 ? P.madder[3] : P.madder[4]);
  }
}, KEEP));
save("keep_reed_pen", iconDisc((c) => {
  line(c, 3, 11, 10, 3, P.ochre[3]);
  line(c, 4, 11, 11, 3, P.ochre[2]);
  dot(c, [[2, 12], [3, 12]], P.panel[0]);
  dot(c, [[11, 2]], P.ochre[4]);
}, KEEP));
save("keep_saffron_sash", iconDisc((c) => {
  for (let y = 4; y <= 10; y++) for (let x = 3; x <= 10; x++) {
    if (Math.abs(x - 6.5 - (y - 7) * 0.5) < 2.2) c.set(x, y, (x + y) % 4 === 0 ? P.saffron[2] : P.saffron[3]);
  }
  dot(c, [[9, 11], [10, 12], [4, 3]], P.saffron[4]);
}, KEEP));
save("keep_bronze_seal", iconDisc((c) => {
  star(c, 7, 7, 4, P.bronze[3]);
  star(c, 7, 7, 2, P.bronze[4], P.gold[4]);
}, KEEP));
save("keep_ink_stone", iconDisc((c) => {
  for (let y = 5; y <= 10; y++) for (let x = 3; x <= 10; x++) c.set(x, y, y === 5 ? P.stone[4] : P.stone[2]);
  for (let x = 5; x <= 8; x++) dot(c, [[x, 7], [x, 8]], P.panel[0]);
  dot(c, [[6, 7]], P.indigo[3]);
}, KEEP));
save("keep_prayer_beads", iconDisc((c) => {
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2;
    c.set(Math.round(6.5 + Math.cos(a) * 3.6), Math.round(6 + Math.sin(a) * 3.6), k % 2 ? P.saffron[2] : P.saffron[4]);
  }
  dot(c, [[7, 10], [7, 11], [7, 12]], P.madder[3]);
}, KEEP));
save("keep_guard_bracer", iconDisc((c) => {
  for (let y = 4; y <= 10; y++) for (let x = 4; x <= 9; x++) c.set(x, y, x === 4 ? P.bronze[4] : x === 9 ? P.bronze[1] : P.bronze[2]);
  for (const y of [5, 7, 9]) dot(c, [[6, y], [7, y]], P.bronze[4]);
}, KEEP));
save("keep_ash_ribbon", iconDisc((c) => {
  for (let y = 2; y <= 12; y++) {
    const x = Math.round(6.5 + Math.sin(y * 0.8) * 2);
    dot(c, [[x, y], [x + 1, y]], y % 3 ? P.ash[0] : P.ash[1]);
  }
}, KEEP));

// Honour: a small gold coin with a crescent, for the HUD and the menus.
{
  const c = new Canvas(10, 10);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    const d = Math.hypot(x + 0.5 - 5, y + 0.5 - 5);
    if (d <= 4.6) c.set(x, y, d > 3.7 ? (y < 5 ? P.gold[4] : P.gold[1]) : P.gold[2]);
  }
  for (let k = 0; k <= 6; k++) {
    const a = Math.PI * (0.55 + k * 0.15);
    c.set(Math.round(5 + Math.cos(a) * 2.4), Math.round(4.6 - Math.sin(a) * 2.4), P.gold[4]);
  }
  save("icon_honour", c);
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
