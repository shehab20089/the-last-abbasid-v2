extends SceneTree
## Renders the gore through the real session (camera, light, post-process): soldiers in the Fallen
## Market cut down each way a blow can cut (head, arm, leg, waist) and the moments after, the piece
## in the air, landing, the pools spreading. Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_gore.gd

## [kind, cut] for each kill.
const KILLS: Array = [["swordsman", &"head"], ["spearman", &"arm"], ["swordsman", &"leg"], ["archer", &"waist"]]
## Seconds after the blow to take each picture.
const MOMENTS: Array[float] = [0.08, 0.3, 0.8, 3.2]

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/gore")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = "res://features/levels/fallen_market/fallen_market.tscn"
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	for soldier: MongolSoldier in game.level.soldiers():
		(soldier.get_node("Brain") as EnemyBrain).process_mode = Node.PROCESS_MODE_DISABLED
	game.hero.input.enabled = false
	game.hud.set_gameplay_visible(false)
	var index: int = 0
	for kill: Array in KILLS:
		var kind: String = kill[0]
		var cut: StringName = kill[1]
		# A stretch of open street by a fire, a little further on for each kill.
		var x: float = (26.0 + index * 9.0) * 16.0
		game.hero.global_position = Vector2(x, 446.0)
		game.hero.set_facing(1.0)
		game.camera.snap()
		var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
		var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
		soldier.position = Vector2(x + 40.0, 446.0)
		soldier.start_facing = -1.0
		game.level.get_node("Enemies").add_child(soldier)
		(soldier.get_node("Brain") as EnemyBrain).process_mode = Node.PROCESS_MODE_DISABLED
		game._wire_soldier(soldier)
		await _wait(0.3)
		# He has seen the hero (a surprise blow would always take the head).
		soldier.unaware = false
		soldier.receive_hit(_blow(cut, soldier))
		var waited: float = 0.0
		for moment: float in MOMENTS:
			await _wait(moment - waited)
			waited = moment
			await _save("%d_%s_%s_%.2f" % [index, kind, cut, moment])
		index += 1
	print("GORE_CAPTURE_DONE %s" % destination)
	paused = false
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


## A killing blow from the hero that cuts `cut`.
func _blow(cut: StringName, target: MongolSoldier) -> HitData:
	var attack: AttackDefinition = (load("res://features/warrior/definitions/heavy.tres") as AttackDefinition).duplicate()
	attack.severs = [cut]
	attack.sever_chance = 1.0
	var hit: HitData = HitData.from_attack(game.hero, attack)
	hit.damage = target.max_health + 1.0
	hit.direction = 1.0
	hit.position = target.global_position + Vector2(-8, -50)
	return hit


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


func _save(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))
