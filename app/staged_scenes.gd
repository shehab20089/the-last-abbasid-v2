class_name StagedScenes
extends Node
## The level's staged scenes as the session plays them: moments of the story told in the game's own figures on the
## street, the hero held still and the bars drawn, his friend roped among the captives, Toqto's stroke at the last
## gate, the people walking out of it. Each scene is data (`Level.scenes`, from `tools/levels/<level>.mjs`): a list of
## steps, each a verb and its words, played in turn:
##   quiet                       wait for a quiet moment (no fight near, the hero on his feet)
##   hold / release              the hero held still (and untouchable), or let go
##   bars on|off                 the black bars
##   show <actor>... / hide <actor>
##   walk <who> <col> <px/s> [animation] [pace] / go ... (the same, fading out over the last steps and gone) /
##   until <actor> (waits for his arrival, or his going) / stop <actor>; pace: the animation's speed, so the feet
##   keep to the ground at that px/s
##   reveal <group>              a hidden group of soldiers shown, still waiting (`wake` turns them on him)
##   act <who> <animation>       an actor's animation, Toqto's (boss) or the hero's (held: kneel)
##   face <who> <left|right|hero|boss|actor>
##   look <col|hero> [seconds]   the camera eases to a column of the street, or back to the hero
##   say <SPEAKER> <LINE>        a line said, waited out as long as it takes to read
##   wait <seconds>
##   strike <actor>              Toqto's stroke on the man kneeling before him (`behead` without a boss)
##   behead <actor>
##   barrier on|off              the burning barricade between the hero and the boss
##   wake <group>, flag <flag>, keepsake <id>, place <col>, fade out|in, shake <n>, slow <scale> <s>,
##   sound <cue> [actor], duck <db> <seconds>, music <track|none>
## Who: an actor's id, `hero` or `boss`. A scene plays once (its flag `scene_<id>`); holding the interact button
## skips it (every step's end still happens: the walks arrive, the dead fall, the flags are set); its waits stop
## while the game is paused, and a level left behind ends it. The session (AbbasidGame) owns it.

## A scene ended (played through or skipped): the story may have moved on.
signal finished(id: StringName)

## How long the interact button is held to skip a scene.
const SKIP_HOLD: float = 0.9
## No soldier fighting this near the hero, for a scene to begin at a quiet moment.
const QUIET_RANGE: float = 320.0
## A line said in a scene stays this long, and longer as it is long (read at an easy pace, in the lower bar).
const LINE_TIME: float = 1.3
const LINE_PER_CHARACTER: float = 1.0 / 17.0

var game: AbbasidGame
## The scene playing, or empty.
var playing: StringName = &""

var _skipping: bool = false
var _held: float = 0.0
var _level: Level
var _focus: Marker2D
var _follow_time: float = 0.12


func setup(session: AbbasidGame) -> void:
	game = session


## A level entered: nothing plays.
func clear() -> void:
	playing = &""
	_skipping = false
	_held = 0.0
	game.hud.scene_skip(false, 0.0)


func has_scene(id: StringName) -> bool:
	return game.level != null and game.level.scenes.has(id)


## Whether a scene has played (it plays only once).
func played(id: StringName) -> bool:
	return game.save.has_flag(StringName("scene_%s" % id))


## Plays a scene of the level once, and waits for its end.
func play(id: StringName) -> void:
	if not has_scene(id) or played(id) or playing != &"":
		return
	_level = game.level
	game.save.set_flag(StringName("scene_%s" % id))
	playing = id
	_skipping = false
	_held = 0.0
	var steps: PackedStringArray = _level.scenes[id]
	for step: String in steps:
		if not _still_here():
			break
		await _run(step.split(" ", false))
	if _still_here():
		_end_quietly()
	else:
		# Broken off by leaving the street (the title, a load): it plays again next time, from its start.
		game.save.flags.erase(StringName("scene_%s" % id))
	playing = &""
	_skipping = false
	game.hud.scene_skip(false, 0.0)
	finished.emit(id)


func _process(delta: float) -> void:
	if playing == &"" or _skipping or get_tree().paused:
		return
	if Input.is_action_pressed(&"interact"):
		_held += delta / maxf(Engine.time_scale, 0.001)
		if _held >= SKIP_HOLD:
			_skipping = true
			_held = 0.0
	else:
		_held = maxf(0.0, _held - delta * 2.0)
	game.hud.scene_skip(not _skipping, _held / SKIP_HOLD)


## A scene that ended with the bars still drawn or the hero still held lets him go.
func _end_quietly() -> void:
	game.hud.cinematic_bars(false)
	_look_at_hero(0.0)
	if game.hero != null and game.hero.state == Warrior.State.CINEMATIC and game.boss_fight.boss == null:
		game.hero.set_cinematic(false)


func _still_here() -> bool:
	return game.level != null and game.level == _level and is_instance_valid(_level)


