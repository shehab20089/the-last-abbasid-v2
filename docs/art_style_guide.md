# The Last Abbasid: character art and animation guide

The rules every character sprite, animation and combat effect follows. The generators enforce most of them (`tools/asset_generation/characters/`, `lib/sprite_shader.mjs`); the rest are checked by eye in `captures/cast/` (the whole cast inside each level at native 640×360) and by `tools/animation_lint.mjs`.

## 1. Scale and framing
- Native game view is 640×360, scaled by whole multiples with nearest filtering. Judge art at 1× and 2×, never only from 4× sheets.
- A grown man stands 80 px to the crown of his helmet (82 with a spike or finial). Women and the young copyist are 0.94–0.95 of that; the Captain is 1.14.
- Proportions: legs half the height (hip joint at 40), shoulders 23 px across, head 11 px to the chin. Weapons to scale: sabre blade 25–30 px, spear 79 px, shield 19–23 px across.
- Every canvas is 128 px tall with the ground 4 px above its bottom (sprite offset (0, -60)); widths are even (96 to 208) so the centre never falls on a half pixel.
- Three-quarter view: the camera turns 22° toward the character's front. Every character faces right in its sheet; the game mirrors it.

## 2. Light
- One key light from the front, above, toward the viewer, shading every surface into its colour ramp. A warm rim of firelight on the back edge of the silhouette (rim strength 0.25–0.45 by material). No other lights are painted into sprites; the level's own light and the fighters' shader do the rest.
- No dithering, no anti-aliasing. Ramps of 4–7 colours, dark to light, shifting cool in the shadows and warm in the lights.

## 3. Values: how a figure reads against a dark street
Every character carries three value groups, so its shapes never merge:
- **Dark mass** (luminance about 6–15%): coats, deels, robes in shadow, outlines.
- **Mid materials** (18–40%): armour plates, leather, trousers, lit cloth, skin in shade. Neighbouring parts (cuirass and skirt, coat and trousers, sleeve and torso) must differ by at least one ramp step where they meet, or be split by a separation line.
- **Accents** (45–80%): faces, metal edges, rivets, trims, faction colour.
- **Reserved** (above 85%): blade edges, glints of one to three pixels, sparks and fire. Nothing else is that bright.
- Faces are always readable: skin is shaded one step lighter than the cloth around it, with dark eyes and beard or mask as the only dark shapes on the face.

## 4. Lines
- A one-pixel outline in each material's darkest colour pushed toward black. Separation lines where a nearer part crosses a farther one (depth step over 2.2 px). Small parts (eyes, rivets, roundels, spikes, nasals, grips) win their pixels over larger parts.

## 5. Faction colours
- **Yusuf:** warm near-black quilted coat; teal hood, scarf, sash and shield; bronze and gold trim; cool steel.
- **Mongol soldiers:** iron lamellar whose plates catch the light in rows, bronze rivets; deep madder-brown deels; crimson sashes and cloth strips; warm fur at collar and brim; black horsehair plumes. The Captain alone has a red plume, a fur mantle and gold on his shield.
- **Hulegu's other men:** the keshig veteran in indigo with a white plume and a cloth mask; the mace-bearer masked, lamellar to the collar, a flanged bronze mace; the Georgian shield-bearers (his Christian allies) in mail and a conical helmet with a nasal, crimson tunics, tall crimson shields bordered in bone and rimmed in iron, and none of the Mongols' red strips; the siege engineers in felt caps and umber coats, unarmoured, clay pots at the hip.
- **Townsfolk:** earth and dye colours (linen, wool, indigo, madder, saffron, dark green), duller than any faction colour, their lit side kept to the middle of their ramp; cream turbans and white beards for the old.

## 6. Materials
- Metal: ramp plus a hard glint where it faces the light. Lamellar: dark lacing lines between rows, plate faces lit, a bronze rivet per plate on the lit side. Mail: a ring checker. Cloth: fold lines on the lit side only. Fur: broken texture, warm. Leather: one step darker than cloth of the same hue.

## 7. Silhouettes
Each role keeps one shape no other has: Yusuf's spiked helmet, flying scarf and round shield; the swordsman's plume and round shield; the spearman's spear and masked face; the archer's bow, fur hat and quiver; the Captain's size, red plume and cloak; the scholar's great turban and satchel; the refugees' head-cloths and flight.

## 8. Animation
- Locomotion: contact, down, passing and up poses; feet planted on the ground while they bear weight; the game plays walk and run at the speed that keeps planted feet still (`walk_animation_speed`, `run_animation_speed`). Loops close seamlessly.
- Attacks: anticipation of at least two frames; the strike on one or two frames; follow-through past the target; a distinct settle back to guard. The hips lead, the shoulders follow, the arm whips last. Enemy wind-ups (the telegraph frame) hold at least 0.12 s.
- Weight: a planted foot does not slide while the body lunges; the lunge is carried by a step.
- Secondary motion (scarves, plumes, sashes, cloth strips, cloaks, coat skirts) is simulated through each animation, lagging the body; it settles instead of flicking straight up.
- Never fake motion by rotating or sliding a whole sprite.
- Character: the scholar is slow and upright; the refugees run hunched and glance back; the wounded guard breathes hard; the mother shields the child.

## 9. Combat effects
- Sword trails are runtime effects, not part of the sprite: a fading crescent behind the blade's path, cool steel for the hero and the soldiers, red for blows no shield can stop; a soldier's low sweep trails amber and his guard-breaker violet, as their warnings glint. A blade wet from a kill runs dark red for a moment (2.5 s, clearing over the last second).
- Glints are drawn in white and greys and tinted, one shape for each warning (`glint`, `glint_low`, `glint_break`, `glint_dire`), with a dark rim so they read over flames. A soldier open to a finisher glows pale blue (never a warning's colour). The engineer's burning naphtha has its own fire (`naft_fire`): low, wide, white-hot along a pool of oil, sooty, the size of the ground it burns, so it is never taken for the city's scenery fires.
- An Art spent stops the world a heartbeat: everything but a ring about Yusuf drains to dim ash grey and the Art's name crosses the screen on a band of ink, in gold, its Arabic above. Its effects stay physical: a blur of steel and dust (the Storm), a slash and blood where the Line's wounds open, a billowing fireball and men running burning (Greek fire), a ring of driven air and dust (the cry), gold embers and after-images (the fury), gold copies along a judgment's blink.
- Impacts: a streak along the cut (falling or rising with the blow) or a thrust's punch, a small spark, a dark-red spray thrown away from the attacker; dust under a hard shove. Physical, never magical.
- Hit-stop 0.06–0.15 s by weight; camera shake small for light blows, larger only for heavy ones and the Captain.

## 10. Gore and the sack
The sack of Baghdad was a massacre, and the game shows it: killing blows cut men apart, and the city's people are killed in the streets. It is shown as the horror it was, never as spectacle to admire.
- Killing blows: an attack definition lists what it can cut off (`severs`: head, arm, leg, waist) and how often (`sever_chance`, 1.0 on every hero attack: every kill dismembers); a blow the soldier never saw coming, or a riposte, takes the head. Each cut throws chunks of flesh and a mist of blood; a killing blow only flashes faintly so the cut reads. The body falls in its own animation (`death_head`, `death_arm`, `death_leg`, `death_waist`) with the wound's raw cap shown; the piece is drawn apart and thrown (`PIECES`), tumbling through eight turns and landing on its flattest side. Pieces and caps come from the same 3D model as the body, so they match it exactly.
- Warnings: a soldier's glint is white for a blow a shield answers, amber for a low sweep (jump or roll), violet for a blow that breaks a held guard (parry or roll), red for a blow no shield stops (roll). The glint follows his blade through the wind-up; all but the white also hang their own sign over his head and flush his body their colour until the blow lands. It comes at least 0.22 s before the blow.
- Finishers: scripted kills on a staggered soldier, both halves drawn to one timing table (`finisher_timing.mjs`) so the blade meets the body on the same frame. Each reads in three beats: a setup that moves the victim (a kick, a flick, a turn), a held wind-up, and one decisive cut with time slowed on it; then the body comes to rest. The soldier's half hides what is cut from the cut frame on, as the deaths do. Black bars frame them and the HUD fades away.
- Blood: dark, wet reds from `P.blood`, never bright cartoon red. A wound pumps in weakening beats as the body falls (it follows the wound frame by frame); pools spread under the dead and stay; drops mark the street where blows throw them. Reduced gore (a setting) keeps the blood of blows and nothing else.
- The people of the city: executions where the hero can arrive in time or too late, refugees cut down as they run, soldiers stabbing at the dead, looting bodies, burning books; corpses in the poses they fell in (`CORPSES`). Victims are drawn with the same care as anyone else, and never posed for laughs.
- Not shown: children killed or hurt (children appear only as survivors), sexual violence, cruelty lingered over for its own sake. The camera moves on; the player is there to stop it.
