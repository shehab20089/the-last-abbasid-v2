extends SceneTree
## Plays the cinematics through the real story card and saves frames of every shot (near its start, at its
## middle, near its end) into captures/cinematics/<id>/ (or <id>/ar with `ar`); `burst` also saves six
## frames running in the middle of each shot, enlarged, to judge the palette's shimmer as the camera moves;
## `ar_start` starts the game in Arabic (as a player who chose it does), so the cinematic is built right to left.
## Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_cinematics.gd [-- intro ending ar burst]

const LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
const ALL: Array[StringName] = [&"intro", &"market_end", &"streets_end", &"scholars_end", &"ending"]
const HEADINGS: Dictionary[StringName, String] = {&"intro": "CHAPTER_1_TITLE", &"market_end": "LEVEL_STREETS_OF_ASH",
	&"streets_end": "LEVEL_SCHOLARS_QUARTER", &"scholars_end": "LEVEL_LAST_GATE", &"ending": ""}
const MOMENTS: Array[float] = [0.08, 0.5, 0.92]

var game: AbbasidGame
var destination: String


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	var arabic_start: bool = "ar_start" in args
	var arabic: bool = "ar" in args or arabic_start
	var burst: bool = "burst" in args
	var ids: Array[StringName] = []
	for id: StringName in ALL:
		if String(id) in args:
			ids.append(id)
	if ids.is_empty():
		ids = ALL.duplicate()
	SaveGame.erase()
	if arabic_start:
		var file: ConfigFile = ConfigFile.new()
		file.set_value("interface", "language", "ar")
		file.save(GameSettings.file_path())
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game.settings.set_language("ar" if arabic else "en")
	game.hero.input.enabled = false
	game.hud.set_gameplay_visible(false)
	paused = true
	for id: StringName in ids:
		destination = ProjectSettings.globalize_path("res://captures/cinematics/%s%s" % [id, "/ar_start" if arabic_start else ("/ar" if arabic else "")])
		DirAccess.make_dir_recursive_absolute(destination)
		var heading: String = HEADINGS[id]
		game.card.play(id, game._card_lines(id), heading)
		await _follow(burst)
		print("CINEMATIC_CAPTURED %s" % id)
	print("CINEMATICS_CAPTURE_DONE")
	paused = false
	game.settings.set_language("en")
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


## Saves the moments of each shot as the cinematic plays, until the card ends.
func _follow(burst: bool) -> void:
	var player: CinematicPlayer = game.card.cinematic
	var saved: PackedStringArray = PackedStringArray()
	while game.card.visible:
		await process_frame
		var shot: int = player.shot_index()
		if shot < 0:
			continue
		var through: float = player.shot_time() / maxf(0.01, player.shot_length())
		for moment: float in MOMENTS:
			var label: String = "%02d_%02d" % [shot, int(moment * 100.0)]
			if through >= moment and not saved.has(label):
				saved.append(label)
				await _save(label)
		var burst_label: String = "%02d_burst" % shot
		if burst and through >= 0.45 and not saved.has(burst_label):
			saved.append(burst_label)
			await _burst(burst_label)


func _save(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))


## Six frames running, a part of the picture enlarged three times, side by side.
func _burst(label: String) -> void:
	var frames: Array[Image] = []
	for i: int in 6:
		await RenderingServer.frame_post_draw
		var image: Image = root.get_texture().get_image()
		var part: Image = image.get_region(Rect2i(200, 120, 160, 90))
		part.convert(Image.FORMAT_RGBA8)
		part.resize(480, 270, Image.INTERPOLATE_NEAREST)
		frames.append(part)
	var sheet: Image = Image.create(480 * 3 + 8, 270 * 2 + 4, false, Image.FORMAT_RGBA8)
	sheet.fill(Color(0.1, 0.1, 0.1))
	for i: int in frames.size():
		sheet.blit_rect(frames[i], Rect2i(0, 0, 480, 270), Vector2i((i % 3) * 484, floori(float(i) / 3.0) * 274))
	sheet.save_png(destination.path_join(label + ".png"))


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout
