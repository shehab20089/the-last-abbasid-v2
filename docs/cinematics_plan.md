# The Last Abbasid: cinematics — plan

**Status (2026-10-10): the script was approved and all five cinematics are built (milestones 1–5); they await the user's viewing. See Progress at the end for where the build departs from the plan.**

The user asked for cinematics in place of the story cards, which are words on a black screen: *"similar to
the Mount & Blade intro, image motion graphics that explain the world of Calradia, but with no narration,
just text on the screen for now."* They had already said of the game's texts that *"most of the time I don't
read them."* So the pictures must tell the story, and the words are captions.

The user made seven new paintings for this in ChatGPT, from briefs written in this conversation
(`docs/concept_art/11`–`17`). A storyboard shows one frame per shot, cut from its painting and reduced to a
pixel palette as the game would, with every line in English and Arabic:
`captures/cinematics/storyboard.html` (frames `captures/cinematics/NN_<cinematic>.png`).

## What a cinematic is here

1. **Pictures carry it.** Someone who reads nothing still follows it: the city at peace, its learning, the
   map, the army, the siege, the fall, the hero. One short line at a time, and where it helps, a place and
   date in the top bar (the two-second version of the line).
2. **The same game.** Pixel art at 640×360 in each painting's own palette, as the title screen and the level
   backdrops already are, with no smooth-video look.
3. **Depth, gently.** Each painting is cut into 3–4 layers (sky, far city, near buildings, foreground). The
   camera moves them at different speeds, little enough that the cuts never show.
4. **Alive.** Fire flickers, embers rise, smoke drifts, water glints, banners stir, birds cross, and on the
   map the ink spreads. No frame is still.
5. **Letterboxed at 2.39:1** (bars 46 px high). The caption sits in the top bar and the line in the bottom
   bar, so the picture is never covered.
6. **Timed to the words, never the reverse.** A shot lasts as long as its lines need, by the card's rule
   (0.045 s a character, at least 2.4 s, fades of 0.7 s). Arabic lines get their own time. When a voice comes
   later, each line takes its clip and the shot is timed to the clip.
7. **The player's time.** Confirm moves on: the rest of a line, then the next line or shot. Holding Back
   skips the whole cinematic, as it skips the card now. A cinematic seen before skips at one press.
8. **Ink** ties them together: the Mongol advance spreads over the map like spilled ink, and the Tigris runs
   black with it.

## The paintings

| File | What it is | Used in |
|---|---|---|
| `11_City_of_Peace.png` (new) | Baghdad at dusk across the Tigris: the bridge of boats, a round reed boat, the palace's black banners | intro 1 |
| `12_House_of_Wisdom.png` (new) | A library hall: scholars copying, a student carrying books, astrolabe and armillary sphere, a courtyard fountain | intro 2, after the Streets of Ash |
| `13_Map_Table.png` (new, variant A) | A blank parchment on a desk by lamplight, seen from above | intro 3 (the map) |
| `14_The_Host.png` (new) | Riders with horsetail standards over a column in the snow: camels, ox carts with timber, tall shields | intro 4 |
| `15_The_Siege.png` (new) | A trebuchet crew hauling; the walls cracked under black crescent banners; the city burning | intro 5 |
| `16_River_of_Ink.png` (new, variant B) | A boatman in a round boat with the satchel; books and pages on the black water; the far bank burning | after the Fallen Market, ending 2 |
| `17_Road_at_Dawn.png` (new) | The column of refugees with their books toward the sunrise; Yusuf at the back; the gate burning | ending 3–4 |
| `01`, `02`, `04`, `05`, `06` (the pack) | The hero; the key art; the Streets of Ash; the Scholars' Quarter; the Last Gate | intro 6–7, the interludes, ending 1 |

- **Variants.** Of the two map tables, A's sheet fits inside the letterbox, while B's is too tall. Of the two
  rivers, B's ink lies in soft clouds and leaves room for the animated ink, while A's is baked in hard
  squiggles.
- **Checked close up:** no lettering anywhere (no false Arabic), nothing fantastic, nothing anachronistic.
- **Grading.** 11 and 12 are glossier than the pack; they are graded a little darker and less saturated, so
  they sit with it while staying the one warm calm before the fire. 06 is graded cold for "before dawn" and
  warm for "first light".

## The script

New strings are marked **new**; the rest are already in the game and unchanged, except `INTRO_2`, which is
shortened because the siege shot now says its first sentence.

### The opening (replaces the intro card; about 80 s)

