# The Last Abbasid

A 2D pixel-art action platformer set during the fall of Baghdad in February 1258. You are Yusuf ibn Harun, a guardsman of the Caliph with no company left to command, fighting through the burning city to carry its books and its people out. It is a work of fiction set amid real events.

**Chapter I: The Fall of the City of Peace** is playable from the title screen to the ending, across four levels:

1. **The Fallen Market.** The Booksellers' Market at night. Find Ibrahim the bookseller, drive the soldiers from his door, and carry his manuscripts to the river gate.
2. **Streets of Ash.** Burning lanes blocked by fallen houses, with archers on the rooftops. Free the captives roped in a small square, among them a man in a saffron sash.
3. **The Scholars' Quarter.** A college's tiled portal, its courtyard and fountain, a library being torn down, and the river wall where the Tigris runs dark with ink. Save the keeper of the library and his catalogue.
4. **The Last Gate.** First light along the southern wall, past the Mongols' camp and up onto the rampart. Then the gate square, where Toqto Noyan, captain of a thousand, holds the last gate.

Along the way there are sword-and-shield fights against Mongol swordsmen, spearmen and archers, and a two-phase boss. There are also lamp checkpoints, ten manuscripts to rescue and read, conversations, ambushes, and a story screen between each level.

## Run the game

Requires **Godot 4.7.2** (the project is tested with the Steam build at `D:\SteamLibrary\steamapps\common\Godot Engine\godot.windows.opt.tools.64.exe`). It uses the Compatibility renderer (OpenGL 3.3), so any reasonably recent GPU works.

- **From the editor:** open `project.godot` in Godot 4.7.2 and press **F5**.
- **From PowerShell, in this folder:**

```powershell
& 'D:\SteamLibrary\steamapps\common\Godot Engine\godot.windows.opt.tools.64.exe' --path .
```

The game renders at 640×360 and scales by whole multiples (a 1280×720 window by default; fullscreen is in Settings). Saves and settings go to Godot's user data folder (`%APPDATA%\Godot\app_userdata\The Last Abbasid\`). **Continue** resumes at the last lamp of the level you reached.

## Controls

| Action | Keyboard | Mouse | Gamepad |
| --- | --- | --- | --- |
| Move (run; tilt the stick lightly to walk) | A / D or ← / → | | Left stick / D-pad |
| Jump (hold for higher) | Space | | A |
| Drop through planks | S / ↓ + Space | | Stick ↓ / D-pad ↓ + A |
| Light attack (press again to chain three cuts; in the air, a slash) | J | Left button | X |
| Heavy cleave (breaks guards); in the air, the plunge; on a staggered, wounded soldier, a finisher | K or F | Middle button | Y / RT |
| Block (hold) / parry (raise just as a blow lands) | L | Right button | RB |
| Shield bash (breaks a guard, shoves; learned in the Streets of Ash) | L held + K | Right + middle button | RB held + Y |
| Rolling cut (attack late in a roll; learned at the Last Gate) | Ctrl, then J | | B, then X |
| Throw a knife (once Salim has given them; lamps refill them) | U | | LT |
| Dodge roll | Ctrl or C | | B |
| Interact / talk / light a lamp | E, W or ↑ | | D-pad ↑ |
| Drink a remedy | Q | | LB |
| Pause | Esc | | Start |

Menus take arrows/WASD, Enter/Space and Esc, or the D-pad, A and B.

## How it plays

