extends SceneTree
## Renders the hero's key poses in the market at night, through the game's own lighting and
## post-processing, for art review: a grid of crops around him, with a soldier facing him.
## Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_poses.gd

const POSES: Array = [
	[&"idle", 0], [&"run", 1], [&"run", 5], [&"attack_1", 1], [&"attack_1", 2], [&"attack_1", 3],
	[&"attack_2", 3], [&"attack_3", 3], [&"heavy", 3], [&"heavy", 5], [&"block", 0], [&"roll", 3],
]
const CROP: Vector2i = Vector2i(200, 120)

var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var destination: String = ProjectSettings.globalize_path("res://captures/art_review")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.2)
	game = current_scene as AbbasidGame
	game.title.close()
	game._enter_level(AbbasidGame.FIRST_LEVEL, &"", false, false)
	await _wait(0.8)
	var hero: Warrior = game.hero
	# The art alone: no hints or bars over it.
	game.hud.visible = false
	hero.input.enabled = false
	var soldier: MongolSoldier = game.level.soldiers()[0]
	soldier.process_mode = Node.PROCESS_MODE_DISABLED
	hero.global_position = Vector2(soldier.global_position.x - 58.0, soldier.global_position.y - 2.0)
	hero.set_facing(1.0)
	await _wait(0.6)
	hero.set_physics_process(false)
	var tiles: Array[Image] = []
	for entry: Array in POSES:
		var animation: StringName = entry[0]
		var frame: int = entry[1]
		hero.sprite.play(animation)
		hero.sprite.pause()
		hero.sprite.frame = frame
		await _wait(0.12)
		tiles.append(_crop(hero))
	# A blow landing: the soldier wakes, the hero cuts, and the frame of the impact is caught.
	hero.set_physics_process(true)
	soldier.process_mode = Node.PROCESS_MODE_INHERIT
	hero.global_position = Vector2(soldier.global_position.x - 34.0, soldier.global_position.y - 2.0)
	hero.set_facing(1.0)
	await _wait(0.1)
	for combo: int in 3:
		hero.input.press(&"attack")
		var landed: Array = [false]
		var on_hit: Callable = func(_t: Combatant, _h: HitData, _o: HitData.Outcome) -> void: landed[0] = true
		hero.hit_landed.connect(on_hit)
		var waited: float = 0.0
		while not landed[0] and waited < 1.0:
			await process_frame
			waited += 1.0 / 60.0
		hero.hit_landed.disconnect(on_hit)
		await process_frame
		await process_frame
		tiles.append(_crop(hero))
	var columns: int = 4
	var rows: int = ceili(tiles.size() / float(columns))
	var sheet: Image = Image.create(columns * CROP.x * 3, rows * CROP.y * 3, false, Image.FORMAT_RGBA8)
	for i: int in tiles.size():
		sheet.blit_rect(tiles[i], Rect2i(Vector2i.ZERO, tiles[i].get_size()),
			Vector2i((i % columns) * CROP.x * 3, (i / columns) * CROP.y * 3))
	sheet.save_png(destination.path_join("hero_in_game.png"))
	print("CAPTURE_POSES_COMPLETE")
	quit(0)


func _wait(seconds: float) -> void:
	await create_timer(seconds).timeout


## The screen around the hero, enlarged three times.
func _crop(hero: Warrior) -> Image:
	var shot: Image = root.get_texture().get_image()
	var scale: float = float(shot.get_width()) / 640.0
	var centre: Vector2 = hero.get_global_transform_with_canvas().origin * scale
	var size: Vector2i = Vector2i(roundi(CROP.x * scale), roundi(CROP.y * scale))
	var corner: Vector2i = Vector2i(roundi(centre.x - size.x * 0.4), roundi(centre.y - size.y * 0.78))
	var tile: Image = shot.get_region(Rect2i(corner, size))
	tile.resize(CROP.x * 3, CROP.y * 3, Image.INTERPOLATE_NEAREST)
	return tile
