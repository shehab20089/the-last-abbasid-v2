extends SceneTree
## Renders the Fallen Market's horrors through the real session: the man at the gate street beheaded
## when the hero comes too late, the refugee cut down by an arrow, the soldier stabbing at a body,
## the dead lying in the street. Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_atrocities.gd

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/atrocities")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = "res://features/levels/fallen_market/fallen_market.tscn"
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game.hero.input.enabled = false
	game.hud.set_gameplay_visible(false)
	# Too late: the hero stands watching from the gate street as the count runs out.
	await _stand(21.0)
	for moment: Array in [[2.9, "execution_0"], [0.3, "execution_1"], [0.4, "execution_2"], [2.6, "execution_3"]]:
		var seconds: float = moment[0]
		var label: String = moment[1]
		await _wait(seconds)
		await _save(label)
	# The refugees, the last of them shot as he runs.
	await _stand(43.0)
	game.hero.global_position.x = 45.0 * 16.0
	for moment: Array in [[1.5, "refugee_0"], [0.5, "refugee_1"], [2.8, "refugee_2"]]:
		var seconds: float = moment[0]
		var label: String = moment[1]
		await _wait(seconds)
		await _save(label)
	# The soldier stabbing at a body short of the river gate, and the dead along the street.
	for stop: Array in [[259.0, "stabber"], [121.0, "dead_headless"], [144.0, "dead_woman"], [200.0, "dead_scholar"]]:
		var column: float = stop[0]
		var label: String = stop[1]
		await _stand(column, true)
		await _wait(0.6)
		await _save(label)
	print("ATROCITY_CAPTURE_DONE %s" % destination)
	paused = false
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


## Puts the hero on the street at a column, facing right; the soldiers there stay at their business.
func _stand(column: float, freeze: bool = false) -> void:
	if freeze:
		for soldier: MongolSoldier in game.level.soldiers():
			(soldier.get_node("Brain") as EnemyBrain).process_mode = Node.PROCESS_MODE_DISABLED
	game.hero.global_position = Vector2(column * 16.0 + 8.0, 446.0)
	game.hero.velocity = Vector2.ZERO
	game.hero.set_facing(1.0)
	game.camera.snap()
	await _wait(0.1)


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


func _save(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))