func _run(words: PackedStringArray) -> void:
	if words.is_empty():
		return
	var verb: String = words[0]
	match verb:
		"quiet":
			while _still_here() and not _skipping and (game.teaching.fighting() or game.hero == null
					or not game.hero.is_on_floor() or game.state != AbbasidGame.State.PLAYING):
				await get_tree().process_frame
		"hold":
			if game.hero != null:
				game.hero.set_cinematic(true)
		"release":
			if game.hero != null:
				game.hero.set_cinematic(false)
		"bars":
			game.hud.cinematic_bars(_word(words, 1) == "on", Hud.SCENE_BAR_HEIGHT)
		"show", "hide":
			for i: int in range(1, words.size()):
				var shown: Actor = _actor(words[i])
				if shown != null:
					shown.visible = verb == "show"
		"walk", "go":
			var walker: Actor = _actor(_word(words, 1))
			if walker != null:
				walker.walk_to(_column(_word(words, 2)), _number(words, 3, 40.0), StringName(_word(words, 4, "walk")),
					verb == "go", _number(words, 5, 1.0))
				if _skipping:
					walker.arrive()
		"until":
			var awaited: Actor = _actor(_word(words, 1))
			while awaited != null and is_instance_valid(awaited) and awaited.moving() and not _skipping and _still_here():
				await get_tree().process_frame
			if awaited != null and is_instance_valid(awaited) and _skipping:
				awaited.arrive()
		"stop":
			var halted: Actor = _actor(_word(words, 1))
			if halted != null:
				halted.halt()
		"reveal":
			_level.reveal_group(StringName(_word(words, 1)))
		"act":
			_act(_word(words, 1), StringName(_word(words, 2)))
		"face":
			_face(_word(words, 1), _word(words, 2))
		"look":
			var where: String = _word(words, 1)
			var seconds: float = _number(words, 2, 1.0)
			if where == "hero":
				_look_at_hero(seconds)
			else:
				_look_at(_column(where), seconds)
		"say":
			if not _skipping:
				var line: String = tr(_word(words, 2))
				game.hud.scene_line(tr(_word(words, 1)), line)
				await _wait(LINE_TIME + line.length() * LINE_PER_CHARACTER)
				game.hud.scene_line("", "")
		"wait":
			await _wait(_number(words, 1, 1.0))
		"strike":
			await _strike(_actor(_word(words, 1)))
		"behead":
			_behead(_actor(_word(words, 1)))
		"barrier":
			if _level.arena != null:
				var standing: bool = _word(words, 1) == "on"
				_level.arena.set_scene_barriers(standing)
				# The barricade falls in: grit and sparks thrown up where it burned.
				if not standing and not _skipping and _level.arena.scene_barriers != null:
					for fire: Node in _level.arena.scene_barriers.get_children():
						var at: Vector2 = (fire as Node2D).global_position
						game.vfx.play(&"dust", at, false, true)
						game.vfx.play(&"dust", at, true, true)
						game.vfx.play(&"embers", at + Vector2(0.0, -10.0), false, true)
		"wake":
			# As an ambush springs: remembered (it springs again on a later life until its men have fallen).
			var group: StringName = StringName(_word(words, 1))
			game.save.set_flag(group)
			_level.wake_group(group)
			game.sounds.play(&"ambush_sting")
			game.music.play_music(&"combat")
		"flag":
			game.save.set_flag(StringName(_word(words, 1)))
		"keepsake":
			game.give_keepsake(StringName(_word(words, 1)))
		"place":
			if game.hero != null:
				game.hero.global_position.x = _column(_word(words, 1))
				game.hero.velocity = Vector2.ZERO
				game.camera.snap()
		"fade":
			if not _skipping:
				await game.fade_to(1.0 if _word(words, 1) == "out" else 0.0)
			else:
				game.fade.color.a = 0.0
		"shake":
			if not _skipping:
				game.camera.shake(_number(words, 1, 2.0))
		"slow":
			if not _skipping:
				game.hit_stop.slow(_number(words, 1, 0.5), _number(words, 2, 0.5))
		"sound":
			if not _skipping:
				var source: Node2D = _who(_word(words, 2))
				if source != null:
					game.sounds.play_at(StringName(_word(words, 1)), source.global_position + Vector2(0.0, -40.0))
				else:
					game.sounds.play(StringName(_word(words, 1)))
		"duck":
			if not _skipping:
				game.music.duck(_number(words, 1, -8.0), _number(words, 2, 1.0))
		"music":
			game.music.play_music(&"" if _word(words, 1) == "none" else StringName(_word(words, 1)))
		_:
			push_warning("A staged scene step not known: %s" % " ".join(words))


## Waits `seconds` of play (none while skipping); the wait stops while the game is paused and ignores slow time.
func _wait(seconds: float) -> void:
	var left: float = seconds
	while left > 0.0 and not _skipping and _still_here():
		await get_tree().process_frame
		if not get_tree().paused:
			left -= get_process_delta_time() / maxf(Engine.time_scale, 0.001)


