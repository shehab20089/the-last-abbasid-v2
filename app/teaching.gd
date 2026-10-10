class_name Teaching
extends Node
## How the session teaches the player, each thing one way (docs/ux_overhaul_plan.md): a lesson waits its turn
## at the top of the screen (in a fight its first sentence, the rest after) and is kept for the Guide (`hint`);
## a technique learned, a counsel, the first lamp and the first warning of each colour stop the game on a card
## (`show_card`, or `learned` and `counsel`, whose cards wait for the first quiet moment); the first unlit lamp
## and the first person with something to say are pointed out as he comes near, and such a person calls out to
## him. The session (AbbasidGame) owns it, asks it to teach, and lends it the pause the cards need.

## How near a soldier's first warning of a colour must be for its lesson to stop the game.
const WARNING_LESSON_RANGE: float = 300.0
## How near the first unlit lamp and the first person with something to say must be to be pointed out, and how
## long into a street before they are (its first moment is for moving).
const FIRST_MEETING_RANGE: float = 150.0
const FIRST_MEETING_DELAY: float = 1.5
## How near someone with something to say must be to call out to him.
const CALL_RANGE: float = 230.0
## What each warning's card shows: its title, its words, the move that answers it (MoveDemos).
const WARNING_LESSONS: Array[Array] = [
	["LESSON_WARN_WHITE", "HINT_WARN_WHITE", &"guard"],
	["LESSON_WARN_AMBER", "HINT_WARN_AMBER", &"roll"],
	["LESSON_WARN_VIOLET", "HINT_WARN_VIOLET", &"roll"],
	["LESSON_WARN_RED", "HINT_WARN_RED", &"roll"],
]
## The lamp's card shows the niche alight.
const LAMP_PICTURE: Texture2D = preload("res://assets/environments/market/props/lamp_niche.png")

var game: AbbasidGame
## Lessons that stop the game, waiting for a quiet moment: {"kind": "technique", "id": ...}, {"kind": "counsel",
## "id": ...}.
var _cards: Array[Dictionary] = []
## What to do once the lesson on the screen is read (the first lamp's card opens the lamp menu), or nothing.
var _after_card: Callable = Callable()
## Seconds in play since the level was entered.
var _level_time: float = 0.0


func setup(session: AbbasidGame) -> void:
	game = session
	game.hud.lessons.shown.connect(_on_lesson_shown)


## A level entered: no card waits, and its first moment is for moving.
func clear() -> void:
	_cards.clear()
	_after_card = Callable()
	_level_time = 0.0


## Every frame: the time on this street counts; the lessons and the signs know whether he fights; a lesson card
## waiting for the quiet shows; the first lamp and the first person with something to say are pointed out as he
## comes near them.
func _process(delta: float) -> void:
	if game == null or game.hero == null or game.level == null:
		return
	var playing: bool = game.state == AbbasidGame.State.PLAYING
	if playing:
		_level_time += delta / maxf(Engine.time_scale, 0.001)
	var fighting: bool = playing and _fighting()
	game.hud.lessons.fighting = fighting
	game.hud.markers.fighting = fighting
	if not playing:
		return
	if not fighting and not _cards.is_empty() and game.hero.is_on_floor():
		var card: Dictionary = _cards.pop_front()
		show_card(card)
		return
	_first_meetings()


# --- Lessons at the top of the screen -----------------------------------------------------------------

## A lesson: it waits its turn at the top of the screen (in a fight its first sentence, the rest after), and
## is kept for the Guide.
func hint(key: String) -> void:
	if key == "":
		return
	game.save.note_lesson(StringName(key))
	# Lessons set off are only kept (in the Guide); set short, only their first sentence is shown.
	if game.settings.lessons == GameSettings.LessonMode.OFF:
		return
	game.hud.lessons.fighting = _fighting()
	game.hud.lessons.push(key, game.settings.lessons == GameSettings.LessonMode.SHORT)


## A lesson came onto the screen: a soft sound.
func _on_lesson_shown(key: String) -> void:
	game.play_log.event("lesson", key)
	game.sounds.play(&"lesson", -8.0)


## A technique learned: its lesson is kept for the Guide; with `card`, how to use it is a card that stops the
## game at the first quiet moment (its words at the top of the screen when lessons are short).
func learned(technique: StringName, card: bool) -> void:
	var lesson: StringName = StringName("HINT_LEARNED_%s" % String(technique).to_upper())
	game.save.note_lesson(lesson)
	if card and game.settings.lessons == GameSettings.LessonMode.FULL:
		_cards.append({"kind": "technique", "id": technique})
	elif card:
		hint(String(lesson))


## Someone explains a move he already has (Hamid: the parry and the riposte): a card that shows it performed, or
## its words at the top of the screen when lessons are short; kept for the Guide either way.
func counsel(move: StringName) -> void:
	var lesson: StringName = StringName("HINT_COUNSEL_%s" % String(move).to_upper())
	game.save.note_lesson(lesson)
	if game.settings.lessons == GameSettings.LessonMode.FULL:
		_cards.append({"kind": "counsel", "id": move})
	else:
		hint(String(lesson))


