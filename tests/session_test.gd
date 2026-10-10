extends SceneTree
## Plays Chapter I through the real session (app/main.tscn) with scripted input: the hero starts
## in the Fallen Market, speaks with the wounded guard, lights a lamp, takes a manuscript and reads
## it, falls and rises again at the lamp, saves the mother from the soldier standing over her,
## springs the ambush (from ahead and behind) and clears it, speaks with Ibrahim and
## opens the river gate, and the story carries him into the Streets of Ash. Then at the Last Gate:
## the arena closes, the captain roars and falls, the arena opens, the gate opens on the chapter's
## end. Progress is saved and reloads.
## Run: node tools/run_godot_cli.mjs --headless --fixed-fps 60 --path . --script res://tests/session_test.gd

var passed: int = 0
var failed: int = 0
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	SaveGame.erase()
	AbbasidGame.start_in_level = AbbasidGame.FIRST_LEVEL
	change_scene_to_file("res://app/main.tscn")
	await frames(20)
	game = current_scene as AbbasidGame
	check(game != null and game.state == AbbasidGame.State.PLAYING, "the session starts in the Fallen Market")
	check(game.hero != null and game.hero.is_on_floor(), "the hero stands in the street")
	check(game.hud.objective_label.text != "", "an objective is shown")
	game.hero.input.enabled = false
	# The first warning of each colour stops the game (tested on its own, in _warning_card).
	for tell: int in 4:
		game.save.set_flag(StringName("seen_warning_%d" % tell))
	await _first_street()
	await _speak_with_guard()
	await _execution()
	await _light_lamp()
	await _take_manuscript()
	await _fall_and_rise()
	await _mother()
	await _planks()
	await _ambush()
	await _speak_with_ibrahim()
	await _river_gate()
	_check_save()
	await _lesson_walked_past()
	await _arts_in_the_streets()
	await _growth()
	await _techniques_page()
	await _coach()
	await _right_to_left()
	await _settings_and_access()
	await _library()
	await _gate_lines()
	await _warning_card()
	await _last_gate()
	await _cinematics()
	print("SESSION_TEST_COMPLETE passed=%d failed=%d" % [passed, failed])
	await _release()
	quit(0 if failed == 0 else 1)


func check(condition: bool, label: String) -> void:
	if condition:
		passed += 1
		print("  ok   ", label)
	else:
		failed += 1
		print("  FAIL ", label)


func frames(count: int) -> void:
	for i: int in count:
		await physics_frame


func _move_hero_to(target: Node2D, offset: float = -20.0) -> void:
	game.hero.global_position = Vector2(target.global_position.x + offset, target.global_position.y - 4.0)
	game.hero.velocity = Vector2.ZERO
	await frames(10)


func _finish_dialogue() -> void:
	for i: int in 200:
		if not game.dialogue.is_open():
			return
		game.dialogue.advance()
		await frames(2)


func _interactable(name: String) -> Node2D:
	return game.level.interactables.get_node(name) as Node2D


## Reads any lesson card that has stopped the game, and goes on.
func _read_cards() -> void:
	for i: int in 10:
		if game.state != AbbasidGame.State.LESSON:
			return
		game.lesson_screen.chosen.emit(&"lesson_done")
		await frames(3)


## The first street as a player first meets it: one lesson at a time at the top of the screen (none lost, none
## cut off), Hamid marked as someone with something to say, the objective pointed out at the screen's edge.
func _first_street() -> void:
	print("the first street")
	var lessons: LessonCard = game.hud.lessons
	await frames(4)
	check(not game.save.lessons.has(&"HINT_PEOPLE"), "his first moment on the street is for moving alone")
	check(lessons.current() == "HINT_MOVE", "the first lesson is how to move (%s)" % lessons.current())
	check(game.save.lessons.has(&"HINT_MOVE"), "and it is kept for the Guide")
	await frames(90)
	var hamid: Npc = _interactable("wounded_guard") as Npc
	check(hamid.has_news() and hamid.display_name() == "SPEAKER_GUARD", "Hamid has something to say, and a name")
	check(game.save.lessons.has(&"HINT_PEOPLE") and lessons.waiting() >= 1,
		"near him, what a speech sign means waits its turn (%d waiting)" % lessons.waiting())
	var ibrahim: Npc = _interactable("ibrahim") as Npc
	check(game.hud.markers.objective_node == ibrahim and game.hud.markers.objective_mark() == &"arrow",
		"the objective points to Ibrahim, off the screen: an arrow at its edge")
	# Lessons wait for each other; none is cut off by the next.
	game._hint("HINT_ATTACK")
	game._hint("HINT_GUARD")
	await frames(2)
	check(lessons.current() == "HINT_MOVE" and lessons.waiting() >= 3, "lessons raised together wait their turn")
	# While the game waits, the lesson's clock stops.
	var left: float = lessons._left
	game._pause()
	await frames(90)
	check(is_equal_approx(lessons._left, left) and not lessons._panel.visible, "paused, the lesson hides and its clock stops")
	game.pause_menu.chosen.emit(&"resume")
	await frames(4)
	# The lesson read, the next comes.
	lessons._left = 0.0
	await frames(40)
	check(lessons.current() != "HINT_MOVE" and lessons.current() != "", "then the next (%s)" % lessons.current())
	lessons.clear()


func _speak_with_guard() -> void:
	print("the wounded guard")
	check(not game.hero.knows(&"charge"), "he does not yet hold his blow back")
	var guard: Node2D = _interactable("wounded_guard")
	await _move_hero_to(guard, 18.0)
	check(game.hero.nearest_interactable() == guard, "the guard can be spoken to")
	game.hero.input.press(&"interact")
	await frames(4)
	check(game.state == AbbasidGame.State.DIALOGUE and game.dialogue.is_open(), "speaking opens the conversation")
	check(game.get_tree().paused, "the street holds still while they speak")
	await _finish_dialogue()
	await frames(4)
	check(game.save.has_flag(&"talked_wounded_guard"), "the conversation is remembered")
	check(game.hero.knows(&"charge") and game.save.has_flag(&"knows_charge"), "Hamid's counsel teaches the charged cleave")
	check(not (_interactable("wounded_guard") as Npc).has_news(), "and he has nothing new to say")
	# What he taught stops the game: the move performed, its buttons, how and when.
	check(game.state == AbbasidGame.State.LESSON and game.lesson_screen.visible and game.get_tree().paused
		and game.lesson_screen.lesson == "HINT_LEARNED_CHARGE", "the new technique is shown on a card that stops the game")
	check(game.lesson_screen._preview.visible, "Yusuf performs it")
	game.lesson_screen.chosen.emit(&"lesson_done")
	await frames(4)
	check(game.state == AbbasidGame.State.PLAYING and not game.get_tree().paused, "read, play resumes")


