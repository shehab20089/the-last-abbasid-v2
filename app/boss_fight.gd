class_name BossFight
extends Node
## The boss fight as the session plays it: the arena closing behind the hero, its scene (the level's `boss_prelude`:
## Hamid at the last gate, once), the boss's roar (the hero held through it), the boss's bar, his second phase, the
## blow that would kill him beating him to one knee and the finishing stroke in slow time, then his fall, the arena
## opening on the way ahead and the scene after it (`boss_after`: Yusuf by Hamid). The level's BossArena holds the
## barriers, the camera's bounds and the boss; CaptainBrain fights him; the scenes are the session's StagedScenes.
## The session (AbbasidGame) owns it, begins it from a `boss` trigger, and tells the story on once it has `ended`.

## The arena has opened again: the way on is clear.
signal ended

var game: AbbasidGame
## The boss being fought, or null.
var boss: MongolSoldier


func setup(session: AbbasidGame) -> void:
	game = session


## A level entered: no boss is fought, and his bar is put away.
func clear() -> void:
	boss = null
	game.hud.hide_boss()


## Whether a group's fall is the boss's (that has its own moment).
func holds_group(group: StringName) -> bool:
	return boss != null and boss.get_meta(&"group", &"") == group


## Whether there is a fight here to begin (an arena not yet closed, its boss alive).
func can_begin() -> bool:
	var arena: BossArena = game.level.arena if game.level != null else null
	if arena == null or arena.closed:
		return false
	var foe: MongolSoldier = arena.boss()
	return foe != null and not foe.dead and foe.get_node_or_null(^"Brain") is CaptainBrain


## The arena closes behind the hero; its scene plays (once); then the boss roars, his words said and the fight's
## lesson given (`speaker`, `line`, `hint`: the trigger's).
func begin(hint: String = "", speaker: String = "", line: String = "") -> void:
	if not can_begin():
		return
	var arena: BossArena = game.level.arena
	var foe: MongolSoldier = arena.boss()
	var brain: CaptainBrain = foe.get_node_or_null(^"Brain") as CaptainBrain
	var fallen: Level = game.level
	boss = foe
	arena.close()
	game.camera.set_bounds(arena.camera_bounds)
	game.hero.set_cinematic(true)
	if game.scenes.has_scene(&"boss_prelude") and not game.scenes.played(&"boss_prelude"):
		await game.scenes.play(&"boss_prelude")
		if game.level != fallen or boss != foe or not is_instance_valid(foe) or foe.dead:
			return
	brain.phase_changed.connect(_on_phase)
	foe.health_changed.connect(_on_health)
	foe.beaten.connect(_on_beaten)
	foe.died.connect(_on_died)
	game.hud.show_boss(tr(foe.profile.display_name), foe.health, foe.max_health)
	game.music.play_music(&"boss")
	game.sounds.play_at(&"boss_roar", foe.global_position + Vector2(0.0, -50.0))
	game.music.duck(-8.0, 1.4, 1.2)
	game.camera.shake(3.0)
	game.hero.set_cinematic(true)
	game.hero.set_facing(signf(foe.global_position.x - game.hero.global_position.x))
	brain.begin_fight()
	game.say(speaker, line)
	if hint != "":
		game.teaching.hint(hint)
	_release_hero_after(CaptainBrain.ROAR_TIME)


func _release_hero_after(seconds: float) -> void:
	var held: Warrior = game.hero
	await _wait(seconds)
	if held != null and is_instance_valid(held) and held == game.hero:
		held.set_cinematic(false)


func _on_health(current: float, _maximum: float) -> void:
	game.hud.update_boss(current)


func _on_phase(_phase: int) -> void:
	if boss != null and is_instance_valid(boss):
		game.sounds.play_at(&"boss_roar", boss.global_position + Vector2(0.0, -50.0))
	game.music.duck(-8.0, 1.2, 1.2)
	game.camera.shake(4.0)
	game.say("SPEAKER_TOQTO", "TOQTO_PHASE")


## The blow that would have killed him brings him to his knee instead, propped on his sabre. A last
## word, in slow time; then Yusuf steps in, and his stroke takes the Captain's head.
func _on_beaten() -> void:
	var foe: MongolSoldier = boss
	if foe == null:
		return
	game.hero.set_cinematic(true)
	game.hero.set_facing(signf(foe.global_position.x - game.hero.global_position.x))
	game.hit_stop.slow(0.4, 1.0)
	game.camera.shake(4.0)
	game.music.play_music(&"")
	game.sounds.play_at(&"boss_roar", foe.global_position + Vector2(0.0, -50.0), -8.0)
	game.say("SPEAKER_TOQTO", "TOQTO_FALL")
	await _wait(2.6)
	var hero: Warrior = game.hero
	if boss != foe or not is_instance_valid(foe) or foe.dead or hero == null:
		return
	# Yusuf beside him, and the stroke.
	var side: float = signf(hero.global_position.x - foe.global_position.x)
	if side == 0.0:
		side = -foe.facing
	hero.global_position.x = foe.global_position.x + side * 52.0
	hero.set_facing(-side)
	hero.cinematic_strike(&"heavy")
	await _wait(0.3)
	if boss != foe or not is_instance_valid(foe) or foe.dead:
		return
	game.hit_stop.slow(0.22, 1.6)
	game.camera.shake(7.0)
	foe.finish()


## He falls; then the arena opens and the way on is clear.
func _on_died() -> void:
	var fallen: Level = game.level
	game.hit_stop.slow(0.3, 1.2)
	game.camera.shake(5.0)
	if boss != null and is_instance_valid(boss):
		game.sounds.play_at(&"boss_fall", boss.global_position)
	else:
		game.sounds.play(&"boss_fall")
	game.music.play_music(&"")
	await _wait(1.4)
	if game.level != fallen or game.level == null:
		return
	game.hud.hide_boss()
	await _wait(1.6)
	if game.level != fallen or game.level == null:
		return
	if game.level.arena != null:
		game.level.arena.open()
	game.camera.set_bounds(game.level.bounds)
	boss = null
	# The scene after the fight (Yusuf by Hamid), once; or only his call to bring the people.
	if game.scenes.has_scene(&"boss_after") and not game.scenes.played(&"boss_after"):
		await game.scenes.play(&"boss_after")
		if game.level != fallen or game.level == null:
			return
	else:
		if game.hero != null:
			game.hero.set_cinematic(false)
		game.say("SPEAKER_YUSUF", "YUSUF_AFTER_TOQTO")
	game.music.play_music(game.level.music)
	ended.emit()


## Waits `seconds` of play, unslowed: the wait stops while the game is paused (the pause menu, a lesson's card),
## so nothing of the fight goes on behind it, and neither a hit's stop nor a slow fall stretches it.
func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds, false, false, true).timeout
