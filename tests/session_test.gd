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
	await _library()
	await _last_gate()
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


func _speak_with_guard() -> void:
	print("the wounded guard")
	var guard: Node2D = _interactable("wounded_guard")
	await _move_hero_to(guard, 18.0)
	check(game.hero.nearest_interactable() == guard, "the guard can be spoken to")
	game.hero.input.press(&"interact")
	await frames(4)
	check(game.state == AbbasidGame.State.DIALOGUE and game.dialogue.is_open(), "speaking opens the conversation")
	check(game.get_tree().paused, "the street holds still while they speak")
	await _finish_dialogue()
	await frames(4)
	check(game.state == AbbasidGame.State.PLAYING and not game.get_tree().paused, "the conversation ends and play resumes")
	check(game.save.has_flag(&"talked_wounded_guard"), "the conversation is remembered")


func _execution() -> void:
	print("the man at the gate street")
	var captive: Captive = game.level.people.get_node("gate_captive") as Captive
	var headsman: MongolSoldier = null
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.get_meta(&"victim", &"") == &"gate_captive":
			headsman = soldier
	check(captive != null and headsman != null and captive.animation == &"kneel", "a man kneels under a raised sabre")
	game.hero.global_position = Vector2(headsman.global_position.x - 120.0, game.hero.global_position.y)
	await frames(30)
	headsman.take_damage(headsman.max_health + 1.0)
	await frames(10)
	check(not captive.dead and captive.animation == &"run", "his executioner dead, he runs")
	check(game.save.has_flag(&"saved_gate_captive"), "his rescue is remembered")
	check(game.hud.notice_label.text.contains(tr("SAVED_1")), "he cries his thanks")
	await frames(30)


func _light_lamp() -> void:
	print("the lamp")
	var lamp: Checkpoint = _interactable("potters_lamp") as Checkpoint
	await _move_hero_to(lamp)
	game.hero.take_damage(30.0)
	game.hero.remedies = 0
	game.hero.input.press(&"interact")
	await frames(40)
	check(lamp.lit, "the lamp is lit")
	check(game.save.checkpoint == &"potters_lamp", "the lamp becomes the place to return to")
	check(game.hero.health == game.hero.max_health and game.hero.remedies == 3, "resting heals and refills remedies")
	check(SaveGame.exists(), "the journey is saved")


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


## The library in the Scholars' Quarter: once the soldiers on the floor fall, the archer on the
## gallery flees and the library is clear (no hunting him along the shelves).
func _library() -> void:
	print("the library")
	game._enter_level("res://features/levels/scholars_quarter/scholars_quarter.tscn", &"courtyard_lamp", false, false)
	await frames(20)
	game.hero.input.enabled = false
	# What the levels before taught him, and a page of the treatise here.
	check(game.hero.knows(&"bash") and not game.hero.knows(&"plunge"), "here he knows the bash, not yet the plunge")
	check(game.hero.knows(&"knives") and game.hero.knives == game.hero.profile.max_knives, "and carries Salim's knives")
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
