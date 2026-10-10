extends SceneTree
## Plays every finisher through the real session on a soldier who meets its terms (wounded to 40%, then
## staggered, or thrown down for the ground finisher) and checks that it truly played: the hero in his
## finisher, the soldier in its half frame by frame, the killing frame reached, the soldier dead at the end.
## With a window it also renders each, a frame for each frame of the hero's half (the prompt, every blow, the
## bars, the blood, the body at rest), as a sheet enlarged twice and the full screen on its killing frame, into
## captures/finishers/. Headless it only checks (tools/run_tests.ps1 runs it so).
## Ends with FINISHERS_CAPTURE_DONE passed=N failed=M, and an error exit when one did not play.
## node tools/run_godot_cli.mjs [--headless] --path . --script res://tests/capture_finishers.gd

const LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
## Each finisher, and the soldier it is played on.
const ORDER: Array[Array] = [["behead", "swordsman"], ["impale", "spearman"], ["spin", "swordsman"], ["disarm", "archer"],
	["ground", "swordsman"]]
## The crop about the hero's feet: from 70 px behind him to 150 px before him, 108 px up, 20 down.
const CROP: Rect2i = Rect2i(-70, -108, 220, 128)
const COLUMNS: int = 5
## A finisher is played on a soldier wounded to this share of his health (it needs half or less).
const WOUNDED: float = 0.4

var destination: String
var game: AbbasidGame
var drawing: bool = DisplayServer.get_name() != "headless"
var passed: int = 0
var failed: int = 0


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/finishers")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	# No lesson card may stop the game in the middle of a finisher.
	game.settings.lessons = GameSettings.LessonMode.OFF
	game._enter_level(LEVEL, &"potters_lamp", false, false)
	await _wait(0.8)
	game.hero.input.enabled = false
	# The street's own soldiers are put out of the way: still, and out of the picture.
	for node: Node in root.get_tree().get_nodes_in_group(&"enemies"):
		node.process_mode = Node.PROCESS_MODE_DISABLED
		var body: CanvasItem = node as CanvasItem
		if body != null:
			body.visible = false
	var home: Vector2 = game.hero.global_position
	for entry: Array in ORDER:
		var key: String = entry[0]
		var kind: String = entry[1]
		game.gore.clear()
		game.hero.global_position = home
		game.hero.set_facing(1.0)
		await _finisher(key, kind)
	print("FINISHERS_CAPTURE_DONE passed=%d failed=%d%s" % [passed, failed, " %s" % destination if drawing else ""])
	Engine.time_scale = 1.0
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit(0 if failed == 0 else 1)


func check(condition: bool, label: String) -> void:
	if condition:
		passed += 1
		print("  ok   %s" % label)
	else:
		failed += 1
		print("  FAIL %s" % label)


