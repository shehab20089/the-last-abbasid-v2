extends SceneTree
## Gameplay checks for the hero, driven by scripted input in a physics sandbox: movement, the
## variable jump and coyote time, the light combo and heavy cleave against a dummy, the roll's
## invulnerability, block, parry and riposte, hurt, healing and death; the air slash and the plunge,
## and dropping through planks.
## Run: node tools/run_godot_cli.mjs --headless --fixed-fps 60 --path . --script res://tests/gameplay_test.gd

var passed: int = 0
var failed: int = 0
var sandbox: Node2D
var warrior: Warrior
var dummy: Combatant
var light_1: AttackDefinition = load("res://features/warrior/definitions/light_1.tres")
var heavy: AttackDefinition = load("res://features/warrior/definitions/heavy.tres")


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	await _reset()
	await _test_movement()
	await _test_jumping()
	await _test_combo()
	await _test_heavy()
	await _test_air_moves()
	await _test_drop_through()
	await _test_roll_cut()
	await _test_enders()
	await _test_delayed_cut()
	await _test_charge()
	await _test_running_thrust()
	await _test_second_move_set()
	await _test_no_freeze()
	await _test_move_routing()
	await _test_open_techniques()
	await _test_breath()
	await _test_breath_rules()
	await _test_flash()
	await _test_string_reach()
	await _test_resolve()
	await _test_arts()
	await _test_modifiers()
	await _test_knives()
	await _test_roll()
	await _test_guard()
	await _test_hurt_and_heal()
	await _test_death()
	await _test_real_input()
	print("GAMEPLAY_TEST_COMPLETE passed=%d failed=%d" % [passed, failed])
	# An orderly end (as the traversal's): the sandbox gone and its frees done, the clock and the input at
	# rest, before the engine tears down.
	sandbox.queue_free()
	await process_frame
	await process_frame
	Engine.time_scale = 1.0
	Input.flush_buffered_events()
	OS.delay_msec(200)
	quit(0 if failed == 0 else 1)


func check(condition: bool, label: String) -> void:
	if condition:
		passed += 1
		print("  ok   ", label)
	else:
		failed += 1
		print("  FAIL ", label)


func frames(count: int) -> void:
	for i: int in count:
		await physics_frame


func _reset() -> void:
	if sandbox != null:
		sandbox.queue_free()
		await process_frame
	var scene: PackedScene = load("res://tests/fixtures/sandbox.tscn")
	sandbox = scene.instantiate() as Node2D
	root.add_child(sandbox)
	warrior = sandbox.get_node("Warrior") as Warrior
	warrior.input.enabled = false
	var dummy_scene: PackedScene = load("res://tests/fixtures/dummy.tscn")
	dummy = dummy_scene.instantiate() as Combatant
	sandbox.add_child(dummy)
	dummy.global_position = Vector2(900, 0)
	await frames(20)


func _place_dummy_in_front(distance: float) -> void:
	dummy.global_position = warrior.global_position + Vector2(warrior.facing * distance, 0)
	dummy.set_facing(-warrior.facing)
	dummy.revive(dummy.global_position)
	dummy.set_facing(-warrior.facing)


func _test_movement() -> void:
	print("movement")
	check(warrior.is_on_floor(), "settles on the ground")
	check(absf(warrior.global_position.y) < 1.0, "stands on the ground line")
	var start: float = warrior.global_position.x
	warrior.input.move = 1.0
	await frames(60)
	check(absf(warrior.velocity.x - warrior.profile.run_speed) < 1.0, "runs at run speed")
	check(warrior.global_position.x - start > 120.0, "the run covers ground")
	check(warrior.sprite.animation == &"run", "plays the run")
	check(is_equal_approx(warrior.stamina, warrior.profile.max_stamina), "running costs no stamina")
	warrior.input.move = 0.4
	await frames(40)
	check(absf(warrior.velocity.x - warrior.profile.walk_speed) < 1.0, "a light tilt walks")
	check(warrior.sprite.animation == &"walk", "plays the walk")
	warrior.input.move = -1.0
	await frames(4)
	check(warrior.facing < 0.0, "turns at once")
	warrior.input.move = 0.0
	await frames(30)
	check(absf(warrior.velocity.x) < 0.5, "stops when released")
	check(warrior.sprite.animation == &"idle", "returns to idle")


func _test_jumping() -> void:
	print("jumping")
	await _reset()
	var ground: float = warrior.global_position.y
	warrior.input.jump_held = true
	warrior.input.press(&"jump")
	var apex: float = ground
	for i: int in 70:
		await physics_frame
		apex = minf(apex, warrior.global_position.y)
	var height: float = ground - apex
	check(height > 52.0 and height < 68.0, "a full jump rises about 60 px (%.1f)" % height)
	check(warrior.is_on_floor(), "lands again")
	warrior.input.jump_held = true
	warrior.input.press(&"jump")
	await frames(3)
	warrior.input.jump_held = false
	apex = ground
	for i: int in 60:
		await physics_frame
		apex = minf(apex, warrior.global_position.y)
	check(ground - apex < 36.0, "a tapped jump is a short hop (%.1f)" % (ground - apex))
	# Coyote time: jump just after walking off the ledge.
	warrior.global_position = Vector2(-215, -82)
	warrior.velocity = Vector2.ZERO
	await frames(10)
	check(warrior.is_on_floor(), "stands on the ledge")
	warrior.input.move = 1.0
	var left_ledge: bool = false
	for i: int in 40:
		await physics_frame
		if not warrior.is_on_floor():
			left_ledge = true
			break
	warrior.input.move = 0.0
	await frames(3)
	warrior.input.press(&"jump")
	warrior.input.jump_held = true
	await frames(2)
	check(left_ledge and warrior.velocity.y < -200.0, "coyote time allows a late jump")
	warrior.input.jump_held = false
	await frames(90)
	# A jump pressed just before landing is remembered.
	warrior.global_position = Vector2(100, -40)
	warrior.velocity = Vector2.ZERO
	var buffered: bool = false
	var touched: bool = false
	var rose_again: bool = false
	for i: int in 40:
		await physics_frame
		if warrior.global_position.y > -14.0 and not buffered:
			warrior.input.press(&"jump")
			warrior.input.jump_held = true
			buffered = true
		touched = touched or warrior.is_on_floor()
		rose_again = rose_again or (touched and warrior.velocity.y < -200.0)
	check(buffered and rose_again, "a buffered jump fires on landing")
	warrior.input.jump_held = false
	await frames(90)


func _test_combo() -> void:
	print("light combo")
	await _reset()
	_place_dummy_in_front(34.0)
	var health: float = dummy.health
	warrior.input.press(&"attack")
	await frames(1)
	check(warrior.state == Warrior.State.ATTACK, "attack starts")
	check(warrior.sprite.animation == &"attack_1", "plays the first cut")
	var opened: bool = false
	for i: int in 20:
		await physics_frame
		opened = opened or warrior.hitbox.is_open()
		if warrior.sprite.frame >= 2:
			warrior.input.press(&"attack")
	check(opened, "the blade goes live on its active frames")
	check(dummy.health < health, "the first cut lands (%.0f -> %.0f)" % [health, dummy.health])
	var second: bool = false
	var third: bool = false
	for i: int in 70:
		await physics_frame
		if warrior.sprite.animation == &"attack_2":
			second = true
		if warrior.sprite.animation == &"attack_3":
			third = true
		if warrior.sprite.animation != &"idle" and warrior.sprite.frame >= 2:
			warrior.input.press(&"attack")
	check(second, "a timed press chains the rising cut")
	check(third, "and then the lunging thrust")
	check(dummy.health <= health - 12.0 - 13.0 - 20.0 + 0.1, "every cut of the combo lands once (%.0f)"
		% dummy.health)
	await frames(40)
	check(warrior.state == Warrior.State.IDLE, "the combo ends in the guard stance")


func _test_heavy() -> void:
	print("heavy cleave")
	await _reset()
	_place_dummy_in_front(40.0)
	var health: float = dummy.health
	var stamina: float = warrior.stamina
	warrior.input.press(&"heavy_attack")
	await frames(2)
	check(warrior.stamina <= stamina - heavy.stamina_cost + 0.1, "the cleave costs more stamina")
	await frames(58)
	check(absf(dummy.health - (health - heavy.damage)) < 0.1, "the cleave lands hard (%.0f)" % dummy.health)


