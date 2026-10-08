extends SceneTree
## Renders the Captain's end through the real session: the blow that brings him to his knee, his
## last word, Yusuf's stroke, his head in the air, the body falling, the blood. Not a pass/fail
## check. Needs a window: node tools/run_godot_cli.mjs --path . --script res://tests/capture_finisher.gd

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/finisher")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = "res://features/levels/last_gate/last_gate.tscn"
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game._enter_level("res://features/levels/last_gate/last_gate.tscn", &"gate_lamp", false, false)
	await _wait(0.6)
	game.hero.input.enabled = false
	game.hud.set_gameplay_visible(false)
	var captain: MongolSoldier = game.level.arena.boss()
	var trigger: Node2D = game.level.triggers.get_node("boss") as Node2D
	game.hero.global_position = Vector2(trigger.global_position.x, 444.0)
	await _wait(0.2)
	while captain.untouchable:
		await process_frame
	(captain.get_node("Brain") as EnemyBrain).process_mode = Node.PROCESS_MODE_DISABLED
	game.hero.global_position = Vector2(captain.global_position.x - 70.0, 444.0)
	game.hero.set_facing(1.0)
	await _wait(0.3)
	var blow: HitData = HitData.from_attack(game.hero, load("res://features/warrior/definitions/heavy.tres") as AttackDefinition)
	blow.damage = captain.max_health + 1.0
	blow.direction = 1.0
	captain.receive_hit(blow)
	game.hud.set_gameplay_visible(false)
	for moment: Array in [[0.6, "0_beaten"], [1.5, "1_last_word"], [1.15, "2_stroke"], [0.15, "3_head"], [0.35, "4_falling"],
			[0.8, "5_down"], [2.2, "6_blood"]]:
		var seconds: float = moment[0]
		var label: String = moment[1]
		await _wait(seconds)
		await _save(label)
	print("FINISHER_CAPTURE_DONE %s" % destination)
	paused = false
	Engine.time_scale = 1.0
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
