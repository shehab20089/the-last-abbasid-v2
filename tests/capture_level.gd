extends SceneTree
## Renders a level at several points along the street with the hero standing there, for visual
## review. Not a pass/fail check. Run (needs a window, not headless):
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_level.gd -- fallen_market

## Columns to stop at in the Fallen Market; other levels are captured at even steps.
const STOPS: Array[int] = [6, 30, 60, 98, 140, 162, 178, 200, 230, 248, 292]
const STEP: int = 22

var destination: String


func _initialize() -> void:
	call_deferred("_capture")


func _capture() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	var level_name: String = args[0] if args.size() > 0 else "fallen_market"
	destination = ProjectSettings.globalize_path("res://captures/level")
	DirAccess.make_dir_recursive_absolute(destination)
	var scene: PackedScene = load("res://features/levels/%s/%s.tscn" % [level_name, level_name])
	var level: Level = scene.instantiate() as Level
	root.add_child(level)
	var warrior_scene: PackedScene = load("res://features/warrior/warrior.tscn")
	var warrior: Warrior = warrior_scene.instantiate() as Warrior
	level.add_child(warrior)
	warrior.input.enabled = false
	warrior.global_position = level.player_start.global_position
	var camera: Camera2D = Camera2D.new()
	camera.limit_left = int(level.bounds.position.x)
	camera.limit_top = int(level.bounds.position.y)
	camera.limit_right = int(level.bounds.end.x)
	camera.limit_bottom = int(level.bounds.end.y)
	level.add_child(camera)
	camera.make_current()
	for enemy: MongolSoldier in level.soldiers():
		(enemy.get_node("Brain") as EnemyBrain).process_mode = Node.PROCESS_MODE_DISABLED
	var stops: Array[int] = STOPS
	if level_name != "fallen_market":
		stops = []
		var columns: int = int(level.bounds.size.x / 16.0)
		for col: int in range(6, columns - 4, STEP):
			stops.append(col)
		stops.append(columns - 8)
	for col: int in stops:
		var x: float = col * 16 + 8
		var y: float = _ground_below(level, x)
		warrior.global_position = Vector2(x, y)
		warrior.velocity = Vector2.ZERO
		camera.global_position = Vector2(x, y - 84)
		camera.reset_smoothing()
		for i: int in 6:
			await process_frame
		await RenderingServer.frame_post_draw
		var image: Image = root.get_texture().get_image()
		image.save_png(destination.path_join("%s_%03d.png" % [level_name, col]))
	print("LEVEL_CAPTURE_DONE %s" % destination)
	level.queue_free()
	await process_frame
	quit()


func _ground_below(level: Level, x: float) -> float:
	var space: PhysicsDirectSpaceState2D = level.get_world_2d().direct_space_state
	for top: float in [260.0, 330.0, 0.0]:
		var query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(Vector2(x, top), Vector2(x, 600), 1)
		var hit: Dictionary = space.intersect_ray(query)
		if not hit.is_empty():
			var point: Vector2 = hit["position"]
			return point.y
	return 448.0
