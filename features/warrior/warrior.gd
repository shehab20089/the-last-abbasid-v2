class_name Warrior
extends Combatant
## Yusuf, the hero: a state machine over the shared Combatant body. Free movement (a run, a walk,
## a variable-height jump with coyote time and buffering, a drop through planks), the three-cut light
## combo with its enders on the heavy button (the pommel strike, the whirling cut, the executioner's
## cleave) and its delayed cut, the heavy cleave and its charge, the running thrust, the air slash and
## the plunge, the shield (a block, a parry in the first moments of raising it, a bash), the dodge
## roll, finishers, remedies and interaction. What he can do is what he has learned (`techniques`).
## Input comes from WarriorInput, what each button makes of the moment from WarriorMoves (which also keeps
## the string's memory and names open moves for the coach), animation choice from WarriorAnimator, and every
## timing from the profile and the animation frames.

signal stamina_changed(current: float, maximum: float)
signal remedies_changed(count: int, maximum: int)
## Knives left, and how many he can carry (0 before he has any).
signal knives_changed(count: int, maximum: int)
signal state_changed(state: State)
signal interactable_changed(target: Interactable)
signal jumped
signal landed(speed: float)
signal footstep
signal rolled
signal blocked(hit: HitData)
signal parried(hit: HitData)
signal guard_broken(hit: HitData)
signal dodged(hit: HitData)
signal healed(amount: float)
signal interacted(target: Interactable)
## A finisher began on a staggered soldier.
signal finisher_started(target: Combatant, finisher: FinisherDefinition)
## A finisher's blow landed on its frame: `cut` is what it took off, or nothing for a thrust's burst.
signal finisher_struck(target: Combatant, finisher: FinisherDefinition, frame: int, cut: StringName)
## The finisher is over; the hero has his body back.
signal finisher_ended(target: Combatant)
## The plunge struck the ground.
signal plunge_landed
## A knife left his hand.
signal thrown(knife: Node2D)
## The held cleave grew to `level` (1 as the blade is raised and held, then 2 and 3), or 0: let go
## or broken off.
signal charge_changed(level: int)
signal resolve_changed(current: float, maximum: float)
## An Art began (its resolve already spent).
signal art_started(art: ArtDefinition)
## The Line's wounds opened on the men it passed through.
signal wounds_opened(targets: Array[Combatant])
## The guard's cry went out (the men it reached have been thrown back).
signal cried(radius: float)
## He crossed to the next man of a judgment in a blink.
signal flitted(from: Vector2, to: Vector2)
## A judgment's last man is dealt with.
signal judgment_ended
## An Art was asked for without the resolve to pay for it.
signal art_refused(art: ArtDefinition)
## The second wind took hold (true) or wore off (false).
signal steeled(on: bool)
## He began one of the techniques he has learned (an ender, the delayed cut, the charged cleave, the
## running thrust, the bash, the rolling cut, the plunge, an Art): the session counts them, so a
## coach can stop naming a move once it is in his hands.
signal technique_used(technique: StringName)
## An action asked for with no breath left to pay for it.
signal breath_refused
## His breath ran out (a gasp; it comes back only after a longer pause).
signal winded
## Steel glints on him as a blow's live frames end: the moment for Steady Breath.
signal breath_glint
## The shield raised in the glint: breath drawn.
signal steady_breath
## A blow that would have landed early in a roll passed him by: breath back, the world slowed, a counter
## ready.
signal close_call(hit: HitData)
## Thrown off his feet by a blow no guard turns.
signal knocked_down
## A light blow glanced off a raised shield.
signal glanced
## The down-stab struck and he springs back up off it.
signal bounced

## The guard's loops: held still, stepping forward, stepping back (the animator chooses among them).
const GUARD_LOOPS: Array[StringName] = [&"block", &"block_walk", &"block_back"]

enum State {IDLE, MOVE, AIR, ATTACK, BLOCK, PARRY, ROLL, HURT, HEAL, INTERACT, DEAD, CINEMATIC, FINISHER, AIR_ATTACK,
	PLUNGE, THROW, CHARGE, ART, DOWN}

## The roll animation's length (8 frames at 18 fps).
const ROLL_TIME: float = 0.444
## The frame of the heal animation on which the remedy takes effect.
const HEAL_FRAME: int = 3
## The frame of the interact animation on which the hand arrives.
const INTERACT_FRAME: int = 2
## The frame of the throw on which the knife leaves his hand, and where it leaves (body space).
const THROW_FRAME: int = 1
const KNIFE_OFFSET: Vector2 = Vector2(18, -52)
## Falls faster than this (px/s) end in the landing crouch.
const HARD_LANDING: float = 260.0
const ATTACK_FRICTION: float = 1500.0
## How near (px) and how level a staggered soldier must be for a finisher.
const FINISH_REACH: float = 64.0
const FINISH_LEVEL: float = 10.0
## While another soldier this near (px) is still in the fight, a finisher plays this much quicker,
## without the bars and the slow time.
const FIGHT_RADIUS: float = 320.0
const QUICK_FINISHER: float = 1.4
## combo_index for what is not the light combo.
const HEAVY_INDEX: int = -1
const BASH_INDEX: int = -2
const PLUNGE_INDEX: int = -3
const POMMEL_INDEX: int = -4
const WHIRL_INDEX: int = -5
const DELAYED_INDEX: int = -6
const EXECUTIONER_INDEX: int = -7
const CHARGED_INDEX: int = -8
const RUNNING_INDEX: int = -9
const ART_INDEX: int = -10
const GROUND_INDEX: int = -11
const LOW_INDEX: int = -12
const SWEEP_INDEX: int = -13
const HEAVY_2_INDEX: int = -14
const HEAVY_3_INDEX: int = -15
const RUN_SLASH_INDEX: int = -16
const GUARDED_INDEX: int = -17
const RIPOSTE_INDEX: int = -18
## The light string's fourth step: the kick.
const KICK_INDEX: int = 3
## How far from a man a judgment sets him down to finish him (px).
const JUDGMENT_GAP: float = 30.0
## How far before him a man lying on the street can be struck by the ground stroke.
const GROUND_REACH: float = 60.0
## A man down is finished from over him (the ground finisher sets him this far ahead), not from across the
## street: within this much of it.
const GROUND_FINISH_AT: float = 2.0
const GROUND_FINISH_SLACK: float = 26.0
## No move: nothing follows.
const NO_INDEX: int = -100
## The technique each learned move's combo index stands for.
const INDEX_TECHNIQUES: Dictionary[int, StringName] = {
	BASH_INDEX: &"bash", POMMEL_INDEX: &"pommel", WHIRL_INDEX: &"whirl", DELAYED_INDEX: &"delayed_cut",
	EXECUTIONER_INDEX: &"executioner", RUNNING_INDEX: &"running_thrust", GROUND_INDEX: &"ground_stab",
	KICK_INDEX: &"kick", LOW_INDEX: &"low_cut", SWEEP_INDEX: &"sweep", HEAVY_2_INDEX: &"rising_cleave",
	HEAVY_3_INDEX: &"windmill", RUN_SLASH_INDEX: &"running_slash", GUARDED_INDEX: &"guarded_thrust",
	RIPOSTE_INDEX: &"riposte",
}
## The rolling cut stands in the combo where the rising cut does: the thrust follows it.
const ROLL_CUT_INDEX: int = 1
## How far (px) the rolling cut looks for a man to turn on when the stick is not held.
const ROLL_CUT_SEEK: float = 90.0
## How far down (px) he slips to drop through the planks under him.
const DROP_THROUGH: float = 9.0

@export var profile: WarriorProfile
## The scripted kills he can play on a staggered soldier (one chosen each time, never twice running).
@export var finishers: Array[FinisherDefinition] = []
## The techniques he has learned (the session sets them from the story and from what he has earned):
## bash, plunge, roll_cut, knives, charge, pommel, whirl, delayed_cut, executioner, running_thrust; the
## second move set, taught through the chapter (kick, low_cut, sweep, rising_cleave, running_slash,
## guarded_thrust, down_stab, windmill); and the Arts (storm, pierce, naft, second_wind, judgment). By
## default he knows them all.
@export var techniques: Array[StringName] = [&"bash", &"plunge", &"roll_cut", &"knives", &"charge", &"pommel",
	&"whirl", &"delayed_cut", &"executioner", &"running_thrust", &"kick", &"low_cut", &"sweep", &"rising_cleave",
	&"running_slash", &"guarded_thrust", &"down_stab", &"windmill", &"storm", &"pierce", &"naft", &"second_wind",
	&"judgment"]
## The Arts he carries into a fight (ids, the art button's first), chosen at a lamp; any slot left
## empty takes the next Art he knows.
@export var art_slots: Array[StringName] = []
## The charged cleave by toggle (a setting): one press raises and holds the blade, the next lets it go;
## two quick presses are the plain cleave.
var charge_toggle: bool = false

var state: State = State.IDLE
var stamina: float = 0.0
var remedies: int = 0
var knives: int = 0
## Index of the current light attack in the combo, or HEAVY_INDEX, BASH_INDEX, PLUNGE_INDEX.
var combo_index: int = 0
## Slashes made in this jump.
var _air_slashes: int = 0
## The men the down-stab has sprung him off since he last stood on the ground.
var _bounced_off: Array[Combatant] = []
## A light blow glanced off a shield (handled on the next step, out of the hitbox's own work).
var _glance_pending: bool = false
## The arm thrown back by a glance: he may raise his shield or roll at once.
var _glancing: bool = false
## The down-stab struck: he springs back up on the next step.
var _bounce_pending: bool = false
## The plunge has turned its blade over and is dropping.
var _plunge_dropping: bool = false
## Horizontal intent while a script drives the hero (cutscenes).
var cinematic_move: float = 0.0
## A stroke playing while cinematic (cinematic_strike), until it ends.
var _cinematic_action: StringName = &""
var _state_time: float = 0.0
var _hurt_left: float = 0.0
var _coyote: float = 0.0
var _jump_rising: bool = false
var _regen_delay: float = 0.0
var _parry_window: float = 0.0
var _parry_cooldown: float = 0.0
## The blow playing has met a man (struck him, or his shield): only then does its end give Steady Breath.
var _landed: bool = false
var _riposte: float = 0.0
var _invulnerable: float = 0.0
var _since_hurt: float = 100.0
## How the held cleave has grown (0 while nothing is held; see charge_changed).
var charge_level: int = 0
## How long he has been running (the running thrust needs a run behind it).
var _run_time: float = 0.0
## The attack's lunge has ended in the man it struck.
var _lunge_stopped: bool = false
## The men about him have flinched from this blow.
var _flinched: bool = false
## This cleave has reached its raised blade and it was decided whether he holds it back.
var _charge_checked: bool = false
## Seconds left in the Steady Breath glint of the blow playing: -1 before it opens, 0 once it has passed.
var _steady_left: float = -1.0
## This roll has had its close call.
var _close_called: bool = false
## Resolve: filled by fighting well, spent on the Arts (see the profile).
var resolve: float = 0.0
## Seconds since he last struck or was struck (out of the fight, resolve ebbs).
var _since_combat: float = 0.0
## The Art playing.
var _art: ArtDefinition
## The men the Art playing has struck (the Line opens their wounds).
var _art_struck: Array[Combatant] = []
## A judgment in progress: the Art, and the men still to be judged, nearest first.
var _judgment: ArtDefinition
var _judging: Array[Combatant] = []
## The fury of the Second Wind: how much faster his blows come, the health a blow gives back, the time a
## kill adds, and the most it may run to.
var _fury_speed: float = 1.0
var _fury_heal: float = 0.0
var _fury_kill: float = 0.0
var _fury_cap: float = 0.0
## The second wind: seconds left in which his blows cost nothing and light blows do not stagger him.
var _steel: float = 0.0
var _steel_threshold: float = 0.0
## What the techniques bought at lamps and the keepsakes he wears do to him (the session sets it).
var mods: Modifiers = Modifiers.new()
## What his buttons make of the moment: the choice of move (see WarriorMoves).
var moves: WarriorMoves = WarriorMoves.new(self)
var _action_done: bool = false
var _interact_target: Interactable
var _interactables: Array[Interactable] = []
var _nearest: Interactable
## The staggered soldier a finisher would take now, or null; null too once he is freed (a street left in the
## middle of a frame), before the hero looks again.
var finisher_target: Combatant:
	get:
		return finisher_target if is_instance_valid(finisher_target) else null
## The finisher playing, its soldier, and the last one played.
var _finisher: FinisherDefinition
var _finished: Combatant
var _last_finisher: FinisherDefinition
var _finisher_frame: int = -1
## A finisher to play next instead of a random one (tests, set pieces).
var next_finisher: FinisherDefinition
## The finisher playing is the full one (bars, slow time): no other soldier near is still fighting.
var finisher_cinematic: bool = false

@onready var input: WarriorInput = $Input
@onready var animator: WarriorAnimator = $Animator
@onready var sensor: Area2D = $InteractionSensor


func _ready() -> void:
	max_health = profile.max_health
	super._ready()
	add_to_group(&"player")
	stamina = profile.max_stamina
	remedies = profile.max_remedies
	knives = max_knives()
	animator.setup(sprite, profile)
	animator.footstep.connect(_on_animator_footstep)
	sprite.frame_changed.connect(_on_action_frame)
	sensor.area_entered.connect(_on_sensor_entered)
	sensor.area_exited.connect(_on_sensor_exited)
	animator.play(&"idle")


func _physics_process(delta: float) -> void:
	input.poll(delta)
	_tick(delta)
	match state:
		State.IDLE, State.MOVE, State.AIR:
			_free(delta)
		State.ATTACK:
			_attacking(delta)
		State.BLOCK:
			_blocking(delta)
		State.PARRY:
			_parrying(delta)
		State.ROLL:
			_rolling(delta)
		State.HURT:
			_hurting(delta)
		State.HEAL, State.INTERACT, State.DEAD:
			velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
		State.CINEMATIC:
			_cinematic(delta)
		State.FINISHER:
			velocity.x = 0.0
		State.AIR_ATTACK:
			_air_attacking(delta)
		State.THROW:
			_throwing(delta)
		State.PLUNGE:
			_plunging(delta)
		State.CHARGE:
			_charging(delta)
		State.ART:
			_arting(delta)
		State.DOWN:
			_lying(delta)
	_apply_gravity(delta)
	var was_on_floor: bool = is_on_floor()
	var fall_speed: float = velocity.y
	move_and_slide()
	_after_move(was_on_floor, fall_speed)
	_update_nearest_interactable()
	_update_finisher_target()


# --- Public ---------------------------------------------------------------------------------------

## Brings the hero back at a checkpoint: full health, stamina and remedies.
func respawn(at: Vector2, face: float = 1.0) -> void:
	revive(at)
	set_facing(face)
	stamina = profile.max_stamina
	remedies = profile.max_remedies
	_refill_knives()
	combo_index = 0
	moves.clear()
	_run_time = 0.0
	_since_combat = 0.0
	if _steel > 0.0:
		_steel = 0.0
		steeled.emit(false)
	_parry_window = 0.0
	_riposte = 0.0
	_invulnerable = 0.6
	input.clear()
	_set_state(State.IDLE)
	animator.play(&"idle")
	stamina_changed.emit(stamina, profile.max_stamina)
	remedies_changed.emit(remedies, profile.max_remedies)


## Refills remedies and health (resting at a lamp).
func rest() -> void:
	heal(max_health)
	remedies = profile.max_remedies
	stamina = profile.max_stamina
	_refill_knives()
	remedies_changed.emit(remedies, profile.max_remedies)
	stamina_changed.emit(stamina, profile.max_stamina)


## Hands control to a script (dialogue, cutscenes) or gives it back to the player.
func set_cinematic(on: bool) -> void:
	if dead:
		return
	if on:
		cancel_attack()
		input.clear()
		cinematic_move = 0.0
		_set_state(State.CINEMATIC)
	elif state == State.CINEMATIC:
		input.clear()
		_set_state(State.IDLE)


## His shield is up (blocking, in a parry's window, or thrusting over its rim).
func is_guarding() -> bool:
	return (state == State.BLOCK or state == State.PARRY
		or (state == State.ATTACK and current_attack != null and current_attack.guarded))


func is_invulnerable() -> bool:
	return (_invulnerable > 0.0 or _rolling_through() or state == State.FINISHER
		or (state == State.ART and _art != null and _art.invulnerable))


## Whether he has learned a technique (see `techniques`).
func knows(technique: StringName) -> bool:
	return techniques.has(technique)


## Sets what he knows (the session, from the story); knives come with their full count.
func set_techniques(known: Array[StringName]) -> void:
	techniques = known.duplicate()
	_refill_knives()


## Learns a technique (a page of the treatise, a gift).
func learn(technique: StringName) -> void:
	if not techniques.has(technique):
		techniques.append(technique)
	if technique == &"knives":
		_refill_knives()


func _refill_knives() -> void:
	knives = max_knives()
	knives_changed.emit(knives, max_knives())


## The knives he carries when full (none before he has them).
func max_knives() -> int:
	return profile.max_knives + mods.extra_knives if knows(&"knives") else 0


## What the techniques bought and the keepsakes worn do to him; his knives fill to the new count.
func set_modifiers(next: Modifiers) -> void:
	mods = next if next != null else Modifiers.new()
	_refill_knives()


## A knife of his killed a man and comes back to his belt (a keepsake's gift).
func knife_returned() -> void:
	if mods.knife_returns and knives < max_knives():
		knives += 1
		knives_changed.emit(knives, max_knives())


func riposte_ready() -> bool:
	return _riposte > 0.0


## True when a blow landed on the hero within `seconds`: soldiers give him a breath after a hit.
func recently_hurt(seconds: float) -> bool:
	return _since_hurt < seconds


## He has run long enough for a running blow (`profile.running_thrust_after`).
func in_full_run() -> bool:
	return _run_time >= profile.running_thrust_after


## The blow playing has met a man (struck him, or his shield).
func blow_met() -> bool:
	return _landed


## The cleave playing has reached its raised blade, and whether he holds it back is decided.
func charge_decided() -> bool:
	return _charge_checked


## Seconds he has been in his present state.
func time_in_state() -> float:
	return _state_time


func nearest_interactable() -> Interactable:
	return _nearest


