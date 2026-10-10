extends SceneTree
## Renders every place a string of buttons is shown (J J then K): a new technique's card, Hamid's counsel card, a lesson card, the
## Techniques page, the lamp menu, the coach over the hero, a game-over tip. Full frames into captures/keys/ (or
## captures/keys/ar with `-- ar`). Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_keys.gd [-- ar]

const LEVEL: String = "res://features/levels/streets_of_ash/streets_of_ash.tscn"

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var arabic: bool = "ar" in OS.get_cmdline_user_args()
	destination = ProjectSettings.globalize_path("res://captures/keys" + ("/ar" if arabic else ""))
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game.settings.set_language("ar" if arabic else "en")
	game._enter_level(LEVEL, &"square_lamp", false, false)
	await _wait(0.8)
	var hero: Warrior = game.hero
	hero.input.enabled = false
	for node: Node in root.get_tree().get_nodes_in_group(&"enemies"):
		var brain: Node = node.get_node_or_null(^"Brain")
		if brain != null:
			brain.process_mode = Node.PROCESS_MODE_DISABLED
	game.save.set_flag(&"seen_lamp_card")
	game.save.honour = 300
	game.save.bought = [&"pommel", &"whirl"]
	game._apply_growth()
	await _wait(0.3)
	# A new technique's card: the whirl, its buttons in order.
	game._show_card({"kind": "technique", "id": &"whirl"})
	await _wait(1.6)
	await _save("01_card_whirl")
	game.lesson_screen.chosen.emit(&"lesson_done")
	await _wait(0.3)
	# Hamid's counsel: the parry and the riposte, performed.
	game._show_card({"kind": "counsel", "id": &"riposte"})
	await _wait(2.2)
	await _save("01b_counsel_riposte")
	game.lesson_screen.chosen.emit(&"lesson_done")
	await _wait(0.3)
	# Lesson cards at the top: the whirl, then the delayed cut.
	game.hud.lessons.clear()
	game.hud.lessons.push("HINT_LEARNED_WHIRL")
	await _wait(0.6)
	await _save("02_lesson_whirl")
	game.hud.lessons.clear()
	game.hud.lessons.push("HINT_LEARNED_DELAYED_CUT")
	await _wait(0.6)
	await _save("03_lesson_delayed_cut")
	game.hud.lessons.clear()
	# The Techniques page on the whirl.
	game._pause()
	await _wait(0.2)
	game.pause_menu.chosen.emit(&"techniques")
	await _wait(0.3)
	for button: Node in game.techniques_screen._grid.get_children():
		var entry: Array = (button as Button).get_meta(&"entry")
		var id: StringName = entry[0]
		if id == &"whirl":
			(button as Button).grab_focus()
	await _wait(1.2)
	await _save("04_techniques_whirl")
	game.techniques_screen.chosen.emit(&"techniques_back")
	game.pause_menu.chosen.emit(&"resume")
	await _wait(0.3)
	# The lamp menu on the whirl.
	var lamp: Checkpoint = game.level.checkpoint(&"square_lamp")
	lamp.interact(hero)
	await _wait(0.5)
	(game.lamp_menu._node_buttons[&"whirl"] as Button).grab_focus()
	await _wait(1.2)
	await _save("05_lamp_whirl")
	game.lamp_menu.chosen.emit(&"leave")
	await _wait(0.4)
	# The coach over the hero, as a cut plays.
	hero.input.press(&"attack")
	await _wait(0.12)
	await _save("06_coach")
	await _wait(1.0)
	print("KEYS_CAPTURE_DONE %s" % destination)
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


func _save(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))
