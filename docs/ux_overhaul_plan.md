# The Last Abbasid: UI and UX overhaul — review and plan

**Status (2026-10-09): built, milestones 1-5 (see Progress at the end); awaiting the user's playtest.**

After the combat work the user played the build and asked for a big review and a very big overhaul of the
interface and the player's experience of the vertical slice: *"I don't see the text guides; I don't know
which NPC I should talk to; I didn't notice the checkpoint lamps, I didn't know a lamp is a checkpoint, I
found out by luck"*, and *"the texts that tell me I got a new move, most of the time I don't read them."*

Evidence: the game's own view, `tests/capture_ux.gd` -> `captures/ux/` (the Fallen Market as a player first
meets it: Hamid, the first lamp from afar and beside it, lit, the menu it opens, the mother, Ibrahim, the
locked gate; `-- clean` hides the interface), `captures/session/` (title, play, prompt, dialogue, fight,
pause, settings, game over, complete, boss), `captures/lamp/` (HUD, lamp menu, Techniques page), and three
independent code audits (teaching and hints; wayfinding, people and interactables; HUD, menus, readability
and accessibility). Mockups of the proposals over the game's own frames: `captures/ux/mock/`.

## Review

Worst first. Timings assume running (150 px/s, about 9 tiles a second).

### 1. Messages are thrown away before they can be read (critical)
- **No queue.** `Hud.show_hint` replaces the text and restarts its clock; at a run the Fallen Market's hints
  overwrite each other in about a second: MOVE by JUMP (1.2 s), JUMP by ATTACK (1.0 s), ROLL (the only place the
  amber warning is explained) by ARCHER_COVER (0.64 s) and that by the kick (0.85 s), CLIMB by PLUNGE (0.75 s),
  the only explanation of Honour (HINT_LAMP_MENU) by GUARD within a second of leaving the lamp. LEARNED_BASH is
  replaced by SHIELDBEARER in 0.2 s, LEARNED_ROLL_CUT by MACEMAN in 1.2 s.
- **One notice slot.** `Hud.notice` keeps one line for 2.6 s; notices raised in the same frame overwrite each
  other: Ibrahim's satchel by his keepsake, Salim's three (captives freed, knives, keepsake) down to the last,
  "Honour +10" by "New objective", every purchase at a lamp but the last.
- **Clocks run while the text is hidden.** The HUD runs while the game is paused, so hints and notices count
  down under the lamp menu, the page reader, dialogue and the pause menu. "The lamp is lit. Your path is
  remembered", the only words that say a lamp is a checkpoint, expires under the lamp menu that opens in the
  same frame; every "Technique learned" from a page expires under the reader; the charge lesson (cols 74-77)
  under the first lamp's menu (col 79).
- **Not enough time.** A fixed 7 s for hints of up to 238 characters (24-34 characters a second to keep up),
  2.6 s for spoken lines of 60-100 characters; about 15 a second is comfortable.
- **In a fight only the first sentence shows, and it is the description**: "An archer behind the spear.",
  "They have not seen you."; the shield-bearer, skirmisher, mace, axe, engineer, glance, violet-glint and
  ground-stroke hints all lose what to do. The rest waits until no soldier is within 320 px, which in practice
  means after the fight.
- **Spoken lines are notices.** `_say` sends 21 lines (the Captain's challenge, phase and last words among
  them) through the 2.6 s slot: pale 9 px text, no frame, about 1.2:1 contrast over bright smoke.

### 2. Lamps are not seen and not explained (critical)
- An unlit lamp has no light (`checkpoint.gd`) and one still frame: a dark arch in a brick block with a 6 px
  lamp. It reads as a kiln (`ux/04`), in the Streets as the well beside it; 8 of the 9 lamps have a fire 3-8
  columns away that outshines them.
