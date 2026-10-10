extends SceneTree
## Enemy checks in the physics sandbox: the swordsman notices, closes in and lands a telegraphed
## slash; a parried slash leaves him staggered for a riposte; his guard stops light cuts and breaks
## under the heavy cleave; he dies. The spearman keeps his distance and thrusts. The archer shoots,
## a raised shield stops his arrows, and no soldier walks off a ledge. A soldier busy at a task
## stays at it, sees and hears less, and a first blow he never sees coming kills him (run up behind
## him and strike); a sentry on watch sees as far as ever; a shout brings comrades within earshot into
## the fight. Killing blows cut men apart as their blows can (unless gore is reduced). A staggered
## soldier can be finished once wounded to half: the heavy button plays one of four scripted kills, the
## hero untouchable (the full one for the last soldier, a quick one while others fight; each gives back
## stamina). Every blow glints at least 0.22 s before it lands; the spearman's low sweep passes under
## a shield (jump it); a guard turns slowly, so a blow at his back lands; the shield bash breaks a
## guard and shoves; the plunge kills a man below who never saw it. The keshig veteran follows his quick
## cut with a backhand; light blows do not stop the mace-bearer, whose overhead blow breaks a raised
## shield; the shield-bearer's wall turns every blow from the front but the bash, and not one from
## behind; the engineer's fire pots burn the ground, through a raised shield.
## Run: node tools/run_godot_cli.mjs --headless --fixed-fps 60 --path . --script res://tests/enemy_test.gd

var passed: int = 0
var failed: int = 0
var sandbox: Node2D
var warrior: Warrior


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	await _test_swordsman_engages()
	await _test_parry_and_riposte()
	await _test_guard()
	await _test_kill()
	await _test_spearman()
	await _test_archer()
	await _test_ledge()
	await _test_surprise()
	await _test_sneak_attack()
	await _test_dismemberment()
	await _test_execution()
	await _test_busy_senses()
	await _test_alarm()
	await _test_finishers()
	await _test_finisher_choice()
	await _test_finisher_rules()
	await _test_knockdown()
	await _test_reactions()
	await _test_hero_thrown_down()
	await _test_follow_ups()
	await _test_poise_and_flinches()
	await _test_guard_reaction()
	await _test_reach_and_judgment()
	await _test_crowd_rules()
	await _test_captain_mind()
	await _test_feint()
	await _test_spear_lunge()
	await _test_archer_kick()
	await _test_duellist_parry()
	await _test_skirmisher()
	await _test_axeman()
	await _test_telegraph_lead()
	await _test_low_sweep()
	await _test_guard_turn()
	await _test_bash()
	await _test_plunge()
	await _test_veteran()
	await _test_maceman()
	await _test_shieldbearer()
	await _test_engineer()
	await _test_pommel_on_soldiers()
	await _test_whirl_on_soldiers()
	await _test_delayed_cut_on_guard()
	await _test_charge_on_soldiers()
	await _test_running_thrust_on_soldier()
	await _test_arts_on_soldiers()
	await _test_judgment()
	await _test_cry_and_fury()
	await _test_answers()
	await _test_toughness()
	await _test_time_to_kill()
	await _test_captain_opening()
	await _test_captain_blows()
	await _test_captain_phases()
	print("ENEMY_TEST_COMPLETE passed=%d failed=%d" % [passed, failed])
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
	await frames(5)


func _spawn(kind: String, at: Vector2, face: float = -1.0) -> MongolSoldier:
	var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	soldier.position = at
	sandbox.add_child(soldier)
	soldier.set_facing(face)
	soldier.spawn_point = at
	return soldier


## A soldier busy with a task (the level's "activity" metadata) until he notices the hero.
func _spawn_busy(kind: String, at: Vector2, face: float, activity: StringName) -> MongolSoldier:
	var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
	var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
	soldier.set_meta(&"activity", activity)
	soldier.position = at
	sandbox.add_child(soldier)
	soldier.set_facing(face)
	soldier.spawn_point = at
	return soldier


func _brain(soldier: MongolSoldier) -> EnemyBrain:
	return soldier.get_node("Brain") as EnemyBrain


func _noticed(soldier: MongolSoldier) -> bool:
	var mode: EnemyBrain.Mode = _brain(soldier).mode
	return mode != EnemyBrain.Mode.IDLE and mode != EnemyBrain.Mode.PATROL


func _test_swordsman_engages() -> void:
	print("swordsman engages")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", Vector2(300, 0))
	var brain: EnemyBrain = _brain(soldier)
	await frames(10)
	check(brain.mode == EnemyBrain.Mode.ALERT or brain.mode == EnemyBrain.Mode.CHASE,
		"notices the hero in front of him")
	var telegraphs: Array[int] = [0]
	soldier.telegraphed.connect(func(_attack: AttackDefinition) -> void: telegraphs[0] += 1)
	var health: float = warrior.health
	var closest: float = INF
	for i: int in 300:
		await physics_frame
		closest = minf(closest, absf(soldier.global_position.x - warrior.global_position.x))
		if warrior.health < health:
			break
	check(closest < 70.0, "closes to sword's length (%.0f px)" % closest)
	check(telegraphs[0] > 0, "his attack is telegraphed first")
	check(warrior.health < health, "his blow lands on a hero who does nothing")


func _test_parry_and_riposte() -> void:
	print("parry and riposte")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", Vector2(150, 0))
	var slash: AttackDefinition = load("res://features/enemies/definitions/swordsman_slash.tres")
	await frames(40)
	soldier.global_position = warrior.global_position + Vector2(38, 0)
	soldier.set_facing(-1.0)
	warrior.set_facing(1.0)
	await frames(2)
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	var outcomes: Array[HitData.Outcome] = []
	warrior.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	soldier.attack(slash)
	# Raise the shield shortly before the slash goes live (frame 3).
	for i: int in 60:
		await physics_frame
		if soldier.sprite.animation == &"attack" and soldier.sprite.frame >= 2:
			warrior.input.block_held = true
			break
	await frames(30)
	warrior.input.block_held = false
	check(HitData.Outcome.PARRIED in outcomes, "a well-timed shield parries the slash")
	check(soldier.state == MongolSoldier.State.STAGGER, "the parried soldier staggers")
	var health: float = soldier.health
	warrior.input.press(&"attack")
	await frames(20)
	check(soldier.health <= health - 12.0 * warrior.profile.riposte_multiplier + 0.1,
		"the riposte lands hard (%.0f -> %.0f)" % [health, soldier.health])


func _test_guard() -> void:
	print("guard")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", Vector2(150, 0))
	await frames(20)
	soldier.global_position = warrior.global_position + Vector2(36, 0)
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	soldier.guard(2.0)
	warrior.set_facing(1.0)
	var outcomes: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void:
		outcomes.append(outcome))
	var health: float = soldier.health
	warrior.input.press(&"attack")
	await frames(20)
	check(HitData.Outcome.BLOCKED in outcomes, "his raised guard turns a light cut")
	check(soldier.health == health, "a guarded cut does no harm")
	await frames(20)
	soldier.state = MongolSoldier.State.READY
	soldier.guard(2.0)
	outcomes.clear()
	warrior.input.press(&"heavy_attack")
	await frames(45)
	check(HitData.Outcome.GUARD_BROKEN in outcomes, "the heavy cleave breaks his guard")
	check(soldier.state == MongolSoldier.State.STAGGER, "a broken guard leaves him staggered")


func _test_kill() -> void:
	print("death")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", Vector2(150, 0))
	var died: Array[bool] = [false]
	soldier.died.connect(func() -> void: died[0] = true)
	soldier.take_damage(soldier.max_health - 5.0)
	await frames(20)
	soldier.global_position = warrior.global_position + Vector2(34, 0)
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	warrior.set_facing(1.0)
	warrior.input.press(&"attack")
	await frames(30)
	check(soldier.dead and died[0], "a final cut kills him")
	check(String(soldier.sprite.animation).begins_with("death"), "he falls")
	check(soldier.severed != &"", "every killing blow cuts something off (%s)" % soldier.severed)
	check(_brain(soldier).mode == EnemyBrain.Mode.DEAD, "his brain stops")
	var health: float = soldier.health
	warrior.input.press(&"attack")
	await frames(30)
	check(soldier.health == health, "the dead take no more blows")


func _test_spearman() -> void:
	print("spearman")
	await _reset()
	var soldier: MongolSoldier = _spawn("spearman", Vector2(220, 0))
	var thrusts: Array[int] = [0]
	soldier.telegraphed.connect(func(_a: AttackDefinition) -> void: thrusts[0] += 1)
	var distances: Array[float] = []
	var health: float = warrior.health
	for i: int in 360:
		await physics_frame
		if soldier.state == MongolSoldier.State.READY and _brain(soldier).mode == EnemyBrain.Mode.CHASE:
			distances.append(absf(soldier.global_position.x - warrior.global_position.x))
	var settled: float = distances[distances.size() - 1] if not distances.is_empty() else INF
	check(thrusts[0] > 0, "he thrusts")
	check(warrior.health < health, "his thrust reaches the hero")
	check(settled > 45.0 and settled < 110.0, "he fights from spear's length (%.0f px)" % settled)


func _test_archer() -> void:
	print("archer")
	await _reset()
	var soldier: MongolSoldier = _spawn("archer", Vector2(330, 0))
	var arrows: Array[Node2D] = []
	soldier.projectile_spawned.connect(func(p: Node2D) -> void: arrows.append(p))
	var health: float = warrior.health
	for i: int in 300:
		await physics_frame
		if warrior.health < health:
			break
	check(not arrows.is_empty(), "he shoots")
	check(warrior.health < health, "his arrow strikes the hero")
	# A raised shield stops arrows.
	warrior.health = warrior.max_health
	warrior.set_facing(1.0)
	warrior.input.block_held = true
	var outcomes: Array[HitData.Outcome] = []
	warrior.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	for i: int in 300:
		await physics_frame
		if not outcomes.is_empty():
			break
	warrior.input.block_held = false
	check(HitData.Outcome.BLOCKED in outcomes or HitData.Outcome.PARRIED in outcomes,
		"a raised shield stops his arrows")
	check(warrior.health == warrior.max_health, "a blocked arrow does no harm")
	# He gives ground when the hero closes in.
	await frames(30)
	var before: float = absf(soldier.global_position.x - warrior.global_position.x)
	warrior.global_position.x = soldier.global_position.x - 70.0
	await frames(60)
	var after: float = absf(soldier.global_position.x - warrior.global_position.x)
	check(after > 70.0 + 10.0 or soldier.state == MongolSoldier.State.ATTACK,
		"he backs away from a close hero (%.0f -> %.0f)" % [before, after])


func _test_ledge() -> void:
	print("ledges")
	await _reset()
	warrior.global_position = Vector2(-700, 0)
	var soldier: MongolSoldier = _spawn("swordsman", Vector2(-260, -80), 1.0)
	_brain(soldier).start_mode = EnemyBrain.Mode.PATROL
	await frames(400)
	check(soldier.global_position.y < -70.0, "a patrolling soldier stays on his ledge")
	# Chasing a hero below, he still will not step off.
	warrior.global_position = Vector2(-150, 0)
	await frames(240)
	check(soldier.global_position.y < -70.0, "he will not chase over the edge")


## A soldier staggered `gap` px before the hero, facing him (wounded to 40% unless `wounded` is false).
func _staggered(kind: String, gap: float, wounded: bool = true) -> MongolSoldier:
	var soldier: MongolSoldier = _spawn(kind, Vector2(150, 0))
	await frames(20)
	if wounded:
		soldier.take_damage(soldier.max_health * 0.6)
	soldier.global_position = warrior.global_position + Vector2(gap, 0)
	soldier.cancel_attack()
	soldier.set_facing(-1.0)
	warrior.set_facing(1.0)
	soldier.stagger(3.0)
	await frames(2)
	return soldier


## Plays a finisher through; returns what it did: [started, strikes, ended].
func _play_finisher(soldier: MongolSoldier) -> Array[int]:
	var counts: Array[int] = [0, 0, 0]
	warrior.finisher_started.connect(func(_t: Combatant, _f: FinisherDefinition) -> void: counts[0] += 1)
	warrior.finisher_struck.connect(func(_t: Combatant, _f: FinisherDefinition, _frame: int, _cut: StringName) -> void:
		counts[1] += 1)
	warrior.finisher_ended.connect(func(_t: Combatant) -> void: counts[2] += 1)
	warrior.input.press(&"heavy_attack")
	for i: int in 400:
		await physics_frame
		if counts[2] > 0:
			break
	return counts


