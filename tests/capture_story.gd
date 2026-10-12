extends SceneTree
## Renders the story's staged scenes as a player sees them (docs/story_plan.md): the column in the Streets of Ash
## (Toqto at its head, Hamid roped among the captives, his shout, Toqto turning), Salim and Umm Ali on the wall road,
## Hamid on his knees before the last gate across the fire, Toqto's stroke, Yusuf kneeling by him after the fight,
## and the people walking out of the gate. Frames every so often through each scene, for review. Not a pass/fail
## check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_story.gd [-- ar]

const T: float = 16.0

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	destination = ProjectSettings.globalize_path("res://captures/story/ar" if "ar" in args else "res://captures/story")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = "res://features/levels/streets_of_ash/streets_of_ash.tscn"
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game.settings.set_language("ar" if "ar" in args else "en")
	await _wait(0.4)
	await _column()
	await _wall_road()
	await _gate()
	print("STORY_CAPTURE_DONE")
	quit(0)


## The column, from the top of the second collapse.
func _column() -> void:
	game.hero.input.enabled = false
	for soldier: MongolSoldier in game.level.soldiers():
		if absf(soldier.global_position.x - 144.0 * T) < 200.0 and soldier.get_meta(&"group", &"") != &"column_guard":
			soldier.queue_free()
	await _wait(0.2)
	game.hero.global_position = Vector2(143.0 * T, 19.0 * T - 8.0)
	game.hero.velocity = Vector2.ZERO
	game.hero.set_facing(1.0)
	for i: int in 300:
		await physics_frame
		if game.scenes.playing == &"column":
			break
	for shot: int in 12:
		await _wait(1.4)
		await _save("column_%02d" % shot)
		if game.scenes.playing == &"":
			break


## Salim and Umm Ali among the people on the wall road.
func _wall_road() -> void:
	game._enter_level("res://features/levels/last_gate/last_gate.tscn", &"", false, false)
	await _wait(0.6)
	game.hero.input.enabled = false
	game.hero.global_position = Vector2(8.0 * T, game.hero.global_position.y)
	game.hero.set_facing(1.0)
	await _wait(1.2)
	await _save("gate_01_wall_road")


## Hamid at the gate, the stroke, the fight's end, the farewell and the people walking out.
func _gate() -> void:
	game._enter_level("res://features/levels/last_gate/last_gate.tscn", &"gate_lamp", false, false)
	await _wait(0.6)
	game.hero.input.enabled = false
	for flag: StringName in [&"saved_gate_captive", &"saved_square_captive", &"saved_river_captive"]:
		game.save.set_flag(flag)
	var trigger: Node2D = game.level.triggers.get_node("boss") as Node2D
	game.hero.global_position = Vector2(trigger.global_position.x - 40.0, game.hero.global_position.y)
	game.hero.set_facing(1.0)
	await _wait(0.4)
	await _save("gate_02_approach")
	game.hero.global_position = Vector2(trigger.global_position.x, game.hero.global_position.y)
	var hamid: Actor = game.level.actor(&"hamid_gate")
	var shot: int = 0
	while game.scenes.playing == &"" and shot < 10:
		await _wait(0.2)
		shot += 1
	shot = 0
	while game.scenes.playing == &"boss_prelude" and shot < 20:
		await _wait(1.2)
		await _save("gate_03_prelude_%02d" % shot)
		shot += 1
		if hamid != null and hamid.dead and shot < 30:
			await _wait(0.15)
			await _save("gate_04_after_stroke_%02d" % shot)
	await _wait(1.0)
	await _save("gate_05_fight_begins")
	# The fight's end at once: the blow that beats him, the stroke.
	var captain: MongolSoldier = game.level.arena.boss()
	for i: int in 400:
		if captain == null or not captain.untouchable:
			break
		await physics_frame
	if captain != null:
		var blow: HitData = HitData.from_attack(game.hero, load("res://features/warrior/definitions/heavy.tres") as AttackDefinition)
		blow.damage = captain.max_health + 1.0
		blow.direction = signf(captain.global_position.x - game.hero.global_position.x)
		captain.receive_hit(blow)
	for i: int in 1200:
		await physics_frame
		if game.scenes.playing == &"boss_after":
			break
	shot = 0
	while game.scenes.playing == &"boss_after" and shot < 12:
		await _wait(1.0)
		await _save("gate_06_farewell_%02d" % shot)
		shot += 1
	var gate: LevelExit = game.level.exit()
	game.hero.global_position = Vector2(gate.global_position.x - 22.0, game.hero.global_position.y)
	await _wait(0.3)
	game.hero.input.enabled = true
	game.hero.input.press(&"interact")
	for i: int in 6:
		await _wait(1.1)
		await _save("gate_07_walk_out_%02d" % i)


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


func _save(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))
