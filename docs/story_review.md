# Story and dialogue review

A review of Chapter I's story and dialogue as it stands on 2026-10-10, and an answer to the user's question: should
the game have in-game cinematics and more drama, such as watching a childhood friend executed by the enemy? Read
from the strings table (`assets/localization/strings.csv`), the conversations (`features/story/dialogue_library.gd`),
the level data (`tools/levels/*.mjs`) and the cinematics (`tools/cinematics/*.mjs`).

**Outcome:** the user left the choice to the review ("you pick the best way"); the Hamid arc below was built the same
day, with the in-game scenes and the words rewritten in both languages: `docs/story_plan.md`.

## In short

The world is right and the writing is clean, but **the story has no heart yet**. Yusuf runs errands for strangers
through a burning city. He wants nothing for himself, loses nothing, chooses nothing and is the same man at the end
as at the start. The enemy has no face until the last arena. Everything he sets out to do succeeds.

The user's instinct is right. A personal loss, shown and not told, is the single change that would do the most for
this story. It must be set up before it is paid off, it must never be a fight the player could have won, and it
should put the enemy's face on the loss so the last fight means something. Hamid is already most of the way there
(see "The idea").

## The story as it plays

| Level | What happens | Who speaks |
| --- | --- | --- |
| Intro (painted) | Five hundred years of the Abbasids; the Mongols; Hülegü; the Caliph refuses; the siege | narration |
| The Fallen Market | Wounded Hamid sends Yusuf to Ibrahim the bookseller. On the way: a headsman, refugees (one shot), a mother over her son. An ambush at the bookshop. Ibrahim gives the satchel of pages; the river gate. | Hamid, the mother, Ibrahim |
| Card (painted) | The satchel goes into a boat; "the Tigris ran black with ink"; Yusuf turns back | narration |
| Streets of Ash | Follow the captives. Executions in the lanes, the mosque's dead, the captives' square. Salim (the mother's husband) is freed and points to the colleges and the captain at the last gate. | Salim |
| Card (painted) | Salim goes west to his family; Yusuf goes on to the colleges | narration |
| The Scholars' Quarter | A young copyist; the library ambush; Shaykh Abd al-Latif gives the catalogue; the river runs black | the copyist, Abd al-Latif |
| Card (painted) | The library burns; the survivors move toward the last gate | narration |
| The Last Gate | Hamid is back, leading the people; the camp, the rampart; Toqto Noyan at the gate; he falls; the gate opens | Hamid, Toqto |
| Ending (painted) | The people walk out; the libraries were lost; some books and scholars lived; Yusuf walks at the back | narration |

The whole spoken story is 84 lines (about 1,060 words). Yusuf has 25 of them (246 words), nearly all functional:
"Where are the teachers?", "Not yet. The soldiers first."

## What works

- **The tone.** Grounded and restrained. It is honest about its history ("a work of fiction, set amid real
  events"). Faith appears as the people of the city would speak it. Nothing is a caricature.
- **A clear spine.** Carry out knowledge (the pages, then the catalogue) and people (the captives, then the gate).
  Ibrahim's "Knowledge is a trust, Yusuf" states it, and the ink-black Tigris runs through three levels as a motif.
- **The pages are the best writing in the game.** A child's practice sheet "For my teacher", a physician's note for
  a child's fever, a letter to a brother in Cairo never sealed, a ledger whose last entry is unfinished. They make
  the loss human in two lines each. The story should learn from them.
- **The mother and Salim.** Her "If you see a man in a saffron sash... no. Go." pays off a level later when Yusuf
  finds him: the one thread that crosses levels, and the best moment in the spoken story.
- **Hamid's return.** "I told you not to look back. I never said I would stay put." It is warm, in character, and
  the only time anyone is funny.
- **Toqto's last line.** "The gate... is yours. The city... is not." True to history, and it refuses the player an
  easy victory.

## What holds it back

1. **Yusuf has no stake and no arc.** No family, no friend he is trying to reach, no guilt, no flaw, no wish of his
   own. "Only the people who remain, and the things they love" is said of him, never shown. A player cares about
   the city through the person they play; today that person is a courier.
2. **The plot is a chain of errands, and one scene is played twice.** Every level is: an NPC asks, Yusuf carries,
   the card says it worked. Ibrahim ("Forty years I copied books in this shop", refuses to leave, hands over pages)
   and Abd al-Latif ("Thirty years I kept these shelves", refuses to leave, hands over the catalogue) are the same
   old man in the same scene.
3. **The enemy has no face.** Toqto is described once, by Salim ("A giant in a red-plumed helm. No one gets past
   him."), named by Hamid just before the gate, and has three lines, all in the arena. The soldiers are hazards. Nobody the player hates stands behind
   the killing, so beating the Captain is a gate opening, not a reckoning.
4. **Nothing is lost that the player cares about.** Every task succeeds. The only deaths are strangers and scenery,
   and the captives the player fails to save. Even the wounded friend left behind comes back on his feet. For the fall
   of Baghdad, the story is strangely consoling: no setback, no reversal, no cost.
5. **The history's strongest beats are unused.**
   - The Caliph al-Musta'sim surrendered on 10 February 1258 and was put to death about the 20th, rolled in a carpet
     and trampled by horses (the Mongols would not spill royal blood). Yusuf is his guardsman, and the game never
     tells him his master is a prisoner in the enemy camp.
   - Nasir al-Din al-Tusi, the great Persian scholar, rode with Hülegü and is said to have carried books away to
     the observatory he would build at Maragha: a scholar serving the conqueror who also kept knowledge alive. That is a mirror of Ibrahim's
     "knowledge is a trust", and it would make one scene of the game unforgettable without bringing Tusi on screen.
   - The Mustansiriyya, the college by the Tigris that still stands today, could be named as the Scholars' Quarter.
6. **The title is not yet earned.** Nobody in the chapter is "the last Abbasid". Toqto calls Yusuf "the Caliph's
   last guardsman", which is close, but nothing makes it true. History offers the answer: Abbasids survived and the
   line was set up again in Cairo in 1261. A child of the House of Abbas among the people at the last gate would earn
   the title and open Chapter II.
7. **The story forgets what the player did.** The game remembers every captive saved or lost (`saved_<id>`,
   `lost_<id>`), the mother's rescue and Salim's freedom, but nothing comes of it. Salim says "I will tell my son
   what you did here" and is never seen again; the ending does not know who walked out of the gate.
8. **The executions numb instead of shock.** Seven headsmen across four levels, each with an anonymous kneeling
   victim, a countdown and a one-line thanks ("God reward you!"). By the third the player is solving a timer. The
   horror would hit harder if fewer were anonymous and one of them was not.
9. **One voice for everyone.** Hamid, Ibrahim, Salim, the mother and Abd al-Latif all speak the same measured,
   formal English with the same blessings ("God keep you" four times, "God reward you" twice, "Go." five times).
   Lines carry plot, not character: "Listen: they took the teachers to the colleges by the river." Some are lessons
   in costume (Hamid's parry counsel, his breath). Yusuf's lines have no personality at all. Clichés: Toqto's "Good!
   At last, a man of Baghdad who fights!" (it also insults the city's defenders); Salim's "No one gets past him."
10. **The Arabic is a translation, not a voice.** It is correct Modern Standard Arabic, but often a calque of the
   English: "ساقي انتهت" (my leg is finished), "أبقِ سيفك قريبًا" (keep your sword close), "يمسك الباب الأخير" (holds
   the last gate), "بالأذرع" (by the armful), "حسنًا! أخيرًا، رجل من بغداد يقاتل!". One word is a real error:
   Salim's sash is "زنّار", which in medieval usage is the belt Christians and Zoroastrians were made to wear; an
   Arabic reader will take Salim for a dhimmi. "حزام زعفراني" or "وشاح زعفراني" is what is meant. The Arabic deserves
   its own pass by a native ear, perhaps in a lightly classical register ("يا ابن هارون", oaths, period terms).

## The idea: in-game cinematics and a friend's execution

**Yes.** Points 1, 3 and 4 above are one problem, and the user's idea answers all three at once: a friend gives
Yusuf a stake, his death at the enemy's hands gives the enemy a face, and the loss gives the chapter its cost. Done
in the engine, with the game's own figures in the street, it will hit far harder than a painted card.

How to make it land, and the traps:

- **Set up before you pay off.** A death means as much as the time the player spent with the person. The friend
  needs at least two scenes before he dies, with warmth in them (a memory, a joke, a promise), and one moment where
  the player is trying to reach him.
- **Never a fight the player could have won.** The game already lets the player save men from headsmen. If the
  friend dies where the player could have killed the headsman, it feels like a cheat ("cutscene incompetence"). He
  must be plainly out of reach: across the burning barricade of the arena, below a wall, across the river. Do not
  put a timer on it.
- **Put the enemy's face on it.** Toqto should do it himself, so the boss fight is about the friend, not the gate.
- **Show it with restraint.** The weight is in the setup and the aftermath (Yusuf's silence, what he picks up, the
  line he says), not in the blood. Cut on the stroke; honour the reduced-gore setting.
- **Let it change him.** After the death, Yusuf's lines, the boss's lines and the ending should be different. The
  friend's keepsake (the Bronze Seal of the Guard already exists) should go with him to the end.

### Who should the friend be?

| Candidate | For | Against |
| --- | --- | --- |
| **Hamid (recommended)** | Already the friend in all but name ("brother"); opens the chapter and returns at the end; his "I never said I would stay put" is the warmest line in the game; Toqto's "the Caliph's last guardsman" becomes literally true the moment he kills him | The mentor's death before the final fight is a familiar shape (it is familiar because it works) |
| The young copyist | The scholar beside the soldier, the pen beside the sword: the game's theme in two boys; the "For my teacher" page could be his | Four lines today, one level only: needs a setup in levels 1 and 2 |
| A new friend | A clean slate | Another face to introduce, more lines and art, less time to care |

### A proposed arc, with Hamid

1. **The Fallen Market.**
   - *Opening, in the engine, about 20 s:* Yusuf comes to by the cart where Hamid dragged him. Rewrite their talk so
     they are boys who grew up together in the same quarter: one shared memory, one joke, Hamid sending him on.
   - *Mid-level, in the engine, about 10 s:* across the burning booksellers' row, Toqto's red plume. He orders the
     books thrown on the fire and the Caliph's guardsmen taken alive at the eastern wall made to kneel. He does not
     see Yusuf. The player now knows the face.
2. **Streets of Ash.**
   - *In the engine, about 15 s:* the captives' column passes on the far side of a fallen house. Hamid is among
     them, roped, beaten for calling out "Yusuf! The people, not me!". The way is blocked; the objective "Follow the
     captives' trail" now means him.
   - Salim, freed, knows where they are taken: "The guardsmen they keep alive go to the captain at the southern
     gate. He makes an example of them." Salim also brings the news that the Caliph is a prisoner in Hülegü's camp.
     The oath of the guard ("I will keep the gate while the city sleeps", a page in the Last Gate) turns bitter.
3. **The Scholars' Quarter.**
   - Make Abd al-Latif a different scene from Ibrahim's. He is not refusing to leave: he is made to sort the
     library for the conqueror. One pile goes to the river; one goes east to "the Khan's astronomer" (al-Tusi,
     never seen). His bitterness at knowledge saved by the hand that burns it, and his choice to give Yusuf the
     catalogue, is a scene no other game has.
   - At a lamp, one line of Yusuf alone: what he will say to Hamid's mother.
4. **The Last Gate.**
   - The people at the wall road are led by Salim, his wife and his son: the mother and Salim together at last.
     The Second Wind is taught as Hamid's voice remembered at the lamp ("the way the old guard taught us").
   - *The gate square, in the engine, about 30 s:* as Yusuf enters, the arena's barricade flares up between them.
     The guardsmen kneel before the gate; Hamid is the last. He sees Yusuf: "The people, Yusuf. Open the gate."
     Toqto strikes. Then Toqto turns: "Now you are the Caliph's last guardsman." The fight begins.
   - *After the fight, in the engine:* Toqto's "The gate... is yours. The city... is not." Yusuf kneels by Hamid
     and takes the bronze seal. The gate opens and the people walk out past him: Salim's family, and every captive
     the player saved, in the order they were saved.
   - *The ending card* adds the Caliph's death on the 20th, and Yusuf carrying the seal. If Chapter II is wanted:
     among the people is a boy of the House of Abbas, whom Hamid had kept hidden. That earns the title.

## In-game cinematics: what it takes

The engine already has most of the pieces: the cinematic bars, the hero held still (`Warrior.set_cinematic`), a
scripted strike (`Warrior.cinematic_strike`), the headsmen and their victims, frame-locked finishers, gore, the
subtitles (`AbbasidGame.say`), the music's duck, and `BossFight`'s timed steps that wait out a pause.

What is missing is a small, data-driven **staged-scene player**: each scene a list of steps in the level data
(`tools/levels/<level>.mjs`, so the story stays data and `main.gd` holds none of it): bars on, hold the hero, move
the camera, walk an actor to a mark, play an animation, say a line, wait, slow time, shake, a sound, bars off.
Scenes are skippable (as the cards are), stop for the pause menu, show in both languages, respect the gore setting,
and are covered by the session test (each plays to its end, skips cleanly and leaves the hero in control).

New art: Hamid roped and walking, kneeling bound, and his death; Toqto's executioner's stroke (from his heavy
blow); Salim's wife and son in the crowd (townsfolk kinds that exist).

## Line notes

Suggestions to show the direction; the final words should be written against the new arc.

| Line | Now | Suggestion |
| --- | --- | --- |
| GUARD_5 (Yusuf) | "I will bring him out. Keep your sword close." | "I'll bring the old man out. Then I'm coming back for you, so don't you dare die." |
| MOTHER_2 (Yusuf) | "Stay hidden. The way west is still open past the lamp." | "Stay low, by the wall. When the smoke thickens, go west." (no game terms in a man's mouth) |
| SALIM_4 | "A giant in a red-plumed helm. No one gets past him." | "Their captain holds the southern gate himself. Toqto, they call him. The guardsmen they took, he keeps for last." |
| LIBRARIAN_1 | "Thirty years I kept these shelves..." | A different man: angry, made to sort the books for the conqueror (see the arc) |
| TOQTO_INTRO | "The Caliph's last guardsman. No one leaves the city..." | After Hamid: "Now you are the Caliph's last guardsman. No one leaves the city. That is the Khan's word, and mine." |
| TOQTO_PHASE | "Good! At last, a man of Baghdad who fights!" | "Your Caliph knelt to us in a tent. His guard will not kneel. Good." |
| HAMID_6 | the breath as a lesson | Keep it, but as a memory: shorter, his voice, no instruction words |
| Repeats | "God keep you" ×4, "God reward you" ×2, "Go." ×5 | One blessing per person, in their own words |

Arabic: fix "زنّار" (Salim's sash) now; then one native pass over every line to replace the calques.

## Order of work, if the user agrees

1. A one-page story bible for approval: Yusuf (what he wants, how he changes), Hamid, Toqto, the Caliph's thread,
   the beats per level, the end.
2. The words rewritten in English, then in Arabic, the Arabic for the user's native eye.
3. The staged-scene player and the scenes, level by level, each tested.
4. The new animations (Hamid bound, kneeling and falling; Toqto's stroke; the crowd at the gate).
5. The gate that remembers who was saved.
6. A playtest of the whole chapter for its pacing.