## A blow that reaches for a man: its lunge carries him to striking distance of the nearest one before
## him (no farther than the blow reaches), so it lands after a knockback and never runs him through.
func _aim_lunge(attack: AttackDefinition) -> void:
	if attack.seeks <= 0.0 or attack.lunge_speed <= 0.0:
		return
	var gap: float = INF
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or other.dead:
			continue
		var offset: Vector2 = other.global_position - global_position
		var ahead: float = offset.x * facing
		if absf(offset.y) > 30.0 or ahead < 0.0 or ahead > attack.strike_at + attack.seeks:
			continue
		gap = minf(gap, ahead)
	if gap != INF:
		aim_lunge(gap, ATTACK_FRICTION)


## The ground stroke on a man lying before him (or just behind: he turns to it). True when it began.
func _ground_stroke() -> bool:
	var target: Combatant = moves.downed_foe(GROUND_REACH) if profile.ground_stab != null else null
	if target == null:
		return false
	input.consume(&"heavy_attack")
	if target.global_position.x != global_position.x:
		set_facing(signf(target.global_position.x - global_position.x))
	var turn: float = facing
	_start_attack(profile.ground_stab, GROUND_INDEX)
	set_facing(turn)
	return true


# --- Free movement --------------------------------------------------------------------------------

func _free(delta: float) -> void:
	var on_floor: bool = is_on_floor()
	if on_floor:
		_air_slashes = 0
	if on_floor and absf(velocity.x) > profile.walk_speed * 1.15:
		_run_time += delta
	else:
		_run_time = 0.0
	if on_floor and input.down_held and input.has(&"jump") and _on_one_way_floor():
		input.consume(&"jump")
		_drop_through()
		on_floor = false
	elif (on_floor or _coyote > 0.0) and input.consume(&"jump"):
		_jump()
		on_floor = false
	if on_floor and _try_action():
		return
	if not on_floor and _try_air_action():
		return
	var move: float = input.move
	if move != 0.0:
		set_facing(move)
	var speed: float = profile.run_speed if absf(move) >= profile.run_tilt else profile.walk_speed
	var target: float = signf(move) * speed
	var rate: float = profile.ground_acceleration if on_floor else profile.air_acceleration
	if move == 0.0 and on_floor:
		rate = profile.ground_deceleration
	velocity.x = move_toward(velocity.x, target, rate * delta)
	if _jump_rising and velocity.y < 0.0 and not input.jump_held:
		velocity.y *= profile.jump_cut
		_jump_rising = false
	if velocity.y >= 0.0:
		_jump_rising = false
	if not on_floor:
		_set_state(State.AIR)
	else:
		_set_state(State.MOVE if absf(velocity.x) > 5.0 else State.IDLE)
	animator.locomotion(on_floor, velocity, delta)


## Starts whichever grounded action was pressed (the blow each button makes of the moment is `moves`' to
## choose). Returns true when one started.
func _try_action() -> bool:
	if input.has(&"dodge") and _try_roll():
		return true
	if _try_arts(false):
		return true
	if input.has(&"attack") and not profile.combo.is_empty():
		input.consume(&"attack")
		var light: int = moves.light_move()
		_start_attack(moves.attack_of(light), light)
		return true
	if input.has(&"heavy_attack") and _start_finisher():
		return true
	if input.has(&"heavy_attack") and _ground_stroke():
		return true
	var heavy: int = moves.heavy_move() if input.has(&"heavy_attack") else NO_INDEX
	if heavy != NO_INDEX:
		input.consume(&"heavy_attack")
		_start_attack(moves.attack_of(heavy), heavy)
		return true
	if input.block_held:
		_start_block()
		return true
	if input.has(&"throw") and _start_throw():
		return true
	if input.has(&"heal") and remedies > 0 and health < max_health:
		input.consume(&"heal")
		_start_heal()
		return true
	if input.has(&"interact") and _nearest != null:
		input.consume(&"interact")
		_start_interact(_nearest)
		return true
	return false


## In the air the light button slashes (`profile.air_slashes` times a jump) and the heavy one plunges.
func _try_air_action() -> bool:
	if _try_arts(false):
		return true
	if input.has(&"heavy_attack") and _start_plunge():
		return true
	if input.has(&"throw") and _start_throw():
		return true
	if input.has(&"attack") and input.down_held and knows(&"down_stab") and profile.down_stab != null:
		input.consume(&"attack")
		return _start_down_stab()
	if input.has(&"attack") and profile.air_attack != null and _air_slashes < profile.air_slashes:
		input.consume(&"attack")
		return _start_air_attack()
	return false


## Standing on planks (a one-way floor): down and jump drop him through them.
func _on_one_way_floor() -> bool:
	for i: int in get_slide_collision_count():
		var contact: KinematicCollision2D = get_slide_collision(i)
		if contact.get_normal().y > -0.7:
			continue
		var tiles: TileMapLayer = contact.get_collider() as TileMapLayer
		if tiles != null:
			# The tile just under the point where his feet meet it.
			var cell: Vector2i = tiles.local_to_map(tiles.to_local(contact.get_position() + Vector2(0.0, 2.0)))
			var data: TileData = tiles.get_cell_tile_data(cell)
			return data != null and data.get_collision_polygons_count(0) > 0 and data.is_collision_polygon_one_way(0, 0)
		var shape: CollisionShape2D = contact.get_collider_shape() as CollisionShape2D
		return shape != null and shape.one_way_collision
	return false


func _drop_through() -> void:
	global_position.y += DROP_THROUGH
	velocity.y = 60.0
	_coyote = 0.0
	_jump_rising = false
	_set_state(State.AIR)


func _jump() -> void:
	velocity.y = -profile.jump_velocity
	_coyote = 0.0
	_jump_rising = true
	jumped.emit()


func _apply_gravity(delta: float) -> void:
	if is_on_floor() and velocity.y >= 0.0:
		return
	# The plunge drops at its own speed.
	if state == State.PLUNGE and _plunge_dropping:
		return
	var g: float = GRAVITY * (profile.fall_gravity_scale if velocity.y > 0.0 else 1.0)
	velocity.y = minf(velocity.y + g * delta, MAX_FALL_SPEED)


func _after_move(was_on_floor: bool, fall_speed: float) -> void:
	var on_floor: bool = is_on_floor()
	if on_floor and not was_on_floor:
		_air_slashes = 0
		_bounced_off.clear()
		landed.emit(fall_speed)
		if fall_speed > HARD_LANDING and (state == State.AIR or state == State.IDLE
				or state == State.MOVE):
			animator.land()
	if was_on_floor and not on_floor and velocity.y >= 0.0:
		_coyote = profile.coyote_time


# --- Attacks ------------------------------------------------------------------------------------

func _start_attack(attack: AttackDefinition, index: int) -> void:
	if not _spend(attack.stamina_cost * (mods.bash_cost if attack == profile.bash else 1.0)):
		return
	if input.move != 0.0:
		set_facing(input.move)
	combo_index = index
	moves.clear()
	_steady_left = -1.0
	_landed = false
	_run_time = 0.0
	_lunge_stopped = false
	_flinched = false
	_charge_checked = false
	_glance_pending = false
	_set_state(State.ATTACK)
	velocity.x *= 0.25
	begin_attack(attack)
	if _steel > 0.0 and _fury_speed > 1.0:
		sprite.speed_scale = _fury_speed
	_aim_lunge(attack)
	if INDEX_TECHNIQUES.has(index):
		technique_used.emit(INDEX_TECHNIQUES[index])


func _attacking(delta: float) -> void:
	var lunge: float = attack_lunge()
	if not is_nan(lunge) and is_on_floor() and not _lunge_stopped:
		velocity.x = lunge
	else:
		velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
	if current_attack == null:
		_set_state(State.IDLE)
		return
	var frame: int = sprite.frame
	# Behind the shield, the thrust over its rim: again while the button is pressed, or back to the guard.
	if combo_index == GUARDED_INDEX and frame > current_attack.recovery_from:
		if input.block_held and input.has(&"attack"):
			input.consume(&"attack")
			cancel_attack()
			_start_attack(profile.shield_thrust, GUARDED_INDEX)
			return
		if input.block_held:
			cancel_attack()
			_set_state(State.BLOCK)
			animator.play(&"block")
			return
	# Held through the raised blade, the cleave's wind-up waits there and the blow grows (decided once,
	# as the blade comes up).
	if not _charge_checked and combo_index == HEAVY_INDEX and current_attack == profile.heavy and frame == profile.charge_frame:
		_charge_checked = true
		if knows(&"charge") and not profile.charged_cleaves.is_empty() and _holds_charge():
			_start_charge()
			return
	# From the live frames on, a press waits for the moment the move gives way: the light button
	# carries the string on, the heavy one turns it into the step's ender.
	if frame >= current_attack.active_from:
		moves.keep_press()
	if frame < current_attack.recovery_from:
		return
	# A cut turned by a raised shield glances off as it gives way, unless what was called for next breaks
	# guards (the pommel, the cleave).
	if _glance_pending:
		_glance_pending = false
		var called: AttackDefinition = moves.queued_attack
		var breaker: bool = called != null and (called.guard_break or called.overwhelms or called.unblockable)
		if not breaker:
			_glance()
			return
	# Steady Breath: as the live frames end, steel glints on him (unless the next blow is already called
	# for); the shield raised in the glint, or a moment before it, draws breath and takes the guard.
	if _steady_left < 0.0:
		_steady_left = 0.0
		if moves.queued_attack == null and not current_attack.guarded and _landed:
			_steady_left = profile.steady_window
			breath_glint.emit()
	if (_steady_left > 0.0 and input.has(&"block")
			and input.age(&"block") <= profile.steady_window - _steady_left + profile.steady_early):
		_steady_left = 0.0
		input.consume(&"block")
		cancel_attack()
		_start_block()
		recover_breath(profile.steady_breath)
		steady_breath.emit()
		technique_used.emit(&"steady_breath")
		return
	if moves.queued_attack != null:
		var next: AttackDefinition = moves.queued_attack
		cancel_attack()
		_start_attack(next, moves.queued_index)
	elif input.has(&"dodge") and _try_roll():
		pass
	elif _try_arts(false):
		pass
	elif input.has(&"heavy_attack") and finisher_target != null:
		cancel_attack()
		_start_finisher()
	elif input.has(&"heavy_attack") and moves.downed_foe(GROUND_REACH) != null:
		cancel_attack()
		_ground_stroke()
	elif input.has(&"heavy_attack") and moves.cleave_follows() and profile.heavy != null:
		input.consume(&"heavy_attack")
		cancel_attack()
		_start_attack(profile.heavy, HEAVY_INDEX)
	elif input.block_held:
		cancel_attack()
		_start_block()
	elif input.move != 0.0 and frame > current_attack.recovery_from:
		moves.gave_way()
		cancel_attack()
		_set_state(State.MOVE)


