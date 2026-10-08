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
	await _test_telegraph_lead()
	await _test_low_sweep()
	await _test_guard_turn()
	await _test_bash()
	await _test_plunge()
	await _test_veteran()
	await _test_maceman()
	await _test_shieldbearer()
	await _test_engineer()
	await _test_captain_opening()
	await _test_captain_blows()
	await _test_captain_phases()
	print("ENEMY_TEST_COMPLETE passed=%d failed=%d" % [passed, failed])
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
		warrior.next_finisher = finisher
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
## its rhythm).
func _test_telegraph_lead() -> void:
	print("every blow glints in time")
	for kind: String in ["swordsman", "spearman", "archer", "captain", "veteran", "maceman", "shieldbearer", "engineer"]:
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
			check(attack.telegraph_frame >= 0 and lead >= 0.219,
				"%s, %s: glints %.0f ms before it lands" % [kind, attack.display_name, lead * 1000.0])
		soldier.free()


## The spearman's low sweep at a hero standing `gap` px before him; returns the outcomes it met.
func _sweep_at(gap: float, block: bool, jump: bool) -> Array[HitData.Outcome]:
	await _reset()
	var spearman: MongolSoldier = _spawn("spearman", Vector2(warrior.global_position.x + gap, 0))
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
	spearman.attack(load("res://features/enemies/definitions/spearman_sweep.tres") as AttackDefinition)
	await frames(50)
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
