class_name BossFight
extends Node
## The boss fight as the session plays it: the arena closing behind the hero and its boss's roar (the hero held
## through it), the boss's bar, his second phase, the blow that would kill him beating him to one knee and the
## finishing stroke in slow time, then his fall and the arena opening on the way ahead. The level's BossArena
## holds the barriers, the camera's bounds and the boss; CaptainBrain fights him. The session (AbbasidGame)
## owns it, begins it from a `boss` trigger, and tells the story on once it has `ended`.

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


## The arena closes behind the hero and its boss roars; false if there is no fight to begin.
func begin() -> bool:
	var arena: BossArena = game.level.arena
	if arena == null or arena.closed:
		return false
	var foe: MongolSoldier = arena.boss()
	if foe == null or foe.dead:
		return false
	var brain: CaptainBrain = foe.get_node_or_null(^"Brain") as CaptainBrain
	if brain == null:
		return false
	boss = foe
	arena.close()
	game.camera.set_bounds(arena.camera_bounds)
	brain.phase_changed.connect(_on_phase)
	foe.health_changed.connect(_on_health)
	foe.beaten.connect(_on_beaten)
	foe.died.connect(_on_died)
	game.hud.show_boss(tr(foe.profile.display_name), foe.health, foe.max_health)
	game.music.play_music(&"boss")
	game.sounds.play(&"boss_roar")
	game.camera.shake(3.0)
	game.hero.set_cinematic(true)
	game.hero.set_facing(signf(foe.global_position.x - game.hero.global_position.x))
	brain.begin_fight()
	_release_hero_after(CaptainBrain.ROAR_TIME)
	return true


func _release_hero_after(seconds: float) -> void:
	var held: Warrior = game.hero
	await _real_delay(seconds)
	if held != null and is_instance_valid(held) and held == game.hero:
		held.set_cinematic(false)


func _on_health(current: float, _maximum: float) -> void:
	game.hud.update_boss(current)


func _on_phase(_phase: int) -> void:
	game.sounds.play(&"boss_roar")
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
	game.sounds.play(&"boss_roar", -8.0)
	game.say("SPEAKER_TOQTO", "TOQTO_FALL")
	await _real_delay(2.6)
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
	await _real_delay(0.3)
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
	game.sounds.play(&"boss_fall")
	game.music.play_music(&"")
	await _real_delay(1.4)
	if game.level != fallen or game.level == null:
		return
	game.hud.hide_boss()
	await _real_delay(1.6)
	if game.level != fallen or game.level == null:
		return
	if game.level.arena != null:
		game.level.arena.open()
	game.camera.set_bounds(game.level.bounds)
	boss = null
	if game.hero != null:
		game.hero.set_cinematic(false)
	game.say("SPEAKER_YUSUF", "YUSUF_AFTER_TOQTO")
	game.music.play_music(game.level.music)
	ended.emit()


func _real_delay(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout
