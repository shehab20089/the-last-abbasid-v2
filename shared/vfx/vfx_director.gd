class_name VfxDirector
extends Node2D
## Spawns one-shot sprite effects (sparks, flashes, dust, flecks, glints) in the world and frees
## each when its animation ends. Purely visual: it never decides anything and knows no gameplay
## types. At most MAX_EFFECTS live at once; the oldest goes first.

const MAX_EFFECTS: int = 48
## The bright bursts left out when flashes are turned off.
const FLASHES: Array[StringName] = [&"parry_flash"]

@export var frames: SpriteFrames
## Flashes off (a setting): the bright bursts are not played.
var calm: bool = false


## Plays `effect` at `at`. flip mirrors it (sparks thrown leftward); anchor_bottom stands it on the
## point instead of centring it (dust on the ground).
func play(effect: StringName, at: Vector2, flip: bool = false, anchor_bottom: bool = false,
		tint: Color = Color.WHITE) -> void:
	if calm and effect in FLASHES:
		return
	_spawn(effect, at, flip, anchor_bottom, tint)


## Plays `effect` at `offset` from `holder` and keeps it there while the holder moves (a warning over a
## man winding up, flames on a burning man), until it ends, or (a looping one) for `life` seconds; if the
## holder goes first, it finishes where he was.
func follow(effect: StringName, holder: Node2D, offset: Vector2, tint: Color = Color.WHITE, life: float = 0.0) -> void:
	var sprite: AnimatedSprite2D = _spawn(effect, holder.global_position + offset, false, false, tint)
	if sprite != null:
		sprite.set_meta(&"holder", holder.get_instance_id())
		sprite.set_meta(&"offset", offset)
		if life > 0.0:
			sprite.set_meta(&"life", life)


func _process(delta: float) -> void:
	for child: Node in get_children():
		if child.has_meta(&"life"):
			var life: float = child.get_meta(&"life")
			life -= delta
			child.set_meta(&"life", life)
			var faded: CanvasItem = child as CanvasItem
			if faded != null:
				faded.modulate.a = clampf(life / 0.3, 0.0, 1.0) * faded.modulate.a if life < 0.3 else faded.modulate.a
			if life <= 0.0:
				child.queue_free()
				continue
		if not child.has_meta(&"holder"):
			continue
		var sprite: Node2D = child as Node2D
		var id: int = child.get_meta(&"holder")
		var holder: Node2D = instance_from_id(id) as Node2D
		if sprite == null or holder == null or not holder.is_inside_tree():
			child.remove_meta(&"holder")
			continue
		var offset: Vector2 = child.get_meta(&"offset")
		sprite.global_position = (holder.global_position + offset).round()


func _spawn(effect: StringName, at: Vector2, flip: bool, anchor_bottom: bool, tint: Color) -> AnimatedSprite2D:
	if frames == null or not frames.has_animation(effect):
		return null
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
	return sprite


## A fading copy of a body as it stands this instant (a dodge, a dash): its frame, where and how it shows,
## tinted, gone within `life` seconds of real time.
func echo(source: AnimatedSprite2D, tint: Color = Color(0.62, 0.86, 1.0, 0.6), life: float = 0.24,
		at: Vector2 = Vector2.INF) -> void:
	if source == null or source.sprite_frames == null or not source.is_inside_tree():
		return
	if get_child_count() >= MAX_EFFECTS:
		get_child(0).queue_free()
	var copy: Sprite2D = Sprite2D.new()
	copy.texture = source.sprite_frames.get_frame_texture(source.animation, source.frame)
	copy.offset = source.offset
	copy.flip_h = source.flip_h
	copy.modulate = tint
	add_child(copy)
	copy.global_position = source.global_position if at == Vector2.INF else at
	var fade: Tween = copy.create_tween()
	fade.set_ignore_time_scale(true)
	fade.tween_property(copy, "modulate:a", 0.0, life)
	fade.tween_callback(copy.queue_free)


func clear() -> void:
	for child: Node in get_children():
		child.queue_free()