## The first warning of each colour the hero meets stops the game: what it means and how to answer it, with the
## sign beside it (the soldier's wind-up waits; the answer is still in time once the card is read).
func first_warning(tell: int, combatant: Combatant) -> void:
	var hero: Warrior = game.hero
	if combatant == hero or hero == null or game.state != AbbasidGame.State.PLAYING:
		return
	if absf(combatant.global_position.x - hero.global_position.x) > WARNING_LESSON_RANGE:
		return
	var seen: StringName = StringName("seen_warning_%d" % tell)
	if game.save.has_flag(seen):
		return
	game.save.set_flag(seen)
	if game.settings.lessons != GameSettings.LessonMode.FULL:
		var lesson: Array = WARNING_LESSONS[tell]
		var key: String = lesson[1]
		hint(key)
		return
	show_card({"kind": "warning", "tell": tell})


## The first unlit lamp and the first person with something to say he comes near: what they are (not in his first
## moment on a street, which is for moving).
func _first_meetings() -> void:
	if _level_time < FIRST_MEETING_DELAY:
		return
	for node: Node in game.level.interactables.get_children():
		var thing: Interactable = node as Interactable
		if thing == null:
			continue
		var distance: float = absf(thing.global_position.x - game.hero.global_position.x)
		var npc: Npc = thing as Npc
		if npc != null and npc.has_news() and distance < CALL_RANGE:
			_call_out(npc)
		if distance > FIRST_MEETING_RANGE:
			continue
		var lamp: Checkpoint = thing as Checkpoint
		if lamp != null and not lamp.lit and not game.save.has_flag(&"seen_lamp_lesson"):
			game.save.set_flag(&"seen_lamp_lesson")
			hint("HINT_LAMP")
		if npc != null and npc.has_news() and not game.save.has_flag(&"seen_people_lesson"):
			game.save.set_flag(&"seen_people_lesson")
			hint("HINT_PEOPLE")


## Someone with something to say calls to him as he first comes near (once): "Yusuf! Here, by the cart!"
func _call_out(npc: Npc) -> void:
	var called: StringName = StringName("called_%s" % npc.npc_id)
	if game.save.has_flag(called):
		return
	game.save.set_flag(called)
	var line: String = "%s_CALL" % String(npc.dialogue).to_upper()
	if tr(line) != line:
		game.say(npc.display_name(), line)


## A soldier near the hero is in the fight.
func _fighting() -> bool:
	if game.hero == null or game.level == null:
		return false
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.in_fight() and absf(soldier.global_position.x - game.hero.global_position.x) < 320.0:
			return true
	return false


# --- Lessons that stop the game -----------------------------------------------------------------------

## Shows a lesson card now, the game paused under it: a technique learned, a counsel, the first lamp, a warning.
## `after` is done once it is read (the first lamp's card opens the lamp menu); otherwise play goes on.
func show_card(card: Dictionary, after: Callable = Callable()) -> void:
	_after_card = after
	var kind: String = card.get("kind", "")
	game.pause_for(AbbasidGame.State.LESSON)
	match kind:
		"technique":
			var technique: StringName = card["id"]
			var art: bool = game.hero.art_by_id(technique) != null
			var key: String = "HINT_LEARNED_%s" % String(technique).to_upper()
			game.lesson_screen.show_lesson(tr(&"LESSON_NEW_ART" if art else &"LESSON_NEW_TECHNIQUE"),
				tr(Lessons.technique_name(technique)), key, _card_demo(technique))
		"counsel":
			var move: StringName = card["id"]
			var name: String = String(move).to_upper()
			game.lesson_screen.show_lesson(tr(&"LESSON_COUNSEL_HEADING"), tr("COUNSEL_%s_TITLE" % name),
				"HINT_COUNSEL_%s" % name, MoveDemos.of(move))
		"lamp":
			var niche: AtlasTexture = AtlasTexture.new()
			niche.atlas = LAMP_PICTURE
			niche.region = Rect2(80, 0, 40, 64)
			game.save.note_lesson(&"HINT_LAMP_CARD")
			game.lesson_screen.show_lesson(tr(&"LESSON_LAMP_HEADING"), tr(&"LESSON_LAMP_CARD"), "HINT_LAMP_CARD", {},
				niche)
		"warning":
			var tell: int = card["tell"]
			var lesson: Array = WARNING_LESSONS[tell]
			var title: String = lesson[0]
			var key: String = lesson[1]
			var demo: StringName = lesson[2]
			game.save.note_lesson(StringName(key))
			game.lesson_screen.show_lesson(tr(&"LESSON_WARNING_HEADING"), tr(title), key, MoveDemos.of(demo), null,
				CombatPresentation.TELL_GLINTS[tell], game.presentation.tell_colours[tell])
	game.sounds.play(&"manuscript", -6.0)


## The lesson read: on to what waits on it (the lamp menu), or back to play at once (a warning's blow is
## still coming, so the devices are hardly held off).
func close_card() -> void:
	game.lesson_screen.close()
	var after: Callable = _after_card
	_after_card = Callable()
	if after.is_valid():
		after.call()
		return
	game.resume_play(0.06)


## A technique's demo; an Art carried second is shown on the second Art's own button.
func _card_demo(technique: StringName) -> Dictionary:
	var demo: Dictionary = MoveDemos.of(technique)
	var arts: Array[ArtDefinition] = game.hero.carried_arts()
	if arts.size() > 1 and arts[1].id == technique:
		return MoveDemos.with_art_button(demo, &"art_2")
	return demo
