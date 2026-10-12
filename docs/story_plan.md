# Story plan: Hamid

The story bible for Chapter I after the review (`docs/story_review.md`), chosen 2026-10-10 ("you pick the best way
for me"). It gives Yusuf a stake (Hamid, his friend since boyhood), the enemy a face (Toqto, seen early), the chapter
a cost (Hamid dies at Toqto's hand), the history its weight (the Caliph's surrender and death), the title its
meaning (Yusuf becomes the last guardsman of the last caliph), and the player's deeds their reward (the people
saved walk out of the gate). The words are in `assets/localization/strings.csv`; the staging in the level data.

## The people

| Who | What they want | How they speak |
| --- | --- | --- |
| **Yusuf ibn Harun**, guardsman of the Caliph | To do his duty; once the Caliph has given up his city, his duty becomes the people and Hamid | Few words; dry; warmer and teasing with Hamid; at the end he gives the orders |
| **Hamid**, guardsman, Yusuf's friend since boyhood | To get Yusuf and the people out; he never thinks of himself | An older brother: jokes through pain, calls Yusuf "brother" |
| **Ibrahim** the bookseller | To save his pages; he taught both boys their letters for nothing | Warm, fond, bookish |
| **Umm Ali** (the mother) and her son **Ali** | To live | Fear, then gratitude |
| **Salim**, her husband | To find his family | Quick, practical |
| **Shaykh Abd al-Latif**, keeper of the college library | That what was here be known | Proud, bitter, exact |
| **Toqto Noyan**, captain of a thousand | The Khan's order: no one leaves | Cold, curious; respects courage and despises the surrender; never a cackling villain |

The Caliph al-Musta'sim never appears. He went out to Hülegü's tents three days before the sack to ask for terms; he is a
prisoner in the camp through the chapter, and the ending tells his death. A Persian scholar riding with the Khan (al-Tusi,
never named) chooses books to carry east.

## The arc

1. **The Fallen Market.** Hamid dragged Yusuf off the eastern wall at dawn. At the cart he tells him the Caliph went out
   to ask for terms ("These are the terms."), sends him to Ibrahim, who taught them both their letters, and gives the
   parry's counsel. "Then I'm coming back for you." Ibrahim knows them as boys: "You two were never any use apart...
   Knowledge is a trust, Yusuf. So is a friend." The card: the pages go into a boat; Yusuf runs back to the cart, and
   Hamid is gone. Blood on the stones, and the marks of many feet.
2. **Streets of Ash.** "If they took him alive, he's among the captives." From the top of the second collapse Yusuf
   sees a column below: a captain with a red plume at its head, Hamid roped and limping among the captives. Hamid
   sees him: "Leave me! Save the people!"; an escort knocks him down; the captain looks up: "Keep this one alive for
   the gate. Kill the other." The column goes on south; its rear guard turns on Yusuf (a fight). In the square, Salim
   (freed) tells him where: south, at the last gate, the captain Toqto keeps the Caliph's guardsmen for last; the
   Caliph himself is a prisoner in their camp; the road south runs past the colleges. The card: Salim goes west to his
   family; Yusuf goes south.
3. **The Scholars' Quarter.** The copyist saw the guardsmen led south at midnight. Abd al-Latif is not refusing to
   leave: the soldiers came with lists. A Persian scholar who rides with the Khan wants the astronomy, the medicine
   and the mathematics, carried east; the rest goes to the river. "They are not burning knowledge. They are choosing
   it. That is worse." He gives Yusuf the catalogue: every book, and where it went.
4. **The Last Gate.** On the wall road Salim and Umm Ali, with Ali, are together again among the people waiting for the
   gate. Salim brings Hamid's words, called out as the captives were driven past: one breath, deep, the way the old
   guard taught them (the Second Wind). At the gate square a burning barricade stands between Yusuf and the gate. Hamid
   kneels bound before it, Toqto over him. "You looked back. I told you not to... The people, Yusuf. Open the gate for
   them." Toqto: "Your Caliph knelt to us in a tent and gave us his city. His guards would not kneel. I respect that.
   It changes nothing." The stroke. "Now you are the Caliph's last guardsman." The barricade burns down; the fight.
   After it Yusuf kneels by Hamid ("I came back, brother. I came back for you."), takes his seal, and calls Salim to
   bring the people. The gate opens and they walk out past him: Salim's family and every captive the player saved.
5. **The ending.** The people on the river road; the Caliph put to death days later, rolled in a carpet and trampled by
   horses; the libraries lost, some books and scholars saved; Yusuf at the back of the column, Hamid's seal in his
   fist, his sword still drawn: the last guardsman of the last caliph of Baghdad.

## The rules the staging keeps

- Hamid's death is never a fight the player could have won: in the Streets of Ash the column halts at Yusuf's call,
  then is driven on into the smoke before the great fire and is gone before he is let go (never there to be walked up
  to), and the rear guard comes between; at the gate a burning barricade stands between them, and it burns down only
  after the stroke.
- Toqto does it himself, so the last fight is about Hamid.
- The stroke is cut on, not lingered over; with gore reduced Hamid falls whole.
- Afterwards things are different: Toqto's second-phase line, Yusuf's words, the seal (a keepsake), the ending.
- Every scene can be skipped, waits out the pause menu, plays in English and Arabic, and does not play twice.

## How it is staged

In-game scenes are data in the level files (`tools/levels/<level>.mjs`: `actors` and `scenes`), played by the
session's `StagedScenes` (`app/staged_scenes.gd`), each a list of steps (`hold`, `bars`, `walk`, `play`, `say`,
`look`, `strike`, `behead`, `wake`, `keepsake`, `fade`, ...). Actors are puppets (`features/story/actor.gd`) in the
game's own sprites: Toqto and his escort in the Streets of Ash, Hamid and the roped captives; at the gate Toqto is
the boss himself. The boss fight plays its level's `boss_prelude` scene before the fight and `boss_after` after it;
the last gate's exit plays the procession of the saved.
