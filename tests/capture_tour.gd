extends SceneTree
## Renders each level of the chapter through the real session (its camera, light and post-process) at
## a few places along the street, for visual review. Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_tour.gd

const LEVELS: Array[String] = ["fallen_market", "streets_of_ash", "scholars_quarter", "last_gate"]
## Fractions of each level's length to stop at.
const STOPS: Array[float] = [0.08, 0.33, 0.6, 0.86]

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/tour")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = "res://features/levels/%s/%s.tscn" % [LEVELS[0], LEVELS[0]]
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	for level_name: String in LEVELS:
		game._enter_level("res://features/levels/%s/%s.tscn" % [level_name, level_name], &"", false, false)
		await _wait(0.5)
		for soldier: MongolSoldier in game.level.soldiers():
			(soldier.get_node("Brain") as EnemyBrain).process_mode = Node.PROCESS_MODE_DISABLED
		game.hero.input.enabled = false
		game.hud.set_gameplay_visible(false)
		for i: int in STOPS.size():
			var x: float = game.level.bounds.size.x * STOPS[i]
			game.hero.global_position = Vector2(x, _ground_below(x) - 2.0)
			game.hero.velocity = Vector2.ZERO
			game.camera.snap()
			await _wait(0.35)
			await _save("%s_%d" % [level_name, i])
	print("TOUR_CAPTURE_DONE %s" % destination)
	paused = false
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


func _ground_below(x: float) -> float:
	var space: PhysicsDirectSpaceState2D = game.level.get_world_2d().direct_space_state
	for top: float in [260.0, 330.0, 0.0]:
		var query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(Vector2(x, top), Vector2(x, 600), 1)
		var hit: Dictionary = space.intersect_ray(query)
		if not hit.is_empty():
			var point: Vector2 = hit["position"]
			return point.y
	return 448.0


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


func _save(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))