## A soldier from the roster `distance` px before the hero, facing him, his brain still.
func _soldier(kind: String, distance: float, health: float = 500.0) -> MongolSoldier:
	var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	soldier.position = warrior.global_position + Vector2(warrior.facing * distance, 0)
	sandbox.add_child(soldier)
	soldier.set_facing(-signf(distance) * warrior.facing)
	(soldier.get_node("Brain") as Node).process_mode = Node.PROCESS_MODE_DISABLED
	soldier.unaware = false
	soldier.max_health = health
	soldier.health = health
	return soldier


## The second move set: the kick ends the light string and throws a man back; down and the light button is
## the low cut, under a raised round shield (not a shield wall); a light cut on a raised shield glances off;
## the heavy button again after the cleave is the rising cleave, then the windmill; on the run the light
## button is the running slash; behind the shield, the guarded thrust (the shield stays up); after a parry,
## the riposte; down and the light button in the air is the down-stab, which springs him off what it strikes.
func _test_second_move_set() -> void:
	print("the second move set")
	# The kick, after the thrust.
	await _reset()
	var soldier: MongolSoldier = _soldier("swordsman", 30.0)
	await frames(4)
	var string: Array[StringName] = []
	warrior.swung.connect(func(attack: AttackDefinition) -> void: string.append(attack.animation))
	var kicked_from: float = 0.0
	for i: int in 4:
		warrior.input.press(&"attack")
		for f: int in 18:
			await physics_frame
			if warrior.current_attack != null and warrior.current_attack.animation == &"attack_4" and kicked_from == 0.0:
				kicked_from = soldier.global_position.x
	await frames(30)
	check(string.size() >= 4 and string[3] == &"attack_4", "the light string's fourth step is the kick (%s)" % [string])
	check(kicked_from != 0.0 and absf(soldier.global_position.x - kicked_from) > 40.0,
		"the kick throws a man back (%.0f px)" % absf(soldier.global_position.x - kicked_from))
	# The low cut, under a raised round shield.
	await _reset()
	soldier = _soldier("swordsman", 30.0)
	await frames(4)
	soldier.guard(10.0)
	var outcomes: Array[HitData.Outcome] = []
	soldier.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.input.down_held = true
	warrior.input.press(&"attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.low_cut, "down and the light button: the low cut")
	await frames(20)
	warrior.input.down_held = false
	check(HitData.Outcome.HIT in outcomes, "it passes under his raised shield (%s)" % [outcomes])
	# Not under a shield wall: there it glances off.
	await _reset()
	var wall: MongolSoldier = _soldier("shieldbearer", 30.0)
	await frames(4)
	outcomes.clear()
	wall.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.input.down_held = true
	warrior.input.press(&"attack")
	await frames(22)
	warrior.input.down_held = false
	check(HitData.Outcome.BLOCKED in outcomes and not HitData.Outcome.HIT in outcomes,
		"a shield wall reaches the street (%s)" % [outcomes])
	# The reaping sweep throws down men off their guard, not one behind a raised shield: going under it is the low
	# cut's job.
	await _reset()
	soldier = _soldier("swordsman", 30.0)
	await frames(4)
	soldier.guard(10.0)
	outcomes.clear()
	soldier.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.input.down_held = true
	warrior.input.press(&"heavy_attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.sweep, "down and the heavy button: the reaping sweep")
	await frames(30)
	warrior.input.down_held = false
	check(HitData.Outcome.BLOCKED in outcomes and not HitData.Outcome.HIT in outcomes,
		"the sweep does not pass a raised shield; the low cut does (%s)" % [outcomes])
	# A cut on a raised shield glances off: the string stops, and the shield can come up at once.
	await _reset()
	soldier = _soldier("swordsman", 30.0)
	await frames(4)
	soldier.guard(10.0)
	var glanced: Array[bool] = [false]
	warrior.glanced.connect(func() -> void: glanced[0] = true)
	warrior.input.press(&"attack")
	for f: int in 24:
		await physics_frame
		if glanced[0]:
			break
	check(glanced[0] and warrior.sprite.animation == &"glance" and warrior.current_attack == null,
		"a cut on a raised shield glances off and the string stops")
	warrior.input.block_held = true
	await frames(2)
	check(warrior.state == Warrior.State.BLOCK, "his own shield comes up at once")
	warrior.input.block_held = false
	# The heavy string.
	await _reset()
	_place_dummy_in_front(36.0)
	var heavies: Array[StringName] = []
	warrior.swung.connect(func(attack: AttackDefinition) -> void: heavies.append(attack.animation))
	warrior.input.press(&"heavy_attack")
	await _plays(&"heavy", 60, heavy.active_from)
	warrior.input.press(&"heavy_attack")
	await _plays(&"heavy_2", 60, 2)
	warrior.input.press(&"heavy_attack")
	await _plays(&"heavy_3", 90, 3)
	await frames(30)
	check(heavies.size() >= 3 and heavies[0] == &"heavy" and heavies[1] == &"heavy_2" and heavies[2] == &"heavy_3",
		"the heavy button again and again: the cleave, the rising cleave, the windmill (%s)" % [heavies])
	# The running slash (at a man ahead).
	await _reset()
	dummy.add_to_group(&"enemies")
	_place_dummy_in_front(150.0)
	var health: float = dummy.health
	warrior.input.move = warrior.facing
	await frames(28)
	warrior.input.press(&"attack")
	await frames(2)
	check(warrior.current_attack == warrior.profile.running_slash, "on the run the light button is the running slash")
	warrior.input.move = 0.0
	await frames(30)
	check(dummy.health < health, "it closes the gap and cuts (%.0f)" % dummy.health)
	# The guarded thrust.
	await _reset()
	_place_dummy_in_front(30.0)
	health = dummy.health
	warrior.input.press(&"block")
	warrior.input.block_held = true
	await frames(12)
	warrior.input.press(&"attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.shield_thrust and warrior.is_guarding(),
		"behind the shield the light button thrusts over its rim, the shield still up")
	var blow: HitData = HitData.from_attack(dummy, light_1)
	check(warrior.judge_hit(blow) == HitData.Outcome.BLOCKED, "a blow from before him still meets the shield")
	await frames(16)
	check(dummy.health < health, "and the point finds the man before him")
	check(warrior.state == Warrior.State.BLOCK, "then the guard again")
	warrior.input.block_held = false
	# The riposte, out of a parry.
	await _reset()
	_place_dummy_in_front(34.0)
	health = dummy.health
	warrior.input.press(&"block")
	warrior.input.block_held = true
	await frames(2)
	check(warrior.receive_hit(HitData.from_attack(dummy, light_1)) == HitData.Outcome.PARRIED, "a blow met in the parry")
	warrior.input.block_held = false
	await frames(6)
	warrior.input.press(&"attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.riposte_attack, "after a parry the light button is the riposte")
	await frames(16)
	check(health - dummy.health > warrior.profile.riposte_attack.damage, "and it lands hard (%.0f)" % (health - dummy.health))
	# The down-stab springs him back up off what it strikes.
	await _reset()
	dummy.global_position = warrior.global_position + Vector2(warrior.facing * 8.0, 0)
	dummy.revive(dummy.global_position)
	warrior.global_position.y -= 104.0
	warrior.velocity = Vector2.ZERO
	await frames(2)
	var bounced: Array[bool] = [false]
	warrior.bounced.connect(func() -> void: bounced[0] = true)
	warrior.input.down_held = true
	warrior.input.press(&"attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.down_stab, "down and the light button in the air: the down-stab")
	for f: int in 40:
		await physics_frame
		if bounced[0]:
			break
	warrior.input.down_held = false
	await frames(2)
	check(bounced[0] and warrior.velocity.y < 0.0 and not warrior.is_on_floor(), "it strikes, and he springs back up")
	warrior.input.press(&"attack")
	await frames(3)
	check(warrior.state == Warrior.State.AIR_ATTACK, "and may slash again")
	# Once a leap off each man: a second down-stab on the same head does not spring him up again.
	bounced[0] = false
	for f: int in 60:
		await physics_frame
		if warrior.state == Warrior.State.AIR and warrior.velocity.y > 0.0:
			break
	warrior.input.down_held = true
	warrior.input.press(&"attack")
	for f: int in 60:
		await physics_frame
		if bounced[0] or warrior.is_on_floor():
			break
	warrior.input.down_held = false
	check(not bounced[0] and warrior.is_on_floor(), "a second down-stab on the same man does not spring him up again")
	await frames(40)
	# The reaping sweep (once taught) throws down the men on both sides of him.
	await _reset()
	warrior.learn(&"sweep")
	var before: MongolSoldier = _soldier("swordsman", 30.0)
	var behind: MongolSoldier = _soldier("swordsman", -30.0)
	await frames(4)
	warrior.input.down_held = true
	warrior.input.press(&"heavy_attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.sweep, "down and the heavy button: the reaping sweep")
	await frames(30)
	warrior.input.down_held = false
	check(before.is_down() and behind.is_down(), "it throws down the men before him and behind him")
	await frames(60)


## A blow met on the shield while it is up for something else never leaves him hanging: in the guarded
## thrust, and in a parry's follow-through when a second man strikes.
func _test_no_freeze() -> void:
	print("no freeze behind the shield")
	await _reset()
	_place_dummy_in_front(30.0)
	warrior.input.press(&"block")
	warrior.input.block_held = true
	await frames(12)
	warrior.input.press(&"attack")
	await frames(2)
	check(warrior.current_attack == warrior.profile.shield_thrust, "the guarded thrust begins")
	check(warrior.receive_hit(HitData.from_attack(dummy, light_1)) == HitData.Outcome.BLOCKED,
		"a blow from before him meets the shield")
	await frames(20)
	check(warrior.state == Warrior.State.BLOCK, "he is back behind his guard, not frozen")
	warrior.input.block_held = false
	await frames(4)
	check(warrior.state == Warrior.State.IDLE, "and lowers it")
	await _reset()
	_place_dummy_in_front(30.0)
	warrior.input.press(&"block")
	warrior.input.block_held = true
	await frames(2)
	check(warrior.receive_hit(HitData.from_attack(dummy, light_1)) == HitData.Outcome.PARRIED, "a blow parried")
	await frames(2)
	warrior.receive_hit(HitData.from_attack(dummy, light_1))
	await frames(30)
	check(warrior.state == Warrior.State.BLOCK or warrior.state == Warrior.State.IDLE,
		"a second blow in the parry leaves him free (%s)" % Warrior.State.keys()[warrior.state])
	warrior.input.block_held = false
	await frames(4)
	warrior.input.press(&"attack")
	await frames(3)
	check(warrior.state == Warrior.State.ATTACK, "and he can strike again")
	await frames(30)


func _test_air_moves() -> void:
	print("in the air")
	await _reset()
	_place_dummy_in_front(34.0)
	var health: float = dummy.health
	warrior.input.press(&"jump")
	warrior.input.jump_held = true
	await frames(8)
	warrior.input.press(&"attack")
	await frames(2)
	check(warrior.state == Warrior.State.AIR_ATTACK, "attack in the air slashes")
	await frames(16)
	check(dummy.health < health, "the air slash finds a man before him (%.0f)" % dummy.health)
	warrior.input.jump_held = false
	# Two slashes in one fall, no more: from high up, three presses, each after the last slash.
	await _reset()
	warrior.global_position.y = -240.0
	warrior.velocity = Vector2.ZERO
	await frames(2)
	var slashes: Array[int] = [0]
	var kinds: Array[StringName] = []
	warrior.swung.connect(func(attack: AttackDefinition) -> void:
		if attack.animation == &"air_attack" or attack.animation == &"air_attack_2":
			slashes[0] += 1
			kinds.append(attack.animation))
	for press: int in 3:
		warrior.input.press(&"attack")
		await frames(14)
	check(not warrior.is_on_floor() and slashes[0] == warrior.profile.air_slashes,
		"two slashes in a fall (%d)" % slashes[0])
	check(kinds.size() == 2 and kinds[0] == &"air_attack" and kinds[1] == &"air_attack_2",
		"a forehand, then a backhand (%s)" % [kinds])
	for i: int in 90:
		await physics_frame
		if warrior.is_on_floor() and warrior.state == Warrior.State.IDLE:
			break
	check(warrior.is_on_floor() and warrior.state == Warrior.State.IDLE, "he lands on his feet")
	# The plunge: from above, the blade down into the man below, then the landing.
	await _reset()
	_place_dummy_in_front(6.0)
	health = dummy.health
	warrior.global_position.y = -100.0
	warrior.velocity = Vector2.ZERO
	await frames(1)
	var stamina: float = warrior.stamina
	warrior.input.press(&"heavy_attack")
	await frames(2)
	check(warrior.state == Warrior.State.PLUNGE and warrior.stamina < stamina, "heavy in the air plunges")
	for i: int in 90:
		await physics_frame
		if warrior.is_on_floor():
			break
	await frames(6)
	check(dummy.health < health, "the plunge strikes the man below (%.0f)" % dummy.health)
	await frames(40)
	check(warrior.state == Warrior.State.IDLE, "he rises from it")


func _test_roll_cut() -> void:
	print("the rolling cut")
	await _reset()
	# Roll through a man, then the light button: up out of the roll, turned on him.
	_place_dummy_in_front(30.0)
	dummy.add_to_group(&"enemies")
	var health: float = dummy.health
	warrior.input.press(&"dodge")
	await frames(16)
	warrior.input.press(&"attack")
	await frames(2)
	check(warrior.current_attack != null and warrior.current_attack.animation == &"roll_cut", "attack late in a roll cuts out of it")
	check(warrior.facing * (dummy.global_position.x - warrior.global_position.x) > 0.0, "turned on the man he rolled past")
	await frames(10)
	check(dummy.health < health, "the rolling cut lands (%.0f)" % dummy.health)
	# The thrust follows it.
	warrior.input.press(&"attack")
	await frames(14)
	check(warrior.current_attack != null and warrior.current_attack.animation == &"attack_3", "the thrust follows the rolling cut")
	await frames(40)
	# Not yet learned: the roll runs its course.
	await _reset()
	warrior.techniques = [&"bash", &"plunge"]
	warrior.input.press(&"dodge")
	await frames(16)
	warrior.input.press(&"attack")
	await frames(2)
	check(warrior.state == Warrior.State.ROLL, "without the technique, the roll runs its course")
	await frames(40)


## Waits up to `limit` physics frames for the hero to play `animation` (from `frame` on); true if he did.
func _plays(animation: StringName, limit: int, frame: int = 0) -> bool:
	for i: int in limit:
		if warrior.sprite.animation == animation and warrior.sprite.frame >= frame:
			return true
		await physics_frame
	return warrior.sprite.animation == animation and warrior.sprite.frame >= frame


func _test_enders() -> void:
	print("the enders")
	var seen: bool = false
	# The cut, then heavy while its blade is live: the pommel strike; the light button carries on from it.
	await _reset()
	_place_dummy_in_front(34.0)
	var health: float = dummy.health
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 20, 2)
	warrior.input.press(&"heavy_attack")
	seen = await _plays(&"pommel_strike", 30)
	check(seen, "heavy after the cut is the pommel strike")
	await _plays(&"pommel_strike", 20, 1)
	warrior.input.press(&"attack")
	seen = await _plays(&"attack_2", 30)
	check(seen, "and the rising cut follows the pommel strike")
	await frames(30)
	check(dummy.health <= health - 12.0 - 6.0 - 13.0 + 0.1, "cut, pommel and rising cut all land (%.0f)" % dummy.health)
	# The rising cut, then heavy: the whirling cut, which strikes behind him as well as before.
	await _reset()
	_place_dummy_in_front(34.0)
	var behind: Combatant = (load("res://tests/fixtures/dummy.tscn") as PackedScene).instantiate() as Combatant
	sandbox.add_child(behind)
	behind.global_position = warrior.global_position - Vector2(warrior.facing * 30.0, 0)
	var behind_health: float = behind.health
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 20, 2)
	warrior.input.press(&"attack")
	await _plays(&"attack_2", 30, 2)
	warrior.input.press(&"heavy_attack")
	seen = await _plays(&"whirling_cut", 30)
	check(seen, "heavy after the rising cut is the whirling cut")
	await frames(20)
	check(behind.health < behind_health, "the whirling cut strikes the man behind him (%.0f)" % behind.health)
	check(behind.velocity.x * warrior.facing < 0.0, "and throws him away on his own side")
	await frames(30)
	# The thrust, then heavy: the executioner's cleave.
	await _reset()
	_place_dummy_in_front(34.0)
	health = dummy.health
	for step: StringName in [&"attack_1", &"attack_2"]:
		warrior.input.press(&"attack")
		await _plays(step, 30, 2)
	warrior.input.press(&"attack")
	await _plays(&"attack_3", 30, 2)
	warrior.input.press(&"heavy_attack")
	seen = await _plays(&"executioner", 30)
	check(seen, "heavy after the thrust is the executioner's cleave")
	await frames(30)
	check(dummy.health <= health - 12.0 - 13.0 - 20.0 - 38.0 + 0.1, "the whole string lands (%.0f)" % dummy.health)
	await frames(30)
	# Not yet learned: heavy after a cut is the plain cleave, as it always was.
	await _reset()
	warrior.set_techniques([&"bash"])
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 20, 2)
	warrior.input.press(&"heavy_attack")
	seen = await _plays(&"heavy", 30)
	check(seen, "without the ender, heavy after the cut cleaves")
	await frames(40)


func _test_delayed_cut() -> void:
	print("the delayed cut")
	var seen: bool = false
	await _reset()
	_place_dummy_in_front(34.0)
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 20, 2)
	warrior.input.press(&"attack")
	await _plays(&"attack_2", 30)
	# Let the rising cut run out, then a beat, then the light button.
	for i: int in 60:
		await physics_frame
		if warrior.state == Warrior.State.IDLE:
			break
	await frames(8)
	warrior.input.press(&"attack")
	seen = await _plays(&"delayed_cut", 4)
	check(seen, "a beat after the rising cut, the light button is the delayed cut")
	await _plays(&"delayed_cut", 20, 2)
	warrior.input.press(&"attack")
	seen = await _plays(&"attack_3", 40)
	check(seen, "and the thrust follows it")
	await frames(40)
	# Too long a pause and the string has ended: a plain cut.
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 20, 2)
	warrior.input.press(&"attack")
	await _plays(&"attack_2", 30)
	for i: int in 60:
		await physics_frame
		if warrior.state == Warrior.State.IDLE:
			break
	await frames(40)
	warrior.input.press(&"attack")
	seen = await _plays(&"attack_1", 4)
	check(seen, "after a long pause the light button cuts afresh")
	await frames(40)