func _execution() -> void:
	print("the man at the gate street")
	var captive: Captive = game.level.people.get_node("gate_captive") as Captive
	var headsman: MongolSoldier = null
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.get_meta(&"victim", &"") == &"gate_captive":
			headsman = soldier
	check(captive != null and headsman != null and captive.animation == &"kneel", "a man kneels under a raised sabre")
	var headsman_brain: EnemyBrain = headsman.get_node("Brain") as EnemyBrain
	check(headsman_brain.execution_left() < 0.0, "before the hero sees it, no count runs")
	game.hero.global_position = Vector2(headsman.global_position.x - 120.0, game.hero.global_position.y)
	await frames(30)
	var left: float = headsman_brain.execution_left()
	check(left > 0.0 and left < 1.0, "in sight of it, the count runs and the ring over him empties (%.2f)" % left)
	headsman.take_damage(headsman.max_health + 1.0)
	await frames(10)
	check(not captive.dead and captive.animation == &"run", "his executioner dead, he runs")
	check(game.save.has_flag(&"saved_gate_captive"), "his rescue is remembered")
	check(" ".join(game.hud.subtitles.lines()).contains(tr("SAVED_1")), "he cries his thanks (a line low on the screen)")
	await frames(30)


func _light_lamp() -> void:
	print("the lamp")
	var lamp: Checkpoint = _interactable("potters_lamp") as Checkpoint
	await _move_hero_to(lamp)
	game.hero.take_damage(30.0)
	game.hero.remedies = 0
	check(game.save.lessons.has(&"HINT_LAMP"), "coming near the first lamp, what a lamp is waits at the top of the screen")
	game.hero.input.press(&"interact")
	await frames(40)
	check(lamp.lit, "the lamp is lit")
	check(game.save.checkpoint == &"potters_lamp", "the lamp becomes the place to return to")
	check(game.hero.health == game.hero.max_health and game.hero.remedies == 3, "resting heals and refills remedies")
	check(SaveGame.exists(), "the journey is saved")
	check(game.state == AbbasidGame.State.LESSON and game.lesson_screen.lesson == "HINT_LAMP_CARD",
		"the first lamp of all: a card says what a lamp is")
	game.lesson_screen.chosen.emit(&"lesson_done")
	await frames(4)
	check(game.state == AbbasidGame.State.LAMP and game.lamp_menu.visible and game.get_tree().paused,
		"then the lamp menu opens")
	game.lamp_menu.chosen.emit(&"leave")
	await frames(4)
	check(game.state == AbbasidGame.State.PLAYING and not game.lamp_menu.visible, "he rises and goes on")
	check(game.hud.notices.texts().has(tr(&"NOTICE_SAVED")), "his way is saved, and he is told")
	check(game.save.lessons.has(&"HINT_LAMP_MENU"), "and what Honour is waits its turn")


func _take_manuscript() -> void:
	print("a manuscript")
	var page: Node2D = _interactable("optics")
	game.hero.global_position = Vector2(page.global_position.x - 14.0, page.global_position.y - 8.0)
	game.hero.velocity = Vector2.ZERO
	await frames(14)
	game.hero.input.press(&"interact")
	await frames(40)
	check(&"optics" in game.save.manuscripts, "the manuscript is taken")
	check(game.state == AbbasidGame.State.READING and game.reader.visible, "its words are shown")
	check(game.hud.manuscripts_label.text == "1/%d" % AbbasidGame.MANUSCRIPTS_TOTAL, "the count rises")
	game.reader.chosen.emit(&"close")
	await frames(4)
	check(game.state == AbbasidGame.State.PLAYING, "reading ends and play resumes")


func _fall_and_rise() -> void:
	print("death and return")
	game.hero.take_damage(game.hero.max_health + 10.0)
	await frames(10)
	check(game.state == AbbasidGame.State.DEAD and game.hero.dead, "the hero falls")
	await frames(170)
	check(game.game_over.visible, "the fall is acknowledged")
	game.game_over.chosen.emit(&"rise")
	await frames(110)
	var lamp: Node2D = _interactable("potters_lamp")
	check(game.state == AbbasidGame.State.PLAYING and not game.hero.dead, "he rises again")
	check(absf(game.hero.global_position.x - lamp.global_position.x) < 40.0, "he rises at the lamp")
	check(game.save.deaths == 1, "the fall is counted")
	check(&"optics" in game.save.manuscripts and not game.level.interactables.has_node("optics"),
		"a taken manuscript stays taken")
	game.hero.input.enabled = false


func _mother() -> void:
	print("the mother")
	var captor: MongolSoldier = null
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.get_meta(&"group", &"") == &"mother":
			captor = soldier
	check(captor != null and captor.sprite.animation == &"menace", "a soldier stands over the mother, sabre raised")
	var mother: Npc = _interactable("mother") as Npc
	check(mother.enabled and not mother.ready_to_speak, "she can be spoken to, but her story waits while he stands over her")
	# (Her captor held still meanwhile: the hero here stands idle within his reach.)
	var captor_brain: EnemyBrain = captor.get_node("Brain") as EnemyBrain
	captor_brain.process_mode = Node.PROCESS_MODE_DISABLED
	await _move_hero_to(mother, 18.0)
	game.hero.input.press(&"interact")
	await frames(4)
	check(game.dialogue.is_open(), "she begs for help")
	await _finish_dialogue()
	await frames(4)
	check(not game.save.has_flag(&"talked_mother"), "that is not yet their conversation")
	# Back down the street, short of where her cry is heard, before he stirs again.
	var cry_at: Node2D = game.level.triggers.get_node("mother_cry") as Node2D
	game.hero.global_position = Vector2(cry_at.global_position.x - 80.0, game.hero.global_position.y)
	await frames(4)
	captor_brain.process_mode = Node.PROCESS_MODE_INHERIT
	await frames(4)
	var trigger: Node2D = game.level.triggers.get_node("mother_cry") as Node2D
	game.hero.global_position = Vector2(trigger.global_position.x, trigger.global_position.y + 76.0)
	# Startled from his task, he takes a moment to turn.
	await frames(40)
	var brain: EnemyBrain = captor.get_node("Brain") as EnemyBrain
	check(brain.mode != EnemyBrain.Mode.IDLE and brain.mode != EnemyBrain.Mode.PATROL, "her cry turns him to the hero")
	check(captor.facing < 0.0, "he faces the hero")
	var before: String = game.objective()
	captor.take_damage(captor.max_health + 1.0)
	await frames(10)
	check(game.save.has_flag(&"mother_cleared"), "her captor is dead")
	check(mother.ready_to_speak, "she will speak now")
	check(game.objective() == before, "the objective is unchanged")


## The planks of the street (one-way tiles): down and jump drop him through to the street.
func _planks() -> void:
	print("through the planks")
	var hero: Warrior = game.hero
	# The street is the top of row 28; the planks past the mother, the top of row 25.
	var street: float = 28.0 * 16.0
	hero.global_position = Vector2(106.5 * 16.0, street - 64.0)
	hero.velocity = Vector2.ZERO
	await frames(30)
	check(hero.is_on_floor() and hero.global_position.y < street - 40.0, "he stands on the planks")
	hero.input.down_held = true
	hero.input.press(&"jump")
	await frames(40)
	hero.input.down_held = false
	check(hero.is_on_floor() and absf(hero.global_position.y - street) < 2.0, "down and jump drop him to the street")


