extends SceneTree
## Renders a short fight with each new soldier through the real session (by the Fallen Market's
## potters' lamp): the shield-bearer's wall turning a cut and then bashed aside; the keshig veteran's
## two cuts; the mace-bearer's overhead blow; the engineer's fire pot bursting into flame; and the
## hero's throwing knife and rolling cut. A sheet each (enlarged 2x). Not a pass/fail check. Needs a
## window: node tools/run_godot_cli.mjs --path . --script res://tests/capture_soldiers.gd

const LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
## The crop about the hero's feet.
const CROP: Rect2i = Rect2i(-80, -120, 260, 140)
const COLUMNS: int = 6

var destination: String
var game: AbbasidGame
var home: Vector2


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/soldiers")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game._enter_level(LEVEL, &"potters_lamp", false, false)
	await _wait(0.8)
	game.hero.input.enabled = false
	game.hero.set_techniques([&"bash", &"plunge", &"roll_cut", &"knives"])
	for node: Node in root.get_tree().get_nodes_in_group(&"enemies"):
		var brain: Node = node.get_node_or_null(^"Brain")
		if brain != null:
			brain.process_mode = Node.PROCESS_MODE_DISABLED
	home = game.hero.global_position
	await _shieldbearer()
	await _veteran()
	await _maceman()
	await _engineer()
	await _knife()
	await _roll_cut()
	print("SOLDIERS_CAPTURE_DONE %s" % destination)
	Engine.time_scale = 1.0
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


## The wall turns a cut; the bash breaks it.
func _shieldbearer() -> void:
	var hero: Warrior = await _fresh()
	var wall: MongolSoldier = await _soldier("shieldbearer", 40.0)
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"attack")
	await _frames(cells, 0.45)
	hero.input.block_held = true
	await _wait(0.2)
	hero.input.press(&"heavy_attack")
	await _frames(cells, 0.8)
	hero.input.block_held = false
	_sheet(cells, "shieldbearer")
	wall.queue_free()


## The quick cut, and the backhand after a held beat.
func _veteran() -> void:
	await _fresh()
	var veteran: MongolSoldier = await _soldier("veteran", 44.0)
	var cells: Array[Image] = [await _crop()]
	veteran.attack(veteran.profile.attacks[SwordsmanBrain.CUT])
	var chained: bool = false
	for i: int in 200:
		await process_frame
		if veteran.current_attack == null and not chained:
			chained = true
			veteran.attack(veteran.profile.attacks[VeteranBrain.CUT_B])
		if i % 4 == 0:
			cells.append(await _crop())
		if chained and veteran.current_attack == null:
			break
	_sheet(cells, "veteran")
	veteran.queue_free()


## The overhead blow, raised high, into the street.
func _maceman() -> void:
	await _fresh()
	var mace: MongolSoldier = await _soldier("maceman", 52.0)
	var cells: Array[Image] = [await _crop()]
	mace.attack(mace.profile.attacks[MacemanBrain.SMASH])
	var last: int = -1
	for i: int in 200:
		await process_frame
		if mace.sprite.frame != last:
			last = mace.sprite.frame
			cells.append(await _crop())
		if mace.current_attack == null:
			break
	_sheet(cells, "maceman")
	mace.queue_free()


## A pot lobbed from across the street; it bursts into fire.
func _engineer() -> void:
	await _fresh()
	var engineer: MongolSoldier = await _soldier("engineer", 150.0)
	var cells: Array[Image] = [await _crop()]
	engineer.attack(engineer.profile.attacks[0])
	var start: int = Time.get_ticks_msec()
	var shot: bool = false
	while Time.get_ticks_msec() - start < 2600:
		await _wait(0.1)
		cells.append(await _crop())
		if not shot and not root.get_tree().get_nodes_in_group(&"hazards").is_empty():
			shot = true
			await _save_full("engineer_fire")
	_sheet(cells, "engineer")
	engineer.queue_free()


func _knife() -> void:
	var hero: Warrior = await _fresh()
	var target: MongolSoldier = await _soldier("swordsman", 120.0)
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"throw")
	await _frames(cells, 0.6)
	_sheet(cells, "knife")
	target.queue_free()


## Roll through a man and rise behind him in the rolling cut.
func _roll_cut() -> void:
	var hero: Warrior = await _fresh()
	var target: MongolSoldier = await _soldier("swordsman", 34.0)
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"dodge")
	await _frames(cells, 0.25)
	hero.input.press(&"attack")
	await _frames(cells, 0.5)
	_sheet(cells, "roll_cut")
	if is_instance_valid(target):
		target.queue_free()


func _fresh() -> Warrior:
	game.gore.clear()
	for fire: Node in root.get_tree().get_nodes_in_group(&"hazards"):
		fire.queue_free()
	var hero: Warrior = game.hero
	hero.global_position = home
	hero.velocity = Vector2.ZERO
	hero.set_facing(1.0)
	hero.rest()
	await _wait(0.3)
	return hero


func _soldier(kind: String, gap: float) -> MongolSoldier:
	var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	game.level.get_node("Enemies").add_child(soldier)
	soldier.global_position = game.hero.global_position + Vector2(gap, 0.0)
	soldier.spawn_point = soldier.global_position
	soldier.set_facing(-1.0)
	(soldier.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	game._wire_soldier(soldier)
	await _wait(0.2)
	soldier.unaware = false
	return soldier


## A frame each time the hero's frame changes, for `seconds`.
func _frames(cells: Array[Image], seconds: float) -> void:
	var hero: Warrior = game.hero
	var last: String = ""
	var start: int = Time.get_ticks_msec()
	while Time.get_ticks_msec() - start < int(seconds * 1000.0):
		await process_frame
		var key: String = "%s:%d" % [hero.sprite.animation, hero.sprite.frame]
		if key != last:
			last = key
			cells.append(await _crop())


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


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
