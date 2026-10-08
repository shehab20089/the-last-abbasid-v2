class_name Captive
extends AnimatedSprite2D
## A townsperson held by the soldiers. Some kneel, bound, until a story flag frees them (their
## captors beaten), then run for it. Some kneel under a soldier's raised sabre: they get away if the
## hero kills him or turns him from his work in time, and are beheaded if not (the level links the
## soldier to them). Never part of the fight itself.

## The sabre fell.
signal killed(captive: Captive)
## They got up and ran.
signal escaped(captive: Captive)

## The flag that frees them (their captors' group cleared), or nothing.
@export var freed_by: StringName = &""
@export var run_direction: float = -1.0
@export var speed: float = 140.0
## Who they are, for the story: one saved is remembered as saved_<id>, one lost as lost_<id>.
@export var captive_id: StringName = &""
## What they cry as they run (a translation key), or nothing.
@export var thanks: String = ""
## What a beheading cuts from them and where they bleed (generated with their sprites).
@export var gore_set: GoreSet

var dead: bool = false
var _left: float = -1.0


func _ready() -> void:
	offset = Vector2(0, -60)
	play(&"kneel")


## Frees them once their flag is set: they get up and run.
func refresh(flags: Array[StringName]) -> void:
	if freed_by != &"" and freed_by in flags:
		run_free()


## Up and away: their captor is dead, or has turned to fight.
func run_free() -> void:
	if dead or _left >= 0.0:
		return
	_left = 6.0
	flip_h = run_direction < 0.0
	play(&"run")
	escaped.emit(self)


## The stroke falls on them where they kneel.
func behead() -> void:
	if dead or _left >= 0.0:
		return
	dead = true
	if sprite_frames.has_animation(&"executed"):
		play(&"executed")
	killed.emit(self)


## Lying where they fell (a reload after the hero failed them).
func lie_dead() -> void:
	dead = true
	if sprite_frames.has_animation(&"executed"):
		animation = &"executed"
		frame = sprite_frames.get_frame_count(&"executed") - 1
		pause()


func facing() -> float:
	return -1.0 if flip_h else 1.0


func _process(delta: float) -> void:
	if _left < 0.0:
		return
	position.x += run_direction * speed * delta
	_left -= delta
	if _left <= 0.0:
		queue_free()
