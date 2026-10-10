extends SceneTree
## Renders what a player sees of the world's people and places as he first meets them in the Fallen
## Market: Hamid where the street begins, the first lamp from a few steps off and beside it, its card and
## its menu, lit, the mother, Ibrahim, and the barred river gate; then the moments the interface speaks up: a
## new technique's card, the first warning's card, a new objective, news stacked, a line said in passing, the
## Guide. Full frames, for reviewing the game's wayfinding and interface. Not a pass/fail check. Needs a
## window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_ux.gd [-- clean | ar]
## With `clean` the interface is hidden (frames to draw a proposed interface over); with `ar`, in Arabic.

const LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
const T: float = 16.0

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	var folder: String = "res://captures/ux"
	if "clean" in args:
		folder = "res://captures/ux/clean"
	elif "ar" in args:
		folder = "res://captures/ux/ar"
	destination = ProjectSettings.globalize_path(folder)
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	# The language asked for (the settings file may keep the last capture's).
	game.settings.set_language("ar" if "ar" in args else "en")
	await _wait(0.6)
	var hero: Warrior = game.hero
	hero.input.enabled = false
	# The street's soldiers stay about their business (no fight interrupts the tour).
	for node: Node in root.get_tree().get_nodes_in_group(&"enemies"):
		var brain: Node = node.get_node_or_null(^"Brain")
		if brain != null:
			brain.process_mode = Node.PROCESS_MODE_DISABLED
	var street: float = hero.global_position.y
	if "clean" in args:
		game.hud.set_gameplay_visible(false)
	await _save("01_start")
	await _visit(4.0, street, "02_near_hamid", 2.0)
	await _visit(13.0, street, "03_beside_hamid")
	# The headsman's count begun: the ring over the man under his sabre.
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.get_meta(&"victim", &"") == &"gate_captive":
			var headsman: EnemyBrain = soldier.get_node("Brain") as EnemyBrain
			headsman._execution = 3.0
	await _visit(25.0, street, "03b_execution")
	await _visit(62.0, street, "04_lamp_from_afar")
	await _visit(77.0, street, "05_lamp_beside")
	var lamp: Checkpoint = _nearest_lamp(hero)
	if lamp != null:
		lamp.interact(hero)
		await _wait(0.8)
		await _save("06_lamp_card")
		game.lesson_screen.chosen.emit(&"lesson_done")
		await _wait(0.8)
		await _save("06b_lamp_menu")
		game.lamp_menu.chosen.emit(&"leave")
		await _wait(0.8)
		await _save("07_lamp_lit")
	await _visit(104.0, street, "08_near_mother")
	await _visit(244.0, street, "09_near_ibrahim")
	await _visit(294.0, street, "10_river_gate")
	# A technique learned on the street: its card.
	await _visit(126.5, street, "11_technique_card", 1.2)
	if game.state == AbbasidGame.State.LESSON:
		game.lesson_screen.chosen.emit(&"lesson_done")
	# The first warning: a soldier winds up beside him.
	await _visit(120.0, street, "", 0.5)
	var scene: PackedScene = load("res://features/enemies/swordsman.tscn")
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	game.level.get_node("Enemies").add_child(soldier)
	game._wire_soldier(soldier)
	soldier.global_position = hero.global_position + Vector2(70.0, 0.0)
	soldier.set_facing(-1.0)
	(soldier.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	soldier.unaware = false
	await _wait(0.2)
	soldier.attack(soldier.profile.attacks[SwordsmanBrain.SLASH])
	await _wait(0.6)
	await _save("12_warning_card")
	if game.state == AbbasidGame.State.LESSON:
		game.lesson_screen.chosen.emit(&"lesson_done")
	soldier.queue_free()
	await _wait(0.6)
	# An elite soldier struck: his name and what is left of him over him; breath run out: the ring by his head.
	var elite_scene: PackedScene = load("res://features/enemies/veteran.tscn")
	var elite: MongolSoldier = elite_scene.instantiate() as MongolSoldier
	game.level.get_node("Enemies").add_child(elite)
	elite.global_position = hero.global_position + Vector2(80.0, 0.0)
	elite.set_facing(-1.0)
	(elite.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	elite.unaware = false
	elite.health = elite.max_health * 0.6
	game.hud.markers.breath_refused()
	await _wait(0.3)
	await _save("12b_elite_and_breath")
	elite.queue_free()
	# A new objective, news stacked, a line said in passing.
	game.hud.lessons.clear()
	game.save.set_flag(&"ambush")
	game.save.set_flag(&"ambush_cleared")
	game._refresh_story()
	game._earn(10, &"capture_honour")
	game.hud.notice(tr("NOTICE_SATCHEL"))
	game.hud.notice(tr("NOTICE_KEEPSAKE") % tr("KEEPSAKE_REED_PEN"))
	game._say("SPEAKER_YUSUF", "GATE_LOCKED_1")
	await _visit(232.0, street, "13_new_objective", 0.8)
	# The Guide.
	game._pause()
	await _wait(0.3)
	game.pause_menu.chosen.emit(&"guide")
	await _wait(0.4)
	await _save("14_guide")
	game.guide_screen.chosen.emit(&"guide_back")
	game.pause_menu.chosen.emit(&"resume")
	print("UX_CAPTURE_DONE %s" % destination)
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


func _visit(col: float, street: float, label: String, wait: float = 0.9) -> void:
	var hero: Warrior = game.hero
	hero.global_position = Vector2(col * T, street - 40.0)
	hero.velocity = Vector2.ZERO
	hero.set_facing(1.0)
	await _wait(wait)
	if label != "":
		await _save(label)


func _nearest_lamp(hero: Warrior) -> Checkpoint:
	var best: Checkpoint = null
	for node: Node in game.level.interactables.get_children():
		var lamp: Checkpoint = node as Checkpoint
		if lamp != null and (best == null or absf(lamp.global_position.x - hero.global_position.x)
				< absf(best.global_position.x - hero.global_position.x)):
			best = lamp
	return best


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


func _save(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))