func _ambush() -> void:
	print("the ambush")
	var ambushers: Array[MongolSoldier] = []
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.get_meta(&"group", &"") == &"ambush":
			ambushers.append(soldier)
	check(ambushers.size() == 3, "three soldiers wait at the bookseller's door")
	var unseen: int = 0
	for soldier: MongolSoldier in ambushers:
		if not soldier.visible:
			unseen += 1
	check(unseen == 3, "they are out of sight until it springs")
	var trigger: Node2D = game.level.triggers.get_node("ambush") as Node2D
	game.hero.global_position = Vector2(trigger.global_position.x, trigger.global_position.y + 76.0)
	await frames(8)
	check(game.save.has_flag(&"ambush"), "the ambush springs")
	var awake: int = 0
	var behind: int = 0
	for soldier: MongolSoldier in ambushers:
		var brain: EnemyBrain = soldier.get_node("Brain") as EnemyBrain
		if not brain.dormant and soldier.visible:
			awake += 1
		if soldier.global_position.x < game.hero.global_position.x:
			behind += 1
	check(awake == 3, "they all wake and show themselves")
	check(behind == 1, "one comes from behind")
	# A killing blow that takes a head: the head flies and the wound pumps as he falls.
	var first: MongolSoldier = ambushers[0]
	var cleave: AttackDefinition = (load("res://features/warrior/definitions/heavy.tres") as AttackDefinition).duplicate()
	cleave.severs = [&"head"]
	cleave.sever_chance = 1.0
	var blow: HitData = HitData.from_attack(game.hero, cleave)
	blow.damage = first.max_health + 1.0
	blow.direction = signf(first.global_position.x - game.hero.global_position.x)
	first.unaware = false
	first.receive_hit(blow)
	await frames(6)
	var flying: int = 0
	for child: Node in game.gore.get_children():
		if child is GorePiece:
			flying += 1
	check(first.severed == &"head" and flying >= 1 + GoreDirector.GIBS_PER_CUT,
		"a killing blow takes his head; it flies, and flesh with it (%d pieces)" % flying)
	var bleeding: bool = false
	for child: Node in first.get_children():
		if child is BloodFountain:
			bleeding = true
	check(bleeding, "his wound pumps as he falls")
	game.hero.global_position.x -= 300.0
	for soldier: MongolSoldier in ambushers:
		soldier.take_damage(soldier.max_health + 1.0)
		await frames(2)
	await frames(10)
	check(game.save.has_flag(&"ambush_cleared"), "the door is cleared")
	check(game.objective() == "OBJ_SPEAK_IBRAHIM", "Ibrahim can be found")
	check(game.hud.moments.titles().has(tr("OBJ_SPEAK_IBRAHIM")), "the new objective is announced")
	check(game.hud.markers.objective_node == _interactable("ibrahim"), "and Ibrahim is marked")


func _speak_with_ibrahim() -> void:
	print("Ibrahim")
	var ibrahim: Npc = _interactable("ibrahim") as Npc
	check(ibrahim.ready_to_speak, "Ibrahim will speak now")
	await _move_hero_to(ibrahim, -22.0)
	game.hero.input.press(&"interact")
	await frames(4)
	check(game.dialogue.is_open(), "Ibrahim speaks")
	await _finish_dialogue()
	await frames(4)
	check(game.save.has_flag(&"satchel"), "the satchel is given")
	var news: PackedStringArray = game.hud.notices.texts()
	check(news.has(tr("NOTICE_SATCHEL")) and news.size() >= 2,
		"the satchel's notice is not lost under the keepsake's (%s)" % " | ".join(news))
	check(game.hud.moments.titles().has(tr("OBJ_RIVER_GATE")), "the new objective is announced across the screen")
	check(game.hud.markers.objective_node == _interactable("RiverGate"), "and the river gate is marked")
	check(game.objective() == "OBJ_RIVER_GATE", "the river gate is the way")
	var gate: LevelExit = _interactable("RiverGate") as LevelExit
	check(gate.unlocked, "the gate will open")


func _river_gate() -> void:
	print("the river gate")
	var gate: Node2D = _interactable("RiverGate")
	await _move_hero_to(gate, -22.0)
	game.hero.input.press(&"interact")
	await frames(30)
	check(game.state == AbbasidGame.State.ENDING, "the gate opens")
	for i: int in 400:
		await physics_frame
		if game.card.visible:
			break
	check(game.card.visible, "the boat and the river are told")
	game.card.skip()
	for i: int in 200:
		await physics_frame
		if game.state == AbbasidGame.State.PLAYING and game.level != null:
			break
	check(game.state == AbbasidGame.State.PLAYING and game.level.level_id == &"streets_of_ash",
		"the story goes on into the Streets of Ash")
	check(game.objective() == "OBJ_FOLLOW_CAPTIVES", "a new objective is set")


func _check_save() -> void:
	print("saving")
	var loaded: SaveGame = SaveGame.load_game()
	check(loaded.level == "res://features/levels/streets_of_ash/streets_of_ash.tscn", "the next level is saved")
	check(loaded.checkpoint == &"", "a new level starts at its beginning")
	check(&"optics" in loaded.manuscripts, "the manuscripts are saved")
	check(loaded.has_flag(&"satchel") and loaded.has_flag(&"fallen_market_complete"), "the story is saved")
	check(loaded.deaths == 1, "the falls are saved")


## Walked past Hamid: the lesson of the held blow comes before the first lamp anyway.
func _lesson_walked_past() -> void:
	print("a lesson walked past")
	for flag: StringName in [&"knows_charge", &"hamid_counsel", &"talked_wounded_guard"]:
		game.save.flags.erase(flag)
	game._enter_level(AbbasidGame.FIRST_LEVEL, &"", false, false)
	await frames(20)
	game.hero.input.enabled = false
	check(not game.hero.knows(&"charge"), "without Hamid's counsel he does not hold his blow back")
	var lesson: Node2D = game.level.triggers.get_node("lesson_charge") as Node2D
	game.hero.global_position = Vector2(lesson.global_position.x, game.hero.global_position.y)
	await frames(10)
	check(game.hero.knows(&"charge") and game.save.has_flag(&"knows_charge"), "the lesson comes before the first lamp")
	check(game.state == AbbasidGame.State.LESSON and game.lesson_screen.lesson == "HINT_LEARNED_CHARGE",
		"and stops the game to show it")
	await _read_cards()


