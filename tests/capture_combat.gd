extends SceneTree
## Renders the hero's growing kit through the real session in the Fallen Market, against soldiers
## set before him: the pommel strike through a raised guard, the whirling cut between two men, the
## delayed cut on a guard, the executioner's cleave at the end of the string, the charged cleave
## (held to its third level) among three, and the running thrust into a spearman; then the Arts: the
## Storm of Blades among three, the Piercing Line through a shield wall, the Naft Flask, the Second Wind
## and the Judgment of the Guard; then the weight of the new combat: a man thrown down by the string's
## end and pinned where he lies, a close call against a real swing, a steady breath in a cut's glint. A
## sheet each (enlarged 2x) and the full frame of each blow. With `-- moves2`, only the second move set: the
## string ending in the kick, the low cut under a raised shield, a cut glancing off one, the heavy string, the
## running slash, the guarded thrust, the riposte out of a parry, the down-stab's bounce and the reaping sweep.
## Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_combat.gd [-- moves2]

const LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
## The crop about the hero's feet.
const CROP: Rect2i = Rect2i(-110, -150, 260, 170)
const COLUMNS: int = 6

var destination: String
var game: AbbasidGame
var home: Vector2


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/combat")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	AbbasidGame.start_in_level = LEVEL
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.0)
	game = current_scene as AbbasidGame
	game._enter_level(LEVEL, &"potters_lamp", false, false)
	await _wait(0.8)
	game.hero.input.enabled = false
	game.hero.set_techniques(AbbasidGame.TECHNIQUES)
	# The street's own soldiers stand where they are, about their business.
	for node: Node in root.get_tree().get_nodes_in_group(&"enemies"):
		var brain: Node = node.get_node_or_null(^"Brain")
		if brain != null:
			brain.process_mode = Node.PROCESS_MODE_DISABLED
	home = game.hero.global_position
	if "arts" in OS.get_cmdline_user_args():
		await _storm()
		await _pierce()
		await _naft()
		await _second_wind()
		await _judgment()
		print("COMBAT_CAPTURE_DONE %s" % destination)
		Engine.time_scale = 1.0
		current_scene.queue_free()
		await process_frame
		OS.delay_msec(200)
		quit()
		return
	if "moves2" in OS.get_cmdline_user_args():
		await _second_move_set()
		print("COMBAT_CAPTURE_DONE %s" % destination)
		Engine.time_scale = 1.0
		current_scene.queue_free()
		await process_frame
		OS.delay_msec(200)
		quit()
		return
	await _pommel()
	await _whirl()
	await _delayed()
	await _executioner()
	await _charge()
	await _running_thrust()
	await _storm()
	await _pierce()
	await _naft()
	await _second_wind()
	await _judgment()
	await _thrown_down()
	await _close_call()
	await _steady_breath()
	print("COMBAT_CAPTURE_DONE %s" % destination)
	Engine.time_scale = 1.0
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


func _pommel() -> void:
	var hero: Warrior = await _ready_hero()
	var soldier: MongolSoldier = await _soldier("swordsman", 34.0)
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"attack")
	await _until(&"attack_1", 2)
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	soldier.guard(2.0)
	hero.input.press(&"heavy_attack")
	await _follow(cells, 1.4, "pommel_strike")
	_sheet(cells, "pommel_strike")
	soldier.queue_free()


func _whirl() -> void:
	var hero: Warrior = await _ready_hero()
	var before: MongolSoldier = await _soldier("swordsman", 36.0)
	var behind: MongolSoldier = await _soldier("spearman", -34.0)
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"attack")
	await _until(&"attack_1", 2)
	hero.input.press(&"attack")
	await _until(&"attack_2", 2)
	hero.input.press(&"heavy_attack")
	await _follow(cells, 1.6, "whirling_cut")
	_sheet(cells, "whirling_cut")
	before.queue_free()
	behind.queue_free()