func _test_charge() -> void:
	print("the charged cleave")
	var charged: Array[AttackDefinition] = warrior.profile.charged_cleaves
	await _reset()
	_place_dummy_in_front(40.0)
	var levels: Array[int] = []
	warrior.charge_changed.connect(func(level: int) -> void: levels.append(level))
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	for i: int in 30:
		await physics_frame
		if warrior.state == Warrior.State.CHARGE:
			break
	check(warrior.state == Warrior.State.CHARGE and warrior.sprite.animation == &"charge_hold",
		"held, the cleave's raised blade waits")
	var stamina: float = warrior.stamina
	await frames(int(warrior.profile.charge_times.x * 60.0) + 4)
	check(warrior.charge_level == 2, "and grows to the second level")
	check(warrior.stamina == stamina, "no breath comes back while he holds it")
	await frames(int((warrior.profile.charge_times.y - warrior.profile.charge_times.x) * 60.0) + 2)
	check(warrior.charge_level == 3, "and to the third")
	var health: float = dummy.health
	warrior.input.heavy_held = false
	await frames(2)
	check(warrior.current_attack == charged[1], "let go, the full charged cleave falls")
	await frames(30)
	check(absf(dummy.health - (health - charged[1].damage)) < 0.1, "and lands its full weight (%.0f)" % dummy.health)
	var last: int = levels.back() if not levels.is_empty() else -1
	check(levels.has(1) and levels.has(2) and levels.has(3) and last == 0, "each level is told, then the release")
	await frames(30)
	# Let go early: the plain cleave, picked up where it was held.
	await _reset()
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	await frames(16)
	warrior.input.heavy_held = false
	await frames(2)
	check(warrior.current_attack == warrior.profile.heavy and warrior.sprite.frame > warrior.profile.charge_frame,
		"let go early, it is the plain cleave")
	await frames(40)
	# The second level.
	await _reset()
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	await frames(16 + int(warrior.profile.charge_times.x * 60.0) + 2)
	warrior.input.heavy_held = false
	await frames(2)
	check(warrior.current_attack == charged[0], "let go at the second level, the charged cleave")
	await frames(40)
	# A blow breaks the charge off.
	await _reset()
	_place_dummy_in_front(30.0)
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	await frames(16)
	dummy.begin_attack(light_1)
	await frames(14)
	check(warrior.state == Warrior.State.HURT and warrior.charge_level == 0, "a blow breaks the charge off")
	warrior.input.heavy_held = false
	await frames(40)
	# A roll breaks it off too.
	await _reset()
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	await frames(16)
	warrior.input.press(&"dodge")
	await frames(2)
	check(warrior.state == Warrior.State.ROLL, "a roll breaks the charge off")
	warrior.input.heavy_held = false
	await frames(40)
	# By toggle (a setting): one press raises and holds the blade, the next lets it go; two quick presses cleave.
	await _reset()
	warrior.charge_toggle = true
	warrior.input.press(&"heavy_attack")
	await frames(16 + int(warrior.profile.charge_times.x * 60.0) + 2)
	check(warrior.state == Warrior.State.CHARGE and warrior.charge_level == 2, "by toggle, one press holds the blade back")
	warrior.input.press(&"heavy_attack")
	await frames(2)
	check(warrior.current_attack == charged[0], "and the next lets the charged cleave go")
	await frames(40)
	warrior.input.press(&"heavy_attack")
	await frames(3)
	warrior.input.press(&"heavy_attack")
	await frames(20)
	check(warrior.state == Warrior.State.ATTACK and warrior.current_attack == warrior.profile.heavy,
		"two quick presses are the plain cleave (%s, %s)" % [Warrior.State.keys()[warrior.state], warrior.sprite.animation])
	warrior.charge_toggle = false
	await frames(40)
	# Not learned: held or not, the plain cleave.
	await _reset()
	warrior.set_techniques([&"bash"])
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	await frames(20)
	check(warrior.state == Warrior.State.ATTACK and warrior.current_attack == warrior.profile.heavy,
		"before he has learned it, a held cleave simply falls")
	warrior.input.heavy_held = false
	await frames(40)