- **Combat:** a three-cut combo, a heavy cleave that breaks a raised guard, a shield that blocks frontal blows at a stamina cost, a parry window in the first moments of raising it (a parried soldier staggers, and your next blow is a riposte at 1.8× damage), a shield bash out of the guard, and a dodge roll with invulnerability. In the air: a slash (two a jump) and the plunge, the blade driven down into the man below (a man who never saw it dies of it); down and jump drop you through planks onto them.
- **Learning:** you start with the cuts, the cleave, the shield, the roll, the air slash and the drop through planks. A page of a treatise on the arts of war in each later level teaches one more: the shield bash in the Streets of Ash, the plunging strike in the Scholars' Quarter, the rolling cut at the Last Gate; Salim gives you throwing knives.
- **Hulegu's army:** besides swordsmen, spearmen and archers, a keshig veteran whose quick cut is the first of two; a mace-bearer whom light blows do not stop and whose overhead blow breaks a shield; Georgian shield-bearers whose tall shields turn every blow from the front (bash them, plunge on them, or get behind them); and siege engineers who lob pots of burning naphtha.
- **Finishers:** a staggered soldier wounded to half his strength glows red; the heavy button plays one of four scripted kills. The last soldier standing gets the full one (black bars, slow time); while others still fight it plays quicker. Each gives back stamina.
- **Soldiers telegraph:** each attack winds up with a glint on the weapon at least 0.22 s before it lands, then commits, leaving the soldier open. White: block or parry it. Amber: a low sweep no shield stops; jump or roll. Red: no shield stops it; roll. A soldier behind his shield turns slowly, so getting round him finds his back. Swordsmen guard against combos; spearmen fight from spear's length; archers keep their distance and shoot from the roofs. At most two soldiers swing at once, and none attacks a hero who was just hit.
- **The Captain** fights behind a round bronze shield. He has a chained three-cut combo; a leaping overhead smash that no shield can stop (his body flushes red and his blade glints red, so roll); and a shield charge that breaks any guard and cannot be parried. He shrugs off ordinary blows, but broken poise or a riposte staggers him. Below half his strength he roars into a second phase: shorter pauses, longer chains, more charges, less guarding.
- **Lamps** in prayer niches are checkpoints. Lighting one saves, heals you and refills your remedies. When you fall you return to the last lamp, and the soldiers return too.
- **Manuscripts** found in the debris can be read, and you keep them even if you fall.

## Verify

```powershell
./tools/run_tests.ps1
```

This imports the project, then runs headless suites with fixed 1/60 s frames:

- hero gameplay and real keyboard/gamepad input (86 checks);
- enemy AI, every soldier type, finishers, the moves against soldiers, and the Captain (179);
- the chapter played through the real session (78), from the market through the transition into the Streets of Ash, then the Last Gate's boss fight to the ending;
- an autoplayer that finishes each of the four levels with real physics (17 checks in all).

Add `-Visual` to also render review screenshots of the levels and of every screen to `captures/` (this needs a window). Node.js is required for the test runner and the asset tools; Godot alone runs the game.

## Rebuild the assets

Every image and sound in `assets/` is generated by the scripts in `tools/asset_generation/` (Node.js, no packages needed). They are deterministic: rerunning them rewrites identical files.

```powershell
node tools/asset_generation/build_characters.mjs                       # hero, soldiers, captain, townspeople
node tools/asset_generation/build_environment.mjs --shared             # the shared tileset and prop library
node tools/asset_generation/build_environment.mjs --level streets_of_ash   # one level's sky, skyline, city, river, backdrop, facades
node tools/asset_generation/build_effects.mjs                          # sparks, flashes, dust, fire, smoke, light
node tools/asset_generation/build_ui.mjs                               # panels, bars, icons, app icon
node tools/asset_generation/build_font.mjs                             # the pixel fonts (BMFont)
node tools/asset_generation/audio/build_sounds.mjs                     # all sound effects, ambiences and music
node tools/levels/build_level.mjs streets_of_ash                       # assembles a level scene from its data
node tools/write_main_scene.mjs                                        # wires every sound and track into app/main.tscn
```

The levels are `fallen_market`, `streets_of_ash`, `scholars_quarter` and `last_gate`. The level scenes and `app/main.tscn` are generated, so edit `tools/levels/<level>.mjs` (or the generators) and rebuild rather than editing those scenes by hand. Each level's data file holds its terrain, props, enemies, people, story beats, objectives, exit and boss arena. Review sheets of the art are written to `captures/art_review/`.

## Project map