func _delayed() -> void:
	var hero: Warrior = await _ready_hero()
	var soldier: MongolSoldier = await _soldier("swordsman", 34.0, true)
	soldier.guard(3.0)
	await _wait(0.2)
	var cells: Array[Image] = [await _crop()]
	hero.moves.delay_window = 0.3
	hero.input.press(&"attack")
	await _follow(cells, 1.2, "delayed_cut")
	_sheet(cells, "delayed_cut")
	soldier.queue_free()


func _executioner() -> void:
	var hero: Warrior = await _ready_hero()
	var soldier: MongolSoldier = await _soldier("veteran", 36.0)
	var cells: Array[Image] = [await _crop()]
	for step: StringName in [&"attack_1", &"attack_2", &"attack_3"]:
		hero.input.press(&"attack")
		await _until(step, 2)
		cells.append(await _crop())
	hero.input.press(&"heavy_attack")
	await _follow(cells, 1.6, "executioner")
	_sheet(cells, "executioner")
	soldier.queue_free()


func _charge() -> void:
	var hero: Warrior = await _ready_hero()
	var wall: MongolSoldier = await _soldier("shieldbearer", 40.0)
	var beside: MongolSoldier = await _soldier("swordsman", -40.0)
	var cells: Array[Image] = [await _crop()]
	hero.input.heavy_held = true
	hero.input.press(&"heavy_attack")
	var shots: int = 0
	var start: int = Time.get_ticks_msec()
	while Time.get_ticks_msec() - start < 1700:
		await process_frame
		if Time.get_ticks_msec() - start > shots * 300:
			shots += 1
			cells.append(await _crop())
			if hero.charge_level == 3 and shots > 4:
				await _save_full("charge_held")
	hero.input.heavy_held = false
	await _follow(cells, 1.4, "charged_cleave")
	_sheet(cells, "charged_cleave")
	wall.queue_free()
	beside.queue_free()


func _running_thrust() -> void:
	var hero: Warrior = await _ready_hero()
	hero.global_position.x -= 80.0
	var spearman: MongolSoldier = await _soldier("spearman", 150.0)
	var cells: Array[Image] = [await _crop()]
	hero.input.move = 1.0
	await _wait(0.3)
	cells.append(await _crop())
	hero.input.press(&"heavy_attack")
	await physics_frame
	hero.input.move = 0.0
	await _follow(cells, 1.2, "running_thrust")
	_sheet(cells, "running_thrust")
	spearman.queue_free()


func _storm() -> void:
	var hero: Warrior = await _ready_hero()
	var soldiers: Array[MongolSoldier] = [await _soldier("swordsman", 36.0), await _soldier("spearman", -34.0),
		await _soldier("swordsman", 58.0)]
	# (Tough enough to live through the turns, so the rising cut can be seen throwing them down.)
	for soldier: MongolSoldier in soldiers:
		soldier.max_health = 400.0
		soldier.health = 400.0
	await _art(&"storm", "art_storm", 2.6)
	for soldier: MongolSoldier in soldiers:
		if is_instance_valid(soldier):
			soldier.queue_free()


func _pierce() -> void:
	var hero: Warrior = await _ready_hero()
	var line: Array[MongolSoldier] = [await _soldier("shieldbearer", 46.0), await _soldier("swordsman", 82.0),
		await _soldier("spearman", 118.0)]
	await _art(&"pierce", "art_pierce", 2.4)
	for soldier: MongolSoldier in line:
		if is_instance_valid(soldier):
			soldier.queue_free()
	hero.global_position = home


func _naft() -> void:
	var hero: Warrior = await _ready_hero()
	var crowd: Array[MongolSoldier] = [await _soldier("swordsman", 104.0), await _soldier("spearman", 122.0),
		await _soldier("swordsman", 150.0)]
	await _art(&"naft", "art_naft", 3.2)
	await _wait(0.9)
	await _save_full("art_naft_after")
	await _wait(0.9)
	await _save_full("art_naft_burning")
	for soldier: MongolSoldier in crowd:
		if is_instance_valid(soldier):
			soldier.queue_free()
	for fire: Node in root.get_tree().get_nodes_in_group(&"hazards"):
		fire.queue_free()