func _test_running_thrust() -> void:
	print("the running thrust")
	await _reset()
	dummy.add_to_group(&"enemies")
	warrior.input.move = 1.0
	await frames(24)
	_place_dummy_in_front(150.0)
	warrior.input.press(&"heavy_attack")
	await frames(1)
	warrior.input.move = 0.0
	check(warrior.current_attack == warrior.profile.running_thrust, "heavy on the run at a man is the running thrust")
	# (He is moved out of the way, so the dash is measured whole.)
	_place_dummy_in_front(-400.0)
	var from: float = warrior.global_position.x
	await frames(40)
	var dash: float = warrior.global_position.x - from
	check(dash > 90.0 and dash < 135.0, "it dashes about 110 px (%.0f)" % dash)
	# On an empty street, the run's heavy button is the cleave.
	await _reset()
	warrior.input.move = 1.0
	await frames(24)
	warrior.input.press(&"heavy_attack")
	await frames(1)
	warrior.input.move = 0.0
	check(warrior.current_attack == warrior.profile.heavy, "with no man ahead, heavy on the run is the cleave")
	await frames(50)
	# It stops in the first man it meets.
	await _reset()
	dummy.add_to_group(&"enemies")
	_place_dummy_in_front(90.0)
	var health: float = dummy.health
	warrior.input.move = 1.0
	await frames(18)
	warrior.input.press(&"heavy_attack")
	await frames(1)
	warrior.input.move = 0.0
	await frames(40)
	check(dummy.health < health, "the point finds him (%.0f)" % dummy.health)
	check(dummy.global_position.x - warrior.global_position.x > 8.0, "and the dash ends in him, not through him")
	# Standing, heavy is the cleave.
	await _reset()
	warrior.input.press(&"heavy_attack")
	await frames(2)
	check(warrior.current_attack == warrior.profile.heavy, "standing, heavy is the cleave")
	await frames(40)


