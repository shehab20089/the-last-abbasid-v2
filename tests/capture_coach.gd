extends SceneTree
## Renders the move coach through the real session in the Streets of Ash: a hero who has bought the
## enders and the running thrust, beside a soldier, as each move's moment comes (a cut, a run, the
## shield), and the pause menu's page of techniques with its stage. Full frames into captures/coach/.
## Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_coach.gd

const LEVEL: String = "res://features/levels/streets_of_ash/streets_of_ash.tscn"

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/coach")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game._enter_level(LEVEL, &"square_lamp", false, false)
	await _wait(0.8)
	var hero: Warrior = game.hero
	hero.input.enabled = false
	for flag: StringName in [&"knows_bash", &"knows_knives", &"knows_storm", &"reached_scholars_quarter"]:
		game.save.set_flag(flag)
	game.save.bought = [&"pommel", &"whirl", &"steady_guard", &"delayed_cut", &"bash_mastery", &"executioner"]
	game._apply_growth()
	# A soldier squares up to him, but holds his blows.
	var soldier: MongolSoldier = null
	for each: MongolSoldier in game.level.soldiers():
		if not each.dead and soldier == null and each.profile.max_health < 200.0:
			soldier = each
	soldier.global_position = hero.global_position + Vector2(64, 0)
	soldier.unaware = false
	var brain: Node = soldier.get_node_or_null(^"Brain")
	if brain != null:
		brain.process_mode = Node.PROCESS_MODE_DISABLED
	soldier.set_facing(-1.0)
	await _wait(0.6)
	hero.input.press(&"attack")
	await _wait(0.12)
	await _save("coach_pommel")
	await _wait(0.8)
	hero.input.press(&"attack")
	await _wait(0.3)
	hero.input.press(&"attack")
	await _wait(0.1)
	await _save("coach_whirl")
	await _wait(1.0)
	hero.input.block_held = true
	await _wait(0.4)
	await _save("coach_bash")
	hero.input.block_held = false
	await _wait(0.6)
	hero.set_resolve(100.0)
	await _wait(0.3)
	await _save("coach_art")
	# The page of techniques, the whirl on its stage at three moments.
	game._pause()
	await _wait(0.2)
	game.pause_menu.chosen.emit(&"techniques")
	await _wait(0.3)
	(game.techniques_screen._grid.get_child(15) as Button).grab_focus()
	for i: int in 4:
		await _wait(0.22)
		await _save("page_whirl_%d" % i)
	(game.techniques_screen._grid.get_child(17) as Button).grab_focus()
	for i: int in 5:
		await _wait(0.25)
		await _save("page_executioner_%d" % i)
	# A page of the treatise that teaches the shield bash, shown with the move.
	game.techniques_screen.chosen.emit(&"techniques_back")
	game.pause_menu.close()
	await _wait(0.2)
	game.reader.read(&"furusiyya_bash", &"bash")
	for i: int in 3:
		await _wait(0.3)
		await _save("reader_bash_%d" % i)
	# The settings, with the Move Prompts row.
	game.reader.close()
	game._pause()
	await _wait(0.2)
	game.pause_menu.chosen.emit(&"settings")
	await _wait(0.3)
	await _save("settings")
	print("COACH_CAPTURE_DONE %s" % destination)
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