| # | Picture and camera | Alive | Words |
|---|---|---|---|
| 0 | Black, as now | | `INTRO_4` |
| 1 | **11**, a slow push from the whole city toward the palace and the bridge of boats; the near bank slides past | lamps twinkle, the river glitters, gulls, a drifting sail, palm fronds | caption `CINE_PLACE_BAGHDAD` **new**; `CINE_INTRO_SEAT` **new** |
| 2 | **12**, a push between the scholars toward the student and the courtyard | lamp flames, motes, the fountain | `CINE_INTRO_LEARNING` **new** |
| 3 | **13**, the desk by lamplight; the camera closes on Baghdad as the road nears it | the ink spreads from the east; Hülegü's road draws itself; the lamp flickers | `CINE_INTRO_EAST` **new**, `CINE_INTRO_HULEGU` **new** |
| 4 | **14**, a push over the riders' shoulders toward the column | snow and dust blow, banners and horsetails stir, the sun glares | caption `CINE_PLACE_ROAD` **new**; `CINE_INTRO_WINTER` **new**, `CINE_INTRO_REFUSAL` **new** |
| 5 | **15**, from the crew and the throw back to the walls | a stone flies and strikes the wall in dust; fire, smoke, embers, torches | caption `CINE_PLACE_WALLS` **new**; `CINE_INTRO_SIEGE` **new** |
| 6 | **02**, a tilt down from the burning gate and its banners to Yusuf mid-cut | fire, embers, smoke, banners | `INTRO_1`, `INTRO_2` (shortened) |
| 7 | **01**, a tilt up from his sword and shield to his face against the burning city | embers, smoke, the banner behind him | `INTRO_3` |
| 8 | The title over black with embers, then the Fallen Market | embers | `GAME_TITLE`, `CHAPTER_1_TITLE` |

The words, English and Arabic:

| Key | English | Arabic |
|---|---|---|
| `INTRO_4` | What follows is a work of fiction, set amid real events. | ما يلي عمل خيالي، تدور أحداثه في خضمّ وقائع حقيقية. |
| `CINE_PLACE_BAGHDAD` **new** | Baghdad, the City of Peace | بغداد، مدينة السلام |
| `CINE_INTRO_SEAT` **new** | For five hundred years the caliphate had belonged to the House of Abbas. Its seat was Baghdad, the City of Peace. | خمسمئة عام والخلافة في بني العبّاس، ودارُها بغداد، مدينة السلام. |
| `CINE_INTRO_LEARNING` **new** | Scholars came from every land to read in its libraries. | وكان طلّاب العلم يفدون إليها من كلّ أرض ليقرؤوا في خزائن كتبها. |
| `CINE_INTRO_EAST` **new** | In the east, the Mongols had built the largest empire the world had ever known. | وفي المشرق، كان المغول قد أقاموا أوسع مُلكٍ عرفته الدنيا. |
| `CINE_INTRO_HULEGU` **new** | In 1256 Hülegü, brother of the Great Khan, crossed into Persia with a vast army. | وفي سنة ١٢٥٦ عبر هولاكو، أخو الخان الأعظم، إلى بلاد فارس في جيشٍ جرّار. |
| `CINE_PLACE_ROAD` **new** | The road to Baghdad, winter 1257 | طريق بغداد، شتاء ١٢٥٧ |
| `CINE_INTRO_WINTER` **new** | In the winter of 1257 his army turned toward Baghdad, and Hülegü called on the Caliph to submit. | وفي شتاء ١٢٥٧ سار هولاكو بجيشه نحو بغداد، ودعا الخليفة إلى الخضوع. |
| `CINE_INTRO_REFUSAL` **new** | The Caliph, al-Musta'sim, refused. | فأبى الخليفة المستعصم بالله. |
| `CINE_PLACE_WALLS` **new** | Before the walls, January 1258 | أمام الأسوار، يناير ١٢٥٨ |
| `CINE_INTRO_SIEGE` **new** | In January 1258 the Mongols surrounded the city. For days their engines battered the walls. | وفي يناير ١٢٥٨ أحاط المغول بالمدينة، وظلّت مجانيقهم أيامًا تدكّ أسوارها. |
| `INTRO_1` | Baghdad. The month of Safar, in the year 656 of the Hijra: February, 1258. | بغداد. شهر صفر، سنة ٦٥٦ للهجرة: فبراير ١٢٥٨ للميلاد. |
| `INTRO_2` (shortened) | Now the walls have fallen, and the sack has begun. | والآن سقطت الأسوار، وبدأ النهب. |
| `INTRO_3` | Yusuf ibn Harun, a guardsman of the Caliph, has no company left to command. Only the people who remain, and the things they love. | يوسف بن هارون، حارس من حرس الخليفة، لم يبقَ له جند يقودهم. لم يبقَ إلا من ظلّ من الناس، وما يحبّون. |