func on_attack_finished(attack: AttackDefinition) -> void:
	if state == State.ATTACK:
		moves.gave_way()
		_set_state(State.IDLE)
		animator.play(&"idle")
	elif state == State.AIR_ATTACK:
		_set_state(State.AIR)
	elif state == State.ART:
		if _art != null and _art.finale != null and attack == _art.attack:
			begin_attack(_art.finale)
			return
		_end_art()


# --- The charge ----------------------------------------------------------------------------------

## The cleave's blade raised and held: the blow grows while the button stays down.
func _start_charge() -> void:
	cancel_attack()
	moves.forget()
	_set_state(State.CHARGE)
	charge_level = 1
	animator.play(&"charge_hold")
	charge_changed.emit(1)


## He stands his ground (he can turn); a roll breaks the charge off, letting go strikes.
func _charging(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
	if input.move != 0.0:
		set_facing(input.move)
	if input.has(&"dodge") and _try_roll():
		return
	var level: int = 1
	if _state_time >= profile.charge_times.y and profile.charged_cleaves.size() >= 2:
		level = 3
	elif _state_time >= profile.charge_times.x:
		level = 2
	if level != charge_level:
		charge_level = level
		charge_changed.emit(level)
	if (not input.heavy_held) if not charge_toggle else input.consume(&"heavy_attack"):
		_release_charge()


## Whether the cleave reaching its raised blade is held back: the button still down, or (by toggle) no
## second press yet (a second press before it is the plain cleave).
func _holds_charge() -> bool:
	if not charge_toggle:
		return input.heavy_held
	return not input.consume(&"heavy_attack")


## Let go: the blow as far as it has grown. Short of the second level it is the plain cleave, picked
## up where its wind-up was held.
func _release_charge() -> void:
	var level: int = charge_level
	_lunge_stopped = false
	_flinched = false
	if level >= 2:
		var attack: AttackDefinition = profile.charged_cleaves[mini(level - 2, profile.charged_cleaves.size() - 1)]
		# The cleave was paid for as it began; the rest of the price now.
		if _steel <= 0.0:
			_drain(attack.stamina_cost - profile.heavy.stamina_cost)
		combo_index = CHARGED_INDEX
		_set_state(State.ATTACK)
		begin_attack(attack)
		technique_used.emit(&"charge")
	else:
		combo_index = HEAVY_INDEX
		_charge_checked = true
		_set_state(State.ATTACK)
		begin_attack(profile.heavy, profile.charge_frame + 1)


# --- Resolve and Arts ------------------------------------------------------------------------------
# Resolve fills as he fights well and drains as he is struck; the Arts spend it. He carries two Arts:
# the art button plays the first, the second Art's own button (or the art button behind the shield)
# the second.

## Whether he has the resolve meter: once he has learned an Art to spend it on.
func has_resolve() -> bool:
	for art: ArtDefinition in profile.arts:
		if knows(art.id):
			return true
	return false


func art_by_id(id: StringName) -> ArtDefinition:
	for art: ArtDefinition in profile.arts:
		if art.id == id:
			return art
	return null


## The two Arts he carries: those chosen (`art_slots`), then the next he knows.
func carried_arts() -> Array[ArtDefinition]:
	var out: Array[ArtDefinition] = []
	for id: StringName in art_slots:
		var chosen: ArtDefinition = art_by_id(id)
		if chosen != null and knows(id) and not chosen in out and out.size() < 2:
			out.append(chosen)
	for art: ArtDefinition in profile.arts:
		if out.size() >= 2:
			break
		if knows(art.id) and not art in out:
			out.append(art)
	return out


## Resolve earned (faster with a keepsake), or lost when negative; only once he has an Art to spend it on.
func gain_resolve(amount: float) -> void:
	if amount != 0.0 and has_resolve():
		set_resolve(resolve + (amount * mods.resolve_gain if amount > 0.0 else amount))


func set_resolve(value: float) -> void:
	var next: float = clampf(value, 0.0, profile.max_resolve)
	if next == resolve:
		return
	resolve = next
	resolve_changed.emit(resolve, profile.max_resolve)


## True while the second wind holds.
func is_steeled() -> bool:
	return _steel > 0.0


## The art buttons: the second Art's own, or the art button (the second Art when `shielded`). True when
## an Art began.
func _try_arts(shielded: bool) -> bool:
	if input.has(&"art_2"):
		return _try_art(1, &"art_2")
	if input.has(&"art"):
		return _try_art(1 if shielded else 0, &"art")
	return false


func _try_art(slot: int, action: StringName) -> bool:
	var carried: Array[ArtDefinition] = carried_arts()
	if slot >= carried.size():
		input.consume(action)
		return false
	var art: ArtDefinition = carried[slot]
	# One that needs his feet under him waits (the press is kept a moment) until he lands.
	if not art.in_air and not is_on_floor():
		return false
	input.consume(action)
	if resolve < art.cost:
		art_refused.emit(art)
		return false
	if art.judgment:
		return _judge(art)
	_begin_art(art)
	if art.attack != null:
		begin_attack(art.attack)
	else:
		animator.play(art.animation)
	return true


func _begin_art(art: ArtDefinition, pay: bool = true) -> void:
	if pay:
		set_resolve(resolve - art.cost)
	cancel_attack()
	moves.clear()
	_lunge_stopped = false
	_flinched = false
	_action_done = false
	if input.move != 0.0:
		set_facing(input.move)
	combo_index = ART_INDEX
	_set_state(State.ART)
	_art = art
	_art_struck.clear()
	if pay:
		art_started.emit(art)
		technique_used.emit(art.id)


func _arting(delta: float) -> void:
	var lunge: float = attack_lunge()
	if _art != null and _art.steer_speed > 0.0 and current_attack == _art.attack:
		# Steered as he turns.
		velocity.x = move_toward(velocity.x, input.move * _art.steer_speed, profile.ground_acceleration * delta)
	elif not is_nan(lunge) and not _lunge_stopped:
		velocity.x = lunge
	elif is_on_floor():
		var brake: float = _art.brake if _art != null and _art.brake > 0.0 else ATTACK_FRICTION
		velocity.x = move_toward(velocity.x, 0.0, brake * delta)


func _end_art() -> void:
	# A judgment goes on to its next man.
	if _judgment != null:
		_judge_next()
		return
	_set_state(State.IDLE if is_on_floor() else State.AIR)
	if is_on_floor():
		animator.play(&"idle")


## The Line's wounds open, all at once, on every man it passed through.
func _open_wounds() -> void:
	var opened: Array[Combatant] = []
	for target: Combatant in _art_struck:
		if not is_instance_valid(target) or target.dead:
			continue
		var hit: HitData = HitData.from_attack(self, _art.opens_wounds)
		hit.direction = signf(target.global_position.x - global_position.x) if target.global_position.x != global_position.x else -facing
		hit.position = target.global_position + Vector2(0.0, -42.0)
		var outcome: HitData.Outcome = target.receive_hit(hit)
		if outcome != HitData.Outcome.IGNORED:
			on_hit_landed(target, hit, outcome)
			hit_landed.emit(target, hit, outcome)
		opened.append(target)
	wounds_opened.emit(opened)


## The Judgment of the Guard: the nearest man before him finished where he stands; one who cannot be
## (a captain in his armour, a hardened man still fresh) takes one great blow instead.
func _judge(art: ArtDefinition) -> bool:
	var targets: Array[Combatant] = _foes_by_distance(art.judgment_reach)
	if targets.is_empty():
		art_refused.emit(art)
		return false
	set_resolve(resolve - art.cost)
	_judgment = art
	_judging = targets.slice(0, maxi(1, art.judgment_chain))
	art_started.emit(art)
	technique_used.emit(art.id)
	_judge_next()
	return true


## The next man of a judgment: he crosses to him in a blink and finishes him (an elite still fresh, or the
## Captain, takes the great blow); when none is left, the judgment ends.
func _judge_next() -> void:
	var target: Combatant = null
	while not _judging.is_empty() and target == null:
		var next: Combatant = _judging.pop_front()
		if is_instance_valid(next) and not next.dead and not next.is_untouchable():
			target = next
	if target == null:
		_end_judgment()
		return
	var side: float = signf(global_position.x - target.global_position.x)
	if side == 0.0:
		side = -facing
	var from: Vector2 = global_position
	var to: Vector2 = Vector2(target.global_position.x + side * JUDGMENT_GAP, global_position.y)
	if absf(to.x - from.x) > 2.0 and _clear_path(from, to):
		global_position = to
		flitted.emit(from, to)
	set_facing(-side)
	if target.can_be_judged() and _start_finisher(target, not _judging.is_empty()):
		return
	_begin_art(_judgment, false)
	begin_attack(_judgment.attack)


## A judgment is under way (its men are being taken one after another).
func is_judging() -> bool:
	return _judgment != null


func _end_judgment() -> void:
	_judgment = null
	_judging.clear()
	_invulnerable = maxf(_invulnerable, 0.4)
	_set_state(State.IDLE if is_on_floor() else State.AIR)
	if is_on_floor():
		animator.play(&"idle")
	judgment_ended.emit()


## The living soldiers within `reach` px of him, before or behind and level with him, nearest first.
func _foes_by_distance(reach: float) -> Array[Combatant]:
	var found: Array[Combatant] = []
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or other.dead or other.is_untouchable():
			continue
		var offset: Vector2 = other.global_position - global_position
		if absf(offset.x) <= reach and absf(offset.y) <= 40.0:
			found.append(other)
	found.sort_custom(func(a: Combatant, b: Combatant) -> bool:
		return absf(a.global_position.x - global_position.x) < absf(b.global_position.x - global_position.x))
	return found


## No wall stands between two points on his line (a blink never goes through stone).
func _clear_path(from: Vector2, to: Vector2) -> bool:
	var space: PhysicsDirectSpaceState2D = get_world_2d().direct_space_state
	var query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(from + Vector2(0, -20), to + Vector2(0, -20), 1)
	return space.intersect_ray(query).is_empty()


## The flask leaves his hand.
func _release_art(art: ArtDefinition) -> void:
	var flask: Node2D = art.projectile.instantiate() as Node2D
	flask.set(&"direction", facing)
	flask.set(&"shooter", self)
	get_parent().add_child(flask)
	flask.global_position = global_position + Vector2(art.release_offset.x * facing, art.release_offset.y)
	thrown.emit(flask)


## Breath and blood back, and for a while his blows cost him nothing and light blows do not stop him.
func _second_wind(art: ArtDefinition) -> void:
	heal(art.heal)
	healed.emit(art.heal)
	if art.restores_stamina:
		stamina = profile.max_stamina
		stamina_changed.emit(stamina, profile.max_stamina)
	_steel = art.steel_time
	_steel_threshold = art.steel_threshold
	_fury_speed = art.fury_speed
	_fury_heal = art.fury_heal
	_fury_kill = art.fury_kill_time
	_fury_cap = art.steel_time + 5.0
	steeled.emit(true)
	if art.cry_radius > 0.0:
		for node: Node in get_tree().get_nodes_in_group(&"enemies"):
			var other: Combatant = node as Combatant
			if other == null or other.dead:
				continue
			var offset: Vector2 = other.global_position - global_position
			if absf(offset.x) <= art.cry_radius and absf(offset.y) <= 60.0:
				var away: float = signf(offset.x) if offset.x != 0.0 else facing
				other.frighten(away, art.cry_knockback, art.cry_stagger)
		cried.emit(art.cry_radius)


## A blow he takes without being stopped: in an armoured Art, or a light blow while the second wind holds.
func _shrugs_off(hit: HitData) -> bool:
	return (state == State.ART and _art != null and _art.armoured) or (_steel > 0.0 and hit.damage < _steel_threshold)


# --- Knives -------------------------------------------------------------------------------------

## A knife from his belt, flicked at the man before him (on the ground or in the air).
func _start_throw() -> bool:
	if not knows(&"knives") or knives <= 0 or profile.knife_scene == null:
		return false
	input.consume(&"throw")
	if input.move != 0.0:
		set_facing(input.move)
	cancel_attack()
	moves.forget()
	_action_done = false
	_set_state(State.THROW)
	animator.play(&"throw")
	return true


func _throwing(delta: float) -> void:
	if is_on_floor():
		velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
	else:
		velocity.x = move_toward(velocity.x, input.move * profile.run_speed, profile.air_acceleration * 0.5 * delta)


func _release_knife() -> void:
	knives -= 1
	knives_changed.emit(knives, max_knives())
	var knife: Node2D = profile.knife_scene.instantiate() as Node2D
	knife.set(&"direction", facing)
	knife.set(&"thrower", self)
	get_parent().add_child(knife)
	knife.global_position = global_position + Vector2(KNIFE_OFFSET.x * facing, KNIFE_OFFSET.y)
	thrown.emit(knife)


# --- In the air ---------------------------------------------------------------------------------

func _start_air_attack() -> bool:
	# The second slash of a jump is a backhand.
	var slash: AttackDefinition = profile.air_attack
	if _air_slashes >= 1 and profile.air_slash_2 != null:
		slash = profile.air_slash_2
	if not _spend(slash.stamina_cost):
		return false
	if input.move != 0.0:
		set_facing(input.move)
	_bounce_pending = false
	_air_slashes += 1
	moves.forget()
	_jump_rising = false
	# A slash checks his fall for a moment, so it can find a man standing below.
	velocity.y = minf(velocity.y, 30.0)
	_set_state(State.AIR_ATTACK)
	begin_attack(slash)
	return true


## The down-stab: the point turned down beneath him; it holds until it strikes (and he springs off what it
## struck) or he lands.
func _start_down_stab() -> bool:
	if not _spend(profile.down_stab.stamina_cost):
		return false
	if input.move != 0.0:
		set_facing(input.move)
	moves.forget()
	_jump_rising = false
	_bounce_pending = false
	velocity.y = maxf(velocity.y, 60.0)
	_set_state(State.AIR_ATTACK)
	begin_attack(profile.down_stab)
	technique_used.emit(&"down_stab")
	return true


func _air_attacking(delta: float) -> void:
	# He keeps his flight; the stick still steers him a little.
	velocity.x = move_toward(velocity.x, input.move * profile.run_speed, profile.air_acceleration * 0.5 * delta)
	if _bounce_pending:
		# The point struck: he springs off it, and may slash again.
		_bounce_pending = false
		cancel_attack()
		velocity.y = -profile.bounce_velocity
		_air_slashes = 0
		_set_state(State.AIR)
		bounced.emit()
		return
	if is_on_floor():
		# Landing cuts the slash short.
		_bounce_pending = false
		cancel_attack()
		_set_state(State.IDLE)
		return
	if current_attack == null:
		_set_state(State.AIR)
		return
	if sprite.frame < current_attack.recovery_from:
		return
	if input.has(&"heavy_attack") and _start_plunge():
		return
	if (input.has(&"attack") and input.down_held and knows(&"down_stab") and profile.down_stab != null
			and current_attack != profile.down_stab):
		input.consume(&"attack")
		cancel_attack()
		_start_down_stab()
	elif input.has(&"attack") and _air_slashes < profile.air_slashes:
		input.consume(&"attack")
		cancel_attack()
		_start_air_attack()


## The plunge: the blade turned point-down in the air, then a drop on whoever is below.
func _start_plunge() -> bool:
	if profile.plunge == null or not knows(&"plunge") or is_on_floor() or not _spend(profile.plunge.stamina_cost):
		return false
	_clear_pending()
	input.consume(&"heavy_attack")
	cancel_attack()
	moves.forget()
	_jump_rising = false
	if input.move != 0.0:
		set_facing(input.move)
	_plunge_dropping = false
	# He checks in the air as he turns the blade over.
	velocity = Vector2(velocity.x * 0.4, minf(velocity.y, 0.0) - 50.0)
	_set_state(State.PLUNGE)
	animator.play(&"plunge")
	technique_used.emit(&"plunge")
	return true


func _plunging(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, 600.0 * delta)
	if _plunge_dropping:
		velocity.y = profile.plunge_speed
	if is_on_floor() and (_plunge_dropping or _state_time > 0.05):
		_land_plunge()


## The blade is down: he drops, the blade live beneath him.
func _drop_plunge() -> void:
	_plunge_dropping = true
	velocity.y = profile.plunge_speed
	begin_attack(profile.plunge)


func _land_plunge() -> void:
	cancel_attack()
	_plunge_dropping = false
	velocity = Vector2.ZERO
	combo_index = PLUNGE_INDEX
	moves.forget()
	_set_state(State.ATTACK)
	begin_attack(profile.plunge_landing)
	# Death from above: the men about the landing flinch.
	if mods.plunge_flinch > 0.0:
		_shake_men(mods.plunge_flinch)
	plunge_landed.emit()


func build_hit(attack: AttackDefinition) -> HitData:
	var hit: HitData = super.build_hit(attack)
	hit.stagger_scale = mods.enemy_stagger
	if attack == profile.plunge or attack == profile.plunge_landing:
		hit.damage *= mods.plunge_damage
	# Fighting for his life, he strikes harder (a keepsake's gift).
	if mods.low_health_damage > 0.0 and health < max_health * mods.low_health_at:
		hit.damage *= 1.0 + mods.low_health_damage
	if _riposte > 0.0 and (attack == profile.riposte_attack or profile.riposte_attack == null):
		hit.riposte = true
		hit.damage *= profile.riposte_multiplier + mods.riposte_bonus
		hit.poise_damage *= 2.0
		hit.hit_stop *= 1.5
	return hit


func on_hit_landed(target: Combatant, hit: HitData, outcome: HitData.Outcome) -> void:
	_since_combat = 0.0
	if outcome == HitData.Outcome.HIT or outcome == HitData.Outcome.GUARD_BROKEN or outcome == HitData.Outcome.BLOCKED:
		_landed = true
	# A duellist's shield beat the blade aside: he is thrown open.
	if outcome == HitData.Outcome.PARRIED:
		_thrown_open(hit)
		return
	# A blow that tells earns resolve (an Art's own blows do not pay for it).
	if state == State.ART and (outcome == HitData.Outcome.HIT or outcome == HitData.Outcome.GUARD_BROKEN):
		if not target in _art_struck:
			_art_struck.append(target)
	if _steel > 0.0 and outcome == HitData.Outcome.HIT:
		if _fury_heal > 0.0:
			heal(_fury_heal)
		if target.dead and _fury_kill > 0.0:
			_steel = minf(_steel + _fury_kill, _fury_cap)
	if state != State.ART and (outcome == HitData.Outcome.HIT or outcome == HitData.Outcome.GUARD_BROKEN):
		var gain: float = hit.attack.resolve_gain if hit.attack != null else 2.0
		gain_resolve(gain + (profile.resolve_riposte if hit.riposte else 0.0))
	# Momentum: a blow that tells gives breath back (an Art's own blows do not).
	if (state != State.ART and hit.attack != null
			and (outcome == HitData.Outcome.HIT or outcome == HitData.Outcome.GUARD_BROKEN)):
		recover_breath(hit.attack.breath_gain)
	if hit.riposte:
		_riposte = 0.0
	# A bash with the mastery behind it staggers a man who was not guarding.
	if hit.attack == profile.bash and mods.bash_staggers and outcome == HitData.Outcome.HIT:
		target.stagger(1.0)
	if hit.attack != null and hit.attack.stops_on_hit and state == State.ATTACK:
		# The point is in him: the dash ends there.
		_lunge_stopped = true
		velocity.x = 0.0
	if hit.attack != null and hit.attack.bounces and state == State.AIR_ATTACK:
		# He springs off each man once a leap (no endless pogo on one head).
		if not target in _bounced_off:
			_bounced_off.append(target)
			_bounce_pending = true
		return
	if outcome == HitData.Outcome.BLOCKED:
		if hit.attack != null and hit.attack.glances and state == State.ATTACK:
			# A light blow glances off: his arm is thrown back as it gives way (see _attacking).
			_glance_pending = true
		else:
			# The blade turned by a raised guard throws the hero back a step.
			velocity.x = -facing * 70.0


# --- The shield ---------------------------------------------------------------------------------

func _start_block() -> void:
	moves.break_string()
	_set_state(State.BLOCK)
	if _parry_cooldown <= 0.0 and (_steel > 0.0 or stamina >= profile.parry_cost):
		_drain(0.0 if _steel > 0.0 else profile.parry_cost)
		_parry_window = profile.parry_window + mods.parry_window
		_parry_cooldown = _parry_window + profile.parry_cooldown
	animator.play(&"block_start")


func _blocking(delta: float) -> void:
	if not input.block_held:
		_parry_window = 0.0
		_set_state(State.IDLE)
		animator.play(&"idle")
		return
	if input.has(&"dodge") and _try_roll():
		return
	# Behind the shield, the art button is the second Art.
	if _try_arts(true):
		return
	if input.has(&"heavy_attack") and _start_finisher():
		return
	if input.has(&"heavy_attack") and profile.bash != null and knows(&"bash"):
		# The shield driven into the man before him.
		input.consume(&"heavy_attack")
		_parry_window = 0.0
		_start_attack(profile.bash, BASH_INDEX)
		return
	if input.has(&"attack") and knows(&"guarded_thrust") and profile.shield_thrust != null:
		input.consume(&"attack")
		_parry_window = 0.0
		_start_attack(profile.shield_thrust, GUARDED_INDEX)
		return
	if input.has(&"attack") and not profile.combo.is_empty():
		input.consume(&"attack")
		_start_attack(profile.combo[0], 0)
		return
	velocity.x = move_toward(velocity.x, input.move * profile.block_walk_speed,
		profile.ground_acceleration * delta)
	# Moving behind the shield he steps, guard up (once the shield is raised and no blow is landing on it).
	if sprite.animation in GUARD_LOOPS:
		animator.guard(velocity.x, facing)


func _parrying(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
	if sprite.frame >= 2 and input.has(&"attack") and profile.riposte_attack != null:
		input.consume(&"attack")
		_start_attack(profile.riposte_attack, RIPOSTE_INDEX)
	elif sprite.frame >= 2 and input.has(&"attack") and not profile.combo.is_empty():
		input.consume(&"attack")
		_start_attack(profile.combo[0], 0)
	elif sprite.frame >= 2 and input.has(&"heavy_attack") and _start_finisher():
		pass
	elif sprite.frame >= 2 and input.has(&"heavy_attack") and profile.heavy != null:
		input.consume(&"heavy_attack")
		_start_attack(profile.heavy, HEAVY_INDEX)


# --- Being struck --------------------------------------------------------------------------------

func judge_hit(hit: HitData) -> HitData.Outcome:
	# Nothing touches him while the story has the stage (a gate opening, a boss's entrance).
	if state == State.DEAD or state == State.CINEMATIC:
		return HitData.Outcome.IGNORED
	if is_invulnerable():
		return HitData.Outcome.DODGED
	var guarding: bool = is_guarding()
	# A low sweep passes under a standing guard.
	if guarding and is_frontal(hit) and not hit.unblockable and not hit.low:
		if _parry_window > 0.0 and hit.parryable:
			return HitData.Outcome.PARRIED
		if hit.guard_break or stamina < _guard_cost(hit):
			return HitData.Outcome.GUARD_BROKEN
		return HitData.Outcome.BLOCKED
	return HitData.Outcome.HIT


func on_struck(hit: HitData, outcome: HitData.Outcome) -> void:
	if outcome != HitData.Outcome.DODGED:
		_since_combat = 0.0
	match outcome:
		HitData.Outcome.PARRIED:
			gain_resolve(profile.resolve_parry + mods.parry_resolve)
			recover_breath(profile.parry_breath + mods.parry_stamina)
			_parry_window = 0.0
			_parry_cooldown = 0.0
			_riposte = profile.riposte_window
			velocity.x = -facing * 40.0
			_set_state(State.PARRY)
			animator.play(&"parry")
			parried.emit(hit)
		HitData.Outcome.BLOCKED:
			_drain(_guard_cost(hit))
			# A blade or a club still tells through the shield a little; an arrow stops dead in it.
			if not hit.projectile:
				take_damage(hit.damage * profile.block_chip)
			velocity.x = hit.shove(0.0, 0.6)
			# Met on a shield raised for something else (a parry's follow-through, a thrust over the rim): that
			# gives way to the plain guard, so nothing waits on frames the recoil will never show.
			if state != State.BLOCK:
				cancel_attack()
				moves.forget()
				_glance_pending = false
				_parry_window = 0.0
				_set_state(State.BLOCK)
			animator.play(&"block_hit")
			blocked.emit(hit)
		HitData.Outcome.GUARD_BROKEN:
			gain_resolve(-profile.resolve_hurt)
			_drain(stamina)
			_regen_delay = profile.exhausted_delay
			take_damage(hit.damage * 0.5 * mods.damage_taken)
			if not dead and hit.attack != null and hit.attack.knocks_down:
				_knock_down(hit)
			elif not dead:
				_hurt(hit, profile.guard_break_time * mods.hurt_time)
			guard_broken.emit(hit)
		HitData.Outcome.HIT:
			gain_resolve(-profile.resolve_hurt)
			take_damage(hit.damage * mods.damage_taken)
			if dead:
				pass
			elif hit.attack != null and hit.attack.knocks_down:
				_knock_down(hit)
			elif _shrugs_off(hit):
				# Struck, and it does not stop him.
				_since_hurt = 0.0
				flash()
			else:
				_hurt(hit, profile.hurt_time * mods.hurt_time)
		HitData.Outcome.DODGED:
			dodged.emit(hit)
			# Rolled just as it came: a close call.
			if (state == State.ROLL and not _close_called and _state_time <= profile.close_call_window
					and hit.attacker != null and hit.attacker != self):
				_close_called = true
				recover_breath(profile.close_call_breath)
				_riposte = maxf(_riposte, profile.counter_window)
				close_call.emit(hit)
				technique_used.emit(&"close_call")


func _guard_cost(hit: HitData) -> float:
	return hit.stamina_damage * (1.6 if hit.guard_break else 1.0) * mods.block_cost


## Whatever an earlier moment left pending (a glance, a bounce) is dropped when he is struck or thrown.
func _clear_pending() -> void:
	_glancing = false
	_glance_pending = false
	_bounce_pending = false


func _hurt(hit: HitData, time: float) -> void:
	_clear_pending()
	_since_hurt = 0.0
	cancel_attack()
	_parry_window = 0.0
	_set_state(State.HURT)
	_hurt_left = time
	_invulnerable = profile.hit_invulnerability
	velocity.x = hit.shove(60.0)
	animator.play(&"hurt")
	flash()


## A light blow glanced off a raised shield: his sword arm is thrown back and the string broken; for a
## moment he can only raise his own shield or roll (no blow taken, nothing to recover from).
func _glance() -> void:
	cancel_attack()
	moves.forget()
	_set_state(State.HURT)
	_glancing = true
	_hurt_left = profile.glance_time
	velocity.x = -facing * 90.0
	animator.play(&"glance")
	glanced.emit()


## His blade beaten aside by a man behind his shield: thrown open, off balance, a moment he cannot block
## (a roll gets him out of it after a beat).
func _thrown_open(hit: HitData) -> void:
	_clear_pending()
	cancel_attack()
	moves.forget()
	_parry_window = 0.0
	_set_state(State.HURT)
	_hurt_left = profile.thrown_open_time
	velocity.x = -hit.direction * 70.0
	animator.play(&"parried")


## Off his feet: he lies a moment (a roll gets him out sooner), then gets up. Nothing touches him the while.
func _knock_down(hit: HitData) -> void:
	_clear_pending()
	_since_hurt = 0.0
	cancel_attack()
	_parry_window = 0.0
	_set_state(State.DOWN)
	_hurt_left = profile.knockdown_time * mods.hurt_time
	_invulnerable = _hurt_left + profile.getup_time + 0.25
	velocity.x = hit.shove(140.0)
	animator.play(&"knockdown")
	flash()
	knocked_down.emit()


func _lying(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, 560.0 * delta)
	if _hurt_left > 0.0:
		if _state_time >= profile.down_escape and input.has(&"dodge") and _try_roll():
			return
		_hurt_left -= delta
		if _hurt_left <= 0.0:
			_hurt_left = -1.0
			_state_time = 0.0
			animator.play(&"getup")
	elif _state_time >= profile.getup_time:
		_set_state(State.IDLE)
		animator.play(&"idle")


func _hurting(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, 700.0 * delta)
	# His blow glanced off a shield: he may raise his own at once, or roll.
	if _glancing:
		if input.has(&"dodge") and _try_roll():
			return
		if input.block_held:
			_start_block()
			return
	elif _state_time >= profile.hurt_escape_time and input.has(&"dodge") and _try_roll():
		return
	_hurt_left -= delta
	if _hurt_left <= 0.0:
		_set_state(State.IDLE)
		animator.play(&"idle")


func on_died() -> void:
	input.clear()
	_invulnerable = 0.0
	_set_state(State.DEAD)
	animator.play(&"death")
	flash()


# --- Roll ---------------------------------------------------------------------------------------

func _try_roll() -> bool:
	if not is_on_floor() or stamina < 1.0:
		return false
	input.consume(&"dodge")
	_spend(profile.roll_cost, true)
	_close_called = false
	if input.move != 0.0:
		set_facing(input.move)
	cancel_attack()
	_parry_window = 0.0
	moves.break_string()
	_set_state(State.ROLL)
	animator.play(&"roll")
	rolled.emit()
	return true


func _rolling(_delta: float) -> void:
	if (_state_time >= profile.roll_cut_from and input.has(&"attack") and profile.roll_cut != null
			and knows(&"roll_cut")):
		input.consume(&"attack")
		_start_roll_cut()
		return
	var t: float = clampf(_state_time / ROLL_TIME, 0.0, 1.0)
	velocity.x = facing * profile.roll_speed * (1.0 - 0.6 * t * t)


## Up out of the roll in a rising cut, turned on whoever is nearest (the stick decides if it is held).
func _start_roll_cut() -> void:
	var turn: float = input.move
	if turn == 0.0:
		var nearest: float = ROLL_CUT_SEEK
		for node: Node in get_tree().get_nodes_in_group(&"enemies"):
			var other: Combatant = node as Combatant
			if other == null or other.dead:
				continue
			var dx: float = other.global_position.x - global_position.x
			if absf(dx) < nearest and absf(other.global_position.y - global_position.y) < 40.0:
				nearest = absf(dx)
				turn = signf(dx) if dx != 0.0 else facing
	if turn != 0.0:
		set_facing(turn)
	_start_attack(profile.roll_cut, ROLL_CUT_INDEX)
	technique_used.emit(&"roll_cut")


func _rolling_through() -> bool:
	return (state == State.ROLL and _state_time >= profile.roll_invulnerable_from
		and _state_time <= profile.roll_invulnerable_to)


# --- Remedies and interaction -------------------------------------------------------------------

func _start_heal() -> void:
	remedies -= 1
	remedies_changed.emit(remedies, profile.max_remedies)
	_action_done = false
	_set_state(State.HEAL)
	animator.play(&"heal")


func _start_interact(target: Interactable) -> void:
	if not target.reach:
		set_facing(signf(target.global_position.x - global_position.x))
		target.interact(self)
		interacted.emit(target)
		return
	set_facing(signf(target.global_position.x - global_position.x))
	_interact_target = target
	_action_done = false
	_set_state(State.INTERACT)
	animator.play(&"interact")


func _on_action_frame() -> void:
	if state == State.FINISHER:
		_finisher_step()
		return
	if (state == State.ATTACK and current_attack != null and current_attack.flinch_radius > 0.0 and not _flinched
			and sprite.animation == current_attack.animation and sprite.frame >= current_attack.active_from):
		_flinched = true
		_shake_men(current_attack.flinch_radius)
	if _action_done:
		return
	if state == State.HEAL and sprite.animation == &"heal" and sprite.frame >= HEAL_FRAME:
		_action_done = true
		heal(profile.remedy_heal + mods.remedy_heal)
		healed.emit(profile.remedy_heal + mods.remedy_heal)
	elif state == State.THROW and sprite.animation == &"throw" and sprite.frame >= THROW_FRAME:
		_action_done = true
		_release_knife()
	elif state == State.INTERACT and sprite.animation == &"interact" and sprite.frame >= INTERACT_FRAME:
		_action_done = true
		if is_instance_valid(_interact_target):
			_interact_target.interact(self)
			interacted.emit(_interact_target)
	elif state == State.ART and _art != null and sprite.animation == _art.animation:
		if _art.projectile != null and sprite.frame >= _art.release_frame:
			_action_done = true
			_release_art(_art)
		elif _art.steel_time > 0.0 and sprite.frame >= _art.effect_frame:
			_action_done = true
			_second_wind(_art)
	elif (state == State.ART and _art != null and _art.opens_wounds != null and current_attack == _art.attack
			and sprite.frame >= _art.effect_frame):
		_action_done = true
		_open_wounds()


func on_animation_finished(animation: StringName) -> void:
	if state == State.FINISHER and _finisher != null and animation == _finisher.hero_animation:
		_end_finisher()
		return
	if state == State.ART and _art != null and animation == _art.animation:
		_end_art()
		return
	match animation:
		&"knockdown":
			if state == State.DOWN and _hurt_left > 0.0:
				animator.play(&"down")
		&"block_start", &"block_hit":
			if state == State.BLOCK:
				animator.play(&"block")
			elif state == State.ATTACK or state == State.PARRY:
				# Never left hanging on a recoil: back to the guard if it is held, else on his feet.
				cancel_attack()
				_set_state(State.BLOCK if input.block_held else State.IDLE)
				animator.play(&"block" if input.block_held else &"idle")
		&"parry":
			if state == State.PARRY:
				if input.block_held:
					_set_state(State.BLOCK)
					animator.play(&"block")
				else:
					_set_state(State.IDLE)
					animator.play(&"idle")
		&"roll":
			if state == State.ROLL:
				_set_state(State.IDLE)
				animator.play(&"idle")
		&"heal", &"interact":
			if state == State.HEAL or state == State.INTERACT:
				_set_state(State.IDLE)
				animator.play(&"idle")
		&"plunge":
			if state == State.PLUNGE:
				_drop_plunge()
		&"throw":
			if state == State.THROW:
				_set_state(State.IDLE if is_on_floor() else State.AIR)
				if is_on_floor():
					animator.play(&"idle")


## A blow like a falling beam: the men about him, either side, flinch from it.
func _shake_men(radius: float) -> void:
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or other.dead:
			continue
		var dx: float = other.global_position.x - global_position.x
		if absf(dx) <= radius and absf(other.global_position.y - global_position.y) < 40.0:
			other.flinch(signf(dx) if dx != 0.0 else facing)


func _on_sensor_entered(area: Area2D) -> void:
	var target: Interactable = area as Interactable
	if target != null and not target in _interactables:
		_interactables.append(target)


func _on_sensor_exited(area: Area2D) -> void:
	var target: Interactable = area as Interactable
	if target != null:
		_interactables.erase(target)


func _update_nearest_interactable() -> void:
	var best: Interactable = null
	var best_distance: float = INF
	if state != State.DEAD and state != State.CINEMATIC:
		for target: Interactable in _interactables:
			if not is_instance_valid(target) or not target.can_interact(self):
				continue
			var distance: float = absf(target.global_position.x - global_position.x)
			if distance < best_distance:
				best = target
				best_distance = distance
	if best != _nearest:
		_nearest = best
		interactable_changed.emit(best)


# --- Finishers -------------------------------------------------------------------------------------
# A staggered soldier near and before him can be finished: the heavy-attack button plays one of
# the scripted kills. The hero is untouchable through it (no soldier starts an attack on him); the
# soldier is set where the choreography wants him and plays his half frame-locked.

func _update_finisher_target() -> void:
	finisher_target = null
	if finishers.is_empty() or dead or not is_on_floor():
		return
	var best: float = FINISH_REACH
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or not other.can_be_finished():
			continue
		var offset: Vector2 = other.global_position - global_position
		if absf(offset.y) > FINISH_LEVEL or absf(offset.x) > best:
			continue
		# Before him, or close enough to turn to.
		if offset.x * facing < -12.0:
			continue
		# A man down: only from over him.
		if other.is_down() and absf(offset.x * facing - GROUND_FINISH_AT) > GROUND_FINISH_SLACK:
			continue
		finisher_target = other
		best = absf(offset.x)


## Plays a finisher on the soldier in reach, if there is one, or on `forced` (the Judgment of the
## Guard, whatever his state; always the full one). True when it began.
func _start_finisher(forced: Combatant = null, quick: bool = false) -> bool:
	var target: Combatant = forced if forced != null else finisher_target
	if target == null or (forced == null and not target.can_be_finished()):
		return false
	var choices: Array[FinisherDefinition] = []
	var lying: bool = target.is_down()
	for finisher: FinisherDefinition in finishers:
		if target.has_finisher(finisher) and finisher != _last_finisher and finisher.ground == lying:
			choices.append(finisher)
	if choices.is_empty():
		for finisher: FinisherDefinition in finishers:
			if target.has_finisher(finisher) and finisher.ground == lying:
				choices.append(finisher)
	if choices.is_empty():
		return false
	var chosen: FinisherDefinition = choices.pick_random()
	if next_finisher != null and target.has_finisher(next_finisher):
		chosen = next_finisher
		next_finisher = null
	input.consume(&"heavy_attack")
	cancel_attack()
	moves.forget()
	set_facing(signf(target.global_position.x - global_position.x) if target.global_position.x != global_position.x else facing)
	_finisher = chosen
	_finished = target
	_last_finisher = chosen
	_finisher_frame = -1
	velocity = Vector2.ZERO
	# The full one when he is the last (or it is a judgment); a quick one while others still fight.
	finisher_cinematic = not quick and (forced != null or not foe_still_fighting(target))
	var speed: float = 1.0 if finisher_cinematic else QUICK_FINISHER
	# A kill like that steels him (a judgment was already paid for).
	if forced == null:
		gain_resolve(profile.resolve_finisher)
	# He is set where the choreography wants him, facing the hero.
	target.global_position = Vector2(global_position.x + facing * chosen.distance, global_position.y)
	target.velocity = Vector2.ZERO
	target.set_facing(-facing)
	target.begin_finisher(chosen.victim_animation, speed)
	_set_state(State.FINISHER)
	animator.play(chosen.hero_animation)
	sprite.speed_scale = speed
	finisher_started.emit(target, chosen)
	_finisher_step()
	return true


## Each frame of the hero's half: the cuts and bursts it lands, and the soldier's death.
func _finisher_step() -> void:
	if _finisher == null or sprite.animation != _finisher.hero_animation:
		return
	var frame: int = sprite.frame
	if frame == _finisher_frame:
		return
	_finisher_frame = frame
	var target: Combatant = _finished
	if target == null or not is_instance_valid(target):
		return
	var cut: StringName = _finisher.cut_on(frame)
	if cut != &"":
		target.finisher_cut(cut)
		finisher_struck.emit(target, _finisher, frame, cut)
	elif _finisher.burst_frames.has(frame):
		finisher_struck.emit(target, _finisher, frame, &"")
	if frame == _finisher.death_frame:
		target.finisher_kill()


## True while another soldier near him is still in the fight.
func foe_still_fighting(except: Combatant) -> bool:
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if (other != null and other != except and other.in_fight()
				and absf(other.global_position.x - global_position.x) <= FIGHT_RADIUS):
			return true
	return false


func _end_finisher() -> void:
	var target: Combatant = _finished
	if target != null and is_instance_valid(target) and not target.dead:
		target.finisher_kill()
	_finisher = null
	_finished = null
	# A kill like that puts the breath back in him (and the blood, with a keepsake's gift).
	stamina = minf(profile.max_stamina, stamina + profile.finisher_stamina)
	stamina_changed.emit(stamina, profile.max_stamina)
	if mods.finisher_heal > 0.0:
		heal(mods.finisher_heal)
		healed.emit(mods.finisher_heal)
	_invulnerable = maxf(_invulnerable, 0.3)
	_set_state(State.IDLE)
	animator.play(&"idle")
	finisher_ended.emit(target)
	if _judgment != null:
		_judge_next()


# --- Cinematic -------------------------------------------------------------------------------------

## Plays a stroke while the story has the stage (the last blow on the Captain); it strikes nothing.
func cinematic_strike(animation: StringName) -> void:
	if state != State.CINEMATIC:
		return
	_cinematic_action = animation
	animator.play(animation)


func _cinematic(delta: float) -> void:
	if cinematic_move != 0.0:
		set_facing(cinematic_move)
	velocity.x = move_toward(velocity.x, cinematic_move * profile.walk_speed,
		profile.ground_acceleration * delta)
	if _cinematic_action != &"":
		if sprite.animation == _cinematic_action and sprite.is_playing():
			return
		_cinematic_action = &""
	animator.locomotion(is_on_floor(), velocity, delta)


# --- Stamina and timers -------------------------------------------------------------------------

## Spends stamina on an action. Any stamina left allows it; none refuses it. While the second wind holds,
## nothing he does costs him.
## Pays for an action, or refuses it (a gasp) when he has not the breath for all of it. A roll needs only
## a breath left (`scrape`): there is always a way out.
func _spend(amount: float, scrape: bool = false) -> bool:
	if _steel > 0.0:
		return true
	if stamina < 1.0 or (not scrape and stamina < amount):
		breath_refused.emit()
		return false
	_drain(amount)
	return true


## Breath back: a blow that landed, a steady breath, a parry, a close call.
func recover_breath(amount: float) -> void:
	if amount <= 0.0 or state == State.DEAD or stamina >= profile.max_stamina:
		return
	stamina = minf(profile.max_stamina, stamina + amount)
	stamina_changed.emit(stamina, profile.max_stamina)


func _drain(amount: float) -> void:
	if amount <= 0.0:
		return
	var before: float = stamina
	stamina = maxf(0.0, stamina - amount)
	_regen_delay = profile.exhausted_delay if stamina <= 0.0 else profile.stamina_regen_delay
	stamina_changed.emit(stamina, profile.max_stamina)
	if stamina <= 0.0 and before > 0.0:
		winded.emit()


func _tick(delta: float) -> void:
	_state_time += delta
	_since_hurt += delta
	_coyote = maxf(0.0, _coyote - delta)
	moves.tick(delta)
	_riposte = maxf(0.0, _riposte - delta)
	_since_combat += delta
	if _since_combat > profile.resolve_idle and resolve > profile.resolve_kept:
		set_resolve(maxf(profile.resolve_kept, resolve - profile.resolve_ebb * delta))
	if _steel > 0.0:
		_steel -= delta
		if _steel <= 0.0:
			steeled.emit(false)
	if _steady_left > 0.0:
		_steady_left = maxf(0.0, _steady_left - delta)
	_parry_cooldown = maxf(0.0, _parry_cooldown - delta)
	if _parry_window > 0.0:
		_parry_window -= delta
	if _invulnerable > 0.0:
		_invulnerable = maxf(0.0, _invulnerable - delta)
		# A soft pulse, not a flicker that hides him (and his colours) half the time.
		var pulse: float = 0.5 + 0.5 * sin(_invulnerable * 28.0)
		_set_ghost(pulse * 0.6 if _invulnerable > 0.0 and state != State.DEAD else 0.0)
	tick_poise(delta)
	if _regen_delay > 0.0:
		_regen_delay -= delta
	elif stamina < profile.max_stamina and state != State.DEAD and state != State.CHARGE:
		var rate: float = profile.stamina_regen * (0.5 if state == State.BLOCK else 1.0)
		stamina = minf(profile.max_stamina, stamina + rate * delta)
		stamina_changed.emit(stamina, profile.max_stamina)


func _set_ghost(amount: float) -> void:
	var flash_material: ShaderMaterial = sprite.material as ShaderMaterial
	if flash_material != null:
		flash_material.set_shader_parameter(&"ghost", amount)


func _set_state(next: State) -> void:
	if state == next:
		return
	if state == State.CHARGE and charge_level > 0:
		charge_level = 0
		charge_changed.emit(0)
	if state == State.ART:
		_art = null
	# Leaving a blow, the sprite goes back to its own pace (the fury quickens blows only).
	if state == State.ATTACK and next != State.FINISHER:
		sprite.speed_scale = 1.0
	state = next
	_state_time = 0.0
	_glancing = false
	state_changed.emit(next)


func _on_animator_footstep() -> void:
	if state == State.MOVE or state == State.CINEMATIC:
		footstep.emit()