func _second_wind() -> void:
	var hero: Warrior = await _ready_hero()
	hero.take_damage(50.0)
	var near: Array[MongolSoldier] = [await _soldier("swordsman", 48.0), await _soldier("spearman", -58.0)]
	await _art(&"second_wind", "art_second_wind", 2.4)
	# The fury: a cut in it, faster, gold.
	hero.input.press(&"attack")
	await _wait(0.12)
	await _save_full("art_second_wind_fury")
	await _wait(0.6)
	for soldier: MongolSoldier in near:
		if is_instance_valid(soldier):
			soldier.queue_free()


func _judgment() -> void:
	var hero: Warrior = await _ready_hero()
	var three: Array[MongolSoldier] = [await _soldier("swordsman", 40.0), await _soldier("spearman", -70.0),
		await _soldier("swordsman", 120.0)]
	await _art(&"judgment", "art_judgment", 7.0)
	for soldier: MongolSoldier in three:
		if is_instance_valid(soldier):
			soldier.queue_free()


## The string's last blow throws a swordsman down; the hero steps over him and pins him where he lies.
func _thrown_down() -> void:
	var hero: Warrior = await _ready_hero()
	var soldier: MongolSoldier = await _soldier("swordsman", 36.0)
	var cells: Array[Image] = [await _crop()]
	for step: StringName in [&"attack_1", &"attack_2", &"attack_3"]:
		hero.input.press(&"attack")
		await _until(step, 2)
		cells.append(await _crop())
	hero.input.press(&"heavy_attack")
	await _follow(cells, 1.4, "thrown_down")
	await _wait(0.2)
	cells.append(await _crop())
	await _save_full("thrown_down_lying")
	if soldier.is_down():
		soldier.health = minf(soldier.health, soldier.max_health * 0.4)
		hero.global_position.x = soldier.global_position.x - 4.0 * hero.facing
		await _wait(0.05)
		hero.input.press(&"heavy_attack")
		await _follow(cells, 2.2, "ground_finisher")
	_sheet(cells, "thrown_down")
	soldier.queue_free()


## A swordsman's slash, and the hero rolls into it just as it comes: a close call.
func _close_call() -> void:
	var hero: Warrior = await _ready_hero()
	var soldier: MongolSoldier = await _soldier("swordsman", 40.0)
	var slash: AttackDefinition = load("res://features/enemies/definitions/swordsman_slash.tres") as AttackDefinition
	var frames: SpriteFrames = soldier.sprite.sprite_frames
	var lead: float = 0.0
	for f: int in slash.active_from:
		lead += frames.get_frame_duration(slash.animation, f) / frames.get_animation_speed(slash.animation)
	var cells: Array[Image] = [await _crop()]
	soldier.attack(slash)
	await _wait(maxf(0.0, lead - 0.07))
	hero.input.press(&"dodge")
	var start: int = Time.get_ticks_msec()
	var saved: bool = false
	while Time.get_ticks_msec() - start < 1100:
		await process_frame
		cells.append(await _crop())
		if not saved and Engine.time_scale < 0.9 and Engine.time_scale > 0.1:
			saved = true
			await _save_full("close_call")
	if not saved:
		await _save_full("close_call")
	_sheet(cells.slice(0, 18), "close_call")
	soldier.queue_free()


## A cut, and the shield raised in the glint as it ends: breath drawn.
func _steady_breath() -> void:
	var hero: Warrior = await _ready_hero()
	hero.stamina = 30.0
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"attack")
	await _until(&"attack_1", 4)
	cells.append(await _crop())
	await _save_full("steady_glint")
	hero.input.press(&"block")
	hero.input.block_held = true
	for i: int in 8:
		await _wait(0.04)
		cells.append(await _crop())
	hero.input.block_held = false
	_sheet(cells, "steady_breath")


## The second move set, each against soldiers set before him.
func _second_move_set() -> void:
	var hero: Warrior = await _ready_hero()
	var soldier: MongolSoldier = await _soldier("swordsman", 30.0)
	soldier.max_health = 400.0
	soldier.health = 400.0
	var cells: Array[Image] = [await _crop()]
	await _chain(cells, [&"attack", &"attack", &"attack", &"attack"], "string_kick", 2.6)
	_sheet(cells, "string_kick")
	soldier.queue_free()
	# The low cut under a raised shield; then a plain cut on it glances off.
	hero = await _ready_hero()
	soldier = await _soldier("swordsman", 32.0)
	soldier.guard(6.0)
	cells = [await _crop()]
	hero.input.down_held = true
	hero.input.press(&"attack")
	await _follow(cells, 1.0, "low_cut")
	hero.input.down_held = false
	_sheet(cells, "low_cut")
	soldier.queue_free()
	hero = await _ready_hero()
	soldier = await _soldier("swordsman", 30.0)
	soldier.guard(6.0)
	cells = [await _crop()]
	hero.input.press(&"attack")
	await _follow(cells, 0.9, "glance")
	_sheet(cells, "glance")
	soldier.queue_free()
	# The heavy string.
	hero = await _ready_hero()
	soldier = await _soldier("swordsman", 36.0)
	soldier.max_health = 400.0
	soldier.health = 400.0
	cells = [await _crop()]
	await _chain(cells, [&"heavy_attack", &"heavy_attack", &"heavy_attack"], "heavy_string", 3.0)
	_sheet(cells, "heavy_string")
	soldier.queue_free()
	# The running slash.
	hero = await _ready_hero()
	soldier = await _soldier("swordsman", 150.0)
	cells = [await _crop()]
	hero.input.move = 1.0
	await _wait(0.35)
	hero.input.press(&"attack")
	hero.input.move = 0.0
	await _follow(cells, 1.0, "running_slash")
	_sheet(cells, "running_slash")
	soldier.queue_free()
	# The guarded thrust, twice.
	hero = await _ready_hero()
	soldier = await _soldier("swordsman", 30.0)
	cells = [await _crop()]
	hero.input.press(&"block")
	hero.input.block_held = true
	await _wait(0.2)
	await _chain(cells, [&"attack", &"attack"], "guarded_thrust", 1.0)
	hero.input.block_held = false
	_sheet(cells, "guarded_thrust")
	soldier.queue_free()
	# The riposte, out of a parry.
	hero = await _ready_hero()
	soldier = await _soldier("swordsman", 34.0)
	cells = [await _crop()]
	hero.input.press(&"block")
	hero.input.block_held = true
	await process_frame
	await process_frame
	var slash: AttackDefinition = load("res://features/enemies/definitions/swordsman_slash.tres") as AttackDefinition
	hero.receive_hit(HitData.from_attack(soldier, slash))
	hero.input.block_held = false
	for i: int in 4:
		await process_frame
		cells.append(await _crop())
	hero.input.press(&"attack")
	await _follow(cells, 1.0, "riposte")
	_sheet(cells, "riposte")
	soldier.queue_free()
	# The down-stab: off the man below and back up.
	hero = await _ready_hero()
	soldier = await _soldier("swordsman", 8.0)
	hero.global_position.y -= 100.0
	await process_frame
	cells = [await _crop()]
	hero.input.down_held = true
	hero.input.press(&"attack")
	var start: int = Time.get_ticks_msec()
	var pressed: bool = false
	while Time.get_ticks_msec() - start < 1400:
		await process_frame
		cells.append(await _crop())
		if hero.state == Warrior.State.AIR and not pressed and Time.get_ticks_msec() - start > 200:
			pressed = true
			hero.input.down_held = false
			hero.input.press(&"attack")
		if hero.is_on_floor() and Time.get_ticks_msec() - start > 500:
			break
	hero.input.down_held = false
	await _save_full("down_stab")
	_sheet(cells.slice(0, 30), "down_stab")
	soldier.queue_free()
	# The reaping sweep between two men.
	hero = await _ready_hero()
	var before: MongolSoldier = await _soldier("swordsman", 30.0)
	var behind: MongolSoldier = await _soldier("spearman", -30.0)
	cells = [await _crop()]
	hero.input.down_held = true
	hero.input.press(&"heavy_attack")
	await _follow(cells, 1.6, "sweep")
	hero.input.down_held = false
	await _wait(0.3)
	cells.append(await _crop())
	_sheet(cells, "sweep")
	before.queue_free()
	behind.queue_free()


