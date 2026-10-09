extends SceneTree
## Lines up the whole cast inside each level, through the real session (its camera, lights, smoke and
## post-process), for art review at the size the player sees: once in a quiet stretch of street and
## once beside a large fire. Each character holds a chosen frame. Not a pass/fail check. Needs a
## window: node tools/run_godot_cli.mjs --path . --script res://tests/capture_cast.gd

const LEVELS: Array[String] = ["fallen_market", "streets_of_ash", "scholars_quarter", "last_gate"]
## [scene or npc kind, animation, frame, x offset from the hero, facing]
const LINEUP: Array = [
	["npc:scholar", &"idle", 0, -292.0, 1.0],
	["npc:refugee_woman", &"run", 2, -240.0, -1.0],
	["engineer", &"idle", 0, -184.0, 1.0],
	["veteran", &"idle", 0, -128.0, 1.0],
	["shieldbearer", &"idle", 0, -68.0, 1.0],
	["hero", &"idle", 0, 0.0, 1.0],
	["swordsman", &"idle", 0, 58.0, -1.0],
	["spearman", &"idle", 0, 118.0, -1.0],
	["archer", &"idle", 0, 178.0, -1.0],
	["maceman", &"idle", 0, 234.0, -1.0],
	["captain", &"idle", 0, 292.0, -1.0],
]

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/cast")
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
			soldier.process_mode = Node.PROCESS_MODE_DISABLED
			soldier.visible = false
		game.hero.input.enabled = false
		game.hud.set_gameplay_visible(false)
		var stops: Array[float] = [game.level.bounds.size.x * 0.42, _largest_fire_x() - 150.0]
		for i: int in stops.size():
			var lineup: Array[Node2D] = _line_up(stops[i])
			game.camera.snap()
			await _wait(0.4)
			await _save("%s_%d" % [level_name, i])
			for node: Node2D in lineup:
				node.queue_free()
	print("CAST_CAPTURE_DONE %s" % destination)
	paused = false
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


## Places the cast along the street around x, each frozen on its frame; returns what it spawned.
func _line_up(x: float) -> Array[Node2D]:
	var spawned: Array[Node2D] = []
	for entry: Array in LINEUP:
		var kind: String = entry[0]
		var animation: StringName = entry[1]
		var frame: int = entry[2]
		var offset: float = entry[3]
		var face: float = entry[4]
		var at: float = x + offset
		var sprite: AnimatedSprite2D
		if kind == "hero":
			var hero: Warrior = game.hero
			hero.global_position = Vector2(at, _ground_below(at) - 1.0)
			hero.velocity = Vector2.ZERO
			hero.set_facing(face)
			hero.set_physics_process(false)
			sprite = hero.sprite
		elif kind.begins_with("npc:"):
			var npc: String = kind.substr(4)
			sprite = AnimatedSprite2D.new()
			sprite.sprite_frames = load("res://assets/npcs/%s/%s_frames.tres" % [npc, npc]) as SpriteFrames
			sprite.offset = Vector2(0, -60)
			sprite.flip_h = face < 0.0
			game.level.add_child(sprite)
			sprite.global_position = Vector2(at, _ground_below(at))
			spawned.append(sprite)
		else:
			var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind) as PackedScene
			var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
			game.level.add_child(soldier)
			soldier.global_position = Vector2(at, _ground_below(at))
			soldier.set_facing(face)
			soldier.process_mode = Node.PROCESS_MODE_DISABLED
			sprite = soldier.sprite
			spawned.append(soldier)
		sprite.play(animation)
		sprite.pause()
		sprite.frame = frame
	return spawned


func _largest_fire_x() -> float:
	var best: float = game.level.bounds.size.x * 0.7
	var biggest: float = 0.0
	var fires: Node = game.level.get_node_or_null("Fires")
	if fires == null:
		return best
	for child: Node in fires.get_children():
		var fire: AnimatedSprite2D = child as AnimatedSprite2D
		if fire == null or fire.sprite_frames == null:
			continue
		var height: float = float(fire.sprite_frames.get_frame_texture(fire.animation, 0).get_height())
		if height > biggest:
			biggest = height
			best = fire.global_position.x
	return best


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
