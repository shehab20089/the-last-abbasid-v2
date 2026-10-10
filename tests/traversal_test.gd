extends SceneTree
## Proves a level can be finished with real physics: an autoplayer runs toward its goal,
## jumps whatever stops it, fights every soldier it meets with the light combo, springs and beats
## the level's ambushes, speaks with whoever has something to give, fights the boss if there is one,
## and opens the exit. Its goals come from the level's own story data, so it plays any level. The
## hero is made very hardy so the check is about the level, not about winning fights.
## Run: node tools/run_godot_cli.mjs --headless --fixed-fps 60 --path . --script res://tests/traversal_test.gd -- fallen_market

const LIMIT_FRAMES: int = 60 * 60 * 9
## Soldiers each level should see fall along the way.
const MIN_KILLS: Dictionary[String, int] = {
	"fallen_market": 8, "streets_of_ash": 9, "scholars_quarter": 10, "last_gate": 8,
}

var passed: int = 0
var failed: int = 0
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	var level_name: String = args[0] if args.size() > 0 else "fallen_market"
	print("traversal: %s" % level_name)
	SaveGame.erase()
	AbbasidGame.start_in_level = "res://features/levels/%s/%s.tscn" % [level_name, level_name]
	change_scene_to_file("res://app/main.tscn")
	for i: int in 20:
		await physics_frame
	game = current_scene as AbbasidGame
	var hero: Warrior = game.hero
	var exit: LevelExit = _exit()
	var best_x: float = hero.global_position.x
	var stuck: int = 0
	var jump_hold: int = 0
	var swing: int = 0
	var highest: float = hero.global_position.y
	var frame: int = 0
	var boss_fought: bool = false
	# Which way he walks to find the edge when his goal is straight below him.
	var drop_dir: float = 1.0
	while frame < LIMIT_FRAMES:
		await physics_frame
		frame += 1
		if game.state == AbbasidGame.State.DIALOGUE:
			game.dialogue.advance()
			continue
		if game.state == AbbasidGame.State.READING:
			game.reader.chosen.emit(&"close")
			continue
		if game.state == AbbasidGame.State.LAMP:
			game.lamp_menu.chosen.emit(&"leave")
			continue
		if game.state == AbbasidGame.State.LESSON:
			game.lesson_screen.chosen.emit(&"lesson_done")
			continue
		if game.state == AbbasidGame.State.ENDING or game.state == AbbasidGame.State.COMPLETE:
			break
		if game.state != AbbasidGame.State.PLAYING:
			continue
		hero = game.hero
		hero.input.enabled = false
		hero.max_health = 100000.0
		if hero.health < 50000.0:
			hero.heal(100000.0)
		if hero.is_on_floor():
			highest = minf(highest, hero.global_position.y)
		boss_fought = boss_fought or (game.level.arena != null and game.level.arena.closed)
		# Fight the nearest soldier: close in, then strike.
		var foe: MongolSoldier = _foe_near(hero, 170.0)
		if frame % 600 == 0:
			print("  t=%ds hero (%.0f, %.0f) %s foe %s" % [frame / 60, hero.global_position.x, hero.global_position.y,
				Warrior.State.keys()[hero.state], ("%s at (%.0f, %.0f) %s hp %.0f" % [foe.name, foe.global_position.x,
				foe.global_position.y, MongolSoldier.State.keys()[foe.state], foe.health]) if foe != null else "none"])
		swing -= 1
		if foe != null:
			var gap: float = foe.global_position.x - hero.global_position.x
			if absf(gap) > 42.0:
				hero.input.move = signf(gap)
				if hero.is_on_wall() and hero.is_on_floor() and jump_hold <= 0:
					hero.input.press(&"jump")
					jump_hold = 26
			else:
				hero.input.move = 0.0
				hero.set_facing(signf(gap))
				if swing <= 0 and hero.is_on_floor():
					hero.input.press(&"attack")
					swing = 12
			if jump_hold > 0:
				jump_hold -= 1
				hero.input.jump_held = true
			continue
		# Where to go: the soldiers of a sprung ambush, whoever has something to give, then the exit.
		var target: Node2D = _goal(hero, exit)
		var goal: float = target.global_position.x
		# A goal straight below (a soldier under a gallery): walk on until the floor ends and drop; if a wall
		# stops him first, the other way.
		if absf(goal - hero.global_position.x) < 30.0 and target.global_position.y - hero.global_position.y > 40.0:
			if stuck > 90:
				drop_dir = -drop_dir
				stuck = 0
				best_x = hero.global_position.x
			goal = hero.global_position.x + 200.0 * drop_dir
		if absf(goal - hero.global_position.x) < 30.0:
			hero.input.move = 0.0
			var npc: Npc = target as Npc
			if (npc != null and npc.ready_to_speak) or (target == exit and exit.unlocked):
				hero.input.press(&"interact")
			continue
		var toward: float = signf(goal - hero.global_position.x)
		hero.input.move = toward
		if hero.global_position.x * toward > best_x * toward + 2.0:
			best_x = hero.global_position.x
			stuck = 0
		else:
			stuck += 1
		var ledge: bool = _ledge_above(hero, toward)
		if (hero.is_on_wall() or stuck > 20 or ledge) and hero.is_on_floor() and jump_hold <= 0:
			hero.input.press(&"jump")
			jump_hold = 26
		if jump_hold > 0:
			jump_hold -= 1
			hero.input.jump_held = true
		else:
			hero.input.jump_held = false
		if stuck > 60 * 8:
			print("  stuck at x=%.0f y=%.0f" % [hero.global_position.x, hero.global_position.y])
			break
	var kills: int = 0
	if game.level != null:
		for soldier: MongolSoldier in game.level.soldiers():
			if soldier.dead:
				kills += 1
	var ended: bool = game.state == AbbasidGame.State.ENDING or game.state == AbbasidGame.State.COMPLETE
	check(ended, "the exit is reached and opened (frame %d)" % frame)
	for group: StringName in _groups():
		check(game.save.has_flag(StringName("%s_cleared" % group)), "group \"%s\" is beaten" % group)
	for flag: StringName in _gifts():
		check(game.save.has_flag(flag), "%s is given" % flag)
	if level_name == "fallen_market":
		check(highest < 310.0, "the climb to the khan's roof is possible")
	if level_name == "last_gate":
		check(boss_fought, "the captain is fought in his square")
	var wanted: int = MIN_KILLS.get(level_name, 6)
	check(kills >= wanted, "soldiers fall along the way (%d)" % kills)
	print("TRAVERSAL_TEST_COMPLETE passed=%d failed=%d" % [passed, failed])
	paused = false
	Engine.time_scale = 1.0
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit(0 if failed == 0 else 1)