func _test_finishers() -> void:
	print("finishers")
	var cuts: Dictionary[String, StringName] = {"behead": &"head", "impale": &"", "spin": &"waist", "disarm": &"head"}
	for key: String in cuts:
		await _reset()
		var soldier: MongolSoldier = await _staggered("swordsman", 44.0)
		check(warrior.finisher_target == soldier, "%s: a staggered soldier before him can be finished" % key)
		var finisher: FinisherDefinition = load("res://assets/characters/warrior/finishers/finish_%s.tres" % key)
		warrior.moves.next_finisher = finisher
		var health: float = warrior.health
		var counts: Array[int] = [0, 0, 0]
		warrior.finisher_started.connect(func(_t: Combatant, _f: FinisherDefinition) -> void: counts[0] += 1)
		warrior.finisher_struck.connect(func(_t: Combatant, _f: FinisherDefinition, _frame: int, _cut: StringName) -> void:
			counts[1] += 1)
		warrior.finisher_ended.connect(func(_t: Combatant) -> void: counts[2] += 1)
		warrior.input.press(&"heavy_attack")
		await frames(3)
		check(counts[0] == 1 and warrior.state == Warrior.State.FINISHER, "%s: the heavy button begins it" % key)
		check(warrior.sprite.animation == finisher.hero_animation and soldier.sprite.animation == finisher.victim_animation,
			"%s: both halves play" % key)
		check(absf(soldier.global_position.x - warrior.global_position.x - finisher.distance) < 1.0 and soldier.facing < 0.0,
			"%s: he is set where the choreography wants him (%.0f px)" % [key, soldier.global_position.x - warrior.global_position.x])
		check(warrior.is_invulnerable(), "%s: the hero is untouchable through it" % key)
		var died_on: int = -1
		for i: int in 400:
			await physics_frame
			if soldier.dead and died_on < 0:
				died_on = warrior.sprite.frame
			if counts[2] > 0:
				break
		check(soldier.dead and died_on == finisher.death_frame, "%s: he dies on its death frame (%d)" % [key, died_on])
		check(soldier.severed == cuts[key], "%s: it cuts what it cuts (%s)" % [key, soldier.severed])
		check(counts[1] == finisher.cut_frames.size() + finisher.burst_frames.size(), "%s: every blow lands (%d)" % [key, counts[1]])
		check(counts[2] == 1 and warrior.state == Warrior.State.IDLE, "%s: the hero has himself back after" % key)
		check(soldier.sprite.animation == finisher.victim_animation and not soldier.sprite.is_playing(),
			"%s: his body comes to rest in his half" % key)
		check(warrior.health == health, "%s: nothing touched the hero" % key)


## A blow of the hero's, as his hitbox would build it.
func _blow(path: String) -> HitData:
	var hit: HitData = HitData.from_attack(warrior, load(path) as AttackDefinition)
	hit.position = warrior.global_position + Vector2(warrior.facing * 30.0, -40.0)
	return hit


## A great blow throws a man down: he falls, lies with his hurtbox along the street, a blow where he
## lies keeps him down longer, and he gets up untouchable as he rises. Over a man down the heavy button
## is the ground stroke; wounded to half, the ground finisher. Killed where he lies, he dies lying. A
## captain in his armour and a mace-bearer are never thrown down.
func _test_knockdown() -> void:
	print("thrown down")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	var shape: CollisionShape2D = soldier.hurtbox.get_node("Shape") as CollisionShape2D
	var standing: float = (shape.shape as RectangleShape2D).size.y
	soldier.receive_hit(_blow("res://features/warrior/definitions/executioner.tres"))
	soldier.health = soldier.max_health
	await frames(2)
	check(soldier.state == MongolSoldier.State.DOWN and soldier.is_down() and soldier.sprite.animation == &"knockdown",
		"the executioner's cleave throws him down")
	check((shape.shape as RectangleShape2D).size.y < standing * 0.5, "and while he is down his hurtbox lies along the street")
	await frames(40)
	check(soldier.sprite.animation == &"down", "he lies on the street")
	var left: float = soldier._timer
	soldier.receive_hit(_blow("res://features/warrior/definitions/light_1.tres"))
	check(soldier._timer > left + 0.2, "struck where he lies, he stays down longer")
	var rose: bool = false
	var untouchable_rising: bool = false
	for i: int in 240:
		await physics_frame
		if soldier.sprite.animation == &"getup":
			rose = true
			untouchable_rising = untouchable_rising or soldier.untouchable
		if soldier.state == MongolSoldier.State.READY:
			break
	check(rose and untouchable_rising, "he gets up, untouchable as he rises")
	check(soldier.state == MongolSoldier.State.READY and (shape.shape as RectangleShape2D).size.y == standing,
		"and stands again in his guard")
	# The ground stroke, on a man down and whole.
	soldier.receive_hit(_blow("res://features/warrior/definitions/executioner.tres"))
	soldier.health = soldier.max_health
	await frames(30)
	warrior.global_position.x = soldier.global_position.x - 40.0
	await frames(1)
	var health: float = soldier.health
	check(&"ground_stab" in warrior.moves.open_techniques(), "over a man down, the coach can name the ground stroke")
	warrior.input.press(&"heavy_attack")
	await frames(3)
	check(warrior.current_attack == warrior.profile.ground_stab, "the heavy button over a man down is the ground stroke")
	await frames(30)
	check(soldier.health < health - 20.0, "and the blade goes into him (%.0f)" % soldier.health)
	await frames(60)
	# Wounded to half and down: the ground finisher.
	await _reset()
	soldier = _spawn("swordsman", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	soldier.receive_hit(_blow("res://features/warrior/definitions/executioner.tres"))
	soldier.health = soldier.max_health * 0.4
	await frames(20)
	check(warrior.finisher_target == null, "a man down is not finished from across the street")
	warrior.global_position.x = soldier.global_position.x - 4.0
	await frames(2)
	check(warrior.finisher_target == soldier, "wounded to half and down, he can be finished from over him")
	warrior.input.press(&"heavy_attack")
	await frames(3)
	check(warrior.state == Warrior.State.FINISHER and warrior.sprite.animation == &"finish_ground"
		and soldier.sprite.animation == &"finished_ground", "the heavy button pins him where he lies")
	for i: int in 200:
		await physics_frame
		if warrior.state != Warrior.State.FINISHER:
			break
	check(soldier.dead, "and he dies of it")
	# Killed where he lies by a blow.
	await _reset()
	soldier = _spawn("swordsman", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	soldier.receive_hit(_blow("res://features/warrior/definitions/executioner.tres"))
	await frames(30)
	var kill: HitData = _blow("res://features/warrior/definitions/ground_stab.tres")
	kill.damage = 500.0
	soldier.receive_hit(kill)
	await frames(2)
	check(soldier.dead and soldier.sprite.animation == &"death_down", "killed where he lies, he dies lying")
	# No blow floors a mace-bearer.
	var maceman: MongolSoldier = _spawn("maceman", warrior.global_position + Vector2(-60, 0), 1.0)
	maceman.unaware = false
	_brain(maceman).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	maceman.receive_hit(_blow("res://features/warrior/definitions/executioner.tres"))
	await frames(2)
	check(maceman.state != MongolSoldier.State.DOWN, "no blow throws a mace-bearer down")
	await frames(10)


## Flinches take their two poses in turn; a heavy blow that does not floor a man makes him reel back; a
## parry throws him open.
func _test_reactions() -> void:
	print("reactions")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	var seen: Array[StringName] = []
	for i: int in 2:
		soldier.receive_hit(_blow("res://features/warrior/definitions/light_1.tres"))
		seen.append(soldier.sprite.animation)
		soldier.health = soldier.max_health
		soldier.poise = soldier.max_poise
		await frames(40)
	check(seen.size() == 2 and seen[0] != seen[1] and &"hurt_b" in seen, "two flinches in a row take two poses (%s)" % [seen])
	# (Two flinches close together steel him a moment: wait it out.)
	await frames(50)
	soldier.poise = soldier.max_poise
	soldier.receive_hit(_blow("res://features/warrior/definitions/light_3.tres"))
	check(soldier.sprite.animation == &"reel", "the thrust, heavy but not felling, makes him reel back")
	await frames(60)
	soldier.on_hit_landed(warrior, _blow("res://features/warrior/definitions/light_1.tres"), HitData.Outcome.PARRIED)
	check(soldier.state == MongolSoldier.State.STAGGER and soldier.sprite.animation == &"parried", "a parry throws him open")
	await frames(30)


## A blow no guard turns throws the hero down: he lies untouchable, then gets up; a roll gets him out of
## it sooner.
func _test_hero_thrown_down() -> void:
	print("the hero thrown down")
	await _reset()
	var maceman: MongolSoldier = _spawn("maceman", warrior.global_position + Vector2(36, 0))
	_brain(maceman).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	var smash: HitData = HitData.from_attack(maceman, load("res://features/enemies/definitions/maceman_smash.tres") as AttackDefinition)
	warrior.receive_hit(smash)
	await frames(2)
	check(warrior.state == Warrior.State.DOWN and warrior.sprite.animation == &"knockdown", "the mace's overhead throws him down")
	check(warrior.is_invulnerable(), "and nothing touches him while he is down")
	var up: bool = false
	for i: int in 120:
		await physics_frame
		if warrior.state == Warrior.State.IDLE:
			up = true
			break
	check(up, "he gets up")
	await frames(60)
	warrior.receive_hit(smash)
	await frames(int(warrior.profile.down_escape * 60.0) + 2)
	warrior.input.press(&"dodge")
	await frames(2)
	check(warrior.state == Warrior.State.ROLL, "a roll gets him out of it sooner")
	await frames(40)


## Poise builds blow on blow and comes back only after a quiet moment; two flinches close together steel a
## man (blows wound him but no longer stop him); a stagger stays open whatever lands in it; a man thrown down
## is kept down longer by a blow only once, and the ground stroke rouses him.
func _test_poise_and_flinches() -> void:
	print("poise and flinches")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	soldier.max_health = 900.0
	soldier.health = 900.0
	await frames(2)
	var cut: String = "res://features/warrior/definitions/light_1.tres"
	soldier.receive_hit(_blow(cut))
	await frames(10)
	check(soldier.poise < soldier.max_poise, "poise lost to a cut stays lost a while (%.0f of %.0f)" % [soldier.poise, soldier.max_poise])
	soldier.receive_hit(_blow(cut))
	await frames(10)
	soldier.receive_hit(_blow(cut))
	await frames(2)
	check(soldier.state == MongolSoldier.State.STAGGER, "three cuts close together break his poise: he staggers")
	var left: float = soldier._timer
	soldier.receive_hit(_blow(cut))
	await frames(1)
	check(soldier.state == MongolSoldier.State.STAGGER and soldier._timer <= left,
		"a cut while he staggers neither ends the opening nor stretches it")
	await frames(120)
	check(soldier.poise == soldier.max_poise, "a quiet moment, and his poise is whole again")
	# The flinch limit.
	await _reset()
	soldier = _spawn("veteran", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	soldier.max_health = 900.0
	soldier.health = 900.0
	soldier.max_poise = 900.0
	soldier.poise = 900.0
	await frames(2)
	var steeled: Array[bool] = [false]
	soldier.steeled.connect(func() -> void: steeled[0] = true)
	soldier.receive_hit(_blow(cut))
	await frames(8)
	soldier.receive_hit(_blow(cut))
	await frames(8)
	check(steeled[0], "two flinches close together steel him")
	await frames(14)
	soldier.receive_hit(_blow(cut))
	await frames(1)
	check(soldier.state != MongolSoldier.State.HURT, "and the next cut no longer stops him")
	await frames(80)
	soldier.receive_hit(_blow(cut))
	await frames(1)
	check(soldier.state == MongolSoldier.State.HURT, "a moment later he flinches again")
	# A man thrown down: one blow keeps him down longer, once; the ground stroke rouses him.
	await _reset()
	soldier = _spawn("swordsman", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	soldier.max_health = 900.0
	soldier.health = 900.0
	await frames(2)
	soldier.knock_down()
	await frames(30)
	var lying: float = soldier._timer
	soldier.receive_hit(_blow(cut))
	await frames(1)
	var once: float = soldier._timer
	soldier.receive_hit(_blow(cut))
	await frames(1)
	check(once > lying and soldier._timer < once, "a blow where he lies keeps him down longer, once (%.2f, %.2f, %.2f)"
		% [lying, once, soldier._timer])
	soldier.receive_hit(_blow("res://features/warrior/definitions/ground_stab.tres"))
	await frames(2)
	check(soldier.sprite.animation == &"getup" and soldier.untouchable, "the ground stroke rouses him: he gets up, untouchable")
	await frames(40)


## Only blows that can reach the hero count against MAX_ATTACKERS (an archer drawing far off does not, one in the
## same fight does); a
## soldier whose turn has not come waits a step off; no blade is swung at a hero on a ledge; a knife out
## of the dark wounds an unaware man and turns him (it takes a blade to kill unseen); an arrow loosed from a
## roof is aimed down at the street; a level's eagerness shortens the pauses between blows.
func _test_crowd_rules() -> void:
	print("the crowd")
	await _reset()
	var a: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(36, 0))
	var b: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(-36, 0), 1.0)
	var c: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(44, 0))
	var archer: MongolSoldier = _spawn("archer", warrior.global_position + Vector2(260, 0))
	for s: MongolSoldier in [a, b, c, archer]:
		s.unaware = false
		_brain(s).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(4)
	var third: EnemyBrain = _brain(c)
	third.target = warrior
	var cut: AttackDefinition = a.profile.attacks[SwordsmanBrain.CUT]
	archer.attack(archer.profile.attacks[ArcherBrain.SHOOT])
	a.attack(cut)
	await frames(1)
	check(third._may_attack(), "an archer drawing far off takes no attacker's place")
	b.attack(cut)
	await frames(1)
	check(not third._may_attack() and third._waiting(), "two blades at him: a third waits his turn")
	third.keep_range(c.profile.min_range, c.profile.preferred_range + 8.0, 120.0)
	check(c.move_intent == -third.direction_to_target(), "and steps back to wait, not crowding in")
	await frames(60)
	# A bowman drawing in the same fight takes an attacker's place: with one blade out, a second man waits.
	await _reset()
	var near_a: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(36, 0))
	var near_b: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(-36, 0), 1.0)
	var bowman: MongolSoldier = _spawn("archer", warrior.global_position + Vector2(150, 0))
	for s: MongolSoldier in [near_a, near_b, bowman]:
		s.unaware = false
		_brain(s).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(4)
	var second: EnemyBrain = _brain(near_b)
	second.target = warrior
	near_a.attack(near_a.profile.attacks[SwordsmanBrain.CUT])
	bowman.attack(bowman.profile.attacks[ArcherBrain.SHOOT])
	await frames(1)
	check(not second._may_attack(), "a bowman drawing in the same fight takes an attacker's place")
	await frames(60)
	# A hero on a ledge above: no blade is swung at him.
	await _reset()
	var below: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(36, 0))
	below.unaware = false
	var brain: EnemyBrain = _brain(below)
	brain.process_mode = Node.PROCESS_MODE_DISABLED
	brain.target = warrior
	await frames(4)
	brain._cooldown = 0.0
	warrior.global_position.y -= 70.0
	var swung: bool = brain.try_attack(below.profile.attacks[SwordsmanBrain.CUT])
	check(not swung, "no blade is swung at a hero on a ledge above")
	warrior.global_position.y += 70.0
	await frames(30)
	# The level's eagerness shortens his pauses.
	below.set_aggression(1.3)
	brain._cooldown = 0.0
	warrior._since_hurt = 10.0
	check(brain.try_attack(below.profile.attacks[SwordsmanBrain.CUT])
		and brain._cooldown <= below.profile.attack_cooldown.y / 1.3 + 0.001,
		"a more eager level's soldier pauses less between blows (%.2f s)" % brain._cooldown)
	await frames(60)
	# A knife out of the dark.
	await _reset()
	var looter: MongolSoldier = _spawn_busy("swordsman", warrior.global_position + Vector2(120, 0), 1.0, &"loot")
	await frames(4)
	var knife: HitData = HitData.new()
	knife.attacker = warrior
	knife.damage = 10.0
	knife.projectile = true
	knife.direction = 1.0
	knife.position = looter.global_position + Vector2(0, -40)
	var whole: float = looter.health
	looter.receive_hit(knife)
	await frames(2)
	check(not looter.dead and is_equal_approx(whole - looter.health, 20.0) and not looter.unaware,
		"a knife out of the dark wounds an unaware man badly and turns him, but does not kill (%.0f)" % (whole - looter.health))
	await frames(30)
	# Arrows from a roof.
	await _reset()
	var arrow_scene: PackedScene = load("res://features/enemies/arrow.tscn")
	var high: Arrow = arrow_scene.instantiate() as Arrow
	high.direction = 1.0
	high.position = warrior.global_position + Vector2(-200, -130)
	sandbox.add_child(high)
	var flat: Arrow = arrow_scene.instantiate() as Arrow
	flat.direction = 1.0
	flat.position = warrior.global_position + Vector2(-200, -45)
	sandbox.add_child(flat)
	await frames(1)
	check(high._velocity.y > 100.0, "an arrow loosed from a roof is aimed down at the hero (%.0f)" % high._velocity.y)
	check(absf(flat._velocity.y) < 30.0, "level with him, it flies level (%.0f)" % flat._velocity.y)
	await frames(30)


## The Captain: thrown off his stroke, he forgets the chain he meant to follow; a plan he cannot carry out
## he thinks again; in his second phase a guard held up before him draws the low sweep (amber).
func _test_captain_mind() -> void:
	print("the captain's mind")
	await _reset()
	var captain: MongolSoldier = _spawn("captain", warrior.global_position + Vector2(50, 0))
	captain.unaware = false
	var brain: CaptainBrain = _brain(captain) as CaptainBrain
	brain.process_mode = Node.PROCESS_MODE_DISABLED
	brain.target = warrior
	brain.dormant = false
	await frames(4)
	brain._chain.assign([CaptainBrain.SLASH_B, CaptainBrain.SLASH_C])
	captain._stagger(0.5)
	check(brain._chain.is_empty(), "staggered, the Captain forgets the chain he meant to follow")
	await frames(50)
	brain._cooldown = 0.0
	brain._plan = CaptainBrain.BASH
	brain._plan_age = 0.0
	for i: int in 70:
		brain.engage(1.0 / 60.0)
		await physics_frame
		if brain._plan != CaptainBrain.BASH:
			break
	check(brain._plan != CaptainBrain.BASH, "a plan he cannot carry out (the charge, too near) he thinks again")
	await frames(90)
	brain.phase = 2
	warrior.input.block_held = true
	await frames(6)
	var picks: Array[int] = []
	for i: int in 12:
		picks.append(brain._choose(44.0))
	warrior.input.block_held = false
	var sweep: AttackDefinition = captain.profile.attacks[CaptainBrain.SWEEP]
	check(CaptainBrain.SWEEP in picks and sweep.low and sweep.tell() == AttackDefinition.Tell.LOW,
		"in his second phase, a guard held up before him draws the low sweep, glinting amber")
	await frames(30)


## The Second Wind's cry throws back and staggers the men near him (not those further off; the Captain only
## gives ground); then the fury: his blows come faster, each that lands gives back a little blood, a kill holds
## it longer.
func _test_cry_and_fury() -> void:
	print("the guard's cry and the fury")
	await _reset()
	var near: MongolSoldier = await _held("swordsman", 50.0)
	var far: MongolSoldier = await _held("swordsman", 220.0)
	var near_from: float = near.global_position.x
	warrior.art_slots = [&"second_wind"]
	warrior.set_resolve(100.0)
	warrior.input.press(&"art")
	var cried: Array[bool] = [false]
	warrior.cried.connect(func(_radius: float) -> void: cried[0] = true)
	for i: int in 60:
		await physics_frame
		if cried[0]:
			break
	await frames(6)
	check(cried[0] and near.state == MongolSoldier.State.STAGGER and near.global_position.x > near_from + 4.0,
		"the cry throws back and staggers a man near him")
	check(far.state != MongolSoldier.State.STAGGER, "but not one further off")
	await frames(60)
	check(warrior.is_steeled(), "then the fury holds")
	warrior.health = warrior.max_health - 30.0
	var before: float = warrior.health
	near.max_health = 400.0
	near.health = 400.0
	near.global_position = warrior.global_position + Vector2(warrior.facing * 30.0, 0.0)
	warrior.input.press(&"attack")
	await frames(3)
	check(is_equal_approx(warrior.sprite.speed_scale, 1.25), "his blows come faster (%.2f)" % warrior.sprite.speed_scale)
	await frames(30)
	check(warrior.health > before, "and each that lands gives back a little blood (%.0f)" % (warrior.health - before))
	var left: float = warrior._steel
	near.health = 1.0
	near.global_position = warrior.global_position + Vector2(warrior.facing * 30.0, 0.0)
	await frames(30)
	warrior.input.press(&"attack")
	for i: int in 40:
		await physics_frame
		if near.dead:
			break
	check(near.dead and warrior._steel > left - 1.2, "a kill holds the fury longer")
	await frames(30)
	# The Captain only gives ground.
	await _reset()
	var captain: MongolSoldier = _spawn("captain", Vector2(warrior.global_position.x + 60.0, 0))
	_brain(captain).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(4)
	captain.frighten(1.0, 260.0, 1.3)
	check(captain.state != MongolSoldier.State.STAGGER and captain.velocity.x > 0.0, "the Captain is not cowed, only pushed")


## A man left open to a finisher is not thrown out of the hero's reach (the kick only shoves him a step);
## the Judgment's great blow takes a share of any man: of a fresh elite, and of the Captain through his
## resistance to the Arts.
func _test_reach_and_judgment() -> void:
	print("kept in reach; the judgment's share")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(30, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	soldier.health = soldier.max_health * 0.4
	soldier._stagger(2.0)
	var from: float = soldier.global_position.x
	soldier.receive_hit(_blow("res://features/warrior/definitions/light_4.tres"))
	await frames(40)
	var moved: float = absf(soldier.global_position.x - from)
	check(moved < 30.0 and soldier.can_be_finished(),
		"kicked while open to a finisher, he stumbles a step and stays in reach (%.0f px)" % moved)
	await _reset()
	soldier = _spawn("swordsman", warrior.global_position + Vector2(30, 0))
	soldier.unaware = false
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	from = soldier.global_position.x
	soldier.receive_hit(_blow("res://features/warrior/definitions/light_4.tres"))
	await frames(50)
	moved = absf(soldier.global_position.x - from)
	check(moved > 50.0, "a man still on his feet the kick throws well back (%.0f px)" % moved)
	var judgment: String = "res://features/warrior/definitions/judgment_blow.tres"
	await _reset()
	var veteran: MongolSoldier = _spawn("veteran", warrior.global_position + Vector2(30, 0))
	veteran.unaware = false
	_brain(veteran).process_mode = Node.PROCESS_MODE_DISABLED
	veteran.max_health = 400.0
	veteran.health = 400.0
	await frames(2)
	veteran.receive_hit(_blow(judgment))
	check(veteran.health <= 400.0 * 0.61, "the Judgment takes a share of a fresh elite, however strong (%.0f of 400)"
		% veteran.health)
	await _reset()
	var captain: MongolSoldier = _spawn("captain", warrior.global_position + Vector2(30, 0))
	captain.unaware = false
	_brain(captain).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	var whole: float = captain.health
	captain.receive_hit(_blow(judgment))
	var taken: float = whole - captain.health
	check(taken >= whole * 0.18 and taken <= whole * 0.22,
		"and a fifth of the Captain, through his armour against the Arts (%.0f of %.0f)" % [taken, whole])
	await frames(30)


## He raises his guard against a swing he sees a beat late (EnemyProfile.reaction_time), never on the frame
## it begins: a quick first cut gets in before a shield comes up.
func _test_guard_reaction() -> void:
	print("a guard answers a beat late")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(44, 0))
	soldier.set_meta(&"guard_chance", 10.0)
	var brain: EnemyBrain = _brain(soldier)
	for f: int in 120:
		await physics_frame
		if brain.mode == EnemyBrain.Mode.CHASE:
			break
	# (Untouchable a while, so he does not start a blow of his own meanwhile.)
	warrior._invulnerable = 3.0
	await frames(10)
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	# The cut goes the other way: what is measured is when his shield comes up.
	warrior.set_facing(-1.0)
	warrior.input.press(&"attack")
	var raised: int = -1
	for f: int in 40:
		await physics_frame
		if soldier.state == MongolSoldier.State.GUARD:
			raised = f + 1
			break
	var earliest: int = floori(soldier.profile.reaction_time * 0.8 * 60.0) - 1
	var latest: int = ceili(soldier.profile.reaction_time * 1.25 * 60.0) + 2
	check(raised >= earliest and raised <= latest,
		"his guard comes up a beat after the swing begins (%d frames; %d to %d)" % [raised, earliest, latest])
	warrior._invulnerable = 0.0
	await frames(30)


## A blow with a follow-up may be followed at once by its chained blow (the swordsman's slash by a cut,
## the mace's sweep by another).
func _test_follow_ups() -> void:
	print("follow-ups")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	await frames(2)
	var brain: EnemyBrain = _brain(soldier)
	brain.process_mode = Node.PROCESS_MODE_DISABLED
	var slash: AttackDefinition = (load("res://features/enemies/definitions/swordsman_slash.tres") as AttackDefinition).duplicate()
	slash.follow_chance = 1.0
	check(slash.follow_up != null and slash.follow_up.chained, "the swordsman's slash has a chained cut to follow it")
	brain._last_attack = slash
	brain.target = warrior
	check(brain.follow_up() and soldier.current_attack == slash.follow_up, "and he throws it at once")
	var sweep: AttackDefinition = load("res://features/enemies/definitions/maceman_swing.tres") as AttackDefinition
	check(sweep.follow_up != null and sweep.follow_up.chained and sweep.follow_chance > 0.0,
		"the mace-bearer's sweep may be followed by a second")
	await frames(40)


