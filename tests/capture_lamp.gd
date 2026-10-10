extends SceneTree
## Renders the lamp menu through the real session in the Streets of Ash: the technique tree with some
## nodes bought and others locked, the keepsakes (some found), the Arts carried, and the HUD's resolve
## bar, Arts and Honour after it, and the pause menu's page of techniques. Full frames into captures/lamp/. Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_lamp.gd [-- ar]   (ar: in Arabic, laid out right to left)

const LEVEL: String = "res://features/levels/streets_of_ash/streets_of_ash.tscn"

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/lamp")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	var args: PackedStringArray = OS.get_cmdline_user_args()
	var language: String = args[0] if args.size() > 0 else "en"
	game.settings.set_language(language)
	if language != "en":
		destination = destination.path_join(language)
		DirAccess.make_dir_recursive_absolute(destination)
	game._enter_level(LEVEL, &"square_lamp", false, false)
	await _wait(0.8)
	game.hero.input.enabled = false
	# A hero part way through the chapter: Honour to spend, a few nodes bought, keepsakes found, Arts known.
	for flag: StringName in [&"knows_bash", &"knows_knives", &"knows_storm", &"knows_pierce"]:
		game.save.set_flag(flag)
	game.save.honour = 235
	game.save.bought = [&"pommel", &"steady_guard", &"quiet_step"]
	for keepsake: StringName in [&"red_thread", &"reed_pen", &"saffron_sash"]:
		game._give_keepsake(keepsake)
	game._apply_growth()
	game.hero.set_resolve(64.0)
	await _wait(3.2)
	await _save("hud")
	# Near to death: the screen's edges darken in time with his heart.
	var whole: float = game.hero.health
	game.hero.health = game.hero.max_health * 0.15
	game.hero.health_changed.emit(game.hero.health, game.hero.max_health)
	await _wait(1.6)
	await _save("hud_danger")
	game.hero.health = whole
	game.hero.health_changed.emit(game.hero.health, game.hero.max_health)
	# (The first lamp's card has been read on an earlier street.)
	game.save.set_flag(&"seen_lamp_card")
	var lamp: Checkpoint = game.level.checkpoint(&"square_lamp")
	lamp.interact(game.hero)
	await _wait(0.5)
	await _save("lamp_tree")
	# Down the Blade to a node waiting on the story, then the Shield's.
	var menu: LampMenu = game.lamp_menu
	(menu._node_buttons[&"executioner"] as Button).grab_focus()
	await _wait(0.3)
	await _save("lamp_tree_locked")
	(menu._node_buttons[&"whirl"] as Button).grab_focus()
	await _wait(0.3)
	await _save("lamp_tree_open")
	menu._show_page(&"keepsakes")
	await _wait(0.3)
	await _save("lamp_keepsakes")
	menu._show_page(&"arts")
	await _wait(0.3)
	await _save("lamp_arts")
	# Up from the lamp; the pause menu's page of techniques.
	menu.chosen.emit(&"leave")
	await _wait(0.5)
	game._pause()
	await _wait(0.2)
	game.pause_menu.chosen.emit(&"techniques")
	await _wait(0.4)
	await _save("techniques")
	(game.techniques_screen._grid.get_child(19) as Button).grab_focus()
	await _wait(0.3)
	await _save("techniques_art")
	(game.techniques_screen._grid.get_child(16) as Button).grab_focus()
	await _wait(0.3)
	await _save("techniques_locked")
	print("LAMP_CAPTURE_DONE %s" % destination)
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
