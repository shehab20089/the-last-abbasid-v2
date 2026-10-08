class_name VfxDirector
extends Node2D
## Spawns one-shot sprite effects (sparks, flashes, dust, flecks, glints) in the world and frees
## each when its animation ends. Purely visual: it never decides anything and knows no gameplay
## types. At most MAX_EFFECTS live at once; the oldest goes first.

const MAX_EFFECTS: int = 48

@export var frames: SpriteFrames


## Plays `effect` at `at`. flip mirrors it (sparks thrown leftward); anchor_bottom stands it on the
## point instead of centring it (dust on the ground).
func play(effect: StringName, at: Vector2, flip: bool = false, anchor_bottom: bool = false,
		tint: Color = Color.WHITE) -> void:
	if frames == null or not frames.has_animation(effect):
		return
	if get_child_count() >= MAX_EFFECTS:
		get_child(0).queue_free()
	var sprite: AnimatedSprite2D = AnimatedSprite2D.new()
	sprite.sprite_frames = frames
	sprite.flip_h = flip
	sprite.modulate = tint
	sprite.global_position = at.round()
	if anchor_bottom:
		var texture: Texture2D = frames.get_frame_texture(effect, 0)
		sprite.offset = Vector2(0, -texture.get_height() / 2.0)
	add_child(sprite)
	sprite.play(effect)
	sprite.animation_finished.connect(sprite.queue_free)


func clear() -> void:
	for child: Node in get_children():
		child.queue_free()
