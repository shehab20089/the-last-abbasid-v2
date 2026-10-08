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
	await _test_knives()
	await _test_roll()
	await _test_guard()
	await _test_hurt_and_heal()
	await _test_death()
	await _test_real_input()
	print("GAMEPLAY_TEST_COMPLETE passed=%d failed=%d" % [passed, failed])
	sandbox.queue_free()
	await process_frame
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
	warrior.swung.connect(func(attack: AttackDefinition) -> void:
		if attack.animation == &"air_attack":
			slashes[0] += 1)
	for press: int in 3:
		warrior.input.press(&"attack")
		await frames(14)
	check(not warrior.is_on_floor() and slashes[0] == warrior.profile.air_slashes,
		"two slashes in a fall (%d)" % slashes[0])
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
	var health: float = warrior.health
	var stamina: float = warrior.stamina
	var outcomes: Array[HitData.Outcome] = []
	var record: Callable = func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome)
	warrior.struck.connect(record)
	dummy.begin_attack(light_1)
	await frames(30)
	check(HitData.Outcome.BLOCKED in outcomes, "a frontal blow is blocked")
	check(warrior.health == health, "a blocked blow costs no health")
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
