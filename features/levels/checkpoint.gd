class_name Checkpoint
extends Interactable
## A lamp in a prayer niche. Lighting it (or resting by it once lit) remembers the hero's way:
## he returns here when he falls, his remedies refilled. Unlit, an ember breathes on its wick and a
## faint glow pulses about it, so it reads as a lamp waiting for its flame; lit, it burns high.

signal rested(checkpoint: Checkpoint)

## The glow about it unlit (breathing slowly) and lit (a flame's flicker), and the flare as it is lit.
const DARK_ENERGY: float = 0.32
const LIT_ENERGY: float = 0.9
const FLARE_ENERGY: float = 2.2

@export var checkpoint_id: StringName = &"lamp"

var lit: bool = false

@onready var sprite: AnimatedSprite2D = $Sprite
@onready var light: FireLight = $Light


func _ready() -> void:
	super._ready()
	set_lit(false, false)


func interact(by: Node2D) -> void:
	set_lit(true, true)
	rested.emit(self)
	super.interact(by)


func set_lit(on: bool, animate: bool) -> void:
	var was_lit: bool = lit
	lit = on
	prompt = "PROMPT_REST" if on else "PROMPT_LIGHT_LAMP"
	sprite.play(&"lit" if on else &"dark")
	light.visible = true
	light.flicker = 0.12 if on else 0.4
	light.speed = 9.0 if on else 2.2
	light.base_energy = LIT_ENERGY if on else DARK_ENERGY
	if on and animate and not was_lit:
		# The flame takes: a flare of light that settles to the lamp's own.
		light.base_energy = FLARE_ENERGY
		var tween: Tween = create_tween()
		tween.tween_property(light, "base_energy", LIT_ENERGY, 0.9).set_ease(Tween.EASE_OUT)


## Where its sign hangs over it (px above its foot).
func marker_height() -> float:
	return 66.0