| Path | Contents |
| --- | --- |
| `app/` | `main.tscn` + `main.gd` (`AbbasidGame`): the session. It handles the title screen, levels and transitions between them, the hero, camera, HUD, saving, death and return, the story events (ambushes, gifts, the boss fight), and wires gameplay signals to sound, effects, shake and hit-stop |
| `features/combat/` | `Combatant` (the shared body: health, poise, facing, frame-driven hitboxes, being struck), `HitData`, `AttackDefinition`, `FrameHitboxes`, `Hitbox`, `Hurtbox`, the hit-flash shader |
| `features/warrior/` | the hero: `Warrior` state machine, `WarriorInput` (buffered input), `WarriorAnimator`, `WarriorProfile` and attack definitions |
| `features/enemies/` | `MongolSoldier` (the body), `EnemyBrain` (perception, patrol, alert, chase, fairness), the swordsman, spearman and archer brains, `CaptainBrain` (two phases, chained combo, smash, charge), `Arrow`, profiles and attacks |
| `features/levels/` | `Level` (objectives, ambush groups, the exit's story card), `Checkpoint`, `Manuscript`, `Npc`, `Captive`, `StoryTrigger`, `LevelExit`, `BossArena`, `FireLight`, `FleeingCivilian`, and the four generated level scenes |
| `features/ui/`, `features/menu/` | HUD (with the place-name banner and the boss's bar), dialogue box, input glyphs, theme; title, pause, settings, results, story card, manuscript reader |
| `features/presentation/` | `GameCamera` (look-ahead, trauma shake), `HitStop` (hit-stop and a boss's slow fall) |
| `features/story/` | `DialogueLibrary` (conversation structure; the words are in `assets/localization/strings.csv`, English and Arabic) |
| `shared/` | `SoundDirector`, `MusicDirector`, `VfxDirector`, `SaveGame` |
| `tools/` | asset generators, level data and builder, test runner |
| `tests/` | gameplay, enemy, session and traversal suites, review captures, fixtures |

## Art, audio and fonts

All art, animation, sound and music are original and generated by this repository's scripts:

- **Characters** are 3D models built, rigged and animated in code, then rendered into pixel art by the project's own rasterizer and pixel shader (palette ramps, outlines, a warm rim of firelight). Every animation is keyed by hand with anticipation, follow-through and cloth that trails the body; planted feet hold still while a lunge carries the body; the hitboxes come from the blade's path, and the sword trails are drawn at runtime from it. The rules are in `docs/art_style_guide.md`.
- **Environments:** each level's distant city (the sky, the smoke and the burning skyline) is cut from the project's concept paintings (`docs/concept_art/`), resampled to the game's pixel grid and reduced to a palette. Everything nearer is painted procedurally in that same palette: the street buildings, kept low and dark so the city shows above them; warm stone paving and masonry; and props with black banners bearing the gold crescent, lattice balconies, cranes with hanging cages, cobalt tilework and square gate towers. Fires are multi-tongued and spit embers, smoke drifts across the city, and a post-process adds warm bloom to fires and lamps, split toning and a vignette. The title screen shows the concept key art, and the HUD follows the concept's crescent medallion and bronze-framed bars.
- **The hero, the soldiers and the Captain** follow the concept sheets. The hero has a spiked steel helmet with an engraved bronze band over a teal hood, a long teal scarf, a quilted coat, mail sleeves, bracers, a curved sabre and a dark teal shield worked in gold; the soldiers wear riveted lamellar, fur-brimmed helmets with horsehair plumes and red cloth; the Captain adds a fur mantle, a red plume, a tattered cloak and a gold-worked shield.
- **Sound** is synthesized. The score is a plucked oud over a drone with a frame drum and a ney, in a maqam for each place: Hijaz for the market, Saba for the burning streets, Bayati for the scholars, and Hijaz Kar for the last gate and its captain.

The pixel fonts are original. Arabic text renders through the system's Tahoma or Segoe UI font at runtime, and no font files are bundled.

## Known limits

The chapter has been verified by automated suites and rendered captures, not yet by extended human play, so combat feel, difficulty and the audio mix need playtesting. See [PROGRESS.md](PROGRESS.md).