## What he has not learned the buttons do not make (the plain move instead); a press during any blow is
## kept for when it gives way; a beat after a step of the string the light button still carries it on;
## down and the light button in a cut's live frames makes the low cut next; the run's blows only at a man
## ahead; the riposte's force belongs to the riposte alone.
func _test_move_routing() -> void:
	print("move routing")
	var none: Array[StringName] = []
	var swung: Array[StringName] = []
	var record: Callable = func(attack: AttackDefinition) -> void: swung.append(attack.animation)
	# Not learned: the kick. After the thrust the string starts again.
	await _reset()
	warrior.set_techniques(none)
	warrior.swung.connect(record)
	for i: int in 4:
		warrior.input.press(&"attack")
		for f: int in 18:
			await physics_frame
	await frames(40)
	check(swung.size() >= 4 and swung[3] == &"attack_1",
		"the kick not learned, the string starts again after the thrust (%s)" % [swung])
	# Not learned: the low cut, the guarded thrust, the rising cleave.
	await _reset()
	warrior.set_techniques(none)
	swung.clear()
	warrior.swung.connect(record)
	warrior.input.down_held = true
	warrior.input.press(&"attack")
	await frames(3)
	warrior.input.down_held = false
	check(warrior.current_attack == warrior.profile.combo[0], "the low cut not learned, down and the light button is the cut")
	await frames(50)
	warrior.input.block_held = true
	await frames(8)
	warrior.input.press(&"attack")
	await frames(3)
	warrior.input.block_held = false
	check(warrior.current_attack == warrior.profile.combo[0],
		"the guarded thrust not learned, the light button behind the shield is the cut")
	await frames(50)
	swung.clear()
	warrior.input.press(&"heavy_attack")
	await frames(10)
	warrior.input.press(&"heavy_attack")
	await frames(60)
	check(not &"heavy_2" in swung, "the rising cleave not learned, the heavy button again is not it (%s)" % [swung])
	await frames(40)
	# Not learned: the down-stab. Down and the light button in the air is the slash.
	await _reset()
	warrior.set_techniques(none)
	warrior.input.press(&"jump")
	await frames(10)
	warrior.input.down_held = true
	warrior.input.press(&"attack")
	await frames(3)
	warrior.input.down_held = false
	check(warrior.current_attack == warrior.profile.air_attack,
		"the down-stab not learned, down and the light button in the air is the slash")
	await frames(60)
	# A beat after a cut ends, the light button still carries the string on; long after, it starts again.
	await _reset()
	warrior.input.press(&"attack")
	for f: int in 90:
		await physics_frame
		if warrior.state != Warrior.State.ATTACK:
			break
	await frames(6)
	warrior.input.press(&"attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.combo[1], "a beat after the cut ends, the light button is the rising cut")
	await frames(70)
	warrior.input.press(&"attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.combo[0], "long after, it starts the string again")
	await frames(50)
	# A light press in the cleave's live frames is kept: the cut follows as the cleave gives way.
	await _reset()
	warrior.input.press(&"heavy_attack")
	await _plays(&"heavy", 60, warrior.profile.heavy.active_from)
	warrior.input.press(&"attack")
	await frames(2)
	var kept: bool = warrior._queued_attack == warrior.profile.combo[0]
	await _plays(&"attack_1", 60)
	check(kept and warrior.current_attack == warrior.profile.combo[0],
		"a light press in the cleave's live frames is kept, and the cut follows")
	await frames(50)
	# Down and the light button in a cut's live frames: the low cut is next.
	await _reset()
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 30, warrior.profile.combo[0].active_from)
	warrior.input.down_held = true
	warrior.input.press(&"attack")
	await frames(2)
	warrior.input.down_held = false
	var next: AttackDefinition = warrior._queued_attack
	await frames(40)
	check(next == warrior.profile.low_cut, "down and the light button in a cut's live frames: the low cut follows")
	await frames(40)
	# On an empty street the light button on the run is the cut.
	await _reset()
	warrior.input.move = warrior.facing
	await frames(28)
	warrior.input.press(&"attack")
	await frames(2)
	warrior.input.move = 0.0
	check(warrior.current_attack == warrior.profile.combo[0], "with no man ahead, the light button on the run is the cut")
	await frames(40)
	# In the riposte's moment only the riposte strikes as one.
	await _reset()
	warrior._riposte = 1.0
	var plain: HitData = warrior.build_hit(warrior.profile.heavy)
	var riposte: HitData = warrior.build_hit(warrior.profile.riposte_attack)
	check(not plain.riposte and riposte.riposte, "in the riposte's moment, only the riposte carries its force")
	warrior._riposte = 0.0
	await frames(10)


## What the buttons would make of the moment (a coach names it), and each learned move counted as used.
func _test_open_techniques() -> void:
	print("open techniques")
	await _reset()
	var used: Array[StringName] = []
	warrior.technique_used.connect(func(technique: StringName) -> void: used.append(technique))
	check(warrior.open_techniques().is_empty(), "standing still, nothing is open")
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 20, 1)
	check(&"pommel" in warrior.open_techniques(), "while the cut plays, the heavy button is the pommel strike")
	warrior.input.press(&"heavy_attack")
	await _plays(&"pommel_strike", 30)
	check(used.size() == 1 and used[0] == &"pommel", "and making it counts a use of the pommel strike (%s)" % [used])
	await frames(40)
	# Not learned, not named.
	var all: Array[StringName] = warrior.techniques.duplicate()
	warrior.techniques = [&"bash"]
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 20, 1)
	check(not &"pommel" in warrior.open_techniques(), "a move not yet learned is never named")
	await frames(40)
	warrior.techniques = all
	# A run with no soldier near is only a run.
	warrior.input.move = 1.0
	await frames(24)
	check(not &"running_thrust" in warrior.open_techniques(), "with no soldier near, a run is not named a thrust")
	warrior.input.move = 0.0
	await frames(30)
	# With one ahead: on the run, the running thrust; behind the shield, the bash; late in a roll, the
	# rolling cut.
	dummy.add_to_group(&"enemies")
	_place_dummy_in_front(170.0)
	warrior.input.move = 1.0
	await frames(24)
	check(&"running_thrust" in warrior.open_techniques(), "on the run toward a soldier, the running thrust is open")
	warrior.input.move = 0.0
	await frames(30)
	warrior.input.block_held = true
	await frames(20)
	check(&"bash" in warrior.open_techniques(), "behind the shield, the bash is open")
	warrior.input.block_held = false
	await frames(10)
	warrior.input.press(&"dodge")
	var late: bool = false
	for i: int in 30:
		await physics_frame
		if &"roll_cut" in warrior.open_techniques():
			late = true
			break
	check(late, "late in a roll, the rolling cut is open")
	await frames(40)
	# As the cleave's blade rises, the charge.
	warrior.input.press(&"heavy_attack")
	await frames(2)
	check(&"charge" in warrior.open_techniques(), "as the cleave begins, holding it is open")
	await frames(60)
	dummy.remove_from_group(&"enemies")