func _exit() -> LevelExit:
	for node: Node in game.level.interactables.get_children():
		if node is LevelExit:
			return node as LevelExit
	return null


## The level's ambush groups (soldiers that wait, dormant, for a story trigger).
func _groups() -> Array[StringName]:
	var groups: Array[StringName] = []
	for soldier: MongolSoldier in game.level.soldiers():
		var group: StringName = soldier.get_meta(&"group", &"")
		if group != &"" and not group in groups:
			groups.append(group)
	return groups


## The flags that the level's people hand over.
func _gifts() -> Array[StringName]:
	var gifts: Array[StringName] = []
	for node: Node in game.level.interactables.get_children():
		var npc: Npc = node as Npc
		if npc != null and npc.gives_flag != &"":
			gifts.append(npc.gives_flag)
	return gifts


func _goal(hero: Warrior, exit: LevelExit) -> Node2D:
	var flags: Array[StringName] = game.save.flags
	for group: StringName in _groups():
		if group in flags and not StringName("%s_cleared" % group) in flags:
			var soldier: MongolSoldier = _nearest_of(hero, group)
			if soldier != null:
				return soldier
	for node: Node in game.level.interactables.get_children():
		var npc: Npc = node as Npc
		if npc != null and npc.ready_to_speak and npc.gives_flag != &"" and not npc.gives_flag in flags:
			return npc
	return exit


## A surface a jump could land on: 28-56 px above the feet, a little ahead, with headroom.
func _ledge_above(hero: Warrior, toward: float) -> bool:
	var space: PhysicsDirectSpaceState2D = hero.get_world_2d().direct_space_state
	for ahead: float in [10.0, 22.0]:
		var x: float = hero.global_position.x + toward * ahead
		var from: Vector2 = Vector2(x, hero.global_position.y - 60.0)
		var query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(from,
			Vector2(x, hero.global_position.y - 24.0), 1)
		var hit: Dictionary = space.intersect_ray(query)
		if hit.is_empty():
			continue
		var point: Vector2 = hit["position"]
		var rise: float = hero.global_position.y - point.y
		if rise >= 28.0 and rise <= 56.0:
			return true
	return false


func _nearest_of(hero: Warrior, group: StringName) -> MongolSoldier:
	var best: MongolSoldier = null
	for soldier: MongolSoldier in game.level.soldiers():
		if soldier.dead or soldier.get_meta(&"group", &"") != group:
			continue
		if best == null or absf(soldier.global_position.x - hero.global_position.x) < absf(best.global_position.x - hero.global_position.x):
			best = soldier
	return best


func _foe_near(hero: Warrior, reach: float) -> MongolSoldier:
	var best: MongolSoldier = null
	var best_distance: float = reach
	for soldier: MongolSoldier in game.level.soldiers():
		# An ambusher still out of sight is not there yet.
		if soldier.dead or not soldier.visible:
			continue
		var offset: Vector2 = soldier.global_position - hero.global_position
		if absf(offset.y) > 40.0:
			continue
		if absf(offset.x) < best_distance:
			best = soldier
			best_distance = absf(offset.x)
	return best


func check(condition: bool, label: String) -> void:
	if condition:
		passed += 1
		print("  ok   ", label)
	else:
		failed += 1
		print("  FAIL ", label)