func _finisher(key: String, kind: String) -> void:
	print("finisher: %s on a %s" % [key, kind])
	var hero: Warrior = game.hero
	var finisher: FinisherDefinition = load("res://assets/characters/warrior/finishers/finish_%s.tres" % key)
	var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	game.level.get_node("Enemies").add_child(soldier)
	soldier.global_position = hero.global_position + Vector2(46.0, 0.0)
	soldier.spawn_point = soldier.global_position
	soldier.set_facing(-1.0)
	(soldier.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	game._wire_soldier(soldier)
	await _wait(0.4)
	# What a finisher asks: a man wounded to half or less, staggered (or, for the ground finisher, thrown down).
	soldier.health = soldier.max_health * WOUNDED
	if finisher.ground:
		soldier.knock_down()
		await _wait(0.6)
		# A man down is finished only from over him.
		hero.global_position.x = soldier.global_position.x - WarriorMoves.GROUND_FINISH_AT - 8.0
		await _wait(0.1)
	else:
		soldier.stagger(6.0)
		await _wait(0.35)
	var cells: Array[Image] = []
	if drawing:
		cells.append(await _crop())
		await _save_full("%s_0_prompt" % key)
	hero.moves.next_finisher = finisher
	hero.input.press(&"heavy_attack")
	var began: bool = false
	var victim_played: bool = false
	# Frames of the hero's half on which the soldier's half showed another frame (they share one timing).
	var out_of_step: Array[String] = []
	var last: int = -1
	var reached: int = -1
	for i: int in 2000:
		await process_frame
		if hero.state == Warrior.State.FINISHER:
			began = true
		elif began or i > 30:
			break
		else:
			continue
		var together: bool = (hero.sprite.animation == finisher.hero_animation
			and soldier.sprite.animation == finisher.victim_animation)
		if together:
			victim_played = true
		if hero.sprite.frame == last:
			continue
		last = hero.sprite.frame
		reached = maxi(reached, last)
		if together and soldier.sprite.frame != last:
			out_of_step.append("%d/%d" % [last, soldier.sprite.frame])
		if drawing:
			cells.append(await _crop())
			if last == finisher.death_frame:
				await _save_full("%s_1_kill" % key)
	check(began, "%s: the hero begins the finisher" % key)
	check(victim_played, "%s: the %s plays its half with him (%s)" % [key, kind, finisher.victim_animation])
	check(victim_played and out_of_step.is_empty(), "%s: frame for frame%s" % [key,
		" (hero/soldier out of step: %s)" % ", ".join(out_of_step) if not out_of_step.is_empty() else ""])
	check(reached >= finisher.death_frame, "%s: the killing frame is reached (%d of %d)" % [key, reached, finisher.death_frame])
	await _wait(0.5)
	check(soldier.dead, "%s: the %s is dead" % [key, kind])
	if drawing:
		cells.append(await _crop())
		await _wait(1.4)
		cells.append(await _crop())
		await _save_full("%s_2_after" % key)
		_sheet(cells, key)
	soldier.queue_free()
	await _wait(0.1)


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


## The frame as drawn, about the hero's feet.
func _crop() -> Image:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	var scale: float = float(image.get_width()) / 640.0
	var feet: Vector2 = game.hero.get_global_transform_with_canvas().origin
	var origin: Vector2i = Vector2i(roundi(feet.x + CROP.position.x), roundi(feet.y + CROP.position.y))
	var region: Rect2i = Rect2i(Vector2i(roundi(origin.x * scale), roundi(origin.y * scale)),
		Vector2i(roundi(CROP.size.x * scale), roundi(CROP.size.y * scale)))
	var cell: Image = Image.create(region.size.x, region.size.y, false, image.get_format())
	cell.fill(Color(0.0, 0.0, 0.0))
	cell.blit_rect(image, region, Vector2i.ZERO)
	if scale != 1.0:
		cell.resize(CROP.size.x, CROP.size.y, Image.INTERPOLATE_NEAREST)
	return cell


func _save_full(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))


## The frames side by side, enlarged twice with nearest sampling.
func _sheet(cells: Array[Image], key: String) -> void:
	var rows: int = ceili(float(cells.size()) / COLUMNS)
	var gap: int = 2
	var sheet: Image = Image.create(COLUMNS * (CROP.size.x + gap), rows * (CROP.size.y + gap), false, Image.FORMAT_RGBA8)
	sheet.fill(Color(0.12, 0.12, 0.14))
	for i: int in cells.size():
		var cell: Image = cells[i]
		cell.convert(Image.FORMAT_RGBA8)
		sheet.blit_rect(cell, Rect2i(Vector2i.ZERO, CROP.size),
			Vector2i((i % COLUMNS) * (CROP.size.x + gap), floori(float(i) / COLUMNS) * (CROP.size.y + gap)))
	sheet.resize(sheet.get_width() * 2, sheet.get_height() * 2, Image.INTERPOLATE_NEAREST)
	sheet.save_png(destination.path_join("%s_sheet.png" % key))