## Breath: what a cut costs and a landed one gives back, the steady breath in a blow's glint, a close call
## in a roll, a parry's breath, and an action refused with none left.
func _test_breath() -> void:
	print("breath")
	await _reset()
	_place_dummy_in_front(34.0)
	var events: Array[StringName] = []
	warrior.breath_glint.connect(func() -> void: events.append(&"glint"))
	warrior.steady_breath.connect(func() -> void: events.append(&"steady"))
	warrior.close_call.connect(func(_hit: HitData) -> void: events.append(&"close_call"))
	warrior.breath_refused.connect(func() -> void: events.append(&"refused"))
	var full: float = warrior.stamina
	var health: float = dummy.health
	warrior.input.press(&"attack")
	await frames(2)
	check(is_equal_approx(warrior.stamina, full - light_1.stamina_cost), "a cut costs %.0f breath" % light_1.stamina_cost)
	for i: int in 20:
		await physics_frame
		if dummy.health < health:
			break
	await frames(1)
	check(is_equal_approx(warrior.stamina, full - light_1.stamina_cost + light_1.breath_gain),
		"and gives %.0f back when it lands (%.1f)" % [light_1.breath_gain, warrior.stamina])
	await frames(40)
	# The steady breath: the shield raised in the glint as a blow ends.
	await _reset()
	events.clear()
	warrior.breath_glint.connect(func() -> void: events.append(&"glint"))
	warrior.steady_breath.connect(func() -> void: events.append(&"steady"))
	warrior.close_call.connect(func(_hit: HitData) -> void: events.append(&"close_call"))
	warrior.breath_refused.connect(func() -> void: events.append(&"refused"))
	# A cut swung at the air gives no glint: the breath is earned on a man.
	warrior.stamina = 40.0
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 30, light_1.recovery_from)
	await physics_frame
	check(not &"glint" in events, "a cut swung at the air gives no glint")
	await frames(50)
	_place_dummy_in_front(34.0)
	warrior.stamina = 40.0
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 30, light_1.recovery_from)
	await physics_frame
	check(&"glint" in events, "as the live frames of a cut that met a man end, steel glints")
	warrior.input.press(&"block")
	warrior.input.block_held = true
	await frames(2)
	var expected: float = (40.0 - light_1.stamina_cost + light_1.breath_gain - warrior.profile.parry_cost
		+ warrior.profile.steady_breath)
	check(&"steady" in events and warrior.state == Warrior.State.BLOCK,
		"the shield raised in the glint draws breath and takes the guard")
	check(absf(warrior.stamina - expected) < 1.0, "breath drawn (%.1f, %.1f)" % [warrior.stamina, expected])
	warrior.input.block_held = false
	await frames(30)
	# Too late, no breath: the glint has passed.
	events.clear()
	warrior.stamina = 40.0
	warrior.input.press(&"attack")
	await _plays(&"attack_1", 30, light_1.recovery_from + 3)
	await frames(6)
	warrior.input.press(&"block")
	warrior.input.block_held = true
	await frames(2)
	check(not &"steady" in events, "raised after the glint, the shield draws no breath")
	warrior.input.block_held = false
	await frames(30)
	# A parry gives breath.
	_place_dummy_in_front(30.0)
	warrior.stamina = 50.0
	dummy.begin_attack(light_1)
	await frames(4)
	warrior.input.block_held = true
	await frames(12)
	warrior.input.block_held = false
	check(warrior.stamina >= 50.0 - warrior.profile.parry_cost + warrior.profile.parry_breath - 0.5,
		"a parry gives breath back (%.1f)" % warrior.stamina)
	await frames(60)
	# A close call: rolled just as the blow came.
	await _reset()
	events.clear()
	warrior.close_call.connect(func(_hit: HitData) -> void: events.append(&"close_call"))
	warrior.breath_refused.connect(func() -> void: events.append(&"refused"))
	_place_dummy_in_front(30.0)
	warrior.stamina = 50.0
	dummy.begin_attack(light_1)
	await frames(3)
	warrior.input.press(&"dodge")
	await frames(20)
	check(&"close_call" in events, "rolled just as the blow came: a close call")
	check(warrior.stamina >= 50.0 - warrior.profile.roll_cost + warrior.profile.close_call_breath - 1.0,
		"it gives breath back (%.1f)" % warrior.stamina)
	check(warrior.riposte_ready(), "and the next blow is a counter")
	await frames(60)
	# Rolled too early, the blow finds nothing to slip: no close call.
	await _reset()
	events.clear()
	warrior.close_call.connect(func(_hit: HitData) -> void: events.append(&"close_call"))
	warrior.breath_refused.connect(func() -> void: events.append(&"refused"))
	_place_dummy_in_front(60.0)
	warrior.input.press(&"dodge")
	await frames(16)
	dummy.begin_attack(light_1)
	await frames(30)
	check(not &"close_call" in events, "a roll thrown early is no close call")
	await frames(30)
	# With no breath at all, a cut is refused, and he gasps.
	warrior.stamina = 0.0
	warrior.input.press(&"attack")
	await frames(2)
	check(warrior.state != Warrior.State.ATTACK and &"refused" in events, "with no breath left, a cut is refused")
	await frames(60)


## The light string lands all its blows on a man giving ground (the rising cut and the thrust reach for
## him), and no soldier starts a blow on a hero struck a moment ago (EnemyBrain.BREATHER).
func _test_string_reach() -> void:
	print("the string's reach")
	await _reset()
	var soldier: MongolSoldier = _soldier("swordsman", 30.0)
	soldier.max_poise = 900.0
	soldier.poise = 900.0
	await frames(4)
	var hits: Array[int] = [0]
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void:
		if outcome == HitData.Outcome.HIT:
			hits[0] += 1)
	soldier.move_intent = warrior.facing
	for i: int in 3:
		warrior.input.press(&"attack")
		for f: int in 18:
			await physics_frame
	await frames(30)
	soldier.move_intent = 0.0
	check(hits[0] >= 3, "the string lands all three blows on a man giving ground (%d)" % hits[0])
	var brain: EnemyBrain = soldier.get_node("Brain") as EnemyBrain
	brain.target = warrior
	brain._cooldown = 0.0
	warrior._since_hurt = EnemyBrain.BREATHER * 0.5
	var struck_too_soon: bool = brain.try_attack(soldier.profile.attacks[SwordsmanBrain.CUT])
	warrior._since_hurt = EnemyBrain.BREATHER + 0.1
	soldier.global_position = warrior.global_position + Vector2(warrior.facing * 34.0, 0.0)
	await frames(2)
	var struck_after: bool = brain.try_attack(soldier.profile.attacks[SwordsmanBrain.CUT])
	check(not struck_too_soon and struck_after, "no blow starts on a hero struck a moment ago, one does after")
	await frames(60)


## A hit's flash is a blink in real time, not held white through a hit-stop.
func _test_flash() -> void:
	print("the flash")
	await _reset()
	Engine.time_scale = 0.05
	dummy.flash(1.0)
	await frames(8)
	var left: float = dummy._flash
	Engine.time_scale = 1.0
	check(left <= 0.0, "in a hit-stop's slow time, a hit's flash is gone within a blink of real time (%.2f)" % left)


func _test_breath_rules() -> void:
	print("breath rules")
	await _reset()
	var refused: Array[bool] = [false]
	var winded: Array[bool] = [false]
	warrior.breath_refused.connect(func() -> void: refused[0] = true)
	warrior.winded.connect(func() -> void: winded[0] = true)
	warrior.stamina = light_1.stamina_cost - 2.0
	warrior.input.press(&"attack")
	await frames(3)
	check(refused[0] and warrior.state != Warrior.State.ATTACK, "a cut he has not the breath for is refused")
	warrior.input.press(&"dodge")
	await frames(3)
	check(warrior.state == Warrior.State.ROLL, "but a roll needs only a breath left")
	check(winded[0] and warrior.stamina <= 0.0, "and with it his breath runs out (winded)")
	await frames(60)
	# A tap of the shield opens the parry's window; tapped again at once, it does not open again.
	await _reset()
	warrior.input.block_held = true
	await frames(2)
	var first: bool = warrior._parry_window > 0.0
	warrior.input.block_held = false
	await frames(2)
	warrior.input.block_held = true
	await frames(2)
	check(first and warrior._parry_window <= 0.0, "tapped twice at once, the shield parries only on the first")
	warrior.input.block_held = false
	await frames(50)
	warrior.input.block_held = true
	await frames(2)
	check(warrior._parry_window > 0.0, "a moment later it parries again")
	warrior.input.block_held = false
	await frames(10)


func _test_resolve() -> void:
	print("resolve")
	await _reset()
	check(warrior.has_resolve() and warrior.resolve == 0.0, "he starts a fight with no resolve")
	_place_dummy_in_front(34.0)
	warrior.input.press(&"attack")
	await frames(14)
	check(is_equal_approx(warrior.resolve, light_1.resolve_gain), "a cut that lands earns resolve (%.0f)" % warrior.resolve)
	await frames(30)
	# A parry earns more, a blow taken costs.
	var before: float = warrior.resolve
	dummy.begin_attack(light_1)
	await frames(4)
	warrior.input.block_held = true
	await frames(20)
	warrior.input.block_held = false
	check(warrior.resolve >= before + warrior.profile.resolve_parry - 0.1, "a parry earns resolve (%.0f)" % warrior.resolve)
	await frames(40)
	before = warrior.resolve
	_place_dummy_in_front(30.0)
	dummy.begin_attack(light_1)
	await frames(14)
	check(warrior.resolve <= before - warrior.profile.resolve_hurt + 0.1, "a blow taken drains it (%.0f)" % warrior.resolve)
	await frames(40)
	# Out of the fight, what is above half ebbs back to half; half is kept.
	warrior.set_resolve(100.0)
	await frames(int((warrior.profile.resolve_idle + 3.0) * 60.0))
	check(warrior.resolve < 100.0 and warrior.resolve >= warrior.profile.resolve_kept, "out of the fight it ebbs to half (%.0f)"
		% warrior.resolve)
	warrior.set_resolve(30.0)
	await frames(int(warrior.profile.resolve_idle * 60.0) + 30)
	check(is_equal_approx(warrior.resolve, 30.0), "below half, it is kept")
	# Before he knows an Art there is no meter to fill.
	await _reset()
	warrior.set_techniques([&"bash"])
	_place_dummy_in_front(34.0)
	warrior.input.press(&"attack")
	await frames(14)
	check(not warrior.has_resolve() and warrior.resolve == 0.0, "without an Art, no resolve gathers")
	await frames(30)