## The swordsman's feint: the slash shown past its glint, broken off behind his shield, then the cut.
func _test_feint() -> void:
	print("the feint")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(40, 0))
	soldier.unaware = false
	await frames(2)
	var brain: SwordsmanBrain = _brain(soldier) as SwordsmanBrain
	brain.process_mode = Node.PROCESS_MODE_DISABLED
	brain.target = warrior
	var slash: AttackDefinition = soldier.profile.attacks[SwordsmanBrain.SLASH]
	soldier.attack(slash)
	brain._feinting = true
	var guarded: bool = false
	var health: float = warrior.health
	for i: int in 60:
		await physics_frame
		brain.attacking(1.0 / 60.0)
		if soldier.state == MongolSoldier.State.GUARD:
			guarded = true
			break
	check(guarded and soldier.current_attack == null, "the slash is broken off behind his shield")
	check(warrior.health == health, "and the feinted slash never lands")
	check(brain._after_feint, "the cut is ready to come after it")
	await frames(30)


## The spearman's lunge carries his point far: it glints first, and he crosses the street behind it.
func _test_spear_lunge() -> void:
	print("the spear lunge")
	await _reset()
	var spearman: MongolSoldier = _spawn("spearman", warrior.global_position + Vector2(200, 0))
	spearman.unaware = false
	_brain(spearman).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	var lunge: AttackDefinition = spearman.profile.attacks[SpearmanBrain.LUNGE]
	check(lunge.telegraph_frame >= 0 and lunge.lunge_speed > 250.0, "the lunge glints, and carries him")
	var from: float = spearman.global_position.x
	spearman.attack(lunge)
	await frames(60)
	check(absf(spearman.global_position.x - from) > 45.0, "he crosses the street behind his point (%.0f px)"
		% absf(spearman.global_position.x - from))


## A hero who gets right up to an archer is kicked away.
func _test_archer_kick() -> void:
	print("the archer's kick")
	await _reset()
	var archer: MongolSoldier = _spawn("archer", warrior.global_position + Vector2(30, 0))
	archer.unaware = false
	await frames(2)
	var kicked: bool = false
	for i: int in 180:
		await physics_frame
		if archer.current_attack != null and archer.current_attack.animation == &"kick":
			kicked = true
			break
	check(kicked, "pressed close, the archer kicks")
	var from: float = warrior.global_position.x
	await frames(30)
	check(warrior.global_position.x < from - 10.0 or warrior.is_invulnerable(), "and the kick drives the hero off")


## A duellist (the veteran) blocks a string of blows on his raised shield, parries the next, throws the
## hero open and ripostes.
## The Kipchak skirmisher leaps back out of reach of a heavy blow, untouchable in the air (his legs need
## a rest before the next leap), and his dash is judged to end at sword's length however far he springs.
func _test_skirmisher() -> void:
	print("the skirmisher")
	await _reset()
	var skirmisher: MongolSoldier = _spawn("skirmisher", warrior.global_position + Vector2(56, 0))
	skirmisher.unaware = false
	var brain: SkirmisherBrain = _brain(skirmisher) as SkirmisherBrain
	brain.process_mode = Node.PROCESS_MODE_DISABLED
	brain.target = warrior
	await frames(4)
	warrior.set_facing(1.0)
	check(not brain._heavy_blow_coming(), "no blow wound up, nothing to leap from")
	warrior.input.enabled = true
	warrior.input.press(&"heavy_attack")
	await frames(3)
	warrior.input.enabled = false
	check(warrior.current_attack != null and brain._heavy_blow_coming(), "a cleave wound up near him is read as a heavy blow")
	check(not brain._heavy_blow_coming(), "and weighed once")
	warrior.cancel_attack()
	var from: float = skirmisher.global_position.x
	check(brain.evade() and skirmisher.untouchable, "he leaps back, untouchable in the air")
	var outcome: HitData.Outcome = skirmisher.receive_hit(_blow("res://features/warrior/definitions/heavy.tres"))
	check(outcome == HitData.Outcome.IGNORED, "a blow finds nothing while he is in the air")
	check(not brain.evade(), "and he cannot leap again at once")
	await frames(45)
	check(skirmisher.global_position.x - from > 30.0, "the leap carries him out of reach (%.0f px)"
		% (skirmisher.global_position.x - from))
	check(skirmisher.state == MongolSoldier.State.READY and not skirmisher.untouchable, "and he lands open again")
	# The dash from well off ends at sword's length.
	await _reset()
	skirmisher = _spawn("skirmisher", warrior.global_position + Vector2(110, 0))
	skirmisher.unaware = false
	_brain(skirmisher).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(4)
	var dash: AttackDefinition = skirmisher.profile.attacks[SkirmisherBrain.DASH]
	check(dash.follow_up != null and dash.follow_up.chained and not dash.follow_up.use_blade_sweep,
		"the knife may follow the dash at once")
	from = skirmisher.global_position.x
	var gap: float = from - warrior.global_position.x
	skirmisher.attack(dash)
	skirmisher.aim_lunge(gap, MongolSoldier.ATTACK_FRICTION)
	await frames(60)
	var travel: float = from - skirmisher.global_position.x
	check(absf(travel - (gap - dash.strike_at)) < 14.0, "his dash from %.0f px carries him %.0f px, to sword's length"
		% [gap, travel])


## The Georgian axeman: his hook tears a raised guard aside and drags the hero in, the butt drives a hero
## who crowds him off, the chop breaks a guard (and the low sweep may follow it at once), the sweep goes low
## (amber).
func _test_axeman() -> void:
	print("the axeman")
	await _reset()
	var axeman: MongolSoldier = _spawn("axeman", warrior.global_position + Vector2(62, 0))
	axeman.unaware = false
	_brain(axeman).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(4)
	var hook: AttackDefinition = axeman.profile.attacks[AxemanBrain.HOOK]
	check(hook.pulls and hook.guard_break and hook.telegraph_frame >= 0, "the hook glints, pulls, and tears a guard aside")
	warrior.set_facing(1.0)
	warrior.input.block_held = true
	await frames(12)
	check(warrior.is_guarding(), "the hero's shield is up")
	var outcomes: Array[HitData.Outcome] = []
	var record: Callable = func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome)
	warrior.struck.connect(record)
	var before: float = warrior.global_position.x
	axeman.attack(hook)
	await frames(45)
	warrior.input.block_held = false
	check(HitData.Outcome.GUARD_BROKEN in outcomes, "the hook tears the raised guard aside (%s)" % [outcomes])
	check(warrior.global_position.x - before > 15.0, "and drags the hero toward him (%.0f px)"
		% (warrior.global_position.x - before))
	warrior.struck.disconnect(record)
	# Crowded, the butt drives him off.
	await _reset()
	axeman = _spawn("axeman", warrior.global_position + Vector2(30, 0))
	axeman.unaware = false
	_brain(axeman).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(4)
	warrior.set_facing(1.0)
	before = warrior.global_position.x
	axeman.attack(axeman.profile.attacks[AxemanBrain.JAB])
	await frames(40)
	check(before - warrior.global_position.x > 20.0, "the butt drives a crowding hero off (%.0f px)"
		% (before - warrior.global_position.x))
	var chop: AttackDefinition = axeman.profile.attacks[AxemanBrain.CHOP]
	var sweep: AttackDefinition = axeman.profile.attacks[AxemanBrain.SWEEP]
	check(chop.guard_break and not chop.knocks_down and chop.super_armor and chop.follow_up == axeman.profile.attacks[AxemanBrain.SWEEP],
		"the chop breaks a guard, and the low sweep may follow it")
	check(sweep.low and not sweep.guard_break, "the sweep goes low, at the shins")
	await frames(20)


func _test_duellist_parry() -> void:
	print("the duellist's parry")
	await _reset()
	var veteran: MongolSoldier = _spawn("veteran", warrior.global_position + Vector2(32, 0))
	veteran.unaware = false
	await frames(2)
	var brain: EnemyBrain = _brain(veteran)
	brain.process_mode = Node.PROCESS_MODE_DISABLED
	brain.target = warrior
	veteran.guard(10.0)
	var outcomes: Array[HitData.Outcome] = []
	for i: int in 3:
		var hit: HitData = _blow("res://features/warrior/definitions/light_1.tres")
		var outcome: HitData.Outcome = veteran.receive_hit(hit)
		outcomes.append(outcome)
		if outcome == HitData.Outcome.PARRIED:
			warrior.on_hit_landed(veteran, hit, outcome)
		await frames(6)
	check(outcomes.size() == 3 and outcomes[0] == HitData.Outcome.BLOCKED and outcomes[1] == HitData.Outcome.BLOCKED
		and outcomes[2] == HitData.Outcome.PARRIED,
		"two blows turned on his shield, the third parried (%s)" % [outcomes])
	check(warrior.state == Warrior.State.HURT and warrior.sprite.animation == &"parried", "the hero is thrown open")
	brain.process_mode = Node.PROCESS_MODE_INHERIT
	brain._on_parried_blow()
	check(veteran.current_attack == veteran.profile.riposte and veteran.profile.riposte.telegraph_frame >= 0,
		"and the veteran ripostes, with a blow that glints")
	await frames(40)
	# A blow that breaks guards is never parried.
	await _reset()
	veteran = _spawn("veteran", warrior.global_position + Vector2(32, 0))
	veteran.unaware = false
	await frames(2)
	_brain(veteran).process_mode = Node.PROCESS_MODE_DISABLED
	veteran.guard(10.0)
	for i: int in 2:
		veteran.receive_hit(_blow("res://features/warrior/definitions/light_1.tres"))
		await frames(4)
	var heavy: HitData.Outcome = veteran.receive_hit(_blow("res://features/warrior/definitions/heavy.tres"))
	check(heavy == HitData.Outcome.GUARD_BROKEN, "a cleave is never parried: it breaks his guard")
	await frames(30)


func _test_finisher_choice() -> void:
	print("finishers: who and which")
	# Never the same one twice running.
	await _reset()
	var first: MongolSoldier = await _staggered("swordsman", 40.0)
	await _play_finisher(first)
	var played: StringName = warrior.sprite.animation if warrior.state == Warrior.State.FINISHER else first.sprite.animation
	await frames(30)
	var second: MongolSoldier = await _staggered("swordsman", 40.0)
	await _play_finisher(second)
	check(first.dead and second.dead and first.sprite.animation != second.sprite.animation,
		"two in a row are never the same (%s, %s)" % [played, second.sprite.animation])
	# Spearmen and archers have their halves.
	for kind: String in ["spearman", "archer"]:
		await _reset()
		var soldier: MongolSoldier = await _staggered(kind, 40.0)
		var counts: Array[int] = await _play_finisher(soldier)
		check(counts[0] == 1 and counts[2] == 1 and soldier.dead, "the %s can be finished" % kind)
	# With reduced gore, only the thrust, which cuts nothing off.
	MongolSoldier.dismemberment = false
	var spared_by: Array[StringName] = []
	for i: int in 3:
		await _reset()
		var spared: MongolSoldier = await _staggered("swordsman", 40.0)
		await _play_finisher(spared)
		spared_by.append(spared.sprite.animation)
		check(spared.dead and spared.severed == &"", "reduced gore: he dies whole (%s)" % spared.sprite.animation)
	MongolSoldier.dismemberment = true
	check(spared_by.count(&"finished_impale") == 3, "reduced gore: only the thrust is played")
	# Not one standing ready, nor one behind him, nor one out of reach.
	await _reset()
	var ready: MongolSoldier = _spawn("swordsman", Vector2(150, 0))
	await frames(20)
	ready.global_position = warrior.global_position + Vector2(40, 0)
	ready.cancel_attack()
	ready.state = MongolSoldier.State.READY
	warrior.set_facing(1.0)
	await frames(2)
	check(warrior.finisher_target == null, "a soldier on his feet cannot be finished")
	ready.stagger(3.0)
	warrior.set_facing(-1.0)
	await frames(2)
	check(warrior.finisher_target == null, "nor one at his back")
	warrior.set_facing(1.0)
	ready.global_position = warrior.global_position + Vector2(90, 0)
	await frames(2)
	check(warrior.finisher_target == null, "nor one out of reach")
	# A plain heavy press with no one to finish still cleaves.
	warrior.input.press(&"heavy_attack")
	await frames(3)
	check(warrior.current_attack != null and warrior.current_attack.animation == &"heavy", "with no one to finish, the button cleaves")
	# The Captain is never finished this way.
	await _reset()
	var captain: MongolSoldier = await _staggered("captain", 40.0)
	check(warrior.finisher_target == null, "the Captain cannot be finished like a common soldier")
	captain.queue_free()