## Presses each button in turn as the blow before it goes live, a frame for each frame shown.
func _chain(cells: Array[Image], presses: Array[StringName], full: String, seconds: float) -> void:
	var hero: Warrior = game.hero
	var next: int = 0
	var last: String = ""
	var saved: bool = false
	var pressed_in: AttackDefinition = null
	var start: int = Time.get_ticks_msec()
	hero.input.press(presses[0])
	next = 1
	while Time.get_ticks_msec() - start < int(seconds * 1000.0):
		await process_frame
		var key: String = "%s:%d" % [hero.sprite.animation, hero.sprite.frame]
		if key != last:
			last = key
			cells.append(await _crop())
		var attack: AttackDefinition = hero.current_attack
		# One press a blow, as its blade goes live (the next blow waits in the string).
		if (next < presses.size() and attack != null and attack != pressed_in
				and hero.sprite.frame >= attack.active_from):
			pressed_in = attack
			hero.input.press(presses[next])
			next += 1
		if next >= presses.size() and attack != null and not saved and hero.sprite.frame == attack.active_from:
			saved = true
			await _save_full(full)
		if hero.state == Warrior.State.IDLE and next >= presses.size() and Time.get_ticks_msec() - start > 400:
			break
		if hero.state == Warrior.State.BLOCK and next >= presses.size() and Time.get_ticks_msec() - start > 400:
			break


## Plays an Art with a full bar of resolve, a frame for each frame it shows.
func _art(id: StringName, label: String, seconds: float) -> void:
	var hero: Warrior = game.hero
	hero.art_slots = [id]
	hero.set_resolve(100.0)
	await _wait(0.2)
	var cells: Array[Image] = [await _crop()]
	hero.input.press(&"art")
	# The moment it is spent (once the press has been taken, on a physics step).
	for i: int in 40:
		await process_frame
		if hero.state == Warrior.State.ART or hero.state == Warrior.State.FINISHER:
			break
	await process_frame
	await _save_full(label + "_moment")
	await _follow(cells, seconds, label)
	_sheet(cells, label)


## The hero back at the lamp, facing the gate, whole and rested; the street cleared of blood.
func _ready_hero() -> Warrior:
	var hero: Warrior = game.hero
	game.gore.clear()
	game.vfx.clear()
	hero.global_position = home
	hero.velocity = Vector2.ZERO
	hero.set_facing(1.0)
	hero.rest()
	await _wait(0.5)
	return hero


## A soldier `gap` px before the hero (behind him when negative), facing him; his brain still unless
## `thinking` (a guard that answers the hero's blows).
func _soldier(kind: String, gap: float, thinking: bool = false) -> MongolSoldier:
	var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	game.level.get_node("Enemies").add_child(soldier)
	soldier.global_position = game.hero.global_position + Vector2(game.hero.facing * gap, 0.0)
	soldier.spawn_point = soldier.global_position
	soldier.set_facing(-signf(gap) * game.hero.facing)
	if not thinking:
		(soldier.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	game._wire_soldier(soldier)
	await _wait(0.1)
	soldier.unaware = false
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	return soldier


func _until(animation: StringName, frame: int) -> void:
	for i: int in 120:
		if game.hero.sprite.animation == animation and game.hero.sprite.frame >= frame:
			return
		await process_frame


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
	if not saved:
		await _save_full(full)


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
