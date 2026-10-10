class_name CombatPresentation
extends Node
## How the fighting looks and sounds, wired from the fighters' own signals: each blow's sparks, blood and sound, the
## camera's shake and the hit-stop; a soldier's warnings (the glint, the sign over his head, the flush, the sound); the
## glows (a cleave held back, the fury, a man open to a finisher); the copies fast movement leaves; an Art's moment
## (the world drained of colour about him); and the screen's edges darkening near death. It decides nothing: the session
## (AbbasidGame) owns it, binds each fighter to it, and keeps its own connections to the same signals for the story, the
## hero's growth and the playtest log.

## The glow of the second wind's fury while it holds, the copies his blows leave in it, and the embers.
const STEEL_GLOW: Color = Color(1.0, 0.8, 0.42)
const FURY_ECHO: Color = Color(1.0, 0.78, 0.4, 0.32)
const EMBERS_EVERY: float = 0.16
## The Storm's blur of steel, the copies a judgment's blink leaves, and the dust the Storm raises.
const STORM_ECHO: Color = Color(0.78, 0.88, 1.0, 0.36)
const JUDGMENT_ECHO: Color = Color(1.0, 0.86, 0.5, 0.5)
const STORM_DUST_EVERY: float = 0.14
## An Art's moment: how long the world stays drained of colour (real s) and how fast it comes back.
const ART_FOCUS_HOLD: float = 0.32
const ART_FOCUS_FADE: float = 0.45
## The glint of a blow's end (Steady Breath), and the pale copies a close call leaves.
const STEADY_GLOW: Color = Color(1.0, 0.96, 0.82)
const CLOSE_CALL_ECHO: Color = Color(0.94, 0.96, 1.0, 0.62)
## The copies fast movement leaves behind him: a dash, the plunge's fall (a plain roll leaves none, so a close
## call's own copies stand out).
const FALL_ECHO: Color = Color(0.55, 0.72, 0.95, 0.38)
const DASH_ECHO: Color = Color(1.0, 0.78, 0.5, 0.42)
const ECHO_EVERY: float = 0.045
## The copies a soldier's spring leaves (a skirmisher's dash and leap, a spear's running lunge): smoke-dim.
const SOLDIER_ECHO: Color = Color(0.85, 0.6, 0.45, 0.32)
## A soldier's lunge at least this fast is a spring that leaves copies behind.
const SPRING_SPEED: float = 300.0
## The held cleave's glow and glint, by how far it has grown (1 to 3).
const CHARGE_GLOW: Array[Color] = [Color(1.0, 0.86, 0.6), Color(1.0, 0.74, 0.36), Color(1.0, 0.52, 0.2)]
## The glow of a soldier open to a finisher: moonlit steel, nothing like a warning's colours.
const FINISH_GLOW: Color = Color(0.5, 0.8, 1.0)
## For colour-blind eyes (a setting): the warnings told apart by brightness as well as hue (a bright yellow sweep,
## a blue guard-breaker, a deep vermilion), and the finisher's glow a sea green no warning uses.
const TELL_COLOURS_CLEAR: Array[Color] = [Color(1.0, 0.97, 0.9), Color(1.0, 0.88, 0.12), Color(0.38, 0.55, 1.0),
	Color(0.95, 0.22, 0.02)]
const FINISH_GLOW_CLEAR: Color = Color(0.25, 1.0, 0.7)
## A soldier's warnings, by what answers the blow (AttackDefinition.Tell): white (block or parry), amber (a
## low sweep: jump or roll), violet (it breaks a held guard: parry or roll), red (nothing a shield does:
## roll). Each its own colour and sound; all but the white also hang their own sign over his head and
## flush his body, held through the wind-up until the blow lands.
const TELL_COLOURS: Array[Color] = [Color(1.0, 0.97, 0.9), Color(1.0, 0.68, 0.22), Color(0.74, 0.46, 1.0),
	Color(1.0, 0.3, 0.2)]
const TELL_GLINTS: Array[StringName] = [&"glint", &"glint_low", &"glint_break", &"glint_dire"]
const TELL_SOUNDS: Array[StringName] = [&"enemy_tell", &"enemy_tell_low", &"enemy_tell_break", &"enemy_tell_dire"]
const TELL_FLUSH: Array[float] = [0.0, 0.28, 0.3, 0.36]
## Seconds a blade stays wet after a kill (its trail runs dark red, then clears).
const BLOODIED_TIME: float = 2.5
## Wounded below this share of his health, the screen's edges darken to blood in time with his heart (every
## HEART_EVERY seconds).
const DANGER_AT: float = 0.3
const HEART_EVERY: float = 0.95

## The warnings' colours and the finisher's glow, as the settings choose them.
var tell_colours: Array[Color] = TELL_COLOURS
var finish_glow: Color = FINISH_GLOW
## The session this shows the fighting of (its state, its hero), and the presentation it drives.
var game: AbbasidGame
var vfx: VfxDirector
var gore: GoreDirector
var camera: GameCamera
var sounds: SoundDirector
var hit_stop: HitStop
var hud: Hud
var settings: GameSettings
## The hero in play (the session's), or null.
var hero: Warrior:
	get:
		return game.hero if game != null else null

## How near to death the screen shows him, and where his heartbeat is.
var _danger: float = 0.0
var _heart: float = 0.0
## An Art's moment: how drained the world is, and how long it stays so; the fury's embers and the Storm's dust.
var _focus: float = 0.0
var _focus_left: float = 0.0
var _ember_left: float = 0.0
var _storm_dust_left: float = 0.0
## Soldiers winding up a warned blow (by instance id): the blow, so the flush holds until it lands.
var _warned: Dictionary[int, AttackDefinition] = {}
## When the hero last gasped for breath he did not have (msec), so the gasp does not repeat on every frame.
var _last_gasp: int = 0
## Seconds to the next copy fast movement leaves behind him.
var _echo_left: float = 0.0


## Takes the session's presentation (its effects, gore, camera, sound, hit-stop, HUD and settings).
func setup(session: AbbasidGame) -> void:
	game = session
	vfx = session.vfx
	gore = session.gore
	camera = session.camera
	sounds = session.sounds
	hit_stop = session.hit_stop
	hud = session.hud
	settings = session.settings
	gore.piece_landed.connect(_on_piece_landed)


## The warnings' colours and the finisher's glow as the settings choose them (for colour-blind eyes, or not).
func apply_settings() -> void:
	tell_colours = TELL_COLOURS_CLEAR if settings.colourblind else TELL_COLOURS
	finish_glow = FINISH_GLOW_CLEAR if settings.colourblind else FINISH_GLOW


func _process(delta: float) -> void:
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	_update_finish_prompt()
	_update_warnings()
	_update_focus(real)
	_update_danger(real)
	_update_charge_glow()
	_update_steel_glow()
	_update_echoes(real)


func _playing() -> bool:
	return game != null and game.state == AbbasidGame.State.PLAYING


