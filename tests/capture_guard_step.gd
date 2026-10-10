extends SceneTree
## Renders Yusuf moving behind his raised shield in the real game: a strip of frames stepping forward, then
## backing away, cropped about him and enlarged. Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_guard_step.gd

const LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
const CROP: Vector2i = Vector2i(120, 110)
const FRAMES: int = 8

var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var destination: String = ProjectSettings.globalize_path("res://captures/moves")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.2)
	game = current_scene as AbbasidGame
	game.hud.set_gameplay_visible(false)
	var hero: Warrior = game.hero
	hero.input.enabled = false
	hero.global_position.x = 8.0 * 16.0
	await _wait(0.4)
	hero.input.press(&"block")
	hero.input.block_held = true
	await _wait(0.4)
	var strips: Array[Image] = []
	for direction: float in [1.0, -1.0]:
		hero.input.move = direction
		await _wait(0.35)
		var frames: Array[Image] = []
		for i: int in FRAMES:
			await _wait(0.07)
			await RenderingServer.frame_post_draw
			var shot: Image = root.get_texture().get_image()
			var at: Vector2 = hero.get_global_transform_with_canvas().origin
			var rect: Rect2i = Rect2i(Vector2i(int(at.x) - CROP.x / 2, int(at.y) - CROP.y + 6), CROP)
			frames.append(shot.get_region(rect))
			print("%s frame %d: %s at %.1f" % ["forward" if direction > 0.0 else "back", i, hero.sprite.animation,
				hero.global_position.x])
		strips.append(_strip(frames))
		hero.input.move = 0.0
		await _wait(0.3)
	var sheet: Image = Image.create(strips[0].get_width(), strips[0].get_height() * 2 + 4, false, Image.FORMAT_RGBA8)
	sheet.fill(Color(0.1, 0.09, 0.1))
	sheet.blit_rect(strips[0], Rect2i(Vector2i.ZERO, strips[0].get_size()), Vector2i.ZERO)
	sheet.blit_rect(strips[1], Rect2i(Vector2i.ZERO, strips[1].get_size()), Vector2i(0, strips[0].get_height() + 4))
	sheet.resize(sheet.get_width() * 3, sheet.get_height() * 3, Image.INTERPOLATE_NEAREST)
	sheet.save_png(destination.path_join("guard_step.png"))
	print("GUARD_STEP_CAPTURE_DONE")
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


func _strip(frames: Array[Image]) -> Image:
	var strip: Image = Image.create(CROP.x * frames.size(), CROP.y, false, Image.FORMAT_RGBA8)
	for i: int in frames.size():
		var frame: Image = frames[i]
		frame.convert(Image.FORMAT_RGBA8)
		strip.blit_rect(frame, Rect2i(Vector2i.ZERO, CROP), Vector2i(i * CROP.x, 0))
	return strip


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout
