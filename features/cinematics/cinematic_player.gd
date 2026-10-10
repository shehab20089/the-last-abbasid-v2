class_name CinematicPlayer
extends Control
## Plays a CinematicDefinition in place of a story card's words on black. Each shot is a painting through a
## moving camera (features/cinematics/cinematic.gdshader), letterboxed: its place and date in the top bar, its
## lines one after another in the bottom bar, timed by their length as the card's are, and a title or the next
## place's name over the picture where the shot calls for one. Shots cut, dissolve or pass through black;
## embers, ash, snow, motes and birds cross them; stones that strike throw dust and shake the picture. Confirm
## hurries on (`hurry`); the card skips it (`stop`). It asks for its sounds (`cue`, `ambience`) and knows
## nothing else of the game. A cinematic once seen is remembered (`was_seen`), so it can be skipped at a press.

signal finished
signal cue(name: StringName)
signal ambience(bed: StringName)

const BAR: float = 46.0
const PICTURE: Vector2 = Vector2(640.0, 268.0)
## A line's fade, its hold per character and at the least (the story card's), and the pause between lines.
const FADE: float = 0.7
const HOLD_PER_CHARACTER: float = 0.045
const MIN_HOLD: float = 2.4
const GAP: float = 0.35
## A title's or a place's name's time on screen, fades included.
const HEADING_TIME: float = 3.6
const HEADING_FADE: float = 0.9
## How much faster time runs while the player hurries on.
const HURRY: float = 6.0
const SEEN_FILE: String = "seen.cfg"
const SHADER: Shader = preload("res://features/cinematics/cinematic.gdshader")
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")
const EMBER: Texture2D = preload("res://assets/effects/ember.png")
const ASH: Texture2D = preload("res://assets/effects/ash.png")
## Names on the map: in ink, or pale over the spreading ink.
const MAP_INK: Color = Color(0.2, 0.12, 0.07)
const MAP_PALE: Color = Color(0.86, 0.76, 0.56)
const LINE_COLOUR: Color = Color(0.93, 0.88, 0.77)
const CAPTION_COLOUR: Color = Color(0.78, 0.66, 0.46)
const BIRD_COLOUR: Color = Color(0.07, 0.05, 0.05)
const ARABIC_DIGITS: String = "٠١٢٣٤٥٦٧٨٩"


## One painting on screen: its rect and shader, the shot it plays, and its own clock.
class ShotView extends RefCounted:
	var rect: ColorRect
	var material: ShaderMaterial
	var shot: CinematicShot
	var time: float = 0.0
	var length: float = 1.0


## The player's brightness, and whether flashes are softened (the fire then flickers half as much).
var brightness: float = 1.0
var calm: bool = false
var playing: bool = false

var _definition: CinematicDefinition
var _heading: String = ""
var _index: int = -1
var _view: ShotView
var _old: ShotView
var _views: Array[ShotView] = []
var _starts: PackedFloat32Array = PackedFloat32Array()
var _holds: PackedFloat32Array = PackedFloat32Array()
var _heading_at: float = -1.0
var _hurry_until: float = -1.0
var _shake: float = 0.0
var _fired: PackedStringArray = PackedStringArray()
## Each bird: x, y, speed (its sign the way it flies), the phase of its wings.
var _birds: Array[Vector4] = []
var _labels: Array[Label] = []