func _test_finisher_rules() -> void:
	print("finishers: when, how, what they give")
	# A stagger on a fresh soldier (a parry) opens him to the riposte, not the finisher.
	await _reset()
	var fresh: MongolSoldier = await _staggered("swordsman", 40.0, false)
	check(warrior.finisher_target == null, "a staggered soldier still strong cannot be finished")
	fresh.take_damage(fresh.max_health * 0.55)
	await frames(2)
	check(warrior.finisher_target == fresh, "wounded to half, he can")
	# The last soldier standing gets the full finisher, and it gives back stamina.
	warrior.stamina = 10.0
	await _play_finisher(fresh)
	check(fresh.dead and warrior.finisher_cinematic, "the last soldier standing: the full finisher")
	check(warrior.stamina >= 10.0 + warrior.profile.finisher_stamina - 0.5,
		"a finisher gives back stamina (%.0f)" % warrior.stamina)
	# While another soldier near him is still in the fight, it plays quick.
	await _reset()
	var other: MongolSoldier = _spawn("swordsman", Vector2(warrior.global_position.x + 220.0, 0))
	_brain(other).process_mode = Node.PROCESS_MODE_DISABLED
	other.engaged = true
	var target: MongolSoldier = await _staggered("swordsman", 40.0)
	warrior.input.press(&"heavy_attack")
	await frames(3)
	check(warrior.state == Warrior.State.FINISHER and not warrior.finisher_cinematic, "another still fights: a quick finisher")
	check(is_equal_approx(warrior.sprite.speed_scale, Warrior.QUICK_FINISHER)
		and is_equal_approx(target.sprite.speed_scale, Warrior.QUICK_FINISHER), "both halves play quicker, in step")
	for i: int in 300:
		await physics_frame
		if warrior.state != Warrior.State.FINISHER:
			break
	check(target.dead and warrior.state == Warrior.State.IDLE, "and it ends as the full one does")


## Every blow a soldier opens with glints at least 0.22 s before it lands (a chain's follow-ups ride
## its rhythm); a low sweep (amber), which asks for a jump or a roll rather than a raised shield, and the Captain's
## opening cut, which begins his chain, a third of a second.
func _test_telegraph_lead() -> void:
	print("every blow glints in time")
	for kind: String in ["swordsman", "spearman", "archer", "captain", "veteran", "maceman", "shieldbearer", "engineer",
			"skirmisher", "axeman"]:
		var scene: PackedScene = load("res://features/enemies/%s.tscn" % kind)
		var soldier: MongolSoldier = scene.instantiate() as MongolSoldier
		var strips: SpriteFrames = (soldier.get_node("Sprite") as AnimatedSprite2D).sprite_frames
		for attack: AttackDefinition in soldier.profile.attacks:
			if attack.chained:
				continue
			var strike: int = attack.projectile_frame if attack.projectile_frame >= 0 else attack.active_from
			var lead: float = 0.0
			for i: int in range(maxi(attack.telegraph_frame, 0), strike):
				lead += strips.get_frame_duration(attack.animation, i) / strips.get_animation_speed(attack.animation)
			var opener: bool = attack.resource_path.ends_with("captain_slash_a.tres")
			var least: float = 0.329 if attack.tell() == AttackDefinition.Tell.LOW or opener else 0.219
			check(attack.telegraph_frame >= 0 and lead >= least,
				"%s, %s: glints %.0f ms before it lands (at least %.0f)" % [kind, attack.display_name, lead * 1000.0,
					least * 1000.0])
		soldier.free()


## A low sweep (the spearman's, unless another `kind` and his `sweep` are named) at a hero standing `gap` px before
## him; returns the outcomes it met.
func _sweep_at(gap: float, block: bool, jump: bool, kind: String = "spearman",
		sweep: String = "spearman_sweep") -> Array[HitData.Outcome]:
	await _reset()
	var spearman: MongolSoldier = _spawn(kind, Vector2(warrior.global_position.x + gap, 0))
	_brain(spearman).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(10)
	spearman.global_position = warrior.global_position + Vector2(gap, 0)
	spearman.velocity = Vector2.ZERO
	spearman.set_facing(-1.0)
	spearman.cancel_attack()
	spearman.state = MongolSoldier.State.READY
	warrior.set_facing(1.0)
	warrior.input.block_held = block
	await frames(12)
	var outcomes: Array[HitData.Outcome] = []
	warrior.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	if jump:
		spearman.telegraphed.connect(func(_a: AttackDefinition) -> void:
			warrior.input.press(&"jump")
			warrior.input.jump_held = true)
	spearman.attack(load("res://features/enemies/definitions/%s.tres" % sweep) as AttackDefinition)
	await frames(60)
	warrior.input.block_held = false
	warrior.input.jump_held = false
	return outcomes


func _test_low_sweep() -> void:
	print("the low sweep")
	var blocked: Array[HitData.Outcome] = await _sweep_at(40.0, true, false)
	check(HitData.Outcome.HIT in blocked and not HitData.Outcome.BLOCKED in blocked and not HitData.Outcome.PARRIED in blocked,
		"a raised shield does not stop it")
	var jumped: Array[HitData.Outcome] = await _sweep_at(40.0, false, true)
	check(jumped.is_empty(), "a jump at its amber glint clears it")
	# Every amber sweep, the axeman's and the Captain's too: it lands into the time a jump hangs in the air.
	for pair: Array in [["axeman", "axeman_sweep"], ["captain", "captain_sweep"]]:
		var kind: String = pair[0]
		var sweep: String = pair[1]
		var standing: Array[HitData.Outcome] = await _sweep_at(40.0, false, false, kind, sweep)
		var cleared: Array[HitData.Outcome] = await _sweep_at(40.0, false, true, kind, sweep)
		check(HitData.Outcome.HIT in standing and cleared.is_empty(),
			"the %s's sweep: it takes a man who stands, and a jump at its glint clears it (%s, %s)" % [kind, standing, cleared])


func _test_guard_turn() -> void:
	print("a guard turns slowly")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", Vector2(150, 0))
	await frames(20)
	soldier.global_position = warrior.global_position + Vector2(36, 0)
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	soldier.set_facing(-1.0)
	soldier.guard(2.0)
	# Round behind him (as a roll through him puts him): he takes a moment to turn his guard.
	warrior.global_position = soldier.global_position + Vector2(28, 0)
	warrior.set_facing(-1.0)
	await frames(6)
	check(soldier.facing < 0.0, "he has not turned yet")
	var outcomes: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.input.press(&"attack")
	await frames(16)
	check(HitData.Outcome.HIT in outcomes, "a cut at his back lands")
	# Left alone behind his shield, he does turn.
	await _reset()
	var sentry: MongolSoldier = _spawn("swordsman", Vector2(150, 0))
	await frames(20)
	sentry.global_position = warrior.global_position + Vector2(36, 0)
	sentry.cancel_attack()
	sentry.state = MongolSoldier.State.READY
	sentry.set_facing(-1.0)
	sentry.guard(2.0)
	warrior.global_position = sentry.global_position + Vector2(40, 0)
	await frames(45)
	check(sentry.facing > 0.0, "given time, his guard comes round (%.1f s)" % EnemyBrain.GUARD_TURN)


## A soldier `gap` px before the hero, his brain still (so the test decides what he does).
func _held(kind: String, gap: float) -> MongolSoldier:
	var soldier: MongolSoldier = _spawn(kind, Vector2(warrior.global_position.x + gap, 0))
	_brain(soldier).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(10)
	soldier.global_position = warrior.global_position + Vector2(gap, 0)
	soldier.velocity = Vector2.ZERO
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	# He has seen the hero (a blow on a man who has not kills him outright).
	soldier.unaware = false
	soldier.set_facing(-1.0)
	warrior.set_facing(1.0)
	return soldier


func _test_bash() -> void:
	print("the shield bash")
	await _reset()
	var soldier: MongolSoldier = await _held("swordsman", 34.0)
	soldier.guard(2.0)
	var outcomes: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.input.block_held = true
	await frames(8)
	warrior.input.press(&"heavy_attack")
	await frames(3)
	check(warrior.current_attack != null and warrior.current_attack.animation == &"bash", "heavy behind the shield bashes")
	await frames(20)
	warrior.input.block_held = false
	check(HitData.Outcome.GUARD_BROKEN in outcomes, "the bash breaks his guard")
	check(soldier.state == MongolSoldier.State.STAGGER, "and leaves him reeling")
	# One with no guard up is shoved back.
	await _reset()
	var other: MongolSoldier = await _held("swordsman", 34.0)
	var start: float = other.global_position.x
	warrior.input.block_held = true
	await frames(8)
	warrior.input.press(&"heavy_attack")
	await frames(30)
	warrior.input.block_held = false
	check(other.global_position.x > start + 14.0, "the bash shoves a man back (%.0f px)" % (other.global_position.x - start))
	# The light button follows a bash with the combo.
	warrior.input.press(&"heavy_attack")
	await frames(1)


func _test_plunge() -> void:
	print("the plunge")
	var plunge: AttackDefinition = load("res://features/warrior/definitions/plunge.tres")
	# From above onto a man at his plunder: he never sees it.
	await _reset()
	var looter: MongolSoldier = _spawn_busy("swordsman", Vector2(warrior.global_position.x + 120.0, 0), 1.0, &"loot")
	await frames(20)
	warrior.global_position = looter.global_position + Vector2(-4, -110)
	warrior.velocity = Vector2.ZERO
	warrior.set_facing(1.0)
	await frames(1)
	warrior.input.press(&"heavy_attack")
	await frames(3)
	check(warrior.state == Warrior.State.PLUNGE, "heavy in the air begins the plunge")
	var landed: Array[int] = [0]
	warrior.plunge_landed.connect(func() -> void: landed[0] += 1)
	for i: int in 120:
		await physics_frame
		if landed[0] > 0:
			break
	await frames(4)
	check(landed[0] == 1 and warrior.current_attack != null and warrior.current_attack.animation == &"plunge_land",
		"he lands on the blade")
	check(looter.dead and looter.killing_hit != null and looter.killing_hit.surprise, "a man who never saw it dies of it")
	await frames(40)
	check(warrior.state == Warrior.State.IDLE, "and rises")
	# On one who has seen him: a heavy blow through a raised guard.
	await _reset()
	var soldier: MongolSoldier = await _held("swordsman", 80.0)
	soldier.guard(3.0)
	var health: float = soldier.health
	var outcomes: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.global_position = soldier.global_position + Vector2(-4, -110)
	warrior.velocity = Vector2.ZERO
	await frames(1)
	warrior.input.press(&"heavy_attack")
	for i: int in 120:
		await physics_frame
		if warrior.state == Warrior.State.ATTACK:
			break
	await frames(10)
	check(HitData.Outcome.GUARD_BROKEN in outcomes or soldier.health <= health - plunge.damage + 0.1,
		"the falling blade breaks through his guard (%s)" % str(outcomes.map(func(o: HitData.Outcome) -> String:
			return HitData.outcome_name(o))))


func _test_veteran() -> void:
	print("the keshig veteran")
	await _reset()
	var veteran: MongolSoldier = await _held("veteran", 36.0)
	var brain: VeteranBrain = _brain(veteran) as VeteranBrain
	brain.process_mode = Node.PROCESS_MODE_INHERIT
	brain._cooldown = 0.0
	var swings: Array[StringName] = []
	var glints: Array[StringName] = []
	veteran.swung.connect(func(a: AttackDefinition) -> void: swings.append(a.animation))
	veteran.telegraphed.connect(func(a: AttackDefinition) -> void: glints.append(a.animation))
	await frames(1)
	check(brain.try_attack(veteran.profile.attacks[SwordsmanBrain.CUT]), "he opens with the quick cut")
	brain._chain = true
	for i: int in 150:
		await physics_frame
		if swings.has(&"cut_b"):
			break
	check(swings.has(&"cut") and swings.has(&"cut_b"), "the backhand follows it (%s)" % str(swings))
	check(glints.has(&"cut") and not glints.has(&"cut_b"), "only the first glints: the second rides its rhythm")


func _test_maceman() -> void:
	print("the mace-bearer")
	var smash: AttackDefinition = load("res://features/enemies/definitions/maceman_smash.tres")
	await _reset()
	var mace: MongolSoldier = await _held("maceman", 40.0)
	var health: float = mace.health
	warrior.input.press(&"attack")
	await frames(14)
	check(mace.health < health and mace.state != MongolSoldier.State.HURT, "a light cut wounds him but does not make him flinch")
	# His overhead blow breaks a raised shield.
	await _reset()
	var other: MongolSoldier = await _held("maceman", 40.0)
	var outcomes: Array[HitData.Outcome] = []
	warrior.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.input.block_held = true
	await frames(30)
	other.attack(smash)
	await frames(60)
	warrior.input.block_held = false
	check(HitData.Outcome.GUARD_BROKEN in outcomes, "his overhead blow breaks a raised shield")
	# Staggered and wounded, he can be finished like any common soldier.
	await _reset()
	var spent: MongolSoldier = await _staggered("maceman", 40.0)
	check(warrior.finisher_target == spent, "staggered and wounded, he can be finished")


