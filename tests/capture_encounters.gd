extends SceneTree
## Renders a level's encounters through the real session (camera, light, post-process) as the hero
## comes upon them. Soldiers are left at their business (their brains are paused). Not a pass/fail
## check. Needs a window: node tools/run_godot_cli.mjs --path . --script res://tests/capture_encounters.gd -- <level>

## Per level, [label, column the hero stands at] (short of each story trigger, so nothing is sprung).
const STOPS: Dictionary = {
	"fallen_market": [["execution", 27.0], ["looter", 60.0], ["mother", 90.0], ["terrace", 128.0],
		["burners", 151.0], ["burners_close", 156.0], ["stabber", 258.0], ["gate", 265.0]],
	"streets_of_ash": [["stripper", 26.0], ["lanes", 64.0], ["bathhouse", 96.0], ["shieldbearer", 108.0], ["mosque", 149.0],
		["square", 182.0], ["ruins", 221.0], ["pyre", 252.0]],
	"scholars_quarter": [["pyre", 9.0], ["fountain", 46.0], ["library_door", 86.0], ["library", 97.0],
		["keeper", 134.0], ["river_wall", 164.0], ["execution", 176.0], ["engineer", 186.0],
		["hall", 225.0], ["far_hall", 250.0]],
	"last_gate": [["road", 28.0], ["camp", 45.0], ["plunder", 58.0], ["prisoners", 82.0], ["wall_walk", 116.0], ["sentry", 148.0], ["siege", 160.0],
		["maceman", 170.0],
		["defenders", 196.0]],
}

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	var level_name: String = args[0] if args.size() > 0 else "fallen_market"
	destination = ProjectSettings.globalize_path("res://captures/encounters/%s" % level_name)
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = "res://features/levels/%s/%s.tscn" % [level_name, level_name]
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	for soldier: MongolSoldier in game.level.soldiers():
		(soldier.get_node("Brain") as EnemyBrain).process_mode = Node.PROCESS_MODE_DISABLED
		# Back where the level put him, standing (a patrol frozen mid-step would walk on forever).
		soldier.move_intent = 0.0
		soldier.velocity = Vector2.ZERO
		soldier.global_position = soldier.spawn_point
	game.hero.input.enabled = false
	game.hud.set_gameplay_visible(false)
	var stops: Array = STOPS[level_name]
	for stop: Array in stops:
		var label: String = stop[0]
		var column: float = stop[1]
		var x: float = column * 16.0 + 8.0
		game.hero.global_position = Vector2(x, _ground_below(x) - 2.0)
		game.hero.velocity = Vector2.ZERO
		game.hero.set_facing(1.0)
		game.camera.snap()
		# Two moments of each activity, so its motion can be judged.
		await _wait(0.5)
		await _save(label + "_a")
		await _wait(0.45)
		await _save(label + "_b")
	print("ENCOUNTER_CAPTURE_DONE %s" % destination)
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