## The Streets of Ash: a leaf of the treatise teaches the Storm of Blades, and with it the resolve meter,
## half full; a kill earns resolve, more for one the dead man never saw coming; a lamp keeps it.
func _arts_in_the_streets() -> void:
	print("resolve and the Arts")
	game._enter_level("res://features/levels/streets_of_ash/streets_of_ash.tscn", &"square_lamp", false, false)
	await frames(20)
	game.hero.input.enabled = false
	check(not game.hero.has_resolve() and not game.hud._resolve_bar.visible, "before an Art, no resolve meter")
	check(game.hero.max_health == game.hero.profile.max_health + game.VIGOUR, "a level behind him, he has more health")
	var tough: MongolSoldier = game.level.soldiers()[0]
	check(is_equal_approx(tough.max_health, tough.profile.max_health * game.level.toughness.x) and game.level.toughness.x > 1.0,
		"and the soldiers here are tougher")
	var page: Manuscript = _interactable("furusiyya_storm") as Manuscript
	page.interact(game.hero)
	await frames(4)
	game.reader.chosen.emit(&"close")
	await frames(4)
	check(game.hero.knows(&"storm") and game.save.has_flag(&"knows_storm"), "the leaf teaches the Storm of Blades")
	check(game.hero.has_resolve() and game.hero.resolve >= game.hero.profile.resolve_kept and game.hud._resolve_bar.visible,
		"the resolve meter shows, half full (%.0f)" % game.hero.resolve)
	check(game.save.arts == [&"storm"] and game.hero.carried_arts()[0].id == &"storm", "and he carries it")
	# A soldier he takes unawares earns more resolve than one who saw him.
	var looter: MongolSoldier = null
	var other: MongolSoldier = null
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.get_meta(&"activity", &"") == &"loot" and looter == null:
			looter = soldier
		elif soldier.get_meta(&"activity", &"") == &"" and other == null and not soldier.get_meta(&"dormant", false):
			other = soldier
	game.hero.set_resolve(10.0)
	looter.receive_hit(_hero_blow(looter.max_health + 1.0))
	await frames(2)
	check(is_equal_approx(game.hero.resolve, 10.0 + game.hero.profile.resolve_surprise_kill),
		"a man taken unawares earns %.0f resolve" % game.hero.profile.resolve_surprise_kill)
	other.unaware = false
	game.hero.set_resolve(10.0)
	other.receive_hit(_hero_blow(other.max_health + 1.0))
	await frames(2)
	check(game.hero.resolve >= 10.0 + game.hero.profile.resolve_kill - 0.1, "any kill earns resolve")
	var lamp: Checkpoint = _interactable("square_lamp") as Checkpoint
	game.hero.set_resolve(42.0)
	lamp.interact(game.hero)
	await frames(4)
	game.lamp_menu.chosen.emit(&"leave")
	await frames(2)
	check(is_equal_approx(SaveGame.load_game().resolve, 42.0), "a lamp keeps his resolve")
	check(SaveGame.load_game().arts == [&"storm"], "and the Arts he carries")


## The pause menu's page of techniques: what he knows, and what lies ahead.
func _techniques_page() -> void:
	print("the techniques page")
	game._pause()
	await frames(2)
	game.pause_menu.chosen.emit(&"techniques")
	await frames(2)
	check(game.techniques_screen.visible and not game.pause_menu.visible, "the pause menu opens the techniques page")
	var known: int = 0
	var ahead: int = 0
	for button: Node in game.techniques_screen._grid.get_children():
		var entry: Array = (button as Button).get_meta(&"entry")
		if game.techniques_screen._knows(entry):
			known += 1
		else:
			ahead += 1
	check(known >= 6 and ahead > 0, "it shows what he knows and what lies ahead (%d, %d)" % [known, ahead])
	game.techniques_screen.chosen.emit(&"techniques_back")
	await frames(2)
	check(game.pause_menu.visible and not game.techniques_screen.visible, "and goes back to the pause menu")
	game.pause_menu.chosen.emit(&"resume")
	await frames(4)