var _picture: Control
var _shade: ColorRect
var _caption: Label
var _line: Label
var _title: Label
var _subtitle: Label
var _embers: CPUParticles2D
var _ash: CPUParticles2D
var _snow: CPUParticles2D
var _motes: CPUParticles2D
var _dust: CPUParticles2D
var _flock: Node2D
var _map_layer: Control


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	visible = false
	var black: ColorRect = ColorRect.new()
	black.color = Color(0.0, 0.0, 0.0)
	black.mouse_filter = Control.MOUSE_FILTER_IGNORE
	black.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(black)
	# The picture between the bars; what is in it is laid out left to right whatever the language.
	_picture = Control.new()
	_picture.layout_direction = Control.LAYOUT_DIRECTION_LTR
	_picture.clip_contents = true
	_picture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_picture.offset_top = BAR
	_picture.offset_right = PICTURE.x
	_picture.offset_bottom = BAR + PICTURE.y
	add_child(_picture)
	for i: int in 2:
		var view: ShotView = ShotView.new()
		view.rect = ColorRect.new()
		view.rect.color = Color(1.0, 1.0, 1.0)
		view.rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		view.rect.visible = false
		view.material = ShaderMaterial.new()
		view.material.shader = SHADER
		view.rect.material = view.material
		_fill_picture(view.rect)
		_views.append(view)
	_embers = _particles(EMBER)
	_ash = _particles(ASH)
	_snow = _particles(ASH)
	_motes = _particles(EMBER)
	_dust = _particles(ASH)
	_dust.one_shot = true
	_dust.explosiveness = 0.85
	_dust.amount = 48
	_dust.lifetime = 1.8
	_dust.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	_dust.emission_sphere_radius = 6.0
	_dust.direction = Vector2(0.0, -1.0)
	_dust.spread = 75.0
	_dust.gravity = Vector2(0.0, 26.0)
	_dust.initial_velocity_min = 16.0
	_dust.initial_velocity_max = 54.0
	_dust.scale_amount_min = 1.0
	_dust.scale_amount_max = 2.2
	_dust.color = Color(0.72, 0.6, 0.48, 0.85)
	_flock = Node2D.new()
	_flock.draw.connect(_draw_birds)
	_picture.add_child(_flock)
	_map_layer = Control.new()
	_map_layer.layout_direction = Control.LAYOUT_DIRECTION_LTR
	_map_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_picture(_map_layer)
	_shade = ColorRect.new()
	_shade.color = Color(0.0, 0.0, 0.0, 0.0)
	_shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fill_picture(_shade)
	# The words: the place and date in the top bar, the line in the bottom bar, a title over the picture.
	_caption = _words(KeyText.FONT, 12, CAPTION_COLOUR)
	_caption.uppercase = true
	_caption.offset_left = 22.0
	_caption.offset_right = PICTURE.x - 22.0
	_caption.offset_top = 6.0
	_caption.offset_bottom = BAR - 6.0
	_caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	# Where a line begins: the left, or the right in a right-to-left language (the label turns it).
	_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_line = _words(KeyText.FONT, 12, LINE_COLOUR)
	_line.offset_left = 44.0
	_line.offset_right = PICTURE.x - 44.0
	_line.offset_top = BAR + PICTURE.y + 2.0
	_line.offset_bottom = 360.0 - 2.0
	_line.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_line.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title = _words(TITLE_FONT, 18, Color(0.95, 0.86, 0.62))
	_title.add_theme_color_override(&"font_shadow_color", Color(0.06, 0.02, 0.02))
	_title.add_theme_constant_override(&"shadow_offset_x", 2)
	_title.add_theme_constant_override(&"shadow_offset_y", 2)
	_title.offset_right = PICTURE.x
	_title.offset_top = 140.0
	_title.offset_bottom = 176.0
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_subtitle = _words(KeyText.FONT, 12, Color(0.82, 0.72, 0.55))
	_subtitle.offset_right = PICTURE.x
	_subtitle.offset_top = 180.0
	_subtitle.offset_bottom = 198.0
	_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER


## Plays `definition`; `heading` (a key) is the card's heading: the chapter's name under the opening's title,
## or the next place's name closing an interlude.
func play(definition: CinematicDefinition, heading: String = "") -> void:
	_definition = definition
	_heading = heading
	_index = -1
	_view = null
	_old = null
	for view: ShotView in _views:
		view.rect.visible = false
	playing = true
	visible = true
	_begin_shot(0)


## Ends the cinematic at once (the card's skip).
func stop() -> void:
	if playing:
		_finish()


## Hurries to the next moment: the end of the line on screen, the next line, or the next shot.
func hurry() -> void:
	if not playing or _view == null:
		return
	var t: float = _view.time
	var moments: PackedFloat32Array = PackedFloat32Array()
	for i: int in _starts.size():
		moments.append(_starts[i])
		moments.append(_starts[i] + FADE * 2.0 + _holds[i])
	if _heading_at >= 0.0:
		moments.append(_heading_at)
		moments.append(_heading_at + HEADING_TIME)
	moments.append(_view.length)
	moments.sort()
	for moment: float in moments:
		if moment > t + 0.05:
			_hurry_until = moment
			return


## The shot playing (0 for the first), or -1.
func shot_index() -> int:
	return _index if playing else -1


## The line on screen now (its translated words), or "".
func line_text() -> String:
	return _line.text if playing and _line.modulate.a > 0.0 else ""


## How fully the line on screen is shown (0 to 1).
func line_alpha() -> float:
	return _line.modulate.a if playing else 0.0


func caption_text() -> String:
	return _caption.text if playing and _caption.modulate.a > 0.0 else ""


## How long the shot playing lasts, and how far into it the cinematic is (seconds).
func shot_length() -> float:
	return _view.length if _view != null else 0.0


func shot_time() -> float:
	return _view.time if _view != null else 0.0


## How long each line of the shot playing stays fully shown (its fades aside).
func line_holds() -> PackedFloat32Array:
	return _holds


static func was_seen(id: StringName) -> bool:
	var file: ConfigFile = ConfigFile.new()
	if file.load(_seen_path()) != OK:
		return false
	var seen: bool = file.get_value("seen", String(id), false)
	return seen


static func mark_seen(id: StringName) -> void:
	var file: ConfigFile = ConfigFile.new()
	file.load(_seen_path())
	file.set_value("seen", String(id), true)
	file.save(_seen_path())


static func _seen_path() -> String:
	return "user://%s%s" % [OS.get_environment("ABBASID_USER_PREFIX"), SEEN_FILE]


func _process(delta: float) -> void:
	if not playing or _view == null:
		return
	var step: float = delta * (HURRY if _hurry_until > _view.time else 1.0)
	_view.time += step
	if _old != null:
		_old.time += step
		var dissolve: float = maxf(0.01, _view.shot.dissolve)
		_view.rect.modulate.a = clampf(_view.time / dissolve, 0.0, 1.0)
		if _view.time >= dissolve:
			_old.rect.visible = false
			_old = null
	if _view.time >= _view.length:
		if _index + 1 < _definition.shots.size():
			_begin_shot(_index + 1)
		else:
			_finish()
			return
	_apply(_view)
	if _old != null:
		_apply(_old)
	_update_words()
	_update_life(step)


func _begin_shot(index: int) -> void:
	var shot: CinematicShot = _definition.shots[index]
	_index = index
	var previous: ShotView = _view
	var view: ShotView = _views[1] if previous == _views[0] else _views[0]
	view.shot = shot
	view.time = 0.0
	view.length = _schedule(shot)
	var material: ShaderMaterial = view.material
	material.set_shader_parameter(&"has_painting", 1.0 if shot.painting != null else 0.0)
	if shot.painting != null:
		material.set_shader_parameter(&"painting", shot.painting)
		material.set_shader_parameter(&"depth_map", shot.depth)
		material.set_shader_parameter(&"masks", shot.masks)
		material.set_shader_parameter(&"palette", shot.palette)
		var stored: Rect2 = shot.painting_rect
		material.set_shader_parameter(&"stored_rect", Vector4(stored.position.x, stored.position.y, stored.size.x,
			stored.size.y))
		var ref: Rect2 = shot.camera_at(shot.reference)
		material.set_shader_parameter(&"camera_ref", Vector4(ref.position.x, ref.position.y, ref.size.x, ref.size.y))
		material.set_shader_parameter(&"parallax", shot.parallax)
		material.set_shader_parameter(&"water", shot.water)
		material.set_shader_parameter(&"sway", shot.sway)
		material.set_shader_parameter(&"smoke", shot.smoke)
		var area: Rect2 = shot.smoke_area
		material.set_shader_parameter(&"smoke_area", Vector4(area.position.x, area.position.y, area.size.x,
			area.size.y))
		material.set_shader_parameter(&"use_map", 1.0 if shot.map_ink != null else 0.0)
		if shot.map_ink != null:
			material.set_shader_parameter(&"map_ink", shot.map_ink)
			material.set_shader_parameter(&"map_times", shot.map_times)
			var map: Rect2 = shot.map_rect
			material.set_shader_parameter(&"map_rect", Vector4(map.position.x, map.position.y, map.size.x, map.size.y))
	view.rect.visible = true
	_picture.move_child(view.rect, 1)
	_old = null
	if previous != null:
		if shot.dissolve > 0.0:
			_old = previous
			view.rect.modulate.a = 0.0
		else:
			previous.rect.visible = false
			view.rect.modulate.a = 1.0
	else:
		view.rect.modulate.a = 1.0
	_view = view
	_hurry_until = -1.0
	_fired.clear()
	_configure_life(shot)
	_make_labels(shot)
	if shot.ambience != &"":
		ambience.emit(shot.ambience)
	_apply(view)
	_update_words()


## Lays out the shot's words in time and returns its length.
func _schedule(shot: CinematicShot) -> float:
	_starts = PackedFloat32Array()
	_holds = PackedFloat32Array()
	var t: float = shot.lead
	for key: String in shot.lines:
		var hold: float = maxf(MIN_HOLD, tr(key).length() * HOLD_PER_CHARACTER)
		_starts.append(t)
		_holds.append(hold)
		t += FADE * 2.0 + hold + GAP
	if not shot.lines.is_empty():
		t -= GAP
	_heading_at = -1.0
	if shot.title != "" or (shot.heading and _heading != ""):
		_heading_at = t + (0.4 if not shot.lines.is_empty() else 0.0)
		t = _heading_at + HEADING_TIME
	return maxf(shot.minimum, t + shot.tail)


func _apply(view: ShotView) -> void:
	var shot: CinematicShot = view.shot
	if shot.painting == null:
		return
	var material: ShaderMaterial = view.material
	var u: float = clampf(view.time / view.length, 0.0, 1.0)
	var camera: Rect2 = shot.camera_at(u)
	material.set_shader_parameter(&"camera", Vector4(camera.position.x, camera.position.y, camera.size.x,
		camera.size.y))
	material.set_shader_parameter(&"time_s", view.time)
	var shake: Vector2 = Vector2.ZERO
	if view == _view and _shake > 0.0:
		shake = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * _shake * 2.5 * camera.size.x / PICTURE.x
	material.set_shader_parameter(&"shake", shake)
	var grade: PackedFloat32Array = shot.grade_at(u)
	material.set_shader_parameter(&"saturation", grade[0])
	material.set_shader_parameter(&"contrast", grade[1])
	material.set_shader_parameter(&"exposure", grade[2])
	material.set_shader_parameter(&"tint", Vector3(grade[3], grade[4], grade[5]))
	material.set_shader_parameter(&"brightness", brightness)
	material.set_shader_parameter(&"fire", shot.fire * (0.5 if calm else 1.0))
	material.set_shader_parameter(&"drift", shot.drift * u)
	if shot.map_ink != null:
		var phase: float = _phase(view.time) if view == _view else 99.0
		material.set_shader_parameter(&"map_reveal", clampf(phase, 0.0, 1.0))
		material.set_shader_parameter(&"map_wash", maxf(shot.ink_from, clampf(phase - 1.0 - float(shot.wash_line), 0.0, 1.0)))
		material.set_shader_parameter(&"map_route", clampf(phase - 1.0 - float(shot.route_line), 0.0, 1.0))


## Where the shot is in its words: 0 to 1 through its lead, then 1 + n through line n (its window and the
## pause after it), and the number of lines plus one after the last.
func _phase(t: float) -> float:
	var shot: CinematicShot = _view.shot
	if t < shot.lead:
		return t / maxf(0.01, shot.lead)
	for i: int in _starts.size():
		var window: float = FADE * 2.0 + _holds[i] + (GAP if i + 1 < _starts.size() else 0.0)
		if t < _starts[i] + window:
			return 1.0 + float(i) + clampf((t - _starts[i]) / window, 0.0, 1.0)
	return 1.0 + float(_starts.size())


func _update_words() -> void:
	var shot: CinematicShot = _view.shot
	var t: float = _view.time
	var shown: int = -1
	var alpha: float = 0.0
	for i: int in _starts.size():
		var local: float = t - _starts[i]
		if local >= 0.0 and local < FADE * 2.0 + _holds[i]:
			shown = i
			alpha = _fade(local, FADE, _holds[i])
	if shown >= 0:
		_line.text = tr(shot.lines[shown])
	_line.modulate.a = alpha
	# The place and date stay for the whole shot.
	if shot.caption != "":
		_caption.text = tr(shot.caption)
		_caption.modulate.a = clampf((t - 0.3) / 0.8, 0.0, 1.0) * clampf((_view.length - t) / 0.8, 0.0, 1.0)
	else:
		_caption.modulate.a = 0.0
	var heading_alpha: float = 0.0
	if _heading_at >= 0.0:
		heading_alpha = _fade(t - _heading_at, HEADING_FADE, HEADING_TIME - HEADING_FADE * 2.0)
		if shot.title != "":
			_title.text = tr(shot.title)
			_subtitle.text = tr(_heading)
		else:
			_title.text = tr(_heading)
			_subtitle.text = ""
	_title.modulate.a = heading_alpha
	_subtitle.modulate.a = heading_alpha
	# Through black at the shot's start and end.
	var black: float = 0.0
	if shot.fade_in > 0.0:
		black = 1.0 - clampf(t / shot.fade_in, 0.0, 1.0)
	if shot.fade_out > 0.0:
		black = maxf(black, clampf((t - (_view.length - shot.fade_out)) / shot.fade_out, 0.0, 1.0))
	_shade.color.a = black


## A fade in, a hold and a fade out: the opacity `local` seconds in.
func _fade(local: float, fade: float, hold: float) -> float:
	if local < 0.0:
		return 0.0
	if local < fade:
		return local / fade
	if local < fade + hold:
		return 1.0
	return clampf(1.0 - (local - fade - hold) / fade, 0.0, 1.0)


func _update_life(step: float) -> void:
	var shot: CinematicShot = _view.shot
	var u: float = _view.time / _view.length
	for i: int in shot.impact_times.size():
		var key: String = "impact_%d" % i
		if u >= shot.impact_times[i] and not _fired.has(key):
			_fired.append(key)
			_dust.position = _screen_point(shot.impact_points[i])
			_dust.restart()
			_dust.emitting = true
			_shake = 1.0
	for i: int in shot.cue_times.size():
		var key: String = "cue_%d" % i
		if u >= shot.cue_times[i] and not _fired.has(key):
			_fired.append(key)
			cue.emit(shot.cue_names[i])
	_shake = maxf(0.0, _shake - step * 2.4)
	for i: int in _birds.size():
		var bird: Vector4 = _birds[i]
		bird.x += bird.z * step
		bird.y += sin(_view.time * 0.7 + bird.w * 6.0) * 1.5 * step
		if bird.x > PICTURE.x + 12.0:
			bird.x = -12.0
		elif bird.x < -12.0:
			bird.x = PICTURE.x + 12.0
		_birds[i] = bird
	_flock.queue_redraw()
	var phase: float = _phase(_view.time)
	for i: int in _labels.size():
		var label: Label = _labels[i]
		var at: Vector2 = _screen_point(shot.map_points[i])
		label.position = (at - label.size * 0.5).round()
		var appear: float = shot.map_phases[i]
		label.modulate.a = clampf((phase - appear) / 0.12, 0.0, 1.0)


## A point of the painting on the picture, as the camera now frames it.
func _screen_point(point: Vector2) -> Vector2:
	var camera: Rect2 = _view.shot.camera_at(clampf(_view.time / _view.length, 0.0, 1.0))
	return (point - camera.position) / camera.size * PICTURE


func _configure_life(shot: CinematicShot) -> void:
	# Embers rise from the fires below, ash falls, snow blows across, motes hang in the light.
	_set_particles(_embers, shot.embers, Vector2(320.0, PICTURE.y + 8.0), Vector2(330.0, 6.0), Vector2(0.15, -1.0),
		20.0, Vector2(6.0, -4.0), Vector2(14.0, 32.0), 6.5, Color(1.0, 0.78, 0.46, 0.95))
	_set_particles(_ash, shot.ash, Vector2(320.0, -8.0), Vector2(340.0, 6.0), Vector2(0.3, 1.0), 25.0,
		Vector2(3.0, 6.0), Vector2(8.0, 18.0), 11.0, Color(0.78, 0.74, 0.7, 0.75))
	_set_particles(_snow, shot.snow, Vector2(300.0, PICTURE.y * 0.5), Vector2(360.0, PICTURE.y * 0.55),
		Vector2(1.0, 0.35), 14.0, Vector2(6.0, 8.0), Vector2(40.0, 80.0), 4.5, Color(0.93, 0.95, 1.0, 0.9))
	_set_particles(_motes, shot.motes, Vector2(320.0, PICTURE.y * 0.5), Vector2(330.0, PICTURE.y * 0.48),
		Vector2(0.0, -1.0), 180.0, Vector2(0.0, -1.0), Vector2(1.5, 5.0), 7.0, Color(1.0, 0.86, 0.6, 0.55))
	_birds.clear()
	for i: int in shot.birds:
		var direction: float = 1.0 if i % 3 != 2 else -1.0
		_birds.append(Vector4(randf_range(0.0, PICTURE.x), randf_range(14.0, PICTURE.y * 0.42),
			direction * randf_range(9.0, 17.0), randf()))
	_shake = 0.0


func _set_particles(particles: CPUParticles2D, amount: int, at: Vector2, extents: Vector2, direction: Vector2,
		spread: float, gravity: Vector2, speed: Vector2, lifetime: float, colour: Color) -> void:
	if amount <= 0:
		particles.emitting = false
		particles.visible = false
		return
	particles.visible = true
	particles.amount = amount
	particles.lifetime = lifetime
	particles.preprocess = lifetime
	particles.position = at
	particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	particles.emission_rect_extents = extents
	particles.direction = direction
	particles.spread = spread
	particles.gravity = gravity
	particles.initial_velocity_min = speed.x
	particles.initial_velocity_max = speed.y
	particles.color = colour
	particles.emitting = true
	particles.restart()


## Puts a layer of the picture in it, filling it. Laid out by its anchors once it is in the picture (which runs left
## to right): a control sized before it has a parent takes the direction of the language of the moment, and in a
## right-to-left one it would be laid a whole picture off to the left.
func _fill_picture(layer: Control) -> void:
	layer.layout_direction = Control.LAYOUT_DIRECTION_LTR
	_picture.add_child(layer)
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func _particles(texture: Texture2D) -> CPUParticles2D:
	var particles: CPUParticles2D = CPUParticles2D.new()
	particles.texture = texture
	particles.emitting = false
	var ramp: Gradient = Gradient.new()
	ramp.offsets = PackedFloat32Array([0.0, 0.12, 0.8, 1.0])
	ramp.colors = PackedColorArray([Color(1.0, 1.0, 1.0, 0.0), Color(1.0, 1.0, 1.0, 1.0), Color(1.0, 1.0, 1.0, 1.0),
		Color(1.0, 1.0, 1.0, 0.0)])
	particles.color_ramp = ramp
	_picture.add_child(particles)
	return particles


func _draw_birds() -> void:
	for bird: Vector4 in _birds:
		var at: Vector2 = Vector2(roundf(bird.x), roundf(bird.y))
		var up: bool = fmod(_view.time * 4.0 + bird.w, 1.0) < 0.5
		var tip: float = -2.0 if up else 1.0
		_flock.draw_line(at, at + Vector2(-3.0, tip), BIRD_COLOUR, 1.0)
		_flock.draw_line(at, at + Vector2(3.0, tip), BIRD_COLOUR, 1.0)


func _make_labels(shot: CinematicShot) -> void:
	for label: Label in _labels:
		label.queue_free()
	_labels.clear()
	var arabic: bool = TranslationServer.get_locale().begins_with("ar")
	for i: int in shot.map_labels.size():
		var label: Label = Label.new()
		label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
		var words: String = tr(shot.map_labels[i])
		label.text = _arabic_digits(words) if arabic else words
		label.add_theme_font_override(&"font", KeyText.FONT)
		label.add_theme_font_size_override(&"font_size", 12)
		var on_ink: bool = shot.map_phases[i] >= 1.0
		label.add_theme_color_override(&"font_color", MAP_PALE if on_ink else MAP_INK)
		label.modulate.a = 0.0
		_map_layer.add_child(label)
		label.reset_size()
		_labels.append(label)


static func _arabic_digits(words: String) -> String:
	var out: String = ""
	for character: String in words:
		var digit: int = "0123456789".find(character)
		out += ARABIC_DIGITS[digit] if digit >= 0 else character
	return out


func _words(font: Font, size: int, colour: Color) -> Label:
	var label: Label = Label.new()
	label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.add_theme_font_override(&"font", font)
	label.add_theme_font_size_override(&"font_size", size)
	label.add_theme_color_override(&"font_color", colour)
	label.modulate.a = 0.0
	add_child(label)
	return label


func _finish() -> void:
	playing = false
	visible = false
	for particles: CPUParticles2D in [_embers, _ash, _snow, _motes, _dust]:
		particles.emitting = false
	for label: Label in _labels:
		label.queue_free()
	_labels.clear()
	if _definition != null:
		mark_seen(_definition.id)
	ambience.emit(&"")
	finished.emit()
