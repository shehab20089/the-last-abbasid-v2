extends SceneTree
## Renders the boss's bar at the Last Gate: the Captain whole, then wounded with his loss trailing, in English
## and in Arabic (laid out right to left). Full frames and an enlarged crop of the bar into captures/boss_bar/.
## Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_boss_bar.gd

const LEVEL: String = "res://features/levels/last_gate/last_gate.tscn"

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/boss_bar")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	# The game started in Arabic (as a player who chose it does), so the interface is built right to left.
	var arabic_start: bool = "ar_start" in OS.get_cmdline_user_args()
	if arabic_start:
		var file: ConfigFile = ConfigFile.new()
		file.set_value("interface", "language", "ar")
		file.save(GameSettings.file_path())
		destination = destination.path_join("ar_start")
		DirAccess.make_dir_recursive_absolute(destination)
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	for language: String in (["ar"] if arabic_start else ["en", "ar"]):
		game.settings.set_language(language)
		game._enter_level(LEVEL, &"gate_lamp", false, false)
		await _wait(0.8)
		game.hero.input.enabled = false
		var captain: MongolSoldier = game.level.arena.boss()
		var trigger: Node2D = game.level.triggers.get_node("boss") as Node2D
		game.hero.global_position = Vector2(trigger.global_position.x, game.hero.global_position.y)
		await _wait(2.4)
		(captain.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
		await _save("%s_whole" % language)
		captain.take_damage(captain.max_health * 0.35)
		await _wait(0.25)
		await _save("%s_struck" % language)
		await _wait(1.6)
		await _save("%s_settled" % language)
	print("BOSS_BAR_CAPTURE_DONE %s" % destination)
	game.settings.set_language("en")
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
	var bar: Image = image.get_region(Rect2i(160, 312, 320, 48))
	bar.resize(bar.get_width() * 3, bar.get_height() * 3, Image.INTERPOLATE_NEAREST)
	bar.save_png(destination.path_join(label + "_bar.png"))
