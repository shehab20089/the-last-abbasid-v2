class_name Npc
extends Interactable
## Someone of Baghdad the hero can speak to, always. Talking asks the session to play the NPC's
## dialogue; an NPC may wait on a story flag (the bookseller on the soldiers at his door), and until
## it is set they say only what fits the moment (their "_waiting" dialogue), handing nothing over.
## They stand a little out of the scene (lifted, a soft warm rim, as the fighters are) so they read
## apart from captives and the dead, and glow softly while the hero is near enough to speak.

signal talk_requested(npc: Npc)

const LOOK: Shader = preload("res://features/combat/hit_flash.gdshader")
## How far above the street they stand out (the fighters stand at 1.22), and their rim.
const LIFT: float = 1.12
const RIM: float = 0.2
## The glow while the hero is near enough to speak.
const NEAR_GLOW: float = 0.1

@export var npc_id: StringName = &"npc"
## The dialogue to play (DialogueLibrary key).
@export var dialogue: StringName = &""
## The flag their story waits on (before it, they say only their waiting words), or empty.
@export var requires: StringName = &""
## The flag the first conversation sets (something given: a satchel, a key), or empty, and the
## notice (a translation key) that announces it.
@export var gives_flag: StringName = &""
@export var gives_notice: String = ""
## What their gift teaches the hero (knives), or nothing.
@export var teaches: StringName = &""
## A keepsake of theirs they give him once they are free to speak (a thread, a pen), or nothing.
@export var gives_keepsake: StringName = &""
@export var idle_animation: StringName = &"idle"
@export var talk_animation: StringName = &"talk"
## Played instead of idle while the NPC waits on `requires` (a captive, kneeling and bound), or empty.
@export var waiting_animation: StringName = &""

## True once what they wait on has happened: their story can go on.
var ready_to_speak: bool = true
## True once the hero has had their conversation (they have nothing new to say).
var talked: bool = false
@export var face: float = 1.0
@export var frames: SpriteFrames

## The top of their head above their feet, by animation (read once from its first frame).
var _heads: Dictionary[StringName, float] = {}
var _material: ShaderMaterial

@onready var sprite: AnimatedSprite2D = $Sprite


func _ready() -> void:
	super._ready()
	reach = false
	prompt = "PROMPT_TALK"
	if frames != null:
		sprite.sprite_frames = frames
	sprite.flip_h = face < 0.0
	ready_to_speak = requires == &""
	_material = ShaderMaterial.new()
	_material.shader = LOOK
	_material.set_shader_parameter(&"lift", LIFT)
	_material.set_shader_parameter(&"rim_strength", RIM)
	_material.set_shader_parameter(&"flash_color", Color(1.0, 0.9, 0.66))
	sprite.material = _material
	_play_idle()


func refresh(flags: Array[StringName]) -> void:
	ready_to_speak = requires == &"" or requires in flags
	talked = StringName("talked_%s" % npc_id) in flags
	if not sprite.animation == talk_animation:
		_play_idle()


## They have something new to say: free to speak, and not yet heard.
func has_news() -> bool:
	return ready_to_speak and not talked


func interact(by: Node2D) -> void:
	talk_requested.emit(self)
	super.interact(by)


func set_talking(on: bool) -> void:
	# Still bound, still waiting: they speak where they are.
	if on and (ready_to_speak or waiting_animation == &""):
		play(talk_animation)
	else:
		_play_idle()


## A soft glow while the hero is near enough to speak with them.
func highlight(on: bool) -> void:
	_material.set_shader_parameter(&"flash", NEAR_GLOW if on else 0.0)


func display_name() -> String:
	return DialogueLibrary.speaker_of(dialogue)


## The top of their head, a little above (they sit, crouch, kneel or stand).
func marker_height() -> float:
	var animation: StringName = sprite.animation
	if not _heads.has(animation):
		_heads[animation] = _measure_head(animation)
	return _heads[animation] + 4.0


func _measure_head(animation: StringName) -> float:
	var fallback: float = super.marker_height()
	if sprite.sprite_frames == null or not sprite.sprite_frames.has_animation(animation):
		return fallback
	var texture: Texture2D = sprite.sprite_frames.get_frame_texture(animation, 0)
	var image: Image = texture.get_image() if texture != null else null
	if image == null or image.is_empty():
		return fallback
	var used: Rect2i = image.get_used_rect()
	if used.size.y <= 0:
		return fallback
	# The frame is drawn centred on the sprite's offset; its first row with anything in it is the head.
	var top: float = sprite.position.y + sprite.offset.y - image.get_height() * 0.5 + used.position.y
	return -top


func _play_idle() -> void:
	play(waiting_animation if not ready_to_speak and waiting_animation != &"" else idle_animation)


func play(animation: StringName) -> void:
	if sprite.sprite_frames.has_animation(animation):
		sprite.play(animation)