The history is told in the past and arrives in the present at the fall ("Now the walls have fallen"), the
night the game is played. The dates, checked:
- The House of Abbas held the caliphate from 750 to 1258, 508 years. Baghdad, founded in 762, was its seat
  (save 836–892 at Samarra), so the line says "its seat was Baghdad", not "ruled from Baghdad for five
  hundred years".
- The Mongol empire was the largest contiguous land empire.
- Hülegü, brother of the Great Khan Möngke, crossed the Oxus at the start of 1256. The Ismaili castles
  (Alamut) fell at the end of 1256. In 1257 he called on al-Musta'sim to submit, and the Caliph refused.
- The city was invested late in January 1258, and the eastern towers fell early in February. The Caliph
  surrendered on 10 February, and the sack began on 13 February (7 Safar 656).
- Snow on the march fits: the army crossed the Zagros in winter.

### Between levels (the lines as now, with pictures)

| Cinematic | Shots | Words |
|---|---|---|
| After the Fallen Market (`market_end`, ~21 s) | **16**: from the boatman and the satchel back to the whole river; ink blooms through the water from the floating books, the boat drifts off, pages bob. **04**: a push toward the guardsman on the broken ledge; the cage sways. | `MARKET_END_1`, `MARKET_END_2`; `MARKET_END_3`; closes on the name *Streets of Ash* |
| After the Streets of Ash (`streets_end`, ~17 s) | **04**: a drift across the smoke toward the great dome. **12** dissolving into **05**: the library at peace, then the quarter burning. | `STREETS_END_1`; `STREETS_END_2`; closes on *The Scholars' Quarter* |
| After the Scholars' Quarter (`scholars_end`, ~16 s) | **05**: a push toward the shelves as the fire takes them. **06** graded cold before dawn: the gate. | `SCHOLARS_END_1`; `SCHOLARS_END_2`; closes on *The Last Gate* |

### The ending (the lines as now; about 38 s)

| # | Picture and camera | Alive | Words |
|---|---|---|---|
| 1 | **06** at first light: the gate and the river road as the sun clears the horizon | the sun rises, the light warms, smoke thins, birds | `ENDING_1` |
| 2 | **16**, a drift over the drowned books on the steps | ink in the water, pages turning | `ENDING_2` |
| 3 | **17**, a pan along the column from the old scholars and their books... | a gentle sway, birds, smoke behind | `ENDING_3` |
| 4 | **17** ...to Yusuf at the back, the gate burning behind him; then the end screen | as above | `ENDING_4` |

After a whole game of night, this is the only daylight.

## The map

- **Projection.** It is drawn in ink inside the parchment of `13_Map_Table.png` (painting pixels
  (245, 120)–(1425, 780)). The projection is equirectangular, about 28°E–76°E and 23.5°N–46°N, with
  longitude scaled by cos 33° (29.3 px a degree). The generator draws the coasts (the eastern
  Mediterranean, the Black Sea, the Caspian, the Gulf, the Red Sea), the Tigris, Euphrates and Oxus,
  mountains hatched (Taurus, Caucasus, Zagros, Elburz), and towns as dots. The outlines are simplified by
  hand: a clear illustration, not a scholarly map.
- **The Mongol advance.** Over the first line the ink spreads from the east to the Mongols' reach in 1256:
  Khorasan and Persia, the Caucasus, and Anatolia (its Seljuks were vassals). It leaves the Caliph's lands
  (Iraq) in gold, and Syria and Egypt bare. Each pixel holds the time the ink reaches it (an arrival-time
  field), and a shader reveals it with a ragged, bleeding edge.
- **Hülegü's road.** Over the second line it draws itself as a dashed red line: Samarkand, the Oxus (1256),
  Alamut (its castle struck through), Hamadan (1257). It stops there; the camera closes on Baghdad, and the
  next shot carries the army on.
- **Names.** They are localized labels over the map, each appearing as the ink reaches it, right to left in
  Arabic. Every one is **new**:

| Key | English | Arabic |
|---|---|---|
| `MAP_BAGHDAD` | Baghdad | بغداد |
| `MAP_CALIPH` | The Caliph's lands | بلاد الخليفة |
| `MAP_PERSIA` | Persia | بلاد فارس |
| `MAP_SYRIA` | Syria | الشام |
| `MAP_EGYPT` | Egypt | مصر |
| `MAP_ARABIA` | Arabia | جزيرة العرب |
| `MAP_CASPIAN` | Caspian Sea | بحر قزوين |
| `MAP_TIGRIS` | Tigris | دجلة |
| `MAP_EUPHRATES` | Euphrates | الفرات |
| `MAP_SAMARKAND` | Samarkand | سمرقند |
| `MAP_ALAMUT` | Alamut | ألموت |
| `MAP_HAMADAN` | Hamadan | همذان |
| `MAP_MONGOLS` | The Mongols | المغول |

The years beside the road use the language's digits.

## How it is built

- **Data:** `tools/cinematics/<id>.mjs`, one file per cinematic (`intro`, `market_end`, `streets_end`,
  `scholars_end`, `ending`), like the levels. Each shot gives:
  - its painting, its layers (polygons in painting pixels, each with a depth) and its camera keys
    ([x, y, w, h] at given times, eased);
  - its effects (fire, water, banner, birds, embers, ash, snow, smoke, ink, sun), each with its mask or area;
  - its line keys and caption key, its transition (cut, dissolve, dip to black), its sound, and a minimum
    length.
- **Generator:** `tools/cinematics/build_cinematics.mjs` (Node, no packages). For each shot it:
  - cuts the layers at the painting's full resolution (up to 2.6× the screen, so a push never enlarges a
    pixel);
  - fills what each layer hides from the pixels around it;
  - grades the shot and finds its palette (`lib/quantize.mjs`), written as a colour lookup texture;
  - finds the masks: fire (bright warm pixels), water, cloth;
  - draws the map and its arrival-time field.

  It writes `assets/cinematics/<id>/` and a `CinematicDefinition` (.tres). These files are generated, never
  edited.
- **Resources** (typed, read-only): `CinematicDefinition` (its shots, music and ambience), `CinematicShot`,
  `ShotLayer`.
- **Player:** `CinematicPlayer` (`features/story/`) holds a SubViewport the size of the picture (640×268):
  - the layers move along the camera path, each by its depth;
  - a shader maps every frame to the shot's palette, so a smooth push still comes out as pixel art in the
    painting's colours;
  - the effects are shader passes on the masks, plus the title screen's embers and ash as particles;
  - the bars hold the caption and the line in the text face, laid right to left in Arabic, with the card's
    hold-to-skip prompt.
- **Into the game:** `StoryCard.play(id, …)` plays the cinematic when `assets/cinematics/<id>` has one, and
  today's words on black otherwise. `main.gd` keeps its calls.
- **Input:** Confirm finishes a line or moves on. Back held for 0.9 s skips. One press skips a cinematic
  already seen (`seen_cine_<id>` in the save).
- **Sound:**
  - Music: the intro plays over `music_title`; the ending keeps `music_ending`.
  - Ambience per shot: `amb_river` on the river, `amb_fire_wind` in the burning city, `amb_wind` on the march.
  - New sounds from `build_sounds.mjs`: the trebuchet's throw and the stone striking the wall, the army's far
    noise, and pages in the water.
- **Settings:** `flashes` off halves the fire's flicker and pulse; `brightness` applies.

## Milestones

1. **The player, the generator and one shot (the siege):** layers, camera, the palette shader, fire, embers,
   words, skip. The proof is captures across the shot. The palette's shimmer during a slow push is judged
   here; the fallback is pans and parallax on whole pixels, as the title screen drifts.
2. **The opening:** its eight shots, the map (coasts, ink, road, names in both languages), the title.
3. **The ending:** four shots, the dawn grade and the rising sun.
4. **The interludes:** the river of ink, the streets, the library dissolving into fire, the gate before dawn.
5. **Sound, settings, the seen-skip, tests, documents, the build.**

## Proof

- **`tests/session_test.gd`:**
  - each cinematic plays to its end (fast-forwarded) and hands over as the card does: the opening to the
    Fallen Market, the interludes to the next level, the ending to the end screen;
  - Confirm moves on, held Back skips, and a seen cinematic skips at a press;
  - every line, caption and name exists in English and Arabic, and every line stays up at least its reading
    time;
  - in Arabic the words sit right to left inside the bars.