## Toqto's stroke on the man kneeling before him: the boss's own execution (MongolSoldier.execute), the victim's
## head taken on its strike frame. Without a boss at hand the victim simply dies.
func _strike(victim: Actor) -> void:
	var boss: MongolSoldier = _level.arena.boss() if _level.arena != null else null
	if boss == null or boss.dead or _skipping:
		_behead(victim)
		return
	boss.execute()
	var struck: Array[bool] = [false]
	var on_stroke: Callable = func() -> void: struck[0] = true
	boss.executed.connect(on_stroke, CONNECT_ONE_SHOT)
	var left: float = 2.0
	while not struck[0] and left > 0.0 and _still_here() and not _skipping:
		await get_tree().process_frame
		if not get_tree().paused:
			left -= get_process_delta_time()
	if boss.executed.is_connected(on_stroke):
		boss.executed.disconnect(on_stroke)
	_behead(victim)


## A man's head taken where he kneels: his fall, what the stroke cut, his blood, the sound and the jolt.
func _behead(victim: Actor) -> void:
	if victim == null or victim.dead:
		return
	victim.visible = true
	victim.behead()
	if victim.gore_set != null:
		game.gore.cut_down(victim, victim, victim.gore_set, &"head", victim.facing(), victim.facing())
		game.gore.bleed_out(victim, victim, victim.gore_set, victim.facing())
	if not _skipping:
		game.sounds.play_at(&"sever", victim.global_position + Vector2(0.0, -30.0))
		game.hit_stop.trigger(0.12)
		game.camera.shake(3.0)


func _act(who: String, animation: StringName) -> void:
	match who:
		"hero":
			if game.hero != null:
				game.hero.cinematic_strike(animation)
		"boss":
			var boss: MongolSoldier = _level.arena.boss() if _level.arena != null else null
			if boss != null and boss.sprite.sprite_frames.has_animation(animation):
				boss.rest_animation = animation
				boss.sprite.play(animation)
		_:
			var actor: Actor = _actor(who)
			if actor != null:
				actor.act(animation)


func _face(who: String, toward: String) -> void:
	var target: Node2D = _who(toward)
	var x: float = target.global_position.x if target != null else NAN
	var side: float = -1.0 if toward == "left" else 1.0 if toward == "right" else NAN
	match who:
		"hero":
			if game.hero != null:
				game.hero.set_facing(side if not is_nan(side) else signf(x - game.hero.global_position.x))
		"boss":
			var boss: MongolSoldier = _level.arena.boss() if _level.arena != null else null
			if boss != null:
				if not is_nan(side):
					boss.set_facing(side)
				elif not is_nan(x):
					boss.face_toward(x)
		_:
			var actor: Actor = _actor(who)
			if actor != null:
				if not is_nan(side):
					actor.flip_h = side < 0.0
				elif not is_nan(x):
					actor.turn_to(x)


## Who a step names: an actor, the hero or the boss (null for a side or an unknown name).
func _who(name: String) -> Node2D:
	match name:
		"", "left", "right":
			return null
		"hero":
			return game.hero
		"boss":
			return _level.arena.boss() if _level.arena != null else null
	return _actor(name)


func _actor(id: String) -> Actor:
	return _level.actor(StringName(id)) if _level != null else null


## The camera eases to a column of the street (at the hero's height), or back to him.
func _look_at(x: float, seconds: float) -> void:
	if _focus == null or not is_instance_valid(_focus):
		_focus = Marker2D.new()
		_focus.name = "SceneFocus"
		_level.add_child(_focus)
		_follow_time = game.camera.follow_time
	# The street's height, where the scene is played out (the hero may be on a roof above it).
	_focus.global_position = Vector2(x, _level.street_y())
	game.camera.follow_time = maxf(0.05, seconds / 3.0)
	game.camera.target = _focus


func _look_at_hero(seconds: float) -> void:
	if game.hero == null or game.camera.target == game.hero:
		return
	game.camera.target = game.hero
	if seconds <= 0.0:
		game.camera.follow_time = _follow_time
		return
	# Eased back over `seconds`, then the camera's own pace again.
	game.camera.follow_time = maxf(0.05, seconds / 3.0)
	get_tree().create_timer(seconds, false, false, true).timeout.connect(_restore_follow)


func _restore_follow() -> void:
	if game.camera.target == game.hero:
		game.camera.follow_time = _follow_time


## A column of the level's data as x: the middle of its tile, as the level builder places things.
func _column(word: String) -> float:
	return float(word) * 16.0 + 8.0


func _word(words: PackedStringArray, index: int, fallback: String = "") -> String:
	return words[index] if words.size() > index else fallback


func _number(words: PackedStringArray, index: int, fallback: float) -> float:
	return float(words[index]) if words.size() > index and words[index].is_valid_float() else fallback