func _test_shieldbearer() -> void:
	print("the shield-bearer")
	await _reset()
	var wall: MongolSoldier = await _held("shieldbearer", 38.0)
	var outcomes: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	var health: float = wall.health
	warrior.input.press(&"attack")
	await frames(24)
	check(HitData.Outcome.BLOCKED in outcomes and wall.health == health, "his shield turns a cut")
	outcomes.clear()
	await frames(20)
	warrior.input.press(&"heavy_attack")
	await frames(45)
	check(HitData.Outcome.BLOCKED in outcomes and not HitData.Outcome.GUARD_BROKEN in outcomes,
		"and the heavy cleave too")
	# Strings beaten on his wall, kicks and all, hardly wear him: it takes what is meant to open it.
	outcomes.clear()
	await frames(30)
	wall.state = MongolSoldier.State.READY
	wall.poise = wall.max_poise
	for string: int in 2:
		for step: int in 4:
			warrior.input.press(&"attack")
			await frames(18)
		await frames(30)
	check(HitData.Outcome.BLOCKED in outcomes and wall.state != MongolSoldier.State.STAGGER
		and wall.poise > wall.max_poise * 0.5,
		"two strings beaten on his wall leave him standing (poise %.0f of %.0f)" % [wall.poise, wall.max_poise])
	outcomes.clear()
	await frames(30)
	wall.state = MongolSoldier.State.READY
	warrior.input.block_held = true
	await frames(8)
	warrior.input.press(&"heavy_attack")
	await frames(24)
	warrior.input.block_held = false
	check(HitData.Outcome.GUARD_BROKEN in outcomes and wall.state == MongolSoldier.State.STAGGER, "the shield bash breaks his wall")
	# From behind, a cut gets past it; he turns slowly under its weight.
	await _reset()
	var other: MongolSoldier = await _held("shieldbearer", 38.0)
	var behind: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: behind.append(outcome))
	# In the fight (he has seen the hero before him), then the hero gets round him.
	warrior._invulnerable = 5.0
	_brain(other).process_mode = Node.PROCESS_MODE_INHERIT
	await frames(50)
	warrior.global_position = other.global_position + Vector2(30, 0)
	warrior.set_facing(-1.0)
	warrior._invulnerable = 0.0
	await frames(4)
	check(other.facing < 0.0, "he has not turned yet")
	warrior.input.press(&"attack")
	await frames(16)
	check(HitData.Outcome.HIT in behind, "a cut at his back gets past the shield")


func _test_engineer() -> void:
	print("the siege engineer")
	await _reset()
	var engineer: MongolSoldier = _spawn("engineer", Vector2(warrior.global_position.x + 170.0, 0))
	var pots: Array[int] = [0]
	engineer.projectile_spawned.connect(func(p: Node2D) -> void:
		if p is FirePot:
			pots[0] += 1)
	var outcomes: Array[HitData.Outcome] = []
	warrior.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	# Behind a raised shield the pot breaks on it, but the fire takes at his feet.
	warrior.set_facing(1.0)
	warrior.input.block_held = true
	var health: float = warrior.health
	var fire_seen: bool = false
	for i: int in 420:
		await physics_frame
		if not get_nodes_in_group(&"hazards").is_empty():
			fire_seen = true
		if fire_seen and warrior.health < health:
			break
	warrior.input.block_held = false
	check(pots[0] > 0, "he throws a fire pot")
	check(HitData.Outcome.BLOCKED in outcomes, "a raised shield takes the pot")
	check(fire_seen, "the naphtha burns where it broke")
	check(warrior.health < health, "and no shield keeps out the fire (%.0f)" % warrior.health)
	# The soldiers' fire spares a soldier on his feet, but not one the hero throws into it.
	await _reset()
	var fire: BurningGround = (load("res://features/enemies/burning_ground.tscn") as PackedScene).instantiate() as BurningGround
	fire.position = warrior.global_position + Vector2(140, 0)
	sandbox.add_child(fire)
	var standing: MongolSoldier = _spawn("swordsman", fire.position + Vector2(-4, 0))
	standing.unaware = false
	_brain(standing).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(40)
	check(standing.health == standing.max_health, "a soldier standing in his own side's fire keeps his feet out of it")
	standing.queue_free()
	var thrown: MongolSoldier = _spawn("swordsman", fire.position + Vector2(4, 0))
	thrown.unaware = false
	_brain(thrown).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(2)
	thrown.stagger(2.0)
	var before: float = thrown.health
	await frames(40)
	check(thrown.health < before, "a soldier thrown into it burns (%.0f of %.0f)" % [thrown.health, before])


## Puts the captain at `distance` in front of the hero, ready, facing him.
func _test_surprise() -> void:
	print("a soldier at his plunder")
	await _reset()
	var home: Vector2 = warrior.global_position + Vector2(90, 0)
	# Kneeling at a chest with his back to the hero, he neither sees nor hears him behind.
	var soldier: MongolSoldier = _spawn_busy("swordsman", Vector2(home.x, 0), 1.0, &"loot")
	await frames(40)
	check(soldier.sprite.animation == &"loot", "he is at his plunder")
	check(not _noticed(soldier), "he has not noticed the hero behind him")
	check(absf(soldier.global_position.x - home.x) < 1.0, "he stays at his task")
	check(soldier.unaware, "he can be taken unawares")
	# A first blow he never sees coming kills him, and takes his head.
	var surprised: Array[bool] = [false]
	soldier.surprised.connect(func() -> void: surprised[0] = true)
	soldier.global_position = warrior.global_position + Vector2(40, 0)
	warrior.set_facing(1.0)
	warrior.input.press(&"attack")
	await frames(24)
	check(surprised[0], "the blow takes him by surprise")
	check(soldier.dead, "a blow he never saw coming kills him")
	check(soldier.severed == &"head" and soldier.sprite.animation == &"death_head", "it takes his head")
	# A soldier who sees the hero coming cannot be taken that way.
	await _reset()
	var guard: MongolSoldier = _spawn_busy("swordsman", Vector2(warrior.global_position.x + 90.0, 0), -1.0, &"chat")
	await frames(30)
	guard.global_position = warrior.global_position + Vector2(40, 0)
	warrior.set_facing(1.0)
	await frames(4)
	warrior.input.press(&"attack")
	await frames(24)
	check(not guard.dead, "a soldier facing the hero is not killed by one blow")


## As a player would: run up behind a looter and strike, pressing attack at any sensible distance.
func _test_sneak_attack() -> void:
	print("sneaking up")
	for press_at: float in [52.0, 44.0, 36.0, 28.0, 20.0]:
		await _reset()
		var looter: MongolSoldier = _spawn_busy("swordsman", Vector2(warrior.global_position.x + 220.0, 0), 1.0, &"loot")
		await frames(20)
		var pressed: bool = false
		for i: int in 150:
			await physics_frame
			if pressed:
				warrior.input.move = 0.0
				if looter.dead:
					break
				continue
			warrior.input.move = 1.0
			if looter.global_position.x - warrior.global_position.x <= press_at:
				warrior.input.press(&"attack")
				pressed = true
		warrior.input.move = 0.0
		check(looter.dead and looter.killing_hit != null and looter.killing_hit.surprise,
			"run up and strike from %.0f px: he dies unawares" % press_at)


func _test_dismemberment() -> void:
	print("cut down")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", Vector2(150, 0))
	await frames(20)
	soldier.take_damage(soldier.max_health - 5.0)
	soldier.global_position = warrior.global_position + Vector2(38, 0)
	soldier.cancel_attack()
	soldier.state = MongolSoldier.State.READY
	warrior.set_facing(1.0)
	warrior.input.press(&"heavy_attack")
	await frames(45)
	check(soldier.dead, "the cleave kills him")
	check(soldier.severed == &"waist" or soldier.severed == &"head", "the cleave cuts him apart (%s)" % soldier.severed)
	check(soldier.sprite.animation == StringName("death_%s" % soldier.severed), "he falls in pieces")
	check(soldier.gore_set != null and not soldier.gore_set.pieces_of(soldier.severed).is_empty()
		and soldier.gore_set.wound(soldier.sprite.animation, 0) != Vector2.INF, "his gore set has the pieces and the wound")
	# With reduced gore the same blow kills him whole.
	await _reset()
	MongolSoldier.dismemberment = false
	var other: MongolSoldier = _spawn("swordsman", Vector2(150, 0))
	await frames(20)
	other.take_damage(other.max_health - 5.0)
	other.global_position = warrior.global_position + Vector2(38, 0)
	other.cancel_attack()
	other.state = MongolSoldier.State.READY
	warrior.set_facing(1.0)
	warrior.input.press(&"heavy_attack")
	await frames(45)
	MongolSoldier.dismemberment = true
	check(other.dead and other.severed == &"" and other.sprite.animation == &"death", "reduced gore: he falls whole")


func _test_execution() -> void:
	print("an execution")
	await _reset()
	# Once the hero can see it, the count runs; then the stroke falls and he turns on the hero.
	var headsman: MongolSoldier = _spawn_busy("swordsman", Vector2(warrior.global_position.x + 200.0, 0), 1.0, &"execute")
	headsman.set_meta(&"delay", 0.6)
	var strokes: Array[int] = [0]
	headsman.executed.connect(func() -> void: strokes[0] += 1)
	await frames(20)
	check(headsman.sprite.animation == &"execute", "he holds his sabre over the captive")
	await frames(90)
	check(strokes[0] == 1, "the stroke falls when the count runs out")
	await frames(60)
	check(_noticed(headsman) and headsman.facing < 0.0, "then he turns on the hero")
	# One killed in time never strikes.
	await _reset()
	var other: MongolSoldier = _spawn_busy("swordsman", Vector2(warrior.global_position.x + 200.0, 0), 1.0, &"execute")
	other.set_meta(&"delay", 0.6)
	var fell: Array[int] = [0]
	other.executed.connect(func() -> void: fell[0] += 1)
	await frames(10)
	other.take_damage(other.max_health + 1.0)
	await frames(90)
	check(fell[0] == 0, "a headsman killed in time never strikes")


func _test_busy_senses() -> void:
	print("busy eyes, watchful eyes")
	await _reset()
	# Talking by a fire, facing the hero, a spearman sees half as far as he would on guard.
	var talker: MongolSoldier = _spawn_busy("spearman", Vector2(warrior.global_position.x + 170.0, 0), -1.0, &"chat")
	await frames(30)
	check(talker.sprite.animation == &"chat", "he talks, leaning on his spear")
	check(not _noticed(talker), "busy, he does not see the hero at 170 px")
	talker.global_position.x = warrior.global_position.x + 100.0
	await frames(10)
	check(_noticed(talker), "he sees him nearer")
	await _reset()
	# A sentry on watch is busy only with looking: he sees as far as ever.
	var sentry: MongolSoldier = _spawn_busy("archer", Vector2(warrior.global_position.x + 300.0, 0), -1.0, &"watch")
	await frames(30)
	check(_noticed(sentry), "an archer on watch sees the hero at 300 px")


func _test_alarm() -> void:
	print("the alarm")
	await _reset()
	# A sentry facing the hero sees him; his shout turns a comrade busy at a fire behind him.
	var sentry: MongolSoldier = _spawn("swordsman", Vector2(warrior.global_position.x + 200.0, 0))
	var burner: MongolSoldier = _spawn_busy("swordsman", Vector2(warrior.global_position.x + 330.0, 0), 1.0, &"burn")
	var far: MongolSoldier = _spawn_busy("swordsman", Vector2(warrior.global_position.x + 700.0, 0), 1.0, &"loot")
	await frames(40)
	check(_noticed(sentry), "the sentry sees the hero")
	check(_noticed(burner), "his shout brings the burner into the fight")
	check(burner.sprite.animation != &"burn", "the burner leaves his fire")
	check(not _noticed(far), "a soldier out of earshot keeps at his task")


func _face_off(captain: MongolSoldier, distance: float) -> void:
	captain.global_position = warrior.global_position + Vector2(distance, 0)
	captain.velocity = Vector2.ZERO
	captain.cancel_attack()
	captain.untouchable = false
	captain.state = MongolSoldier.State.READY
	captain.set_facing(-1.0)
	warrior.set_facing(1.0)
	await frames(2)


## Waits until the hero's attack `animation` reaches `frame` (or `limit` frames pass).
func _until(animation: StringName, frame: int, limit: int = 40) -> void:
	for i: int in limit:
		if warrior.sprite.animation == animation and warrior.sprite.frame >= frame:
			return
		await physics_frame


func _test_pommel_on_soldiers() -> void:
	print("the pommel strike")
	# Through a raised guard: it knocks the guard aside.
	await _reset()
	var guarded: MongolSoldier = await _held("swordsman", 34.0)
	var outcomes: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.input.press(&"attack")
	await _until(&"attack_1", 2)
	guarded.cancel_attack()
	guarded.state = MongolSoldier.State.READY
	guarded.guard(2.0)
	warrior.input.press(&"heavy_attack")
	await frames(24)
	check(HitData.Outcome.GUARD_BROKEN in outcomes and guarded.state == MongolSoldier.State.STAGGER,
		"the pommel strike knocks a raised guard aside")
	# On a fresh man: the cut and the pommel together stagger him, where two cuts do not.
	await _reset()
	var fresh: MongolSoldier = await _held("swordsman", 34.0)
	warrior.input.press(&"attack")
	await _until(&"attack_1", 2)
	warrior.input.press(&"heavy_attack")
	await frames(30)
	check(fresh.state == MongolSoldier.State.STAGGER, "the cut and the pommel stagger a fresh swordsman")