func _real_delay(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout


# --- Binding ---------------------------------------------------------------------------------------

## The hero's look and sound, from his own signals.
func bind_hero(warrior: Warrior) -> void:
	_bind_combatant(warrior)
	warrior.died.connect(_on_hero_died)
	warrior.jumped.connect(sounds.play.bind(&"jump", -6.0))
	warrior.footstep.connect(sounds.play.bind(&"footstep", -12.0))
	warrior.landed.connect(_on_hero_landed)
	warrior.rolled.connect(_on_hero_rolled)
	warrior.healed.connect(_on_hero_healed)
	warrior.finisher_started.connect(_on_finisher_started)
	warrior.finisher_struck.connect(_on_finisher_struck)
	warrior.finisher_ended.connect(_on_finisher_ended)
	warrior.plunge_landed.connect(_on_plunge_landed)
	warrior.thrown.connect(_on_knife_thrown)
	warrior.charge_changed.connect(_on_charge_changed)
	warrior.art_started.connect(_on_art_started)
	warrior.wounds_opened.connect(_on_wounds_opened)
	warrior.cried.connect(_on_cried)
	warrior.flitted.connect(_on_flitted)
	warrior.judgment_ended.connect(_on_judgment_ended)
	warrior.art_refused.connect(_on_art_refused)
	warrior.breath_glint.connect(_on_breath_glint)
	warrior.winded.connect(_on_winded)
	warrior.steady_breath.connect(_on_steady_breath)
	warrior.close_call.connect(_on_close_call)
	warrior.breath_refused.connect(_on_breath_refused)
	warrior.knocked_down.connect(_on_knocked_down.bind(warrior))
	warrior.glanced.connect(_on_glanced)
	warrior.bounced.connect(sounds.play.bind(&"jump", -4.0))


## A soldier's look and sound, from his own signals.
func bind_soldier(soldier: MongolSoldier) -> void:
	_bind_combatant(soldier)
	soldier.died.connect(_on_soldier_died.bind(soldier))
	if soldier.get_meta(&"activity", &"") == &"stab":
		soldier.sprite.frame_changed.connect(_on_stab_frame.bind(soldier))
	soldier.projectile_spawned.connect(_on_projectile)
	soldier.surprised.connect(_on_soldier_surprised)
	soldier.knocked_down.connect(_on_knocked_down.bind(soldier))
	soldier.evaded.connect(_on_soldier_evaded.bind(soldier))
	soldier.steeled.connect(_on_soldier_steeled.bind(soldier))
	soldier.ignited.connect(_on_soldier_ignited.bind(soldier))
	soldier.sprite.frame_changed.connect(_on_soldier_frame.bind(soldier))
	var brain: EnemyBrain = soldier.get_node_or_null(^"Brain") as EnemyBrain
	if brain != null:
		brain.alerted.connect(sounds.play.bind(&"enemy_alert", -5.0))


func _bind_combatant(combatant: Combatant) -> void:
	combatant.struck.connect(_on_struck.bind(combatant))
	combatant.swung.connect(_on_swung.bind(combatant))
	combatant.telegraphed.connect(_on_telegraphed.bind(combatant))


# --- Blows --------------------------------------------------------------------------------------------

func _on_struck(hit: HitData, outcome: HitData.Outcome, target: Combatant) -> void:
	var guard_point: Vector2 = target.global_position + Vector2(target.facing * 13.0, -46.0)
	var shake: float = hit.attack.camera_shake if hit.attack != null else 1.5
	match outcome:
		HitData.Outcome.HIT:
			var thrown_left: bool = hit.direction < 0.0
			var impact: StringName = hit.attack.impact_effect if hit.attack != null else &"hit_pierce"
			vfx.play(impact, hit.position, thrown_left)
			vfx.play(&"hit_spark", hit.position)
			vfx.play(&"blood_spray", hit.position, thrown_left)
			if settings.gore:
				vfx.play(&"hit_flecks", hit.position, thrown_left)
			gore.spatter(hit.position, hit.direction, target.global_position.y)
			if hit.knockback >= 200.0:
				# A blow that shoves him back raises dust where his heels drag.
				vfx.play(&"dust", target.global_position, thrown_left, true)
			sounds.play(hit.attack.hit_cue if hit.attack != null else &"arrow_hit")
			sounds.play(&"hero_hurt" if target == hero else &"enemy_hurt", -3.0)
			hit_stop.trigger(hit.hit_stop)
			camera.shake(shake + (1.5 if target == hero else 0.0))
			camera.kick(hit.direction, clampf(shake * 0.8, 1.0, 4.0))
		HitData.Outcome.BLOCKED:
			vfx.play(&"block_spark", guard_point, target.facing < 0.0)
			sounds.play(&"shield_block")
			hit_stop.trigger(0.045)
			camera.shake(1.0)
		HitData.Outcome.PARRIED:
			vfx.play(&"parry_flash", guard_point)
			vfx.play(&"hit_spark", guard_point)
			sounds.play(&"parry")
			hit_stop.trigger(0.14)
			camera.shake(3.0)
			# Time slows on his own parry only (a soldier beating his blade aside is no moment of his).
			if target == hero:
				hit_stop.slow(0.45, 0.28)
				hud.breath_drawn()
		HitData.Outcome.GUARD_BROKEN:
			vfx.play(&"block_spark", guard_point, target.facing < 0.0)
			vfx.play(&"hit_spark", guard_point)
			sounds.play(&"guard_break")
			hit_stop.trigger(0.1)
			camera.shake(3.0)


func _on_swung(attack: AttackDefinition, combatant: Combatant) -> void:
	sounds.play(attack.swing_cue, -2.0)
	if attack.flinch_radius > 0.0:
		# A blow like a falling beam: grit thrown up both ways, and the street shakes.
		vfx.play(&"dust", combatant.global_position + Vector2(combatant.facing * 30.0, 0.0), false, true)
		vfx.play(&"dust", combatant.global_position + Vector2(combatant.facing * 30.0, 0.0), true, true)
		camera.shake(3.0)


## A soldier winds up: steel catches the light on his blade (following him through the wind-up), in the
## colour of what answers the blow. A blow a shield does not simply answer (a low sweep, a guard-breaker, one
## no shield stops) also hangs its sign over his head and flushes his body that colour until it lands. Each
## warning has its own sound, softer the further off it comes.
func _on_telegraphed(attack: AttackDefinition, combatant: Combatant) -> void:
	var tell: int = attack.tell()
	var colour: Color = tell_colours[tell]
	vfx.follow(&"glint", combatant, _blade_tip(combatant) - combatant.global_position, colour)
	if tell != AttackDefinition.Tell.GUARD:
		vfx.follow(TELL_GLINTS[tell], combatant, Vector2(0.0, _head_of(combatant) - 12.0), colour)
		_warned[combatant.get_instance_id()] = attack
		combatant.flash(TELL_FLUSH[tell] + 0.3, colour)
	var cue: StringName = TELL_SOUNDS[tell] if sounds.has_cue(TELL_SOUNDS[tell]) else &"enemy_tell"
	sounds.play(cue, _warning_volume(combatant))


## A warned soldier's flush holds through his wind-up, until the blow lands or is broken off.
func _update_warnings() -> void:
	for id: int in _warned.keys():
		var combatant: Combatant = instance_from_id(id) as Combatant
		var attack: AttackDefinition = _warned[id]
		if (combatant == null or combatant.dead or combatant.current_attack != attack
				or combatant.sprite.frame >= attack.active_from):
			_warned.erase(id)
			continue
		var tell: int = attack.tell()
		combatant.glow(TELL_FLUSH[tell], tell_colours[tell])


## How far above his feet a fighter's head is (the top of his hurtbox), for the signs over him.
func _head_of(combatant: Combatant) -> float:
	var shape: CollisionShape2D = combatant.hurtbox.get_node_or_null(^"Shape") as CollisionShape2D
	var rect: RectangleShape2D = shape.shape as RectangleShape2D if shape != null else null
	if rect == null:
		return -66.0
	return shape.position.y - rect.size.y * 0.5


## A warning sounds in full near the hero and softer further off (never silent: it is a warning).
func _warning_volume(combatant: Combatant) -> float:
	if hero == null:
		return -6.0
	var distance: float = absf(combatant.global_position.x - hero.global_position.x)
	return -6.0 - clampf((distance - 220.0) / 260.0, 0.0, 1.0) * 9.0


## Where a fighter's blade tip is now, in the world (his hand's height when unknown).
func _blade_tip(combatant: Combatant) -> Vector2:
	var tip: Vector2 = Vector2(12, -62)
	if combatant.hitboxes != null:
		var known: Vector2 = combatant.hitboxes.tip(combatant.sprite.animation, combatant.sprite.frame)
		if known != Vector2.INF:
			tip = known
	return combatant.global_position + Vector2(tip.x * combatant.facing, tip.y)


# --- The hero -------------------------------------------------------------------------------------------

func _on_hero_died() -> void:
	sounds.play(&"hero_death")
	gore.bleed_out(hero, hero.sprite, null, hero.facing)


func _on_hero_landed(speed: float) -> void:
	if speed > 220.0:
		sounds.play(&"land", -4.0)
		vfx.play(&"dust", hero.global_position, false, true)


func _on_hero_rolled() -> void:
	sounds.play(&"roll", -3.0)
	vfx.play(&"dust", hero.global_position, hero.facing < 0.0, true)


func _on_hero_healed(_amount: float) -> void:
	sounds.play(&"heal")


## The held cleave grows: a breath drawn, then a ring of steel and a glint along the blade at each step.
func _on_charge_changed(level: int) -> void:
	if level == 1:
		sounds.play(&"charge_hum", -4.0)
	elif level >= 2:
		sounds.play(&"charge_level", -3.0 if level == 2 else 0.0)
		vfx.play(&"glint", _blade_tip(hero), false, false, CHARGE_GLOW[level - 1])
		camera.shake(0.8 if level == 2 else 1.6)


## While the hero holds the cleave back he glows warmer as it grows.
func _update_charge_glow() -> void:
	if hero == null or hero.charge_level <= 0:
		return
	var level: int = hero.charge_level
	var pulse: float = 0.1 + 0.08 * level + 0.06 * sin(Time.get_ticks_msec() * (0.008 + 0.004 * level))
	hero.glow(pulse, CHARGE_GLOW[level - 1])


## The plunge strikes the street: dust thrown both ways, the ground shakes.
func _on_plunge_landed() -> void:
	sounds.play(&"land", -1.0)
	vfx.play(&"dust", hero.global_position, false, true)
	vfx.play(&"dust", hero.global_position, true, true)
	camera.shake(3.5)


func _on_knife_thrown(knife: Node2D) -> void:
	sounds.play(&"sword_swing", -6.0)
	var thrown: ThrownKnife = knife as ThrownKnife
	if thrown != null:
		thrown.impacted.connect(_on_arrow_impacted)
	# The hero's naphtha flask: Greek fire.
	var flask: FirePot = knife as FirePot
	if flask != null:
		flask.burst.connect(_on_naft_burst)


## Steel glints on him as a blow ends: the moment to raise the shield and draw breath.
func _on_breath_glint() -> void:
	vfx.play(&"glint", hero.global_position + Vector2(hero.facing * 6.0, -50.0), false, false, STEADY_GLOW)
	sounds.play(&"breath_glint", -12.0)


## The shield raised in the glint: breath drawn, the bar brightens.
func _on_steady_breath() -> void:
	sounds.play(&"breath_in", -5.0)
	hero.flash(0.3, STEADY_GLOW)
	hud.breath_drawn()


## Rolled just as the blow came: the world slows, pale copies of him trail through it, breath returns and
## his next blow is a counter.
func _on_close_call(_hit: HitData) -> void:
	hit_stop.slow(0.35, 0.4)
	sounds.play(&"close_call", -2.0)
	hud.breath_drawn()
	for i: int in 4:
		if i > 0:
			await _real_delay(0.05)
		if hero == null or not is_instance_valid(hero):
			return
		vfx.echo(hero.sprite, CLOSE_CALL_ECHO, 0.32)


## A light blow glanced off a raised shield.
func _on_glanced() -> void:
	camera.kick(-hero.facing, 2.0)
	sounds.play(&"glance", -3.0)


## His breath runs out: two ragged gasps, and the bar flashes.
func _on_winded() -> void:
	_last_gasp = Time.get_ticks_msec()
	sounds.play(&"winded", -4.0)
	hud.breath_refused()
	hud.markers.breath_refused()


## No breath left for what he asked: a gasp, and the bar flashes.
func _on_breath_refused() -> void:
	var now: int = Time.get_ticks_msec()
	if now - _last_gasp > 450:
		_last_gasp = now
		sounds.play(&"breath_out", -6.0)
	hud.breath_refused()
	hud.markers.breath_refused()


## Fast movement leaves pale copies of him behind: the roll, a dash (the running thrust, the Piercing
## Line), the plunge's fall.
func _update_echoes(real: float) -> void:
	if hero == null or not _playing():
		return
	var tint: Color = Color.TRANSPARENT
	match hero.state:
		Warrior.State.PLUNGE:
			if hero.velocity.y > 200.0:
				tint = FALL_ECHO
		Warrior.State.ATTACK, Warrior.State.ART:
			var attack: AttackDefinition = hero.current_attack
			if attack != null and attack.lunge_speed >= 200.0 and absf(hero.velocity.x) > 150.0:
				tint = DASH_ECHO
			elif attack != null and attack.art and attack.rehit and attack.radial:
				tint = STORM_ECHO
				_storm_dust_left -= real
				if _storm_dust_left <= 0.0:
					_storm_dust_left = STORM_DUST_EVERY
					vfx.play(&"dust", hero.global_position, randf() < 0.5, true)
			elif hero.is_steeled() and hero.state == Warrior.State.ATTACK:
				tint = FURY_ECHO
	if tint.a <= 0.0:
		_echo_left = 0.0
		return
	_echo_left -= real
	if _echo_left <= 0.0:
		_echo_left = ECHO_EVERY
		vfx.echo(hero.sprite, tint, 0.2)


## While the fury holds he glows gold, embers lifting off him.
func _update_steel_glow() -> void:
	if hero == null or not hero.is_steeled() or hero.charge_level > 0:
		return
	hero.glow(0.16 + 0.08 * sin(Time.get_ticks_msec() * 0.008), STEEL_GLOW)
	_ember_left -= get_process_delta_time() / maxf(Engine.time_scale, 0.001)
	if _ember_left <= 0.0:
		_ember_left = EMBERS_EVERY
		vfx.play(&"embers", hero.global_position + Vector2(randf_range(-9.0, 9.0), -6.0), randf() < 0.5, true)


## Wounded near to death: blood at the screen's edges in time with his heart, and the heart itself; it fades as he
## heals (or the game waits).
func _update_danger(real: float) -> void:
	var target: float = 0.0
	if hero != null and is_instance_valid(hero) and not hero.dead and _playing() and hero.max_health > 0.0:
		var left: float = hero.health / hero.max_health
		if left < DANGER_AT:
			target = lerpf(0.4, 0.85, 1.0 - left / DANGER_AT)
	_danger = move_toward(_danger, target, real * 1.5)
	var beat: float = 0.0
	if _danger > 0.0 and _playing():
		_heart += real
		if _heart >= HEART_EVERY:
			_heart = 0.0
			sounds.play(&"heartbeat", -5.0)
		# Two beats, the strong one and its echo.
		var t: float = _heart / HEART_EVERY
		beat = maxf(exp(-pow((t - 0.04) * 13.0, 2.0)), 0.7 * exp(-pow((t - 0.25) * 13.0, 2.0)))
	var grade: ShaderMaterial = game.grade() if game != null else null
	if grade != null:
		grade.set_shader_parameter(&"danger", _danger * (0.6 + 0.4 * beat))


# --- Finishers and Arts -------------------------------------------------------------------------------

## A scripted kill begins. The last soldier standing gets the full one: the bars close in, a sting,
## and the street holds its breath. While others still fight, it plays quick and plain.
func _on_finisher_started(_target: Combatant, _finisher: FinisherDefinition) -> void:
	hud.set_finish_target(null)
	if hero.is_judging():
		sounds.play(&"judgment_gong", -3.0)
		hero.flash(0.5, CHARGE_GLOW[0])
	if hero.finisher_cinematic:
		hud.cinematic_bars(true)
		sounds.play(&"finisher")
		camera.shake(1.5)
	else:
		sounds.play(&"finisher", -10.0)


## A finisher's blow: what it cuts off flies, or the blood bursts from a thrust; time slows on it.
func _on_finisher_struck(target: Combatant, finisher: FinisherDefinition, frame: int, cut: StringName) -> void:
	var soldier: MongolSoldier = target as MongolSoldier
	if soldier == null:
		return
	var full: bool = hero.finisher_cinematic
	if full and frame >= finisher.slow_from and frame <= finisher.slow_to:
		hit_stop.slow(0.3, 0.7)
	if cut != &"":
		gore.cut_down(soldier, soldier.sprite, soldier.gore_set, cut, soldier.facing, hero.facing, 1.6 if full else 1.2)
		sounds.play(&"sever")
		hit_stop.trigger(0.11 if full else 0.07)
		camera.shake(4.5 if full else 3.0)
	else:
		var middle: Vector2 = soldier.global_position + Vector2(0.0, -40.0)
		var last: bool = frame == finisher.burst_frames[finisher.burst_frames.size() - 1]
		gore.burst(soldier, soldier.sprite, soldier.gore_set, middle, hero.facing, last)
		sounds.play(&"sever", -4.0)
		hit_stop.trigger(0.08 if full else 0.05)
		camera.shake(3.0 if full else 2.0)
	if settings.gore:
		var trail: SwordTrail = hero.get_node_or_null(^"Sprite/Trail") as SwordTrail
		if trail != null:
			trail.bloodied = BLOODIED_TIME


func _on_finisher_ended(_target: Combatant) -> void:
	if not hero.is_judging():
		hud.cinematic_bars(false)


## The soldier a finisher would take glows, and the heavy button shows over him, while he stands open.
func _update_finish_prompt() -> void:
	var target: Combatant = hero.finisher_target if hero != null and _playing() else null
	hud.set_finish_target(target)
	if target != null:
		var pulse: float = 0.24 + 0.12 * sin(Time.get_ticks_msec() * 0.012)
		target.glow(pulse, finish_glow)


## An Art spent: the world stops a heartbeat and drains of colour about him, the Art's name crosses the
## screen, a drum and a ring of steel, then its own sound; a judgment draws the black bars for all its men.
func _on_art_started(art: ArtDefinition) -> void:
	sounds.play(&"art_moment", -2.0)
	if art.cue != &"":
		sounds.play(art.cue, -1.0)
	hit_stop.trigger(0.14)
	hit_stop.slow(0.4, 0.3)
	_focus = 1.0
	_focus_left = ART_FOCUS_HOLD
	hud.art_banner(tr(art.name_key), _arabic_name(art.name_key))
	camera.shake(3.0)
	hero.flash(0.7, CHARGE_GLOW[1])
	if art.judgment:
		hud.cinematic_bars(true)
	if art.attack != null and art.attack.lunge_speed > 200.0:
		vfx.play(&"dust", hero.global_position, hero.facing < 0.0, true)
	elif art.attack != null and art.attack.radial:
		vfx.play(&"dust", hero.global_position, false, true)
		vfx.play(&"dust", hero.global_position, true, true)


## The name an Art has in Arabic (shown above its name as it is spent), whatever the language.
func _arabic_name(key: String) -> String:
	var arabic: Translation = TranslationServer.get_translation_object("ar")
	if arabic == null:
		return ""
	return String(arabic.get_message(StringName(key)))


## The world drained of colour about the hero after an Art is spent, then its colour back.
func _update_focus(real: float) -> void:
	if _focus_left > 0.0:
		_focus_left -= real
	elif _focus > 0.0:
		_focus = maxf(0.0, _focus - real / ART_FOCUS_FADE)
	var grade: ShaderMaterial = game.grade() if game != null else null
	if grade == null:
		return
	grade.set_shader_parameter(&"focus", _focus)
	if _focus > 0.0 and hero != null:
		var size: Vector2 = get_viewport().get_visible_rect().size
		var at: Vector2 = hero.get_global_transform_with_canvas().origin + Vector2(0.0, -40.0)
		grade.set_shader_parameter(&"focus_center", Vector2(at.x / size.x, at.y / size.y))


## The Line's wounds open together on the men it passed through: a slash across each, a burst of blood.
func _on_wounds_opened(targets: Array[Combatant]) -> void:
	if targets.is_empty():
		return
	sounds.play(&"wounds_open", 0.0)
	hit_stop.trigger(0.12)
	camera.shake(4.5)
	for target: Combatant in targets:
		if is_instance_valid(target):
			vfx.play(&"hit_slash", target.global_position + Vector2(0.0, -42.0), target.global_position.x < hero.global_position.x)


## Greek fire: the flask bursts in a fireball and the street goes up.
func _on_naft_burst(at: Vector2, _outcome: int) -> void:
	sounds.play(&"naft_burst", 0.0)
	vfx.play(&"naft_burst", at + Vector2(0.0, 6.0), false, true)
	vfx.play(&"dust", at, false, true)
	vfx.play(&"dust", at, true, true)
	hit_stop.trigger(0.08)
	camera.shake(6.0)


## The guard's cry: the air driven out along the street both ways, dust thrown up, the street shaken.
func _on_cried(_radius: float) -> void:
	vfx.play(&"shockwave", hero.global_position + Vector2(0.0, 4.0), false, true)
	vfx.play(&"dust", hero.global_position + Vector2(-18.0, 0.0), true, true)
	vfx.play(&"dust", hero.global_position + Vector2(18.0, 0.0), false, true)
	hit_stop.trigger(0.1)
	camera.shake(6.0)
	hero.flash(0.8, STEEL_GLOW)


## Between two judgments he crosses the street in a blink: gold copies of him along the way.
func _on_flitted(from: Vector2, to: Vector2) -> void:
	sounds.play(&"pierce_dash", -4.0)
	for i: int in 5:
		vfx.echo(hero.sprite, JUDGMENT_ECHO, 0.32, from.lerp(to, float(i) / 5.0))
	hit_stop.slow(0.35, 0.25)


func _on_judgment_ended() -> void:
	hud.cinematic_bars(false)
	camera.shake(3.0)


## An Art asked for without the resolve to pay for it.
func _on_art_refused(_art: ArtDefinition) -> void:
	sounds.play(&"art_refused", -4.0)


# --- The soldiers ----------------------------------------------------------------------------------------

## A soldier falls: cut apart if the blow took something off him, and bleeding where he lies (a finisher has
## already cut him, frame by frame).
func _on_soldier_died(soldier: MongolSoldier) -> void:
	sounds.play(&"enemy_death", -2.0)
	if soldier.in_finisher:
		gore.bleed_out(soldier, soldier.sprite, soldier.gore_set, soldier.facing, soldier.severed)
		return
	# The blade that killed him is wet with it for a while.
	var trail: SwordTrail = hero.get_node_or_null(^"Sprite/Trail") as SwordTrail if hero != null else null
	if trail != null and settings.gore:
		trail.bloodied = BLOODIED_TIME
	if soldier.severed != &"":
		var blow: float = soldier.killing_hit.direction if soldier.killing_hit != null else -soldier.facing
		var fury: float = 3.0 if soldier.profile.armoured_body else 1.0
		gore.cut_down(soldier, soldier.sprite, soldier.gore_set, soldier.severed, soldier.facing, blow, fury)
		sounds.play(&"sever", -1.0)
		hit_stop.trigger(0.09)
	gore.bleed_out(soldier, soldier.sprite, soldier.gore_set, soldier.facing, soldier.severed)


## A soldier stabbing at a body on the street: blood with each thrust.
func _on_stab_frame(soldier: MongolSoldier) -> void:
	if soldier.dead or soldier.sprite.animation != &"stab" or soldier.sprite.frame != 1:
		return
	# Only where it can be seen (the street keeps only so many marks).
	if hero == null or absf(soldier.global_position.x - hero.global_position.x) > 420.0:
		return
	var at: Vector2 = soldier.global_position + Vector2(soldier.facing * 20.0, -5.0)
	gore.spatter(at, soldier.facing, soldier.global_position.y, 1)
	sounds.play(&"sever", -16.0)


## A man set ablaze: the fire takes him, and burns on him as he runs.
func _on_soldier_ignited(soldier: MongolSoldier) -> void:
	sounds.play(&"ignite", -4.0)
	vfx.follow(&"fire_medium", soldier, Vector2(0.0, -28.0), Color.WHITE, soldier.burn_left())


## A soldier leaps back out of reach: a scuff of dust where he sprang, and a pale copy left in the air.
func _on_soldier_evaded(soldier: MongolSoldier) -> void:
	vfx.play(&"dust", soldier.global_position, soldier.facing > 0.0, true)
	sounds.play(&"jump", -4.0)
	vfx.echo(soldier.sprite, SOLDIER_ECHO, 0.26)


## A soldier's spring (a dash, a running lunge, a leap) leaves pale copies behind, as the hero's does.
func _on_soldier_frame(soldier: MongolSoldier) -> void:
	var attack: AttackDefinition = soldier.current_attack
	var springing: bool = (attack != null and attack.lunge_speed >= SPRING_SPEED
		and attack.is_lunge_frame(soldier.sprite.frame))
	if springing or (soldier.sprite.animation == &"evade" and soldier.sprite.frame in [2, 3, 4]):
		vfx.echo(soldier.sprite, SOLDIER_ECHO, 0.22)


## A soldier flinched twice close together steels himself: a cool grey flash and a breath drawn (not a
## warning's colour: he is not winding up, he will just not be stopped a moment).
func _on_soldier_steeled(soldier: MongolSoldier) -> void:
	soldier.flash(0.22, Color(0.72, 0.78, 0.86))
	sounds.play(&"breath_in", -12.0)


## A first strike on a soldier who never saw it coming: he dies before he can turn.
func _on_soldier_surprised() -> void:
	sounds.play(&"guard_break", -3.0)
	hit_stop.trigger(0.12)
	camera.shake(2.4)


## A man thrown off his feet: he hits the street with a thud and the dust flies.
func _on_knocked_down(body: Combatant) -> void:
	var behind: float = -body.facing * 14.0
	vfx.play(&"dust", body.global_position + Vector2(behind, 0.0), body.facing > 0.0, true)
	sounds.play(&"body_drop", -2.0)
	camera.shake(2.4 if body == hero else 1.8)


func _on_projectile(projectile: Node2D) -> void:
	var arrow: Arrow = projectile as Arrow
	if arrow != null:
		sounds.play(&"bow_release", -3.0)
		arrow.impacted.connect(_on_arrow_impacted)
	var pot: FirePot = projectile as FirePot
	if pot != null:
		pot.burst.connect(_on_pot_burst)


## A fire pot breaks: clay and naphtha, and the fire takes.
func _on_pot_burst(at: Vector2, _outcome: int) -> void:
	sounds.play(&"pot_burst", -2.0)
	vfx.play(&"dust", at, false, true)
	camera.shake(2.0)


func _on_arrow_impacted(at: Vector2, outcome: int) -> void:
	if outcome == -1:
		sounds.play(&"arrow_thunk", -4.0)
		vfx.play(&"dust", at, false, true)


func _on_piece_landed(_at: Vector2) -> void:
	sounds.play(&"body_drop", -8.0)
