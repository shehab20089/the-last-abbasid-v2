class_name MovePreview
extends VBoxContainer
## A move shown on a small stage: Yusuf plays the animations it is made of in turn, at their own timing,
## carried by their lunges as in the game and leaving the same blade trails, while the buttons that make
## it light up below the stage as each is pressed (a held one stays lit). It begins again after a breath.
## A demo comes from MoveDemos. Pure presentation.

const FRAMES: SpriteFrames = preload("res://assets/characters/warrior/warrior_frames.tres")
const HITBOXES: FrameHitboxes = preload("res://assets/characters/warrior/warrior_hitboxes.tres")
const PROFILE: WarriorProfile = preload("res://features/warrior/definitions/warrior_profile.tres")
## Friction once a lunge stops pushing (as Warrior.ATTACK_FRICTION).
const FRICTION: float = 1500.0
## Seconds he stands in his guard after the move before it begins again.
const REST: float = 0.8
const STEP: float = 1.0 / 60.0
const LIT: Color = Color(1.0, 0.86, 0.45)
const UNLIT: Color = Color(0.6, 0.55, 0.48)
const LIGHT_TIME: float = 0.32

var glyphs: InputGlyphs
## The stage's height (the street sits near its foot).
var stage_height: float = 124.0

var _stage: Control
var _sprite: AnimatedSprite2D
var _trail: SwordTrail
var _keys_row: HBoxContainer
## One per key of the demo (null for a beat with no button).
var _caps: Array[Label] = []
var _keys: Array = []
var _steps: Array = []
## Each attack the hero has, by its animation.
var _attacks: Dictionary[StringName, AttackDefinition] = {}

# The demo as it plays.
var _step: int = -1
var _frames: PackedInt32Array = PackedInt32Array()
var _index: int = 0
var _frame_left: float = 0.0
var _wait_left: float = 0.0
var _step_time: float = 0.0
var _step_length: float = 0.0
var _x: float = 0.0
var _speed: float = 0.0
var _start: float = 0.0
var _rest_left: float = 0.0
var _lit: Dictionary[int, float] = {}
var _held: int = -1
var _done: bool = true
## The glint's brightness on him (fading), and the time to the next echo left behind.
var _glint: float = 0.0
var _echo_left: float = 0.0


func _ready() -> void:
	add_theme_constant_override(&"separation", 3)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage = Control.new()
	_stage.clip_contents = true
	_stage.custom_minimum_size = Vector2(0, stage_height)
	_stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stage.draw.connect(_draw_stage)
	_stage.resized.connect(_restart)
	add_child(_stage)
	_sprite = AnimatedSprite2D.new()
	_sprite.sprite_frames = FRAMES
	_sprite.offset = Vector2(0, -60)
	_stage.add_child(_sprite)
	_trail = SwordTrail.new()
	_trail.show_behind_parent = true
	_trail.material = CanvasItemMaterial.new()
	_sprite.add_child(_trail)
	_keys_row = HBoxContainer.new()
	_keys_row.alignment = BoxContainer.ALIGNMENT_CENTER
	_keys_row.add_theme_constant_override(&"separation", 3)
	_keys_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_keys_row)
	for attack: AttackDefinition in _all_attacks():
		if attack != null and not _attacks.has(attack.animation):
			_attacks[attack.animation] = attack


## Shows a demo (MoveDemos), or nothing for an empty one.
func show_demo(demo: Dictionary) -> void:
	for child: Node in _keys_row.get_children():
		child.queue_free()
	_caps.clear()
	var keys: Array = demo.get("keys", [])
	var steps: Array = demo.get("steps", [])
	_keys = keys
	_steps = steps
	_build_keys()
	_stage.visible = not _steps.is_empty()
	_restart()


## Buttons named for the device in use (call when it changes).
func refresh_keys() -> void:
	for i: int in _caps.size():
		var cap: Label = _caps[i]
		if cap != null:
			var key: Array = _keys[i]
			var action: StringName = key[0]
			cap.text = _label(action)


func _process(delta: float) -> void:
	if _steps.is_empty() or not is_visible_in_tree():
		return
	var real: float = minf(delta / maxf(Engine.time_scale, 0.001), 0.1)
	for entry: Variant in _lit.keys():
		var key: int = entry
		_lit[key] -= real
		if _lit[key] <= 0.0:
			_lit.erase(key)
	if _done:
		_rest_left -= real
		_speed = move_toward(_speed, 0.0, FRICTION * real)
		_x += _speed * real
		_sprite.position.x = _x
		if _rest_left <= 0.0:
			_begin(true)
	else:
		var step: Dictionary = _steps[_step]
		var speed: float = step.get("speed", 1.0)
		_advance(real * speed, true)
		if step.get("echo", false):
			_echo_left -= real
			if _echo_left <= 0.0:
				_echo_left = 0.05
				_echo()
	_glint = maxf(0.0, _glint - real * 3.5)
	_sprite.modulate = Color.WHITE.lerp(Color(1.9, 1.8, 1.45), _glint)
	_paint_keys()


# --- Playing ------------------------------------------------------------------------------------

func _restart() -> void:
	if _steps.is_empty() or _stage == null:
		return
	# A dry run finds how far the move carries him, so it plays centred on the stage.
	_x = 0.0
	_start = 0.0
	_begin(false)
	var low: float = 0.0
	var high: float = 0.0
	var guard: int = 0
	while not _done and guard < 6000:
		_advance(STEP, false)
		low = minf(low, _x)
		high = maxf(high, _x)
		guard += 1
	_start = (_stage.size.x - (high - low)) * 0.5 - low
	_begin(true)


func _begin(visual: bool) -> void:
	_x = _start
	_speed = 0.0
	_frame_left = 0.0
	_lit.clear()
	_held = -1
	_done = false
	_enter_step(0, visual)


func _advance(dt: float, visual: bool) -> void:
	var step: Dictionary = _steps[_step]
	_step_time += dt
	# The body goes as the game would carry it: a lunge on its frames, a run, or friction.
	var attack: AttackDefinition = _attack_of(step)
	var frame: int = _frames[_index] if _index < _frames.size() else 0
	if step.get("run", false):
		_speed = PROFILE.run_speed
	elif attack != null and attack.lunge_speed > 0.0 and frame >= attack.lunge_from and frame <= attack.lunge_to:
		_speed = attack.lunge_speed
	else:
		_speed = move_toward(_speed, 0.0, FRICTION * dt)
	_x += _speed * dt
	if visual:
		_sprite.position = Vector2(_x, _floor() + _lift(step))
	if step.has("wait"):
		_wait_left -= dt
		if _wait_left <= 0.0:
			_next_step(visual)
		return
	_frame_left -= dt
	while _frame_left <= 0.0 and not _done:
		_index += 1
		if _index >= _frames.size():
			_next_step(visual)
			return
		_show_frame(visual)


func _enter_step(i: int, visual: bool) -> void:
	_step = i
	var step: Dictionary = _steps[i]
	_step_time = 0.0
	var hold: int = step.get("hold", -1)
	_held = hold
	if step.has("wait"):
		var wait: float = step["wait"]
		_wait_left = wait
		_frame_left = 0.0
		_step_length = wait
		_frames = PackedInt32Array()
		if visual:
			_sprite.play(&"idle")
		_light(step, 0, visual)
		return
	var anim: StringName = step["anim"]
	var count: int = FRAMES.get_frame_count(anim)
	var last: int = count - 1
	var first: int = step.get("from", 0)
	if step.get("glint", false) and visual:
		_glint = 1.0
	if step.has("upto"):
		var upto: int = step["upto"]
		last = mini(upto, last)
	elif step.get("cut", false) and _attacks.has(anim):
		last = mini(_attacks[anim].recovery_from - 1, last)
	_frames = PackedInt32Array()
	var loops: int = step.get("loops", 1)
	for loop: int in maxi(1, loops):
		for f: int in range(first, last + 1):
			_frames.append(f)
	_step_length = 0.0
	for f: int in _frames:
		_step_length += _duration(anim, f)
	_index = 0
	_show_frame(visual)


func _next_step(visual: bool) -> void:
	if _step + 1 >= _steps.size():
		_done = true
		_held = -1
		_rest_left = REST
		if visual:
			_sprite.play(&"idle")
		return
	_enter_step(_step + 1, visual)


func _show_frame(visual: bool) -> void:
	var step: Dictionary = _steps[_step]
	var anim: StringName = step["anim"]
	var frame: int = _frames[_index]
	_frame_left += _duration(anim, frame)
	if _frame_left <= 0.0:
		_frame_left = _duration(anim, frame)
	# The frame's place in the step (a loop counts from its own start for the keys).
	_light(step, frame if _index < FRAMES.get_frame_count(anim) else -1, visual)
	if not visual:
		return
	if _sprite.animation != anim:
		_sprite.animation = anim
	_sprite.stop()
	_sprite.frame = frame
	var attack: AttackDefinition = _attacks[anim] if _attacks.has(anim) else null
	if attack != null and _index < FRAMES.get_frame_count(anim):
		_trail.strike(attack, HITBOXES, frame, 1.0)


func _light(step: Dictionary, frame: int, visual: bool) -> void:
	if not visual or not step.has("light"):
		return
	var lights: Array = step["light"]
	for entry: Variant in lights:
		var pair: Array = entry
		var key: int = pair[0]
		var at: int = pair[1]
		if at == frame or (frame == 0 and at == 0 and _frames.is_empty()):
			_lit[key] = LIGHT_TIME


## A pale copy of him as he stands, fading where he was (a close call, a dash).
func _echo() -> void:
	var copy: Sprite2D = Sprite2D.new()
	copy.texture = FRAMES.get_frame_texture(_sprite.animation, _sprite.frame)
	copy.offset = _sprite.offset
	copy.position = _sprite.position
	copy.modulate = Color(0.6, 0.85, 1.0, 0.55)
	_stage.add_child(copy)
	_stage.move_child(copy, 0)
	var fade: Tween = copy.create_tween()
	fade.tween_property(copy, "modulate:a", 0.0, 0.3)
	fade.tween_callback(copy.queue_free)


func _duration(anim: StringName, frame: int) -> float:
	var fps: float = FRAMES.get_animation_speed(anim)
	return FRAMES.get_frame_duration(anim, frame) / maxf(fps, 1.0)


func _attack_of(step: Dictionary) -> AttackDefinition:
	if not step.has("anim"):
		return null
	var anim: StringName = step["anim"]
	return _attacks[anim] if _attacks.has(anim) else null


func _lift(step: Dictionary) -> float:
	if not step.has("lift") or _step_length <= 0.0:
		return 0.0
	var lift: Array = step["lift"]
	var from: float = lift[0]
	var to: float = lift[1]
	return lerpf(from, to, clampf(_step_time / _step_length, 0.0, 1.0))


func _floor() -> float:
	return _stage.size.y - 10.0


func _all_attacks() -> Array[AttackDefinition]:
	var out: Array[AttackDefinition] = []
	out.append_array(PROFILE.combo)
	out.append_array([PROFILE.heavy, PROFILE.air_attack, PROFILE.plunge, PROFILE.plunge_landing, PROFILE.bash,
		PROFILE.roll_cut, PROFILE.pommel_strike, PROFILE.whirling_cut, PROFILE.executioner, PROFILE.delayed_cut,
		PROFILE.running_thrust])
	if not PROFILE.charged_cleaves.is_empty():
		out.append(PROFILE.charged_cleaves[0])
	for art: ArtDefinition in PROFILE.arts:
		if art.attack != null:
			out.append(art.attack)
	return out


# --- The stage and the keys ------------------------------------------------------------------------

func _draw_stage() -> void:
	var size: Vector2 = _stage.size
	_stage.draw_rect(Rect2(Vector2.ZERO, size), Color(0.035, 0.028, 0.03))
	# Firelight low on the street behind him, the street itself, and its edge.
	var ground: float = _floor()
	for i: int in 6:
		var t: float = float(i) / 6.0
		_stage.draw_rect(Rect2(0.0, ground - 40.0 + t * 40.0, size.x, 40.0 / 6.0),
			Color(0.16, 0.07, 0.03, 0.05 + t * 0.1))
	_stage.draw_rect(Rect2(0.0, ground, size.x, size.y - ground), Color(0.075, 0.06, 0.055))
	_stage.draw_line(Vector2(0.0, ground + 0.5), Vector2(size.x, ground + 0.5), Color(0.36, 0.27, 0.2), 1.0)
	_stage.draw_rect(Rect2(Vector2.ZERO, size), Color(0.45, 0.36, 0.24, 0.8), false, 1.0)


func _build_keys() -> void:
	for i: int in _keys.size():
		var key: Array = _keys[i]
		var action: StringName = key[0]
		var how: String = key[1]
		if i > 0:
			var before: Array = _keys[i - 1]
			var joiner: Label = Label.new()
			var before_how: String = before[1]
			# The string reads the way the language does.
			joiner.text = "+" if before_how == "hold" else ("‹" if _keys_row.is_layout_rtl() else "›")
			# Drawn as written, never mirrored: right to left the arrow points left, on to the next button read.
			joiner.text_direction = Control.TEXT_DIRECTION_LTR
			joiner.add_theme_color_override(&"font_color", UNLIT)
			_keys_row.add_child(joiner)
		if how == "wait":
			var beat: Label = Label.new()
			beat.text = "…"
			beat.add_theme_color_override(&"font_color", UNLIT)
			_keys_row.add_child(beat)
			_caps.append(beat)
			continue
		if how == "hold":
			var hold: Label = Label.new()
			hold.text = "PROMPT_HOLD"
			hold.add_theme_color_override(&"font_color", UNLIT)
			_keys_row.add_child(hold)
		var cap: Label = MoveCoach.key_cap()
		cap.text = _label(action)
		_keys_row.add_child(cap)
		_caps.append(cap)


func _paint_keys() -> void:
	for i: int in _caps.size():
		var cap: Label = _caps[i]
		if cap == null:
			continue
		var on: bool = _lit.has(i) or _held == i
		cap.modulate = Color(1.25, 1.12, 0.85) if on else Color(0.62, 0.58, 0.54)


func _label(action: StringName) -> String:
	if glyphs != null:
		return glyphs.label(action)
	return "A/D" if action == &"move" else String(action)