func _test_whirl_on_soldiers() -> void:
	print("the whirling cut")
	await _reset()
	var before: MongolSoldier = await _held("swordsman", 36.0)
	var behind: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(-34, 0), 1.0)
	_brain(behind).process_mode = Node.PROCESS_MODE_DISABLED
	behind.unaware = false
	await frames(2)
	behind.global_position = warrior.global_position + Vector2(-34, 0)
	var health: Array[float] = [before.health, behind.health]
	var start: float = behind.global_position.x
	warrior.input.press(&"attack")
	await _until(&"attack_1", 2)
	warrior.input.press(&"attack")
	await _until(&"attack_2", 2)
	warrior.input.press(&"heavy_attack")
	await _until(&"whirling_cut", 3)
	await frames(12)
	check(before.health < health[0] and behind.health < health[1], "the whirling cut strikes the men on both sides")
	check(behind.global_position.x < start - 6.0, "and throws the man behind away behind him (%.0f px)"
		% (start - behind.global_position.x))


func _test_delayed_cut_on_guard() -> void:
	print("the delayed cut")
	# A swordsman in the fight, his shield up against the hero's string: the beat fools him.
	for feint: bool in [true, false]:
		await _reset()
		var soldier: MongolSoldier = _spawn("swordsman", Vector2(warrior.global_position.x + 120.0, 0))
		warrior._invulnerable = 8.0
		await frames(40)
		soldier.global_position = warrior.global_position + Vector2(34, 0)
		soldier.velocity = Vector2.ZERO
		soldier.cancel_attack()
		soldier.state = MongolSoldier.State.READY
		soldier.set_facing(-1.0)
		warrior.set_facing(1.0)
		soldier.guard(3.0)
		await frames(2)
		var outcomes: Array[HitData.Outcome] = []
		warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
		if feint:
			warrior.moves.delay_window = 0.3
		warrior.input.press(&"attack")
		await frames(2)
		var played: AttackDefinition = warrior.current_attack
		await frames(22)
		if feint:
			check(played == warrior.profile.delayed_cut, "a beat after the rising cut, the delayed cut")
			check(HitData.Outcome.HIT in outcomes, "he takes the string for over and lowers his shield: the cut lands")
		else:
			check(HitData.Outcome.BLOCKED in outcomes, "without the beat, his raised guard turns the cut")


func _test_charge_on_soldiers() -> void:
	print("the charged cleave")
	var charged: Array[AttackDefinition] = warrior.profile.charged_cleaves
	# The second level breaks a shield-bearer's wall.
	await _reset()
	var wall: MongolSoldier = await _held("shieldbearer", 40.0)
	var outcomes: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	await _charge(charged[0])
	await frames(20)
	check(HitData.Outcome.GUARD_BROKEN in outcomes and (wall.state == MongolSoldier.State.STAGGER
		or wall.state == MongolSoldier.State.DOWN), "the charged cleave breaks a shield wall (and throws him down)")
	# The third goes through a raised guard whole, and the men about him flinch; a mace-bearer does not.
	await _reset()
	var guarded: MongolSoldier = await _held("swordsman", 40.0)
	var beside: MongolSoldier = _spawn("swordsman", warrior.global_position + Vector2(-40, 0), 1.0)
	var mace: MongolSoldier = _spawn("maceman", warrior.global_position + Vector2(-58, 0), 1.0)
	for other: MongolSoldier in [beside, mace]:
		_brain(other).process_mode = Node.PROCESS_MODE_DISABLED
		other.unaware = false
	await frames(2)
	beside.global_position = warrior.global_position + Vector2(-40, 0)
	mace.global_position = warrior.global_position + Vector2(-58, 0)
	var hits: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: hits.append(outcome))
	var health: float = guarded.health
	guarded.guard(5.0)
	var flinched: Array[bool] = [false, false]
	beside.state_changed.connect(func(state: MongolSoldier.State) -> void:
		flinched[0] = flinched[0] or state == MongolSoldier.State.HURT)
	mace.state_changed.connect(func(state: MongolSoldier.State) -> void:
		flinched[1] = flinched[1] or state == MongolSoldier.State.HURT)
	await _charge(charged[1])
	await frames(20)
	check(HitData.Outcome.HIT in hits and absf(guarded.health - (health - charged[1].damage)) < 0.1,
		"the full charged cleave goes through a raised guard whole (%.0f)" % guarded.health)
	check(flinched[0], "the man beside him flinches from the blow")
	check(not flinched[1], "a mace-bearer does not")


## Holds the heavy button until the cleave reaches `attack`, then lets go.
func _charge(attack: AttackDefinition) -> void:
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	var need: float = warrior.profile.charge_times.x if attack == warrior.profile.charged_cleaves[0] else warrior.profile.charge_times.y
	for i: int in 200:
		await physics_frame
		if warrior.state == Warrior.State.CHARGE and warrior._state_time >= need + 0.05:
			break
	warrior.input.heavy_held = false
	await frames(2)


func _test_running_thrust_on_soldier() -> void:
	print("the running thrust")
	await _reset()
	var soldier: MongolSoldier = await _held("spearman", 110.0)
	var health: float = soldier.health
	warrior.input.move = 1.0
	await frames(20)
	warrior.input.press(&"heavy_attack")
	await frames(1)
	warrior.input.move = 0.0
	await frames(40)
	check(soldier.health < health, "the running thrust reaches a spearman (%.0f)" % soldier.health)
	check(soldier.global_position.x > warrior.global_position.x, "and ends in him, short of his far side")