## The coach names a learned move over the hero as its moment comes, with its button, until he has used
## it a few times; the setting keeps it always, or never.
func _coach() -> void:
	print("the coach")
	game._enter_level("res://features/levels/streets_of_ash/streets_of_ash.tscn", &"square_lamp", false, false)
	await frames(20)
	game.hero.input.enabled = false
	game.save.bought = [&"pommel"]
	game.save.practice.clear()
	game._apply_growth()
	var coach: MoveCoach = game.hud.coach
	game.hero.input.press(&"attack")
	await frames(6)
	check(coach.shown == &"pommel" and coach._panel.visible, "while the cut plays, the coach names the pommel strike")
	check(coach._key.text == game.glyphs.label(&"heavy_attack"), "with the button that makes it (%s)" % coach._key.text)
	game.hero.input.press(&"heavy_attack")
	await frames(70)
	check(game.save.times_used(&"pommel") == 1, "making it counts a use")
	# (Each time long enough after the last for the string to start again.)
	for i: int in 2:
		game.hero.input.press(&"attack")
		await frames(6)
		game.hero.input.press(&"heavy_attack")
		await frames(70)
	check(game.save.times_used(&"pommel") == 3, "three uses (%d)" % game.save.times_used(&"pommel"))
	game.hero.input.press(&"attack")
	await frames(6)
	check(coach.wanted_technique() == &"", "once it is in his hands, it is no longer named")
	await frames(70)
	game.settings.set_move_prompts(GameSettings.Prompts.ALWAYS)
	game.hero.input.press(&"attack")
	await frames(6)
	check(coach.wanted_technique() == &"pommel", "set to always, it is named still")
	await frames(70)
	game.settings.set_move_prompts(GameSettings.Prompts.OFF)
	game.save.practice.clear()
	game.hero.input.press(&"attack")
	await frames(6)
	check(coach.wanted_technique() == &"", "and set off, never")
	await frames(30)
	game.settings.set_move_prompts(GameSettings.Prompts.LEARNING)
	# The uses are kept with the save.
	game.save.practise(&"pommel")
	game.save.write()
	check(SaveGame.load_game().times_used(&"pommel") == 1, "the uses are saved")
	# Named a dozen times and never taken up, a move is given up on (and that is kept too).
	game.save.practice.clear()
	game.save.shown[&"pommel"] = MoveCoach.RETIRE_AFTER
	await frames(40)
	game.hero.input.press(&"attack")
	await frames(6)
	check(coach.wanted_technique() == &"", "named a dozen times and never used, the move is no longer named")
	game.save.write()
	check(SaveGame.load_game().times_shown(&"pommel") == MoveCoach.RETIRE_AFTER, "the times named are saved")
	game.save.shown.clear()
	await frames(70)
	# A soldier near him winding up a blow: nothing is named (the warning is what matters).
	var scene: PackedScene = load("res://features/enemies/swordsman.tscn")
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	game.level.get_node("Enemies").add_child(soldier)
	soldier.global_position = game.hero.global_position + Vector2(game.hero.facing * 90.0, 0.0)
	(soldier.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	soldier.unaware = false
	await frames(4)
	game.hero.input.press(&"attack")
	await frames(3)
	var named: StringName = coach.wanted_technique()
	soldier.attack(soldier.profile.attacks[SwordsmanBrain.SLASH])
	await frames(2)
	check(named == &"pommel" and coach.wanted_technique() == &"",
		"while a soldier near him winds up, the coach is silent (%s)" % named)
	await frames(60)
	# A lesson in a fight shows its first sentence (what to do); the whole of it once the fight is over.
	var lessons: LessonCard = game.hud.lessons
	lessons.clear()
	soldier.engaged = true
	await frames(2)
	game._hint("HINT_ATTACK")
	await frames(3)
	var cut_short: String = lessons.current_text()
	check(cut_short.ends_with(".") and cut_short.length() < tr("HINT_ATTACK").length(),
		"a lesson in a fight shows its first sentence (%s)" % cut_short)
	soldier.queue_free()
	lessons._left = 0.0
	await frames(40)
	check(lessons.current_text() == tr("HINT_ATTACK"), "and whole once the fight is over")
	lessons.clear()
	game.save.bought.clear()
	game._apply_growth()


## In Arabic the screens are laid out right to left: every menu and the HUD's rows built in code must be
## mirrored whole, never pushed off the edge of the screen.
func _right_to_left() -> void:
	print("right to left")
	game.settings.set_language("ar")
	var screen: Rect2 = Rect2(Vector2.ZERO, Vector2(640, 360))
	var lamp: Checkpoint = _interactable("square_lamp") as Checkpoint
	lamp.interact(game.hero)
	await frames(4)
	var panel: Control = game.lamp_menu.get_child(1) as Control
	check(game.lamp_menu.visible and screen.encloses(panel.get_global_rect()),
		"in Arabic the lamp menu is on the screen (%s)" % panel.get_global_rect())
	# The pause button lets him rise, whatever the menu shows.
	var press: InputEventAction = InputEventAction.new()
	press.action = &"pause"
	press.pressed = true
	Input.parse_input_event(press)
	await frames(4)
	check(game.state == AbbasidGame.State.PLAYING, "and the pause button lets him rise from it")
	game._pause()
	await frames(2)
	game.pause_menu.chosen.emit(&"techniques")
	await frames(2)
	var page: Control = game.techniques_screen.get_child(1) as Control
	check(screen.encloses(page.get_global_rect()), "the techniques page is on the screen (%s)" % page.get_global_rect())
	# A string of buttons reads the way the language does: right to left its arrows point left (never mirrored).
	(game.techniques_screen._grid.get_child(0) as Button).grab_focus()
	await frames(2)
	var arrows: Array[Label] = []
	for child: Node in game.techniques_screen._preview._keys_row.get_children():
		var arrow: Label = child as Label
		if arrow != null and (arrow.text == "‹" or arrow.text == "›"):
			arrows.append(arrow)
	var leftward: bool = not arrows.is_empty()
	for arrow: Label in arrows:
		leftward = leftward and arrow.text == "‹" and arrow.text_direction == Control.TEXT_DIRECTION_LTR
	check(leftward, "right to left, a string of buttons reads right to left, its arrows pointing left (%d)" % arrows.size())
	check(game.hud.coach._panel.get_child(0) is HBoxContainer
		and (game.hud.coach._panel.get_child(0) as HBoxContainer).is_layout_rtl(), "and the coach's button stands where the eye begins")
	# A HUD built right to left (a game begun in Arabic): the boss's bar and its trail lie in one place, fill from the
	# right, and their arrowheads point outward.
	var hud_scene: PackedScene = load("res://features/ui/hud.tscn")
	var rtl_hud: Hud = hud_scene.instantiate() as Hud
	rtl_hud.glyphs = game.glyphs
	game.add_child(rtl_hud)
	await frames(2)
	rtl_hud.show_boss("x", 50.0, 100.0)
	await frames(3)
	var bar_rect: Rect2 = rtl_hud.boss_bar.get_global_rect()
	var trail_rect: Rect2 = rtl_hud._boss_trail.get_global_rect()
	check(bar_rect.is_equal_approx(trail_rect) and screen.encloses(bar_rect),
		"right to left, the boss's trail lies on his bar (%s, %s)" % [bar_rect, trail_rect])
	check(rtl_hud.boss_bar.fill_mode == TextureProgressBar.FILL_RIGHT_TO_LEFT
		and (rtl_hud.boss_box.get_node("BossCapLeft") as TextureRect).flip_h == false,
		"and fills from the right, its ends pointing outward")
	# And its banners (an Art's name, a new objective) stand on the screen.
	rtl_hud.art_banner("Storm of Blades", "عاصفة السيوف")
	rtl_hud.moment("NEW OBJECTIVE", "Speak with Ibrahim")
	await frames(40)
	check(screen.encloses(rtl_hud.art_name._words.get_global_rect()) and screen.encloses(rtl_hud.moments._title.get_global_rect()),
		"right to left, the banners stand on the screen (%s, %s)" % [rtl_hud.art_name._words.get_global_rect(),
		rtl_hud.moments._title.get_global_rect()])
	rtl_hud.queue_free()
	await frames(2)
	game.techniques_screen.chosen.emit(&"techniques_back")
	game.pause_menu.chosen.emit(&"resume")
	await frames(4)
	var honour: Control = game.hud._honour_label
	check(honour.is_visible_in_tree() and screen.encloses(honour.get_global_rect()),
		"the Honour count is on the screen (%s)" % honour.get_global_rect())
	game.settings.set_language("en")
	await frames(2)


## The settings: a button rebound stays rebound (and leaves the action that had it), all are put back; the
## warnings in colours for colour-blind eyes; time effects off; lessons short or off; the settings screen's pages.
func _settings_and_access() -> void:
	print("settings and access")
	var settings: GameSettings = game.settings
	var key_n: InputEventKey = InputEventKey.new()
	key_n.physical_keycode = KEY_N
	settings.rebind(&"jump", key_n)
	check(InputMap.action_has_event(&"jump", key_n) and game.glyphs.label(&"jump") == "N", "a key rebound jumps (%s)" % game.glyphs.label(&"jump"))
	settings.load_settings()
	check(InputMap.action_has_event(&"jump", key_n), "and stays so when the settings are read again")
	var key_k: InputEventKey = InputEventKey.new()
	key_k.physical_keycode = KEY_K
	settings.rebind(&"attack", key_k)
	check(InputMap.action_has_event(&"attack", key_k) and not InputMap.action_has_event(&"heavy_attack", key_k),
		"a key taken by another action leaves it")
	settings.reset_bindings()
	var space: InputEventKey = InputEventKey.new()
	space.physical_keycode = KEY_SPACE
	check(InputMap.action_has_event(&"jump", space) and InputMap.action_has_event(&"heavy_attack", key_k)
		and not InputMap.action_has_event(&"jump", key_n), "every button put back as it was")
	settings.set_colourblind(true)
	check(game._tell_colours == AbbasidGame.TELL_COLOURS_CLEAR and game._finish_glow == AbbasidGame.FINISH_GLOW_CLEAR,
		"warnings in colours told apart by colour-blind eyes")
	settings.set_colourblind(false)
	settings.set_time_effects(false)
	game.hit_stop.trigger(0.2)
	check(is_equal_approx(Engine.time_scale, 1.0), "time effects off: a blow does not stop time")
	settings.set_time_effects(true)
	game.hit_stop.clear()
	var lessons: LessonCard = game.hud.lessons
	lessons.clear()
	settings.set_lessons(GameSettings.LessonMode.SHORT)
	game._hint("HINT_ATTACK")
	await frames(3)
	check(lessons.current_text() != "" and lessons.current_text().length() < tr("HINT_ATTACK").length(),
		"lessons set short: the first sentence only (%s)" % lessons.current_text())
	lessons.clear()
	settings.set_lessons(GameSettings.LessonMode.OFF)
	game._hint("HINT_GUARD")
	await frames(3)
	check(lessons.current() == "" and game.save.lessons.has(&"HINT_GUARD"), "set off, none is shown, but each is kept")
	settings.set_lessons(GameSettings.LessonMode.FULL)
	game._pause()
	await frames(2)
	game.pause_menu.chosen.emit(&"settings")
	await frames(3)
	check(game.settings_screen.visible and game.settings_screen.value_of(&"brightness") == "100%",
		"the settings open on their pages (%s)" % game.settings_screen.value_of(&"brightness"))
	game.settings_screen._show_page(&"controls")
	await frames(2)
	check(game.settings_screen._pages[&"controls"].visible, "with every button on the controls page")
	game.settings_screen.chosen.emit(&"back")
	await frames(2)
	game.pause_menu.chosen.emit(&"resume")
	await frames(4)


## Honour and what it buys: earned by deeds (once each), spent by the lamp on the tree, given back for
## nothing; keepsakes given and worn; tokens found; all of it kept in the save.
func _growth() -> void:
	print("Honour, the tree and keepsakes")
	game._enter_level("res://features/levels/streets_of_ash/streets_of_ash.tscn", &"square_lamp", false, false)
	await frames(20)
	game.hero.input.enabled = false
	# What the people of the market gave him (the mother's thread, Ibrahim's pen) is put aside for this.
	game.save.honour = 0
	game.save.keepsakes.clear()
	game.save.worn.clear()
	# A kill pays Honour once for each man (one not killed before).
	var soldier: MongolSoldier = null
	for each: MongolSoldier in game.level.soldiers():
		var slain: StringName = StringName("slain_%s_%s" % [game.level.level_id, each.name])
		if not each.dead and each.get_meta(&"group", &"") == &"" and soldier == null and not game.save.has_flag(slain):
			soldier = each
	soldier.unaware = false
	soldier.receive_hit(_hero_blow(soldier.max_health + 1.0))
	await frames(2)
	check(game.save.honour == game.CATALOG.kill, "a soldier killed pays Honour (%d)" % game.save.honour)
	check(game.hud._honour_label.text == "%d" % game.save.honour, "and the HUD shows it")
	game._on_soldier_died(soldier)
	check(game.save.honour == game.CATALOG.kill, "the same man pays only once")
	# A guardsman's token.
	var token: Relic = _interactable("token_balcony") as Relic
	token.interact(game.hero)
	await frames(2)
	check(game.save.honour == game.CATALOG.kill + game.CATALOG.token and game.save.has_flag(&"relic_token_balcony"),
		"a guardsman's token pays Honour and is remembered")
	# The lamp: the tree.
	game.save.honour = 400
	var lamp: Checkpoint = _interactable("square_lamp") as Checkpoint
	lamp.interact(game.hero)
	await frames(4)
	check(game.state == AbbasidGame.State.LAMP, "the lamp menu opens")
	var tree: Progression = game.progression
	check(tree.state_of(tree.node(&"whirl")) == Progression.NodeState.LOCKED, "a node waits for the one above it")
	check(tree.state_of(tree.node(&"executioner")) == Progression.NodeState.LOCKED, "and one waits for the story")
	game.lamp_menu._on_node_pressed(&"pommel")
	game.lamp_menu._on_node_pressed(&"whirl")
	game.lamp_menu._on_node_pressed(&"steady_guard")
	check(game.save.honour == 400 - 60 - 90 - 60 and game.save.bought == [&"pommel", &"whirl", &"steady_guard"],
		"nodes are bought with Honour (%d left)" % game.save.honour)
	game.lamp_menu.chosen.emit(&"leave")
	await frames(4)
	check(game.hero.knows(&"pommel") and game.hero.knows(&"whirl") and not game.hero.knows(&"delayed_cut"),
		"what he bought, he knows")
	check(is_equal_approx(game.hero.mods.block_cost, 0.7), "and the Steady Guard steadies his shield")
	# Unlearning gives it all back.
	lamp.interact(game.hero)
	await frames(4)
	game.lamp_menu._on_respec()
	game.lamp_menu.chosen.emit(&"leave")
	await frames(4)
	check(game.save.honour == 400 and game.save.bought.is_empty() and not game.hero.knows(&"pommel"),
		"unlearning gives every Honour back")
	# Keepsakes: given, worn at once while a slot is free, changing how he fights.
	game._give_keepsake(&"red_thread")
	game._give_keepsake(&"bronze_seal")
	game._give_keepsake(&"saffron_sash")
	check(game.save.keepsakes.size() == 3 and game.save.worn == [&"red_thread", &"bronze_seal"], "two keepsakes are worn at once")
	check(game.hero.mods.remedy_heal == 15.0 and game.hero.mods.parry_stamina == 10.0, "and do what they do")
	game.progression.toggle_wear(&"red_thread")
	game.progression.toggle_wear(&"saffron_sash")
	game._apply_growth()
	check(game.hero.mods.extra_knives == 1 and game.hero.mods.knife_returns, "worn in its place, Salim's sash adds a knife")
	# All of it is saved.
	game.save.write()
	var loaded: SaveGame = SaveGame.load_game()
	check(loaded.honour == 400 and loaded.keepsakes.size() == 3 and &"saffron_sash" in loaded.worn,
		"Honour and keepsakes are saved")
	# Entering again, the token is gone.
	game._enter_level("res://features/levels/streets_of_ash/streets_of_ash.tscn", &"square_lamp", false, false)
	await frames(20)
	check(game.level.interactables.get_node_or_null(^"token_balcony") == null, "a token taken is not there again")


## The first white glint stops the game: what it means and how to answer it; the blow waits while it is read.
func _warning_card() -> void:
	print("the first warning")
	game.save.flags.erase(&"seen_warning_0")
	var scene: PackedScene = load("res://features/enemies/swordsman.tscn")
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	game.level.get_node("Enemies").add_child(soldier)
	game._wire_soldier(soldier)
	soldier.global_position = game.hero.global_position + Vector2(game.hero.facing * 90.0, 0.0)
	(soldier.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	soldier.unaware = false
	await frames(4)
	soldier.attack(soldier.profile.attacks[SwordsmanBrain.SLASH])
	for i: int in 60:
		if game.state == AbbasidGame.State.LESSON:
			break
		await physics_frame
	check(game.state == AbbasidGame.State.LESSON and game.lesson_screen.lesson == "HINT_WARN_WHITE",
		"the first white glint stops the game: what it means and how to answer it")
	var frame: int = soldier.sprite.frame
	await frames(30)
	check(soldier.sprite.frame == frame, "his blow waits while it is read")
	game.lesson_screen.chosen.emit(&"lesson_done")
	await frames(2)
	check(game.state == AbbasidGame.State.PLAYING, "then the fight goes on")
	check(game.save.lessons.has(&"HINT_WARN_WHITE"), "and the Guide keeps it")
	soldier.queue_free()
	await frames(4)


## A barred gate's line follows the story: the captors dead, Yusuf says it is Salim he must hear; the Guide keeps
## the lessons met, by chapter.
func _gate_lines() -> void:
	print("barred gates and the Guide")
	game._enter_level("res://features/levels/streets_of_ash/streets_of_ash.tscn", &"square_lamp", false, false)
	await frames(20)
	game.hero.input.enabled = false
	var gate: LevelExit = game.level.exit()
	game.save.flags.erase(&"salim_freed")
	game.save.flags.erase(&"captors_cleared")
	game._refresh_story()
	check(not gate.unlocked and gate.locked_line_for(game.save.flags) == "GATE_LOCKED_2", "barred: the captives first")
	game.save.set_flag(&"captors_cleared")
	game._refresh_story()
	check(gate.locked_line_for(game.save.flags) == "GATE_LOCKED_SALIM", "the captors dead: Salim first")
	check(game.hud.markers.objective_node == _interactable("salim"), "and Salim is marked")
	game._pause()
	await frames(2)
	game.pause_menu.chosen.emit(&"guide")
	await frames(2)
	check(game.guide_screen.visible and game.guide_screen._list.get_child_count() > 4, "the Guide keeps the lessons met")
	game.guide_screen.chosen.emit(&"guide_back")
	await frames(2)
	check(game.pause_menu.visible and not game.guide_screen.visible, "and goes back to the pause menu")
	game.pause_menu.chosen.emit(&"resume")
	await frames(4)


## A blow of the hero's that kills.
func _hero_blow(damage: float) -> HitData:
	var hit: HitData = HitData.new()
	hit.attacker = game.hero
	hit.attack = game.hero.profile.combo[0]
	hit.damage = damage
	hit.direction = 1.0
	return hit


## The library in the Scholars' Quarter: once the soldiers on the floor fall, the archer on the
## gallery flees and the library is clear (no hunting him along the shelves).
func _library() -> void:
	print("the library")
	game._enter_level("res://features/levels/scholars_quarter/scholars_quarter.tscn", &"courtyard_lamp", false, false)
	await frames(20)
	game.hero.input.enabled = false
	# What the levels before taught him, and a page of the treatise here.
	check(game.hero.knows(&"bash") and not game.hero.knows(&"plunge"), "here he knows the bash, not yet the plunge")
	check(game.hero.knows(&"knives") and game.hero.knives == game.hero.max_knives(), "and carries Salim's knives")
	check(game.hero.knows(&"charge"), "and holds his blow back as Hamid taught him")
	check(game.hero.knows(&"storm") and game.hero.has_resolve(), "and the Storm of Blades")
	# The first engineer he kills leaves him his naphtha.
	var engineer: MongolSoldier = null
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.profile.drops_technique == &"naft":
			engineer = soldier
			break
	check(not game.hero.knows(&"naft"), "he has no naphtha yet")
	engineer.unaware = false
	engineer.receive_hit(_hero_blow(engineer.max_health + 1.0))
	await frames(4)
	check(game.hero.knows(&"naft") and game.save.has_flag(&"knows_naft") and &"naft" in game.save.arts,
		"the dead engineer's flasks are his, and carried")
	await frames(10)
	check(game.state == AbbasidGame.State.LESSON and game.lesson_screen.lesson == "HINT_LEARNED_NAFT",
		"and a card shows how they are thrown")
	await _read_cards()
	var page: Manuscript = _interactable("furusiyya_plunge") as Manuscript
	page.interact(game.hero)
	await frames(4)
	check(game.state == AbbasidGame.State.READING, "the treatise's page is read")
	game.reader.chosen.emit(&"close")
	await frames(4)
	check(game.hero.knows(&"plunge") and game.save.has_flag(&"knows_plunge"), "the page teaches the plunge")
	var trigger: Node2D = game.level.triggers.get_node("library") as Node2D
	game.hero.global_position = Vector2(trigger.global_position.x, trigger.global_position.y + 76.0)
	await frames(8)
	var archer: MongolSoldier = null
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.get_meta(&"group", &"") != &"library":
			continue
		if soldier.projectile_scene != null:
			archer = soldier
		else:
			soldier.take_damage(soldier.max_health + 1.0)
	await frames(10)
	check(archer != null and game.save.has_flag(&"library_cleared"), "the soldiers on the floor fall and the library is clear")
	await frames(90)
	check(not is_instance_valid(archer), "the archer on the gallery has fled")
	var keeper: Npc = _interactable("librarian") as Npc
	check(keeper.ready_to_speak, "the keeper will speak now")


func _last_gate() -> void:
	print("the last gate")
	game._enter_level("res://features/levels/last_gate/last_gate.tscn", &"gate_lamp", false, false)
	await frames(20)
	game.hero.input.enabled = false
	var arena: BossArena = game.level.arena
	var captain: MongolSoldier = arena.boss()
	check(arena != null and captain != null and not arena.closed, "the captain waits at his gate")
	var trigger: Node2D = game.level.triggers.get_node("boss") as Node2D
	game.hero.global_position = Vector2(trigger.global_position.x, game.hero.global_position.y)
	await frames(6)
	check(arena.closed and game.hud.boss_box.visible, "the square closes and his name is shown")
	check(captain.state == MongolSoldier.State.ACTING and captain.sprite.animation == &"roar", "he roars")
	await frames(30)
	game.hero.global_position.x -= 90.0
	await frames(10)
	check(game.hero.global_position.x > arena.camera_bounds.position.x, "the burning barricade holds the hero in")
	# The blow that would kill him brings him to his knee; then Yusuf's stroke takes his head.
	for i: int in 400:
		if not captain.untouchable:
			break
		await physics_frame
	var blow: HitData = HitData.from_attack(game.hero, load("res://features/warrior/definitions/heavy.tres") as AttackDefinition)
	blow.damage = captain.max_health + 1.0
	blow.direction = signf(captain.global_position.x - game.hero.global_position.x)
	captain.receive_hit(blow)
	await frames(4)
	check(captain.is_beaten and not captain.dead and game.hero.state == Warrior.State.CINEMATIC,
		"the blow brings him to his knee, and the story takes the stage")
	for i: int in 900:
		await physics_frame
		if captain.dead:
			break
	check(captain.dead and captain.severed == &"head" and captain.sprite.animation == &"executed",
		"Yusuf's stroke takes his head")
	await frames(10)
	check(captain.dead and game.save.has_flag(&"captain_cleared"), "the captain falls")
	for i: int in 300:
		await physics_frame
		if not arena.closed:
			break
	check(not arena.closed and not game.hud.boss_box.visible, "the square opens again")
	var gate: LevelExit = _interactable("LastGate") as LevelExit
	check(gate.unlocked and game.objective() == "OBJ_OPEN_GATE", "the last gate can be opened")
	await _move_hero_to(gate, -22.0)
	game.hero.input.press(&"interact")
	await frames(30)
	check(game.state == AbbasidGame.State.ENDING, "the gate opens on the ending")
	for i: int in 400:
		await physics_frame
		if game.card.visible:
			break
	check(game.card.visible, "the ending is told")
	game.card.skip()
	await frames(4)
	check(game.state == AbbasidGame.State.COMPLETE and game.complete.visible, "the chapter is complete")


## The story told in pictures (docs/cinematics_plan.md): each cinematic is made and plays every shot to its end,
## every word is in English and Arabic and every line stays up as long as it takes to read in both; confirm
## hurries it on; a card plays its cinematic, or its words on black when it has none; a cinematic seen before is
## skipped at a press, one never seen is not; right to left, its words stand in the bars, laid right to left.
func _cinematics() -> void:
	print("the cinematics")
	const STEP: float = 0.05
	var locale: String = TranslationServer.get_locale()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(CinematicPlayer._seen_path()))
	var player: CinematicPlayer = CinematicPlayer.new()
	root.add_child(player)
	player.set_process(false)
	var ids: Array[StringName] = [&"intro", &"market_end", &"streets_end", &"scholars_end", &"ending"]
	for id: StringName in ids:
		var definition: CinematicDefinition = CinematicDefinition.find(id)
		check(definition != null and not definition.shots.is_empty(), "the %s cinematic is made" % id)
		if definition == null:
			continue
		var missing: PackedStringArray = PackedStringArray()
		for language: String in ["en", "ar"]:
			TranslationServer.set_locale(language)
			for shot: CinematicShot in definition.shots:
				var keys: PackedStringArray = shot.lines.duplicate()
				for key: String in [shot.caption, shot.title]:
					if key != "":
						keys.append(key)
				for key: String in shot.map_labels:
					if not key.is_valid_int():
						keys.append(key)
				for key: String in keys:
					if tr(key) == key:
						missing.append("%s %s" % [language, key])
		check(missing.is_empty(), "every word of %s is in English and Arabic (%s)" % [id, ", ".join(missing)])
		for language: String in ["en", "ar"]:
			TranslationServer.set_locale(language)
			var expected: PackedStringArray = PackedStringArray()
			for shot: CinematicShot in definition.shots:
				for key: String in shot.lines:
					expected.append(tr(key))
			var shown: Dictionary[String, float] = {}
			var ended: Array[bool] = [false]
			var on_end: Callable = func() -> void: ended[0] = true
			player.finished.connect(on_end)
			player.play(definition, "LEVEL_STREETS_OF_ASH")
			var total: float = 0.0
			var shots_seen: int = 0
			while player.playing and total < 400.0:
				player._process(STEP)
				total += STEP
				shots_seen = maxi(shots_seen, player.shot_index() + 1)
				if player.line_alpha() >= 0.999:
					var words: String = player.line_text()
					shown[words] = shown.get(words, 0.0) + STEP
			player.finished.disconnect(on_end)
			var short: PackedStringArray = PackedStringArray()
			for words: String in expected:
				var need: float = maxf(CinematicPlayer.MIN_HOLD, words.length() * CinematicPlayer.HOLD_PER_CHARACTER)
				var held: float = shown.get(words, 0.0)
				if held < need - STEP * 2.0:
					short.append("%.1f of %.1f s: %s" % [held, need, words.left(30)])
			check(ended[0] and shots_seen == definition.shots.size(),
				"%s plays its %d shots to the end in %s (%.0f s)" % [id, definition.shots.size(), language, total])
			check(short.is_empty(), "every line of %s stays up as long as it takes to read in %s (%s)"
				% [id, language, " | ".join(short)])
			if id == &"intro" and language == "en":
				check(total > 60.0 and total < 130.0, "the opening lasts a minute or two (%.0f s)" % total)
	TranslationServer.set_locale("en")
	# Confirm hurries the shot on to its next moment; once ended, the cinematic is remembered as seen.
	var intro: CinematicDefinition = CinematicDefinition.find(&"intro")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(CinematicPlayer._seen_path()))
	player.play(intro, "CHAPTER_1_TITLE")
	player._process(0.1)
	var before: float = player.shot_time()
	player.hurry()
	player._process(0.1)
	check(player.shot_time() - before >= 0.45, "confirm hurries the cinematic on to its next moment (%.2f s in 0.1 s)"
		% (player.shot_time() - before))
	check(not CinematicPlayer.was_seen(&"intro"), "a cinematic not yet ended is not seen")
	player.stop()
	check(not player.playing and CinematicPlayer.was_seen(&"intro"), "an ended cinematic is remembered as seen")
	player.queue_free()
	# The card: its cinematic, a press skipping one seen before but not one never seen, words on black without one.
	var card: StoryCard = (load("res://features/menu/story_card.tscn") as PackedScene).instantiate() as StoryCard
	root.add_child(card)
	await process_frame
	var done: Array[StringName] = []
	card.finished.connect(func(id: StringName) -> void: done.append(id))
	var back: InputEventAction = InputEventAction.new()
	back.action = &"ui_cancel"
	back.pressed = true
	var lines: Array[String] = []
	card.play(&"intro", lines, "CHAPTER_1_TITLE")
	check(card.visible and card.is_cinematic(), "a card with a cinematic plays it")
	card._unhandled_input(back)
	check(done.has(&"intro") and not card.visible, "a cinematic seen before is skipped at a press")
	card.play(&"scholars_end", lines, "LEVEL_LAST_GATE")
	card._unhandled_input(back)
	check(card.visible and card.is_cinematic() and not done.has(&"scholars_end"),
		"a press does not skip a cinematic never seen (it must be held)")
	card.skip()
	check(done.has(&"scholars_end"), "the card ends when skipped")
	var words: Array[String] = ["INTRO_4"]
	card.play(&"no_cinematic", words, "")
	check(card.visible and not card.is_cinematic() and card.text.visible, "a card without one tells its words on black")
	card.skip()
	# A game begun in Arabic builds its cinematic right to left: the picture still fills its place between the bars
	# (sized before it had a parent, it once took the language's direction and lay a whole picture off to the left).
	TranslationServer.set_locale("ar")
	var arabic_card: StoryCard = (load("res://features/menu/story_card.tscn") as PackedScene).instantiate() as StoryCard
	root.add_child(arabic_card)
	await process_frame
	arabic_card.play(&"intro", lines, "CHAPTER_1_TITLE")
	arabic_card.cinematic.set_process(false)
	arabic_card.cinematic._process(0.1)
	var picture_area: Rect2 = Rect2(Vector2(0.0, CinematicPlayer.BAR), CinematicPlayer.PICTURE)
	var misplaced: PackedStringArray = PackedStringArray()
	var layers: Array[Control] = [arabic_card.cinematic._shade, arabic_card.cinematic._map_layer]
	for view: CinematicPlayer.ShotView in arabic_card.cinematic._views:
		layers.append(view.rect)
	for layer: Control in layers:
		if not layer.get_global_rect().is_equal_approx(picture_area):
			misplaced.append("%s at %s" % [layer.get_class(), layer.get_global_rect()])
	check(misplaced.is_empty(), "begun in Arabic, the picture fills its place between the bars (%s)" % ", ".join(misplaced))
	arabic_card.skip()
	arabic_card.queue_free()
	TranslationServer.set_locale("en")
	# The opening shows its first painting at once: a black opening reads as the old card.
	TranslationServer.set_locale("en")
	card.play(&"intro", lines, "CHAPTER_1_TITLE")
	var first: CinematicShot = card.cinematic._view.shot
	check(first.painting != null and first.fade_in <= 1.5, "the opening shows a painting from its first moments")
	card.skip()
	# Right to left: the place and date in the top bar, the line in the bottom one, laid right to left.
	TranslationServer.set_locale("ar")
	card.play(&"intro", lines, "CHAPTER_1_TITLE")
	var cinematic: CinematicPlayer = card.cinematic
	cinematic.set_process(false)
	var waited: float = 0.0
	while cinematic.playing and cinematic.line_alpha() < 1.0 and waited < 30.0:
		cinematic._process(STEP)
		waited += STEP
	var caption: Label = cinematic._caption
	var line: Label = cinematic._line
	var caption_rect: Rect2 = caption.get_global_rect()
	var line_rect: Rect2 = line.get_global_rect()
	check(cinematic.shot_index() == 0 and caption.is_layout_rtl() and line.is_layout_rtl(),
		"right to left the cinematic's words are laid right to left")
	check(cinematic.caption_text() == tr("CINE_PLACE_BAGHDAD") and caption_rect.end.y <= CinematicPlayer.BAR
		and line_rect.position.y >= CinematicPlayer.BAR + CinematicPlayer.PICTURE.y,
		"the place and date stand in the top bar, the line in the bottom one (%s, %s)" % [caption_rect, line_rect])
	card.skip()
	card.queue_free()
	TranslationServer.set_locale(locale)
	await process_frame

## Quitting while sounds still play makes Godot report their playbacks as leaked; free the
## session first and give the audio thread a moment to let go.
func _release() -> void:
	paused = false
	Engine.time_scale = 1.0
	if current_scene != null:
		current_scene.queue_free()
		await process_frame
	await process_frame
	OS.delay_msec(200)
