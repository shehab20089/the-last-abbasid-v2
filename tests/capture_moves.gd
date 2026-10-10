extends SceneTree
## Renders the new moves through the real session in the Fallen Market: a drop through the gallery's
## planks and a plunge onto a book burner, the air slash, the shield bash on the river gate's
## sentries, the spearman's amber low sweep, and a quick finisher while another soldier still fights.
## A sheet each (enlarged 2x) and a few full frames. Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_moves.gd
## With `-- tells`: only the four warnings (a cut, a low sweep, a guard-breaker, a blow no shield stops).

const LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
## The crop about the hero's feet.
const CROP: Rect2i = Rect2i(-90, -150, 220, 170)
const COLUMNS: int = 6
const T: float = 16.0

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/moves")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game._enter_level(LEVEL, &"potters_lamp", false, false)
	await _wait(0.8)
	game.hero.input.enabled = false
	# The street's own soldiers stand where they are, about their business.
	for node: Node in root.get_tree().get_nodes_in_group(&"enemies"):
		var brain: Node = node.get_node_or_null(^"Brain")
		if brain != null:
			brain.process_mode = Node.PROCESS_MODE_DISABLED
	var home: Vector2 = game.hero.global_position
	if "tells" in OS.get_cmdline_user_args():
		await _tells(home)
	else:
		await _plunge()
		await _air_slash(home)
		await _bash()
		await _low_sweep(home)
		await _quick_finisher(home)
	print("MOVES_CAPTURE_DONE %s" % destination)
	Engine.time_scale = 1.0
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


## On the gallery over the pyre: down and jump through the planks, then the plunge onto the burner.
func _plunge() -> void:
	var hero: Warrior = game.hero
	hero.global_position = Vector2(157.4 * T, 22.0 * T)
	hero.velocity = Vector2.ZERO
	hero.set_facing(1.0)
	await _wait(0.9)
	var cells: Array[Image] = [await _crop()]
	await _save_full("plunge_0_gallery")
	hero.input.down_held = true
	hero.input.press(&"jump")
	for i: int in 5:
		await physics_frame
	hero.input.down_held = false
	hero.input.press(&"heavy_attack")
	await _follow(cells, 3.0, "plunge_1_landing")
	await _wait(0.8)
	cells.append(await _crop())
	await _save_full("plunge_2_after")
	_sheet(cells, "plunge")


func _air_slash(home: Vector2) -> void:
	var hero: Warrior = game.hero
	game.gore.clear()
	hero.global_position = home
	hero.set_facing(1.0)
	var soldier: MongolSoldier = await _soldier("swordsman", 64.0)
	await _wait(0.4)
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"jump")
	hero.input.jump_held = true
	await _wait(0.12)
	hero.input.press(&"attack")
	await _follow(cells, 1.2, "air_slash_1")
	hero.input.jump_held = false
	_sheet(cells, "air_slash")
	soldier.queue_free()


## The river gate's sentries, shields locked: hold the shield up, then bash.
func _bash() -> void:
	var hero: Warrior = game.hero
	game.gore.clear()
	var sentry: MongolSoldier = null
	for node: Node in root.get_tree().get_nodes_in_group(&"enemies"):
		var other: MongolSoldier = node as MongolSoldier
		if other != null and absf(other.global_position.x - 280.0 * T - 8.0) < 24.0:
			sentry = other
	hero.global_position = Vector2(sentry.global_position.x - 34.0, sentry.global_position.y)
	hero.set_facing(1.0)
	sentry.unaware = false
	sentry.set_facing(-1.0)
	await _wait(0.6)
	sentry.guard(3.0)
	hero.input.block_held = true
	await _wait(0.3)
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"heavy_attack")
	await _follow(cells, 0.9, "bash_1")
	hero.input.block_held = false
	_sheet(cells, "bash")


## A spearman's low sweep at the hero, glinting amber.
func _low_sweep(home: Vector2) -> void:
	var hero: Warrior = game.hero
	game.gore.clear()
	hero.global_position = home
	hero.set_facing(1.0)
	var spearman: MongolSoldier = await _soldier("spearman", 44.0)
	await _wait(0.4)
	var cells: Array[Image] = [await _crop()]
	spearman.attack(load("res://features/enemies/definitions/spearman_sweep.tres") as AttackDefinition)
	var last: int = -1
	for i: int in 60:
		await process_frame
		if spearman.sprite.frame != last:
			last = spearman.sprite.frame
			cells.append(await _crop())
			if last == 0:
				await _save_full("sweep_glint")
		if spearman.current_attack == null:
			break
	_sheet(cells, "low_sweep")
	spearman.queue_free()


## The four warnings, each from the wind-up to the blow: white (a cut), amber (a low sweep), violet (a blow
## that breaks a guard), red (one no shield stops).
func _tells(home: Vector2) -> void:
	var hero: Warrior = game.hero
	hero.global_position = home
	hero.set_facing(1.0)
	await _wait(0.4)
	var tells: Array[String] = ["swordsman:swordsman_cut", "spearman:spearman_sweep", "maceman:maceman_smash",
		"axeman:axeman_hook", "captain:captain_smash", "captain:captain_sweep"]
	for pair: String in tells:
		var entry: PackedStringArray = pair.split(":")
		game.gore.clear()
		var soldier: MongolSoldier = await _soldier(entry[0], 58.0)
		await _wait(0.3)
		var blow: AttackDefinition = load("res://features/enemies/definitions/%s.tres" % entry[1]) as AttackDefinition
		var cells: Array[Image] = []
		hero._invulnerable = 3.0
		soldier.attack(blow)
		var last: int = -1
		for i: int in 90:
			await process_frame
			if soldier.sprite.frame != last:
				last = soldier.sprite.frame
				cells.append(await _crop())
				if last == maxi(blow.telegraph_frame, 0) + 1:
					await _save_full("tell_%s" % entry[1])
			if soldier.current_attack == null or last > blow.active_to:
				break
		_sheet(cells, "tell_%s" % entry[1])
		soldier.queue_free()
		await _wait(0.5)


## A wounded, staggered soldier finished while another, nearer the gate, is still in the fight.
func _quick_finisher(home: Vector2) -> void:
	var hero: Warrior = game.hero
	game.gore.clear()
	hero.global_position = home
	hero.set_facing(1.0)
	await _wait(0.3)
	var other: MongolSoldier = await _soldier("swordsman", 150.0)
	other.engaged = true
	var target: MongolSoldier = await _soldier("swordsman", 44.0)
	target.take_damage(target.max_health * 0.6)
	target.stagger(5.0)
	await _wait(0.3)
	var cells: Array[Image] = [await _crop()]
	await _save_full("quick_0_prompt")
	hero.input.press(&"heavy_attack")
	await _follow(cells, 2.5, "quick_1")
	_sheet(cells, "quick_finisher")
	other.queue_free()
	target.queue_free()


## A soldier `gap` px before the hero, facing him, his brain still.
func _soldier(kind: String, gap: float) -> MongolSoldier:
	var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	game.level.get_node("Enemies").add_child(soldier)
	soldier.global_position = game.hero.global_position + Vector2(game.hero.facing * gap, 0.0)
	soldier.spawn_point = soldier.global_position
	soldier.set_facing(-game.hero.facing)
	(soldier.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	game._wire_soldier(soldier)
	await _wait(0.1)
	soldier.unaware = false
	return soldier


## A frame for each frame the hero's animation shows, for up to `seconds`, until he stands idle again.
func _follow(cells: Array[Image], seconds: float, full: String) -> void:
	var hero: Warrior = game.hero
	var last: String = ""
	var start: int = Time.get_ticks_msec()
	var saved: bool = false
	while Time.get_ticks_msec() - start < int(seconds * 1000.0):
		await process_frame
		var key: String = "%s:%d" % [hero.sprite.animation, hero.sprite.frame]
		if key != last:
			last = key
			cells.append(await _crop())
			if not saved and hero.current_attack != null and hero.sprite.frame == hero.current_attack.active_from:
				saved = true
				await _save_full(full)
		if hero.state == Warrior.State.IDLE and Time.get_ticks_msec() - start > 300:
			break


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


func _crop() -> Image:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	var scale: float = float(image.get_width()) / 640.0
	var feet: Vector2 = game.hero.get_global_transform_with_canvas().origin
	var origin: Vector2i = Vector2i(roundi(feet.x + CROP.position.x * game.hero.facing - (CROP.size.x if game.hero.facing < 0.0 else 0)),
		roundi(feet.y + CROP.position.y))
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
func _sheet(cells: Array[Image], label: String) -> void:
	var rows: int = ceili(float(cells.size()) / COLUMNS)
	var gap: int = 2
	var sheet: Image = Image.create(COLUMNS * (CROP.size.x + gap), rows * (CROP.size.y + gap), false, Image.FORMAT_RGBA8)
	sheet.fill(Color(0.12, 0.12, 0.14))
	for i: int in cells.size():
		var cell: Image = cells[i]
		cell.convert(Image.FORMAT_RGBA8)
		sheet.blit_rect(cell, Rect2i(Vector2i.ZERO, CROP.size),
			Vector2i((i % COLUMNS) * (CROP.size.x + gap), (i / COLUMNS) * (CROP.size.y + gap)))
	sheet.resize(sheet.get_width() * 2, sheet.get_height() * 2, Image.INTERPOLATE_NEAREST)
	sheet.save_png(destination.path_join("%s_sheet.png" % label))