func _test_arts_on_soldiers() -> void:
	print("the Arts against soldiers")
	# The Storm of Blades among three: all are cut, and thrown away on their own sides.
	await _reset()
	var front: MongolSoldier = await _held("swordsman", 36.0)
	var back: MongolSoldier = _spawn("spearman", warrior.global_position + Vector2(-36, 0), 1.0)
	_brain(back).process_mode = Node.PROCESS_MODE_DISABLED
	back.unaware = false
	await frames(2)
	back.global_position = warrior.global_position + Vector2(-36, 0)
	var health: Array[float] = [front.health, back.health]
	warrior.art_slots = [&"storm"]
	warrior.set_resolve(50.0)
	warrior.input.press(&"art")
	await frames(110)
	check(front.dead and back.dead, "the Storm of Blades kills the common men on both sides who stay in it")
	# Tougher men: drawn in by the turns, then thrown down and away by the rising cut.
	await _reset()
	var big: MongolSoldier = await _held("swordsman", 36.0)
	var behind: MongolSoldier = _spawn("spearman", warrior.global_position + Vector2(-36, 0), 1.0)
	_brain(behind).process_mode = Node.PROCESS_MODE_DISABLED
	behind.unaware = false
	for man: MongolSoldier in [big, behind]:
		man.max_health = 500.0
		man.health = 500.0
	await frames(2)
	behind.global_position = warrior.global_position + Vector2(-36, 0)
	var start: float = behind.global_position.x
	warrior.art_slots = [&"storm"]
	warrior.set_resolve(50.0)
	warrior.input.press(&"art")
	var drawn: float = INF
	var thrown: Array[bool] = [false, false]
	for i: int in 130:
		await physics_frame
		if warrior.sprite.animation == &"art_storm":
			drawn = minf(drawn, absf(big.global_position.x - warrior.global_position.x))
		thrown[0] = thrown[0] or big.is_down()
		thrown[1] = thrown[1] or behind.is_down()
	check(drawn <= 36.0, "its turns draw a man in, never throw him clear (%.0f px)" % drawn)
	check(thrown[0] and thrown[1] and behind.global_position.x < start - 10.0,
		"and its rising cut throws the men on both sides down and away")
	check(500.0 - big.health >= 70.0, "a man who stays in it takes the turns' worth (%.0f)" % (500.0 - big.health))
	# The Piercing Line through three men in a row: each struck as he passes, and all their wounds open together.
	await _reset()
	var line: Array[MongolSoldier] = []
	for gap: float in [40.0, 75.0, 110.0]:
		var man: MongolSoldier = await _held("swordsman", gap)
		man.max_health = 300.0
		man.health = 300.0
		line.append(man)
	var opened: Array[int] = [0]
	warrior.wounds_opened.connect(func(targets: Array[Combatant]) -> void: opened[0] = targets.size())
	warrior.art_slots = [&"pierce"]
	warrior.set_resolve(50.0)
	var from: float = warrior.global_position.x
	warrior.input.press(&"art")
	await frames(70)
	var all_struck: bool = true
	var all_down: bool = true
	for man: MongolSoldier in line:
		all_struck = all_struck and man.health <= 300.0 - 50.0
		all_down = all_down and (man.is_down() or man.state == MongolSoldier.State.DOWN)
	check(all_struck and opened[0] == 3, "the Line cuts every man in a row, and their wounds open together (%d)" % opened[0])
	check(all_down, "the wounds opening throw them down")
	check(warrior.global_position.x - from >= 150.0 and warrior.global_position.x > line[2].global_position.x,
		"he ends beyond the last of them (%.0f px)" % (warrior.global_position.x - from))
	await frames(60)
	# The Piercing Line goes through a shield wall and ends behind it.
	await _reset()
	var wall: MongolSoldier = await _held("shieldbearer", 50.0)
	var outcomes: Array[HitData.Outcome] = []
	warrior.hit_landed.connect(func(_t: Combatant, _h: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	warrior.art_slots = [&"pierce"]
	warrior.set_resolve(50.0)
	warrior.input.press(&"art")
	await frames(50)
	check(HitData.Outcome.GUARD_BROKEN in outcomes and warrior.global_position.x > wall.global_position.x,
		"the Piercing Line breaks through a shield wall and ends behind it")
	# The naphtha fire burns soldiers through their shields, staggering each the first time.
	await _reset()
	var guarded: MongolSoldier = await _held("swordsman", 90.0)
	guarded.guard(4.0)
	var burned: float = guarded.health
	var fire: BurningGround = (load("res://features/warrior/naft_fire.tscn") as PackedScene).instantiate() as BurningGround
	sandbox.add_child(fire)
	fire.global_position = guarded.global_position
	await frames(6)
	check(guarded.health < burned and guarded.is_burning(), "the naphtha burns through a shield and sets him ablaze")
	# It burns the hero too.
	warrior.global_position = fire.global_position
	var hero_health: float = warrior.health
	await frames(40)
	check(warrior.health < hero_health, "and it burns the hero who walks into it")
	fire.queue_free()
	# Greek fire sets a man ablaze: he runs burning, harmed as he goes, and sets alight the comrade he meets.
	await _reset()
	var torch: MongolSoldier = await _held("swordsman", 60.0)
	var mate: MongolSoldier = await _held("swordsman", 76.0)
	for man: MongolSoldier in [torch, mate]:
		man.max_health = 400.0
		man.health = 400.0
	var naft: BurningGround = (load("res://features/warrior/naft_fire.tscn") as PackedScene).instantiate() as BurningGround
	sandbox.add_child(naft)
	naft.global_position = torch.global_position + Vector2(-50.0, 0.0)
	var torch_from: float = torch.global_position.x
	await frames(10)
	check(torch.is_burning() and torch.state == MongolSoldier.State.ACTING, "a man caught in the naphtha is set ablaze")
	await frames(50)
	check(torch.global_position.x > torch_from + 20.0, "and runs burning, away from the fire's heart")
	check(torch.health < 400.0 - 20.0, "harmed as he burns (%.0f)" % (400.0 - torch.health))
	check(mate.is_burning(), "and sets alight the comrade he runs into")
	check(not _brain(torch).can_attack_now(), "a burning man strikes no blow")
	naft.queue_free()
	await frames(10)
	# No soldier walks into fire.
	await _reset()
	var wary: MongolSoldier = await _held("swordsman", 60.0)
	var wall_of_fire: BurningGround = (load("res://features/warrior/naft_fire.tscn") as PackedScene).instantiate() as BurningGround
	sandbox.add_child(wall_of_fire)
	wall_of_fire.global_position = wary.global_position + Vector2(-80.0, 0.0)
	await frames(2)
	check(not _brain(wary).can_step(-1.0) and _brain(wary).can_step(1.0), "no soldier steps into the fire")
	wall_of_fire.queue_free()
	await frames(4)


func _test_judgment() -> void:
	print("the Judgment of the Guard")
	# A fresh common soldier is finished where he stands.
	await _reset()
	var soldier: MongolSoldier = await _held("swordsman", 40.0)
	warrior.art_slots = [&"judgment"]
	warrior.set_resolve(100.0)
	var started: Array[int] = [0]
	warrior.finisher_started.connect(func(_t: Combatant, _f: FinisherDefinition) -> void: started[0] += 1)
	warrior.input.press(&"art")
	await frames(4)
	check(started[0] == 1 and warrior.state == Warrior.State.FINISHER and warrior.finisher_cinematic,
		"a fresh swordsman is finished where he stands, in full")
	check(warrior.resolve == 0.0, "for a full bar of resolve")
	for i: int in 200:
		await physics_frame
		if soldier.dead and warrior.state != Warrior.State.FINISHER:
			break
	check(soldier.dead, "and he dies of it")
	# Three men near him are judged one after another.
	await _reset()
	var three: Array[MongolSoldier] = []
	for gap: float in [40.0, -60.0, 110.0]:
		var man: MongolSoldier = await _held("swordsman", gap)
		three.append(man)
	warrior.art_slots = [&"judgment"]
	warrior.set_resolve(100.0)
	var ended: Array[bool] = [false]
	warrior.judgment_ended.connect(func() -> void: ended[0] = true)
	warrior.input.press(&"art")
	for i: int in 600:
		await physics_frame
		if ended[0]:
			break
	check(three[0].dead and three[1].dead and three[2].dead and ended[0],
		"the Judgment takes three men, one after another")
	check(warrior.resolve == 0.0, "for one full bar of resolve")
	await frames(30)
	# A hardened man still fresh takes one great blow instead.
	await _reset()
	var veteran: MongolSoldier = await _held("veteran", 40.0)
	var health: float = veteran.health
	warrior.art_slots = [&"judgment"]
	warrior.set_resolve(100.0)
	warrior.input.press(&"art")
	await frames(30)
	check(warrior.state != Warrior.State.FINISHER and veteran.health < health and not veteran.dead,
		"a fresh veteran takes a great blow instead (%.0f)" % veteran.health)
	# Wounded to half, he too is finished.
	await _reset()
	var wounded: MongolSoldier = await _held("veteran", 40.0)
	wounded.take_damage(wounded.max_health * 0.6)
	warrior.art_slots = [&"judgment"]
	warrior.set_resolve(100.0)
	warrior.input.press(&"art")
	await frames(4)
	check(warrior.state == Warrior.State.FINISHER, "wounded to half, a veteran is finished too")
	await frames(120)
	# With no one near, it is refused and costs nothing.
	await _reset()
	warrior.art_slots = [&"judgment"]
	warrior.set_resolve(100.0)
	warrior.input.press(&"art")
	await frames(4)
	check(warrior.resolve == 100.0 and warrior.state != Warrior.State.ART, "with no man near, it is refused and costs nothing")


## Soldiers answer the new moves: a veteran steps back from a held cleave, a spearman thrusts into it, a
## man twice caught by a cut all round keeps out of its reach, and the Captain braces against an Art.
func _test_answers() -> void:
	print("soldiers who answer back")
	# A veteran in the fight steps back from a cleave held back.
	await _reset()
	var veteran: MongolSoldier = await _engaged("veteran", 70.0)
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	var start: float = absf(veteran.global_position.x - warrior.global_position.x)
	await frames(45)
	check(warrior.state == Warrior.State.CHARGE, "the hero holds his cleave back")
	check(absf(veteran.global_position.x - warrior.global_position.x) > start + 10.0,
		"a veteran steps back out of its reach (%.0f -> %.0f px)" % [start, absf(veteran.global_position.x - warrior.global_position.x)])
	warrior.input.heavy_held = false
	await frames(40)
	# A spearman drives his point into it.
	await _reset()
	var spearman: MongolSoldier = await _engaged("spearman", 60.0)
	warrior.input.heavy_held = true
	warrior.input.press(&"heavy_attack")
	var thrust: Array[bool] = [false]
	spearman.state_changed.connect(func(state: MongolSoldier.State) -> void:
		thrust[0] = thrust[0] or state == MongolSoldier.State.ATTACK)
	for i: int in 90:
		await physics_frame
		if warrior.state == Warrior.State.HURT:
			break
	check(thrust[0], "a spearman thrusts into a man holding his blow back")
	warrior.input.heavy_held = false
	await frames(40)
	# Caught twice by a cut all round, a man keeps out of its reach.
	await _reset()
	var swordsman: MongolSoldier = await _engaged("swordsman", 40.0)
	var whirl: HitData = HitData.from_attack(warrior, warrior.profile.whirling_cut)
	whirl.damage = 1.0
	for i: int in 2:
		swordsman.receive_hit(whirl)
		await frames(30)
	await frames(60)
	check(absf(swordsman.global_position.x - warrior.global_position.x) >= EnemyBrain.WARY_RANGE - 8.0,
		"caught twice by the whirl, he keeps out of its reach (%.0f px)" % absf(swordsman.global_position.x - warrior.global_position.x))
	# The Captain braces against an Art.
	await _reset()
	var captain: MongolSoldier = _spawn("captain", Vector2(warrior.global_position.x + 60.0, 0))
	_brain(captain).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(4)
	var storm_blow: AttackDefinition = load("res://features/warrior/definitions/storm_blades.tres") as AttackDefinition
	var storm: HitData = HitData.from_attack(warrior, storm_blow)
	var health: float = captain.health
	captain.receive_hit(storm)
	check(is_equal_approx(health - captain.health, storm_blow.damage * (1.0 - captain.profile.art_resistance)),
		"the Captain braces against an Art (%.0f of %.0f)" % [health - captain.health, storm_blow.damage])


## A soldier in the fight `gap` px before the hero, who cannot be hurt for a while (so the soldier's
## answer, not his blows, is what is seen).
func _engaged(kind: String, gap: float) -> MongolSoldier:
	var soldier: MongolSoldier = await _held(kind, gap)
	var brain: EnemyBrain = _brain(soldier)
	brain._acquire_target()
	brain._set_mode(EnemyBrain.Mode.CHASE)
	brain._cooldown = 0.0
	brain.process_mode = Node.PROCESS_MODE_INHERIT
	warrior._invulnerable = 0.0
	warrior._since_hurt = 100.0
	return soldier


## Later levels' soldiers are tougher; a boss is as he was made.
func _test_toughness() -> void:
	print("tougher soldiers")
	await _reset()
	var soldier: MongolSoldier = _spawn("swordsman", Vector2(400, 0))
	var captain: MongolSoldier = _spawn("captain", Vector2(600, 0))
	await frames(2)
	soldier.toughen(1.3, 1.2)
	captain.toughen(1.3, 1.2)
	check(is_equal_approx(soldier.max_health, soldier.profile.max_health * 1.3) and soldier.health == soldier.max_health
		and is_equal_approx(soldier.max_poise, soldier.profile.max_poise * 1.2), "a soldier of the Last Gate is tougher")
	check(captain.max_health == captain.profile.max_health, "the Captain is as he was made")


## How long a swordsman takes to fall: with the starting kit a late one takes longer than an early one,
## and with the kit the hero has by then, less time than an early one took.
func _test_time_to_kill() -> void:
	print("time to kill")
	var early: int = await _time_to_kill(1.0, false)
	var late_bare: int = await _time_to_kill(1.3, false)
	var late_grown: int = await _time_to_kill(1.3, true)
	check(late_bare > early * 1.15, "with the starting kit, a late swordsman takes longer (%d against %d frames)" % [late_bare, early])
	check(late_grown < early, "with the kit he has by then, less than an early one took (%d against %d frames)" % [late_grown, early])


## Frames to kill a held swordsman made `toughness` times tougher: the cuts alone, or the whole string
## with its ender (the executioner's cleave).
func _time_to_kill(toughness: float, grown: bool) -> int:
	await _reset()
	var techniques: Array[StringName] = []
	if grown:
		techniques = [&"executioner", &"pommel", &"whirl"]
	warrior.set_techniques(techniques)
	# The blade's work alone: no finisher cuts the count short.
	warrior.finishers = []
	var soldier: MongolSoldier = await _held("swordsman", 34.0)
	soldier.toughen(toughness, toughness)
	for frame: int in 900:
		await physics_frame
		if soldier.dead:
			return frame
		# A player who knows the string: the next press as each cut goes live, the ender after the thrust.
		var attack: AttackDefinition = warrior.current_attack
		if warrior.state == Warrior.State.IDLE:
			warrior.input.press(&"attack")
		elif attack != null and warrior.sprite.frame >= attack.active_from and warrior.moves.queued_attack == null:
			var ender: bool = grown and attack == warrior.profile.combo[2]
			warrior.input.press(&"heavy_attack" if ender else &"attack")
		# He stays where the blade can find him, however the blows throw him.
		soldier.global_position.x = warrior.global_position.x + 34.0
		soldier.velocity.x = 0.0
	return 900


func _test_captain_opening() -> void:
	print("captain: the opening")
	await _reset()
	var captain: MongolSoldier = _spawn("captain", Vector2(170, 0))
	var brain: CaptainBrain = _brain(captain) as CaptainBrain
	await frames(60)
	check(brain.dormant and brain.mode != EnemyBrain.Mode.CHASE and absf(captain.global_position.x - 170.0) < 4.0,
		"he waits until the fight begins")
	var begun: Array[bool] = [false]
	brain.fight_begun.connect(func() -> void: begun[0] = true)
	brain.begin_fight()
	await frames(4)
	check(begun[0] and captain.state == MongolSoldier.State.ACTING and captain.sprite.animation == &"roar",
		"he opens the fight with a roar")
	captain.global_position.x = warrior.global_position.x + 40.0
	warrior.set_facing(1.0)
	var health: float = captain.health
	warrior.input.press(&"attack")
	await frames(24)
	check(captain.health == health, "no blade touches him while he roars")
	warrior.global_position.x = captain.global_position.x - 140.0
	var start: float = warrior.health
	var telegraphs: Array[int] = [0]
	captain.telegraphed.connect(func(_a: AttackDefinition) -> void: telegraphs[0] += 1)
	for i: int in 600:
		await physics_frame
		if warrior.health < start:
			break
	check(telegraphs[0] > 0, "his blows are telegraphed")
	check(warrior.health < start, "he comes for the hero and strikes")


func _test_captain_blows() -> void:
	print("captain: the smash and the charge")
	await _reset()
	var captain: MongolSoldier = _spawn("captain", Vector2(170, 0))
	# His blows are ordered by hand here; his brain stays out of it.
	_brain(captain).process_mode = Node.PROCESS_MODE_DISABLED
	await frames(20)
	var outcomes: Array[HitData.Outcome] = []
	warrior.struck.connect(func(_hit: HitData, outcome: HitData.Outcome) -> void: outcomes.append(outcome))
	# The falling blow: a raised shield does not stop it.
	await _face_off(captain, 70.0)
	warrior.input.block_held = true
	await frames(12)
	var health: float = warrior.health
	captain.attack(captain.profile.attacks[CaptainBrain.SMASH])
	for i: int in 120:
		await physics_frame
		if not outcomes.is_empty():
			break
	warrior.input.block_held = false
	check(outcomes.has(HitData.Outcome.HIT), "the falling blow goes through a raised shield")
	check(warrior.health <= health - 30.0, "and it lands hard (%.0f -> %.0f)" % [health, warrior.health])
	# The shield charge: it throws the guard aside from a distance.
	warrior.health = warrior.max_health
	warrior.stamina = warrior.profile.max_stamina
	await frames(80)
	outcomes.clear()
	await _face_off(captain, 150.0)
	warrior.input.block_held = true
	await frames(12)
	captain.attack(captain.profile.attacks[CaptainBrain.BASH])
	for i: int in 120:
		await physics_frame
		if not outcomes.is_empty():
			break
	warrior.input.block_held = false
	check(outcomes.has(HitData.Outcome.GUARD_BROKEN), "the shield charge crosses the gap and breaks the guard")
	# A light cut does not make him flinch.
	await frames(90)
	await _face_off(captain, 36.0)
	health = captain.health
	warrior.input.press(&"attack")
	await frames(24)
	check(captain.health < health and captain.state != MongolSoldier.State.HURT,
		"his armour takes a cut without flinching")


func _test_captain_phases() -> void:
	print("captain: the second phase and the fall")
	await _reset()
	var captain: MongolSoldier = _spawn("captain", Vector2(200, 0))
	var brain: CaptainBrain = _brain(captain) as CaptainBrain
	brain.begin_fight()
	await frames(100)
	var phases: Array[int] = []
	brain.phase_changed.connect(func(phase: int) -> void: phases.append(phase))
	warrior.global_position.x = captain.global_position.x - 260.0
	captain.take_damage(captain.max_health * 0.5)
	for i: int in 120:
		await physics_frame
		if not phases.is_empty():
			break
	check(phases == [2], "below half his strength he roars into his second phase")
	check(captain.state == MongolSoldier.State.ACTING and captain.untouchable, "the second roar is untouchable too")
	check(is_equal_approx(brain.block_scale(), 0.4), "he guards less in his desperation")
	await frames(120)
	var died: Array[bool] = [false]
	captain.died.connect(func() -> void: died[0] = true)
	# Hold his brain still so the last cut is not met by his guard.
	brain.process_mode = Node.PROCESS_MODE_DISABLED
	await _face_off(captain, 36.0)
	captain.take_damage(captain.health - 4.0)
	warrior.input.press(&"attack")
	await frames(30)
	brain.process_mode = Node.PROCESS_MODE_INHERIT
	await frames(2)
	check(captain.is_beaten and not captain.dead and captain.sprite.animation == &"beaten" and captain.untouchable,
		"a last cut brings him to his knee, propped on his sabre")
	captain.finish()
	await frames(10)
	check(captain.dead and died[0] and captain.severed == &"head" and captain.sprite.animation == &"executed",
		"the finishing stroke takes his head where he kneels")
	check(brain.mode == EnemyBrain.Mode.DEAD, "his fight is over")
