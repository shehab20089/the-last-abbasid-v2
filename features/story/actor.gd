class_name Actor
extends AnimatedSprite2D
## Someone in a staged scene (StagedScenes): a figure in the game's own sprites that a scene walks to a mark, turns,
## makes play an animation, or beheads: Toqto and his escort with their captives in the Streets of Ash, Hamid at the
## last gate, the people walking out of it. Never part of the fight. A scene's work done on an earlier life is kept:
## once `dead_flag` is set he lies where he fell, once `gone_flag` is set he is gone.

## He has reached the mark he was walking to.
signal arrived(actor: Actor)

@export var actor_id: StringName = &""
## What he does standing (and on reaching a mark).
@export var rest: StringName = &"idle"
@export var face: float = 1.0
## Out of sight until a scene shows him.
@export var unseen: bool = false
## What a beheading cuts from him and where he bleeds (generated with his sprites), or none.
@export var gore_set: GoreSet
## The flags that mean a scene has done its work with him: he lies dead, or he is gone.
@export var dead_flag: StringName = &""
@export var gone_flag: StringName = &""
## How far above the street he stands out, and his firelit rim (a soldier's as the fighters', the townsfolk's softer).
@export var lift: float = 1.12
@export var rim: float = 0.2

## How far before his mark a man who is going (`vanish`) fades into the smoke, px.
const FADE_DISTANCE: float = 48.0

var dead: bool = false
var _target_x: float = NAN
var _speed: float = 0.0
var _vanish: bool = false


func _ready() -> void:
	offset = Vector2(0, -60)
	flip_h = face < 0.0
	visible = not unseen
	var look: ShaderMaterial = ShaderMaterial.new()
	look.shader = Npc.LOOK
	look.set_shader_parameter(&"lift", lift)
	look.set_shader_parameter(&"rim_strength", rim)
	material = look
	if sprite_frames != null and sprite_frames.has_animation(rest):
		play(rest)


## The scene's work already done on an earlier life: he lies where he fell, or is gone.
func apply_progress(flags: Array[StringName]) -> void:
	if gone_flag != &"" and gone_flag in flags:
		queue_free()
	elif dead_flag != &"" and dead_flag in flags:
		lie_dead()


## Walks (or runs) to `x` at `speed` px/s playing `animation` at `pace` (its own speed matched to his, so his
## feet do not slide); on arriving he rests, or, `vanish`, fades into the smoke over his last steps and is gone.
func walk_to(x: float, speed: float, animation: StringName, vanish: bool = false, pace: float = 1.0) -> void:
	if dead:
		return
	_target_x = x
	_speed = maxf(speed, 1.0)
	_vanish = vanish
	turn_to(x)
	act(animation)
	speed_scale = maxf(pace, 0.05)


## On his mark at once (a scene skipped).
func arrive() -> void:
	if is_nan(_target_x):
		return
	global_position.x = _target_x
	_finish_walk()


## Stops where he is and stands (a scene halts the column at Yusuf's call).
func halt() -> void:
	if is_nan(_target_x):
		return
	_target_x = NAN
	speed_scale = 1.0
	act(rest)


func moving() -> bool:
	return not is_nan(_target_x)


func turn_to(x: float) -> void:
	if absf(x - global_position.x) > 0.5:
		flip_h = x < global_position.x


func facing() -> float:
	return -1.0 if flip_h else 1.0


## Plays one of his animations, if he has it.
func act(animation: StringName) -> void:
	if sprite_frames != null and sprite_frames.has_animation(animation):
		play(animation)


## The stroke falls on him where he kneels.
func behead() -> void:
	if dead:
		return
	dead = true
	_target_x = NAN
	act(&"executed")


## Lying where he fell (a scene played on an earlier life).
func lie_dead() -> void:
	dead = true
	visible = true
	_target_x = NAN
	if sprite_frames != null and sprite_frames.has_animation(&"executed"):
		animation = &"executed"
		frame = sprite_frames.get_frame_count(&"executed") - 1
		pause()


func _process(delta: float) -> void:
	if is_nan(_target_x):
		return
	var step: float = _speed * delta
	var gap: float = _target_x - global_position.x
	if absf(gap) <= step:
		global_position.x = _target_x
		_finish_walk()
	else:
		global_position.x += signf(gap) * step
		if _vanish:
			modulate.a = clampf((absf(gap) - step) / FADE_DISTANCE, 0.0, 1.0)


func _finish_walk() -> void:
	_target_x = NAN
	speed_scale = 1.0
	arrived.emit(self)
	if _vanish:
		queue_free()
	else:
		act(rest)