func _test_arts() -> void:
	print("the Arts")
	var storm: ArtDefinition = warrior.profile.arts[0]
	# The Storm of Blades: paid from resolve, strikes on both sides again and again, and no blow stops it.
	await _reset()
	warrior.art_slots = [&"storm", &"pierce"]
	_place_dummy_in_front(34.0)
	var behind: Combatant = (load("res://tests/fixtures/dummy.tscn") as PackedScene).instantiate() as Combatant
	sandbox.add_child(behind)
	behind.global_position = warrior.global_position - Vector2(warrior.facing * 34.0, 0)
	var healths: Array[float] = [dummy.health, behind.health]
	warrior.set_resolve(60.0)
	var started: Array[StringName] = []
	warrior.art_started.connect(func(art: ArtDefinition) -> void: started.append(art.id))
	warrior.input.press(&"art")
	await frames(2)
	check(warrior.state == Warrior.State.ART and started == [&"storm"], "the art button lets the Storm of Blades loose")
	check(is_equal_approx(warrior.resolve, 60.0 - storm.cost), "it is paid for in resolve (%.0f)" % warrior.resolve)
	await frames(10)
	dummy.begin_attack(light_1)
	await frames(10)
	check(warrior.state == Warrior.State.ART, "a blow does not stop him while he turns")
	var burst: Array[bool] = [false]
	for i: int in 150:
		await physics_frame
		if warrior.sprite.animation == &"art_storm_burst":
			burst[0] = true
		if warrior.state != Warrior.State.ART:
			break
	check(healths[0] - dummy.health >= 30.0 and healths[1] - behind.health >= 30.0,
		"it cuts the men on both sides again and again (%.0f, %.0f)" % [healths[0] - dummy.health, healths[1] - behind.health])
	check(burst[0], "and ends in the rising cut that throws them down")
	check(warrior.state == Warrior.State.IDLE, "and he comes back to his guard")
	behind.queue_free()
	# Without the resolve, nothing.
	await _reset()
	warrior.art_slots = [&"storm"]
	warrior.set_resolve(20.0)
	var refused: Array[bool] = [false]
	warrior.art_refused.connect(func(_art: ArtDefinition) -> void: refused[0] = true)
	warrior.input.press(&"art")
	await frames(2)
	check(refused[0] and warrior.state != Warrior.State.ART and warrior.resolve == 20.0, "without the resolve, the Art is refused")
	# The Piercing Line on the second Art: behind the shield, the art button; through a man, untouchable.
	await _reset()
	warrior.art_slots = [&"storm", &"pierce"]
	warrior.set_resolve(50.0)
	_place_dummy_in_front(50.0)
	var health: float = dummy.health
	var start: float = warrior.global_position.x
	warrior.input.block_held = true
	await frames(6)
	warrior.input.press(&"art")
	await frames(3)
	warrior.input.block_held = false
	check(warrior.state == Warrior.State.ART and warrior.current_attack != null
		and warrior.current_attack.animation == &"art_pierce", "behind the shield, the art button is the second Art")
	await frames(4)
	check(warrior.is_invulnerable(), "no blow touches him in the dash")
	await frames(40)
	check(warrior.global_position.x - start > 110.0, "he dashes through (%.0f px)" % (warrior.global_position.x - start))
	check(dummy.health < health and warrior.global_position.x > dummy.global_position.x, "cutting the man he passes")
	# The Naft Flask: a flask thrown, and fire where it breaks that burns anyone.
	await _reset()
	warrior.art_slots = [&"naft"]
	warrior.set_resolve(50.0)
	var flasks: Array[Node2D] = []
	warrior.thrown.connect(func(flask: Node2D) -> void: flasks.append(flask))
	warrior.input.press(&"art")
	await frames(40)
	check(flasks.size() == 1 and flasks[0] is FirePot, "the Naft Flask is thrown")
	await frames(30)
	var fires: Array[Node] = root.get_tree().get_nodes_in_group(&"hazards")
	var burning: BurningGround = fires[0] as BurningGround if not fires.is_empty() else null
	check(burning != null and burning.burns_team == -1, "where it breaks, fire that burns anyone")
	for fire: Node in fires:
		fire.queue_free()
	# The Second Wind: blood and breath back, then blows that cost nothing and light blows that do not stop him.
	await _reset()
	warrior.art_slots = [&"second_wind"]
	warrior.set_resolve(100.0)
	warrior.take_damage(50.0)
	warrior.stamina = 10.0
	warrior.input.press(&"art")
	await frames(40)
	check(warrior.health >= warrior.max_health - 50.0 + 24.0 and warrior.stamina >= warrior.profile.max_stamina - 1.0,
		"the Second Wind gives back blood and breath")
	check(warrior.is_steeled() and warrior.resolve == 0.0, "it takes a full bar, and he is steeled")
	await frames(20)
	var stamina: float = warrior.stamina
	warrior.input.press(&"heavy_attack")
	await frames(4)
	check(warrior.stamina == stamina, "while it holds, his blows cost nothing")
	await frames(50)
	_place_dummy_in_front(30.0)
	dummy.begin_attack(light_1)
	await frames(14)
	check(warrior.state != Warrior.State.HURT and warrior.health < warrior.max_health, "a light blow wounds him but does not stop him")
	await frames(30)


## What the techniques bought and the keepsakes worn do to him.
func _test_modifiers() -> void:
	print("growth")
	await _reset()
	var mods: Modifiers = Modifiers.new()
	mods.block_cost = 0.5
	mods.extra_knives = 2
	mods.remedy_heal = 15.0
	mods.hurt_time = 0.5
	warrior.set_modifiers(mods)
	check(warrior.knives == warrior.profile.max_knives + 2, "the bandolier carries more knives")
	check(is_equal_approx(warrior._guard_cost(HitData.from_attack(dummy, light_1)), light_1.stamina_damage * 0.5),
		"a steady guard spends less on a blow")
	warrior.take_damage(70.0)
	var health: float = warrior.health
	warrior.input.press(&"heal")
	await frames(70)
	check(is_equal_approx(warrior.health - health, warrior.profile.remedy_heal + 15.0), "the red thread heals more")
	# A blow leaves him reeling half as long.
	await _reset()
	warrior.set_modifiers(mods)
	_place_dummy_in_front(30.0)
	dummy.begin_attack(light_1)
	var hurt_frames: int = 0
	for i: int in 60:
		await physics_frame
		if warrior.state == Warrior.State.HURT:
			hurt_frames += 1
	check(hurt_frames > 0 and hurt_frames < int(warrior.profile.hurt_time * 60.0 * 0.7),
		"iron will: he reels a shorter while (%d frames)" % hurt_frames)
	await frames(30)


func _test_knives() -> void:
	print("throwing knives")
	await _reset()
	_place_dummy_in_front(120.0)
	check(warrior.knives == warrior.profile.max_knives, "he carries %d knives" % warrior.profile.max_knives)
	var health: float = dummy.health
	warrior.input.press(&"throw")
	await frames(3)
	check(warrior.state == Warrior.State.THROW, "the throw button throws")
	await frames(30)
	check(dummy.health < health, "the knife strikes a man at a distance (%.0f)" % dummy.health)
	check(warrior.knives == warrior.profile.max_knives - 1, "one knife fewer")
	warrior.knives = 0
	warrior.input.press(&"throw")
	await frames(3)
	check(warrior.state != Warrior.State.THROW, "with none left, nothing is thrown")
	warrior.rest()
	check(warrior.knives == warrior.profile.max_knives, "a lamp refills them")
	warrior.set_techniques([&"bash"])
	check(warrior.knives == 0, "before he has them, he carries none")
	warrior.learn(&"knives")
	check(warrior.knives == warrior.profile.max_knives, "the gift comes full")
	await frames(20)


func _test_drop_through() -> void:
	print("dropping through planks")
	await _reset()
	# The sandbox's planks: a one-way platform whose top is 60 px up.
	warrior.global_position = Vector2(560, -72)
	await frames(30)
	check(warrior.is_on_floor() and warrior.global_position.y < -55.0, "he stands on the planks")
	warrior.input.down_held = true
	warrior.input.press(&"jump")
	await frames(45)
	warrior.input.down_held = false
	check(warrior.is_on_floor() and absf(warrior.global_position.y) < 2.0, "down and jump drop him through them")
	# On solid ground, down and jump is a jump.
	warrior.input.down_held = true
	warrior.input.press(&"jump")
	warrior.input.jump_held = true
	await frames(10)
	check(warrior.global_position.y < -20.0, "on solid ground it is a jump")
	warrior.input.down_held = false
	warrior.input.jump_held = false
	await frames(60)


func _test_roll() -> void:
	print("dodge roll")
	await _reset()
	var start: float = warrior.global_position.x
	warrior.input.press(&"dodge")
	await frames(2)
	check(warrior.state == Warrior.State.ROLL, "the roll starts")
	check(warrior.is_invulnerable(), "the roll passes through blows")
	await frames(30)
	var distance: float = warrior.global_position.x - start
	check(distance > 60.0 and distance < 110.0, "the roll covers ground (%.1f px)" % distance)
	check(warrior.state == Warrior.State.IDLE, "the roll ends in the stance")
	# A blow that lands mid-roll is dodged.
	_place_dummy_in_front(30.0)
	var health: float = warrior.health
	dummy.begin_attack(light_1)
	await frames(4)
	warrior.input.press(&"dodge")
	var outcomes: Array[HitData.Outcome] = []
	var record: Callable = func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome)
	warrior.struck.connect(record)
	await frames(30)
	warrior.struck.disconnect(record)
	check(HitData.Outcome.DODGED in outcomes or outcomes.is_empty(), "a blow during the roll is dodged")
	check(warrior.health == health, "no damage taken while rolling")


func _test_guard() -> void:
	print("block and parry")
	await _reset()
	_place_dummy_in_front(30.0)
	warrior.input.block_held = true
	await frames(30)
	check(warrior.state == Warrior.State.BLOCK, "holding block raises the shield")
	# Moving behind the shield he steps, guard up: forward toward the man before him, back away from him.
	var facing: float = warrior.facing
	warrior.input.move = facing
	await frames(12)
	check(warrior.state == Warrior.State.BLOCK and warrior.sprite.animation == &"block_walk" and absf(warrior.velocity.x) > 10.0,
		"moving behind the shield, he steps forward, guard up (%s)" % warrior.sprite.animation)
	warrior.input.move = -facing
	await frames(16)
	check(warrior.sprite.animation == &"block_back" and warrior.facing == facing,
		"backing away, he steps back still facing the man before him (%s)" % warrior.sprite.animation)
	warrior.input.move = 0.0
	await frames(16)
	check(warrior.sprite.animation == &"block", "standing, he holds the guard still (%s)" % warrior.sprite.animation)
	_place_dummy_in_front(30.0)
	var health: float = warrior.health
	var stamina: float = warrior.stamina
	var outcomes: Array[HitData.Outcome] = []
	var record: Callable = func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome)
	warrior.struck.connect(record)
	dummy.begin_attack(light_1)
	await frames(30)
	check(HitData.Outcome.BLOCKED in outcomes, "a frontal blow is blocked")
	check(warrior.health < health and warrior.health >= health - light_1.damage * warrior.profile.block_chip - 0.01,
		"a blocked blow costs only a chip of health (%.1f)" % (health - warrior.health))
	check(warrior.stamina < stamina, "a blocked blow costs stamina")
	# A blow from behind gets through the guard.
	outcomes.clear()
	dummy.global_position = warrior.global_position - Vector2(warrior.facing * 30.0, 0)
	dummy.set_facing(warrior.facing)
	dummy.begin_attack(light_1)
	await frames(30)
	check(HitData.Outcome.HIT in outcomes, "the shield does not guard the back")
	await frames(40)
	# Parry: raise the shield just before the blow lands.
	warrior.input.block_held = false
	await frames(40)
	_place_dummy_in_front(30.0)
	outcomes.clear()
	dummy.begin_attack(light_1)
	await frames(4)
	warrior.input.block_held = true
	await frames(20)
	check(HitData.Outcome.PARRIED in outcomes, "a blow just as the shield rises is parried")
	check(warrior.sprite.animation == &"parry", "the parry animation plays")
	check(warrior.riposte_ready(), "a parry opens a riposte")
	var dummy_health: float = dummy.health
	warrior.input.block_held = false
	warrior.input.press(&"attack")
	await frames(30)
	check(dummy.health <= dummy_health - light_1.damage * warrior.profile.riposte_multiplier + 0.1,
		"the riposte strikes harder (%.0f)" % dummy.health)
	warrior.struck.disconnect(record)


func _test_hurt_and_heal() -> void:
	print("hurt and heal")
	await _reset()
	_place_dummy_in_front(30.0)
	dummy.begin_attack(light_1)
	await frames(14)
	check(warrior.health < warrior.max_health, "an unguarded blow hurts")
	check(warrior.state == Warrior.State.HURT, "the blow staggers the hero")
	await frames(30)
	check(warrior.state == Warrior.State.IDLE, "the stagger passes")
	var remedies: int = warrior.remedies
	var health: float = warrior.health
	warrior.input.press(&"heal")
	await frames(70)
	check(warrior.remedies == remedies - 1, "a remedy is used")
	check(warrior.health > health, "the remedy heals (%.0f -> %.0f)" % [health, warrior.health])


## Real key and gamepad events through the project's input map, as a player's presses arrive.
func _test_real_input() -> void:
	print("keyboard and gamepad")
	await _reset()
	warrior.input.enabled = true
	var start: float = warrior.global_position.x
	_key(KEY_D, true)
	await frames(30)
	check(warrior.global_position.x > start + 40.0, "D runs right")
	check(warrior.sprite.animation == &"run", "the keys run")
	_key(KEY_D, false)
	await frames(20)
	_key(KEY_LEFT, true)
	await frames(6)
	check(warrior.facing < 0.0, "the left arrow turns him")
	_key(KEY_LEFT, false)
	await frames(20)
	_key(KEY_SPACE, true)
	await frames(2)
	_key(KEY_SPACE, false)
	check(warrior.velocity.y < 0.0, "Space jumps")
	await frames(60)
	_key(KEY_J, true)
	await frames(2)
	_key(KEY_J, false)
	check(warrior.state == Warrior.State.ATTACK, "J strikes")
	await frames(40)
	_key(KEY_K, true)
	await frames(2)
	_key(KEY_K, false)
	check(warrior.current_attack != null and warrior.current_attack.animation == &"heavy", "K cleaves")
	await frames(60)
	_key(KEY_K, true)
	await frames(80)
	check(warrior.state == Warrior.State.CHARGE and warrior.charge_level >= 2, "K held charges the cleave")
	_key(KEY_K, false)
	await frames(2)
	check(warrior.current_attack != null and warrior.current_attack.animation == &"cleave_charged", "let go, the charged cleave falls")
	await frames(60)
	_key(KEY_L, true)
	await frames(10)
	check(warrior.state == Warrior.State.BLOCK, "holding L raises the shield")
	_key(KEY_K, true)
	await frames(2)
	_key(KEY_K, false)
	check(warrior.current_attack != null and warrior.current_attack.animation == &"bash", "L held, K bashes")
	await frames(30)
	_key(KEY_L, false)
	await frames(20)
	_key(KEY_U, true)
	await frames(2)
	_key(KEY_U, false)
	check(warrior.state == Warrior.State.THROW, "U throws a knife")
	await frames(30)
	await frames(10)
	_key(KEY_CTRL, true)
	await frames(2)
	_key(KEY_CTRL, false)
	check(warrior.state == Warrior.State.ROLL, "Ctrl rolls")
	await frames(40)
	var pad: InputEventJoypadButton = InputEventJoypadButton.new()
	pad.button_index = JOY_BUTTON_X
	pad.pressed = true
	Input.parse_input_event(pad)
	await frames(2)
	pad.pressed = false
	Input.parse_input_event(pad)
	check(warrior.state == Warrior.State.ATTACK, "the gamepad's X strikes")
	await frames(40)
	warrior.input.enabled = false


func _key(code: Key, pressed: bool) -> void:
	var event: InputEventKey = InputEventKey.new()
	event.physical_keycode = code
	event.keycode = code
	event.pressed = pressed
	Input.parse_input_event(event)


func _test_death() -> void:
	print("death")
	await _reset()
	var died: Array[bool] = [false]
	warrior.died.connect(func() -> void: died[0] = true)
	warrior.take_damage(warrior.max_health - 1.0)
	_place_dummy_in_front(30.0)
	dummy.begin_attack(light_1)
	await frames(20)
	check(warrior.dead and died[0], "a final blow kills")
	check(warrior.state == Warrior.State.DEAD, "the hero lies dead")
	check(warrior.sprite.animation == &"death", "the death animation plays")
	warrior.input.press(&"attack")
	await frames(5)
	check(warrior.state == Warrior.State.DEAD, "the dead do not act")
	warrior.respawn(Vector2(100, 0))
	await frames(5)
	check(not warrior.dead and warrior.health == warrior.max_health, "respawn restores the hero")