- Its prompt shows within 44 px, about 0.6 s at a run, at the foot of the screen.
- Nothing teaches it before or at the first lamp: there is no lamp hint; the first words about lamps are in
  HINT_HEAL at col 198, after both of the market's lamps. The lamp menu opens at once with 0 Honour and no word
  of resting, refilling, saving or rising there; the game-over screen does not say where he will rise (with no
  lamp lit, the street's start).

### 3. Nothing marks the people to talk to (critical)
- No marker, no name: "[E] Speak" at the foot of the screen within 50 px, about 0.7 s at a run. The name shows
  only once the conversation opens.
- They sink into the scene: fighters are lifted by their shader (1.22x and a firelit rim); townsfolk are drawn
  duller than any faction and have no shader. All of them are low and still (Hamid sits, the mother and the
  copyist crouch, Salim kneels) beside captives and corpses who look the same: Hamid reads as a body against the
  cart (`ux/01`); at the Last Gate he sits beside a dead guard in his own uniform; Salim kneels between two roped
  captives, and the "saffron sash" the objective names is a 2 px dull-gold belt; the mother keeps her crouch
  after her captor dies, and her prompt shows while she is hidden behind the fighters (`ux/08`).
- The objective names people and places never shown: "the keeper of the library" is "Shaykh Abd al-Latif" in
  the dialogue; "Booksellers' Row" is never labelled. Hamid (two techniques) and the mother (a keepsake) are
  never pointed out at all.

### 4. New moves are told in text nobody reads (critical; the user's note)
- A technique learned raises a 2.6 s notice and a hint at the foot of the screen; both are overwritten or run
  out under a menu (above). The lessons on the street (charge, kick, low cut) arrive while running, often
  overwritten within a second. Only the Arts are taught well: through the page reader, with the move performed.
- Breath and Steady Breath, finishers, the white warning, remedies (until col 198), executions (until the second
  level), the Techniques page and the controls are never taught in play at all.

### 5. Where to go is never shown (high)
- The objective is a 9 px line at the top right that changes silently: "New objective" is posted only when a
  group is cleared, without its text; a gift in a conversation changes it with no notice; the box never flashes.
- No direction or distance: after the ambush Ibrahim is about 680 px on; players run past him in a 0.6 s prompt.
  Walk past the keeper of the library and you fight on to a door whose line contradicts the objective.
- **Locked exits give stale reasons.** `LevelExit.locked_line` is one fixed line: the Scholars' garden door says
  "The library is still in their hands" after the library is cleared; the Streets gate says "The captives. I
  cannot pass them by" after the captors are dead. The locked prompt is a bare name.
- The Scholars' objective says "Carry the catalogue to the last gate" where the exit is the garden door.
- No journal, no map; the pause menu does not show the objective.

### 6. Text sits where the fight is, in one small face (high)
- The hint panel is at y 298-326 and grows upward: everyone's feet are at about y 296, so two-line hints reach
  the feet and three-line hints cover shins and kneeling people (`ux/07`, `ux/08`). It uses the same panel as the
  prompt below it, and no sound.
- Text appears in five places with four lifetimes (notice top-centre without a panel, objective top-right,
  location centre, hint and prompt at the foot, coach over the head). The foot also holds the finish prompt, the
  boss bar and dialogue.
- **The move coach and the Art banner's Arabic line render in Godot's default 16 px antialiased font**: the
  HUD's gameplay layer has no theme.
- One 5x7 face for everything in play.

### 7. Buttons and devices (high)
- Keys are written as "[J]" in hints and prompts and drawn as caps only in the coach and menus.
- `art_2` has no pad binding: the second Art shows "?" on a pad, in the coach and the demos. Start does not
  close the pause menu. Pad names are Xbox-only ("D-Up" for interact). Keyboard names ignore the layout
  (AZERTY), "A/D" is hard-coded. Menus' demos never refresh their keys when the device changes.
- No controls screen and no rebinding; `MENU_CONTROLS` is unused.

### 8. The HUD (medium)
- The Art icons overlap the stamina bar's end and the pages counter; the knife icon is the 12x3 projectile
  sprite and reads as "-3"; counters show no keys; the health bar does not lengthen as health grows; Honour has
  no label; in Arabic the bars' end caps are not flipped.
- No danger feedback: no low-health warning, a refused action only flashes the corner bar, elite soldiers have
  no health readout, the boss bar no damage trail, the Guard's Bracer bonus no sign.

### 9. Menus (medium)
- Focus is faint (border and fill differ by a few shades; hover is the same style); disabled buttons and the
  scrollbar fall back to Godot grey ("Unlearn all", the Techniques scrollbar).
- The lamp tree: bought and open nodes differ only in text colour; no cost on the node, no links between
  nodes; a worn keepsake is gold text only; locked text about 2.3:1. 34 Techniques entries share 18 icons.
- Settings: a click always steps forward (a mouse cannot lower a volume); the font has no "|", so the volume
  meter falls back to a system face; the language does not follow the system's; switching language mid-game
  leaves the objective and hints in the old one; no brightness, window scale, vsync, text size, flashes,
  hit-stop or slow-motion, colour-blind or vibration options.
- Flow: Esc cannot cancel "Begin anew?"; B, which is also dodge, skips a whole story card silently; "Return to
  the Lamp" reloads without asking; focus resets after Settings or Techniques; no pause on focus loss; the mouse
  cursor is never hidden; panel widths differ from screen to screen; game over has no frame; pages cannot be
  re-read; no credits; Continue does not say where or when.

### 10. Warnings lean on colour (medium)
The signs over soldiers' heads have their own shapes and each warning its own sound, but the blade glint is the
same star for all four and the hints teach colour words. With deuteranopia amber and red come close, and violet
(breaks your guard) and the pale blue of a man open to a finisher come close: danger and opportunity look alike.

### 11. Level data that teaches wrong (medium)
- HINT_JUMP, the second hint in the game, teaches the down-stab, learned in the third level.
- The library's ambush wakes its soldiers before the plunge page whose text says "a man below who never saw it
  dies of it".
- Lessons arrive while a headsman's clock runs (market: the 3 s clock starts at col 15 between JUMP and ATTACK),
  and the first execution is never explained (HINT_EXECUTION first appears in the second level).
- Hint triggers fire again on every life (`level.gd` expects `trigger_id` flags that are never set).
- HINT_ART_SLOTS, HINT_HEAVY_STRING and HINT_GUARD_BREAK are never shown.

### What works
The objective always names the next step; the `_waiting` and `_after` lines give direction; the market gate's
line points back to Ibrahim; pages and tokens glint; the Arts are taught with their demo; the coach over the
hero is the most readable text in the game; the warning signs have their own shapes and sounds; the building
blocks are clean (one `Interactable` base, people with requirement flags, lamps with a lit state, `MovePreview`
demos for every move).

## Principles

1. **Never lose the player.** At every moment he can see where to go next, whom to talk to and what he can
   use. The world shows it first (light, motion, a sign over a head); the interface confirms it.
2. **Teach at the moment, once, where the eyes are; keep it to re-read.** A lesson appears near the middle
   of the screen at a quiet moment, short, with the real buttons drawn as keys; the important ones stop the
   game; every lesson goes into a Guide in the pause menu.
3. **One visual language.** Gold means *you can use this* (a person to talk to, a lamp, a page, a door).
   White, amber, violet and red stay the warnings. Pale blue is a man open to a finisher. Nothing else uses
   these.
4. **Readable at 640x360 on a television.** Body text never below the 9 px face; everything the player must
   read in play (prompts, lessons, objective, names) on a new 13 px face; panels close to what they speak of.
5. **Quiet when it can be.** The HUD shows what is changing (a page found, Honour earned) and fades back; the
   street stays the picture.
6. **Every choice the player makes about the interface is his:** text size, how much guidance, shake,
   flashes, slow time, buttons.

## The overhaul

Ten workstreams, built in five milestones (below). Each names where it lives.

### 1. One message system (`features/ui/`, `app/main.gd`)
- **Every clock stops while the game waits** (pause, a menu, the reader, a conversation): hints, notices,
  spoken lines and the location title count down only in play.
- **Lessons** (`LessonCard`, replacing the hint panel): one card at a time at the top centre, under the HUD's
  row and above the hero's head, never on the street; its title, at most three short lines, the buttons drawn
  as keys; held for 2.5 s + 1 s per 15 characters (at most 12 s), or until the move it teaches is done; a soft
  sound as it comes. A queue: never two at once, none lost, none under a conversation; in a fight a lesson's
  short form (what to do, never who he is) and the rest once the street is quiet.
- **Notices** (`NoticeStack`): up to three lines stacked at the right under the objective, each its own time
  (1.5 s + 1 s per 16 characters), sliding in and out; none overwritten.
- **Spoken lines** (`_say`): a subtitle line above the foot of the screen, framed, with the speaker named, timed
  by length, never overwritten (a queue).
- **Banners** for the moments that matter, in the middle of the screen: `NEW OBJECTIVE` with its words, `LAMP LIT`,
  `NEW TECHNIQUE`; the location title as now.
- The coach and the Art banner get the game's theme (no more default font).

### 2. Learning moments that stop the game (`LessonScreen`, a MenuScreen)
- **A new technique** learned from the story (a lesson on the street, a gift, a spoil) opens a card in the middle
  of the screen with the game paused: `NEW TECHNIQUE`, its name, Yusuf performing it on a small stage
  (`MovePreview`) while its buttons light in order, two lines of how and when, and `[E] Continue`. A page of the
  treatise keeps its reader (it already shows the move) under the same `NEW TECHNIQUE` heading. One bought at a
  lamp (its demo was played as it was chosen) is told in a notice. In a fight the card waits for the quiet.
- **The first lamp**, before the lamp menu opens: what a lamp is and does, with the lamp drawn lit.
- **The first time** of each thing that matters and is not obvious: the warnings (white, amber, violet, red,
  each with its sign), breath and the winded, a finisher's pale glow, a man thrown down, a captive under a
  sabre, Honour, a keepsake, remedies. Short cards (not paused) for the quick ones, paused cards with a demo for
  the warnings.
- Every card met goes into the **Guide** (pause menu), to read again with its demo.

### 3. Lamps
- **A beacon.** An unlit lamp burns low (a pulsing ember glow) and carries a gold flame sign with the word
  `Lamp` over it from 18 tiles off; a lit lamp burns high and shows `Rest` within reach.
- **Its prompt over it**, from 70 px: `[E] Light the lamp` / `[E] Rest by the lamp`.
- **Explained once** (the first-lamp card) and in the level: a lamp lesson before the first lamp; the charge
  lesson moved earlier so they do not collide.
- **Lit**: the flare, `LAMP LIT` banner with `Healed · Remedies refilled · Saved · You rise here if you fall`;
  the lamp menu opens with a line under its heading saying the same; the game-over screen says where he will rise.

### 4. People
- **A sign over each person with something to say** (`WorldMarkers`, drawn by the HUD over the world): a gold
  speech sign over one with a new conversation (larger, with the objective's mark, when the objective is to speak
  with them); nothing once all is said. **Their name** within 120 px, **the prompt over them** (`[E] Speak with
  Hamid`) within reach.
- **Seen**: townsfolk who can speak get a mild version of the fighters' shader (lifted, a soft warm rim) so they
  stand out from captives and the dead; Salim's sash wider and brighter; Hamid kept clear of the dead guard.
- A short call from someone who can speak as the hero first comes near (`<dialogue>_call`: Hamid's "Yusuf! Here,
  by the cart!").
- The objective names a person as he will be named over his head ("Speak with Shaykh Abd al-Latif").

### 5. Where to go
- **Objective targets**: each `objectives` entry gains a target (`flag|KEY|npc:ibrahim`, `exit`, `col:205`), from
  `tools/levels/<level>.mjs`. The HUD marks it: a gold sign over it on the screen, an arrow at the screen's edge
  with its name and distance in steps when it is not; the arrow bright for a few seconds when the objective
  changes or he rests, faint otherwise, hidden in a fight.
- **Every change announced** (`NEW OBJECTIVE` banner with its words and a sound, the panel flashing), whatever
  changed it (a fight, a conversation, a gift, an ambush).
- **Locked exits say what is missing now**: `lockedLines` keyed by flags like the objectives, and `(barred)` on the
  prompt.
- The objective in the pause menu; the Scholars' objective names the garden door.

### 6. Buttons and devices
- **Keys drawn as keys everywhere**: key caps built at runtime from the game's own font (`KeyCaps`), set inside
  text (`RichTextLabel`) for lessons, prompts and cards; pad buttons as round faces in their colours.
- **Pads**: `art_2` shown as `RB+RT`; Start closes the pause menu; the pad family named from `Input.get_joy_name`
  (Xbox, PlayStation, Nintendo); interact shown as the pad's own button.
- Keyboard names from the layout (`DisplayServer.keyboard_get_label_from_physical`), "A/D" from the real bindings;
  every demo's keys refresh when the device changes.
- **Controls** screen in Settings: every action, its key and its button, rebinding with a press, reset.

### 7. The HUD
- **The hero's panel** top left: health with its trail (longer as health grows), breath, resolve and the two Arts
  after the bars with their keys (lit when they can be paid for), remedies with `Q` and knives (a real knife icon)
  with `U`, pages and Honour (labelled, shown when they change).
- **Danger**: low health darkens the screen's edges in time with a heartbeat; a refused action (no breath) shows a
  short arc by the hero and a gasp; elite soldiers show their name and a bar once struck; the boss bar trails its
  damage; the Guard's Bracer shows when it bites.
- **A saved sign** (a small turning lamp in the corner) whenever the game writes the save.
- Arabic: the bars' caps flipped and the fill mirrored.

### 8. Menus
- **Theme**: a strong focus (bright rim and a marker), hover apart from focus, themed disabled buttons and
  scrollbars, one panel width.
- **Title**: Continue says where and how long; Esc cancels "Begin anew?"; credits.
- **Pause**: Resume, Guide (lessons, techniques, warnings), Journal (the objective, people met, what was found per
  level), Codex (the rescued pages to read again), Settings, Return to the Lamp (asks), Quit to Title (asks); Start
  closes it; focus remembered per screen.
- **Lamp menu**: the line on what resting did; nodes with their cost, a tick when bought, a lock when not yet open,
  links between them; a worn badge on keepsakes.
- **Game over**: where he rises and a tip drawn from how he fell (the warning he did not answer, out of breath).
- **Story cards**: hold to skip, with the prompt shown; dodge no longer skips.
- Pause on losing focus or a pad; the cursor hidden in play.

### 9. Settings and accessibility
Tabs: **Gameplay** (move prompts, lessons: all / short / off, charge held or toggled, gore), **Controls** (above),
**Audio** (as now, with ‹ › for the mouse), **Display** (fullscreen, window scale, vsync, brightness), **Access**
(text size: normal / large, screen shake, flashes, hit-stop and slow motion, warning colours: standard /
colour-blind, vibration), **Language** (defaulting to the system's; changing it refreshes the objective and the
lessons).

### 10. The levels teach in order
- The Fallen Market's first ten minutes re-spaced: a lesson at least 45 tiles or a fight from the last; move, jump,
  strike, the headsman (explained, his first delay longer), the lamp, block and parry, remedies before the first
  real fight, roll and the amber sweep before the terrace, the kick after it.
- Every lesson rewritten: what to do first, one idea, three short lines at most; the poetry kept for the people.
- Fixes: HINT_JUMP without the down-stab; the library's plunge page before its ambush; hint triggers remembered
  across lives; the unused hints placed or removed.
- The same pass on the other three levels.

## Milestones

1. **Never lost** (the user's complaints): the message system; learning cards and the Guide; lamps; people; where to
   go; the text face and key caps; the coach's theme; the level fixes of section 10 for the Fallen Market.
2. **The HUD**: the panel, keys by counters, danger feedback, elite bars, the saved sign, Arabic mirroring.
3. **The menus**: theme pass, pause additions (Journal, Codex), title, lamp menu, game over, story cards, flow.
4. **Settings and accessibility**: tabs, controls and rebinding, pads, display, access options, language.
5. **Onboarding and polish**: the other three levels' teaching passes, every lesson rewritten, UI motion and sound,
   the Arabic layouts.

## Proof
- Tests: every person with something to say has a sign and a name; the objective's target is marked (on the screen
  or at its edge) in every level; no two lessons at once and none lost; no clock runs while the game waits;
  notices raised together are all shown; the first lamp's card shows once and before the lamp menu; a technique
  learned on the street opens its card; every lesson reaches the Guide; a locked gate's line matches the story;
  rebinding round-trips through the settings; the text size changes the faces.
- Captures: `tests/capture_ux.gd` before and after, frame for frame, in English and Arabic; a scripted walk of the
  market's first ten minutes.

## Not in this overhaul
- A pixel Arabic face (open decision); bundling an open-licence Arabic font needs a download the user approves.
- Unique icons for all 34 techniques (they share 18).

## Progress

### Milestone 1: built
Everything in workstreams 1-5 and the Fallen Market's part of 10, with these departures:
- The text face has a 9 px cap height (12 px with descenders, 14 px lines), drawn fresh in `build_font.mjs` rather than
  scaled from the 5x7 face.
- Key caps are drawn at runtime from the body face (`KeyCaps`), not built as images: any key a player binds gets its cap.
  Words and caps flow together in `KeyText` (an HFlowContainer per paragraph), not a RichTextLabel.
- Lamps: no larger lantern sprite; the unlit niche got a breathing ember and the light a slow pulse, which with the
  sign reads at a glance. Lighting the first lamp shows its card before the menu; the "LAMP LIT" banner became the line
  under the lamp menu's heading and a "Your way is saved" notice (a banner under a paused menu would not be seen).
- The objective's arrow stands at a fixed height at the screen's edge (following the target's height it fell on the
  signs of the street).
- People call out once as he first comes near (`<DIALOGUE>_CALL`), which the plan listed only as an idea.
- Not yet: the journal and the map (milestone 3), lesson cards ending early when the move is done, the mother rising
  when freed, a ring on a captive under a headsman.

### Milestones 2-5: built
- **The HUD** as planned, with these departures: the news stacks at the top left under the hero's panel (beside the
  counters it reports on; at the right it fought the lesson card and the objective's arrow); no resolve star (the
  resolve bar keeps its gold); the low-breath arc is a ring by his head shown only when breath runs out; the Guard's
  Bracer has no sign yet.
- **The menus** as planned, except: no credits screen (who to credit is the user's to say); the pause menu's
  question boxes keep the panel's size; the lamp tree shows marks and prices but no drawn links between nodes (the
  columns already read top to bottom).
- **Settings and accessibility** as planned, except: no text-size option (everything read in play, conversations and
  story cards are now in the 12 px text face; the menus' 9 px face stays, its layouts being tight), no vibration
  (the game has none to turn off), no hold/toggle for block (only the charge has a toggle).
- **The levels**: the market's pass (milestone 1), the Scholars' guarded thrust moved before its headsman's clock,
  the Last Gate's road headsman given 4 s; the other levels' lessons already sit before what they teach, and the queue
  keeps them from overwriting each other.
- Not verified by hand: timing and placement in real play, the first-warning cards over a whole chapter, every
  rebinding on a real pad, the danger vignette's strength.