- **`tests/capture_cinematics.gd`** (needs a window): the start, middle and end of each shot in English and
  Arabic, into `captures/cinematics/`.
- The full suite as before.

## Not in this plan

- A narrator (the timing takes a clip per line when there is one).
- Figures walking inside the paintings (the column, the boat crossing), beyond small cut-out drifts.
- A gallery to watch them again (the Journal could hold one later).

## Progress

### Built (2026-10-10)

- **Where it lives.**
  - `features/cinematics/`: `CinematicDefinition` and `CinematicShot` (generated, read-only), `CinematicPlayer`
    (the letterboxed player) and `cinematic.gdshader`.
  - `tools/cinematics/`:
    - `build_cinematics.mjs`, the generator;
    - `paintings.mjs`, each painting's depth, fire, water, cloth and what drifts, by hand from its grid;
    - `grades.mjs`;
    - `map.mjs`, the map and the river's ink;
    - `<id>.mjs`, one shot list per cinematic.
  - Output: `assets/cinematics/` (generated): the eleven paintings as kept (31 MB of PNG, imported lossy), and
    each cinematic's palettes and `<id>.tres`.
- **Into the game.** `StoryCard.play` plays a card's cinematic when it has one and its words on black when
  not. `main.gd` connects the card's `cue` and `ambience` signals to the sound and music directors, and passes
  brightness and flashes to the player. Nothing else in the session changed.
- **The pixel look holds in motion.** Each frame is the painting area-averaged under each output pixel (16
  taps in linear light), graded, then looked up in the shot's 128-colour palette (a 512×512 table). Captures of
  consecutive frames at 3× show stable pixels and no flicker.
- **Tests:** session 227 (adds 43).
  - Every cinematic is made and plays all its shots to the end, in English and Arabic.
  - Every word exists in both languages, and every line stays fully shown for at least its reading time in
    each.
  - The opening runs 83 s in English and 78 s in Arabic, and shows a painting from its first moments.
  - Confirm hurries; an ended cinematic is remembered.
  - A card plays its cinematic, falls back to words on black, skips at a press once seen and not before.
  - Right to left, the caption and line sit in their bars, laid right to left.
- **Capture:** `tests/capture_cinematics.gd` (`-- intro ar burst`) -> `captures/cinematics/<id>/`.

### Where the build departs from the plan

- **Parallax is limited by the screen, not set by hand.** A painting cut into depths by a soft map smears
  where the depths part, and the first build smeared on long camera moves (the key art's awning). The generator
  now gives each shot the parallax that keeps its nearest and farthest parts within 12 screen pixels of each
  other through the whole move (`parallaxFor`, `depthShift` per shot). The depth is gentler than planned but
  never tears.
- **Seen-skip lives in its own file.** The plan put it in the save as `seen_cine_<id>`. It is kept in
  `user://seen.cfg` instead, so a new game does not forget what the player has already watched. A skipped
  cinematic counts as seen.
- **Confirm hurries rather than cuts.** Time runs six times faster to the next moment (the end of the line,
  the next line, the next shot), so nothing jumps.
- **The opening starts on the painting.** The plan opened on the fiction note over black. The user's first
  look at the build read that as "still a black screen", so the city now fades in within 1.2 s and the note is
  the first line over it. The opening has eight shots and runs 83 s (78 in Arabic).
- **The ending has three shots, not four.** The column at dawn is one continuous pan, from the scholars and
  their books to Yusuf at the back, under its two lines.
- **The map's Mongol ink** covers what obeyed them by 1256: Rum, Georgia, Persia with Fars and Kerman down to
  the Gulf, Khorasan and Transoxiana. Its edge is ragged. The names appear as the ink or the road reaches them.
- **One new sound, not three.** `siege_impact` (the stone striking the walls) was added. The army's far noise
  and pages in the water are carried by the ambience beds (`wind`, `river`, `fire_wind`).
- **Fixed after the user's second look** ("when I click run ... I only got black screen"): in a game begun in
  Arabic, the picture's layers were sized before they had a parent, took the right-to-left direction and lay a
  whole picture off to the left, so only the words showed; switching to English did not move them back. They are
  now added to the picture first and laid out by anchors (`CinematicPlayer._fill_picture`). Test: session
  `begun in Arabic, the picture fills its place`. Capture: `tests/capture_cinematics.gd -- ar_start`.
- **Not built:** figures moving within a painting (the boat drifts, but no one walks) and a gallery to watch
  them again.
