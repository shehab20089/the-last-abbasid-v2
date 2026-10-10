class_name StoryCard
extends Control
## The story told between play: the chapter's opening, between levels and its ending. A card with a
## cinematic (`CinematicDefinition.find`, assets/cinematics/<id>) plays it (`cinematic`): paintings through a
## moving camera with the words in letterbox bars, confirm hurrying it on. A card without one is narration
## over black: each line fades in, holds, and fades out, confirm moving to the next. Holding Back (or pause) a
## moment skips either, the prompt and its filling bar shown; a cinematic seen before skips at one press.

signal finished(id: StringName)
## Sounds a cinematic asks for: a cue, and an ambience bed ("" for none).
signal cue(name: StringName)
signal ambience(bed: StringName)

const FADE: float = 0.7
const HOLD_PER_CHARACTER: float = 0.045
const MIN_HOLD: float = 2.4
## How long Back must be held to skip the card.
const SKIP_HOLD: float = 0.9

## The buttons' names for the device in use.
var glyphs: InputGlyphs
var cinematic: CinematicPlayer
var _skip_held: float = 0.0
var _skip_row: HBoxContainer
var _skip_caps: HBoxContainer
var _skip_words: Label
var _skip_bar: ColorRect
## A cinematic seen before: one press of Back skips it.
var _quick_skip: bool = false

var _lines: Array[String] = []
var _index: int = -1
var _id: StringName = &""
var _time: float = 0.0
var _hold: float = 0.0

@onready var black: ColorRect = $Black
@onready var text: Label = %Text
@onready var title: Label = %Title


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layout_direction = Control.LAYOUT_DIRECTION_LOCALE
	visible = false
	text.add_theme_font_override(&"font", KeyText.FONT)
	text.add_theme_font_size_override(&"font_size", 12)
	cinematic = CinematicPlayer.new()
	cinematic.name = "Cinematic"
	add_child(cinematic)
	cinematic.finished.connect(_on_cinematic_finished)
	cinematic.cue.connect(_on_cinematic_cue)
	cinematic.ambience.connect(_on_cinematic_ambience)
	# Hold to skip: the button, the words, and a bar that fills as it is held.
	_skip_row = HBoxContainer.new()
	_skip_row.add_theme_constant_override(&"separation", 4)
	_skip_row.anchor_left = 1.0
	_skip_row.anchor_right = 1.0
	_skip_row.anchor_top = 1.0
	_skip_row.anchor_bottom = 1.0
	_skip_row.alignment = BoxContainer.ALIGNMENT_END
	add_child(_skip_row)
	_skip_caps = HBoxContainer.new()
	_skip_caps.add_theme_constant_override(&"separation", 1)
	_skip_row.add_child(_skip_caps)
	_skip_words = Label.new()
	_skip_words.text = "CARD_HOLD_SKIP"
	_skip_words.add_theme_color_override(&"font_color", Color(0.6, 0.55, 0.48))
	_skip_row.add_child(_skip_words)
	_skip_bar = ColorRect.new()
	_skip_bar.color = Color(0.86, 0.68, 0.32)
	_skip_bar.anchor_left = 1.0
	_skip_bar.anchor_right = 1.0
	_skip_bar.anchor_top = 1.0
	_skip_bar.anchor_bottom = 1.0
	_skip_bar.offset_right = -10.0
	add_child(_skip_bar)
	_place_skip(false)


func play(id: StringName, lines: Array[String], heading: String = "") -> void:
	_id = id
	visible = true
	_skip_held = 0.0
	_fill_skip_caps()
	var definition: CinematicDefinition = CinematicDefinition.find(id)
	if definition != null:
		_lines = []
		_index = -1
		black.visible = false
		title.visible = false
		text.visible = false
		_quick_skip = CinematicPlayer.was_seen(id)
		_skip_words.text = "CARD_PRESS_SKIP" if _quick_skip else "CARD_HOLD_SKIP"
		_place_skip(true)
		cinematic.play(definition, heading)
		return
	_quick_skip = false
	_skip_words.text = "CARD_HOLD_SKIP"
	_place_skip(false)
	black.visible = true
	title.visible = true
	text.visible = true
	_lines = lines
	_index = -1
	title.text = tr(heading) if heading != "" else ""
	_next()


## Ends the card at once (Back does the same).
func skip() -> void:
	if not visible:
		return
	if cinematic.playing:
		cinematic.stop()
		return
	_index = _lines.size()
	_next()


## Whether the card is playing a cinematic.
func is_cinematic() -> bool:
	return cinematic.playing


func _next() -> void:
	_index += 1
	if _index >= _lines.size():
		_end()
		return
	text.text = tr(_lines[_index])
	_time = 0.0
	_hold = maxf(MIN_HOLD, text.text.length() * HOLD_PER_CHARACTER)
	text.modulate.a = 0.0


func _end() -> void:
	visible = false
	finished.emit(_id)


func _on_cinematic_finished() -> void:
	_end()


func _on_cinematic_cue(name: StringName) -> void:
	cue.emit(name)


func _on_cinematic_ambience(bed: StringName) -> void:
	ambience.emit(bed)


func _process(delta: float) -> void:
	if not visible:
		return
	_time += delta
	# Held long enough, Back skips the whole card.
	if not _quick_skip and (Input.is_action_pressed(&"ui_cancel") or Input.is_action_pressed(&"pause")):
		_skip_held += delta
		if _skip_held >= SKIP_HOLD:
			_skip_held = 0.0
			skip()
			return
	else:
		_skip_held = maxf(0.0, _skip_held - delta * 2.0)
	_skip_bar.offset_left = -10.0 - 140.0 * (_skip_held / SKIP_HOLD)
	_skip_bar.visible = _skip_held > 0.0
	if cinematic.playing:
		return
	var total: float = FADE * 2.0 + _hold
	if _time < FADE:
		text.modulate.a = _time / FADE
	elif _time < FADE + _hold:
		text.modulate.a = 1.0
	elif _time < total:
		text.modulate.a = 1.0 - (_time - FADE - _hold) / FADE
	else:
		_next()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event.is_action_pressed(&"ui_accept") or event.is_action_pressed(&"attack"):
		get_viewport().set_input_as_handled()
		if cinematic.playing:
			cinematic.hurry()
		elif _time < FADE + _hold:
			_time = FADE + _hold
		else:
			_next()
	elif event.is_action_pressed(&"ui_cancel") or event.is_action_pressed(&"pause"):
		# Held, not pressed: the card is skipped in _process once it has been held long enough. A cinematic
		# seen before goes at a press.
		get_viewport().set_input_as_handled()
		if _quick_skip:
			skip()


## The skip prompt at the foot of the screen, or in a cinematic's top bar (opposite its caption).
func _place_skip(in_top_bar: bool) -> void:
	if in_top_bar:
		_skip_row.anchor_top = 0.0
		_skip_row.anchor_bottom = 0.0
		_skip_row.offset_left = -170.0
		_skip_row.offset_right = -14.0
		_skip_row.offset_top = 15.0
		_skip_row.offset_bottom = 29.0
		_skip_bar.anchor_top = 0.0
		_skip_bar.anchor_bottom = 0.0
		_skip_bar.offset_top = 31.0
		_skip_bar.offset_bottom = 32.0
		_skip_row.modulate.a = 0.75
	else:
		_skip_row.anchor_top = 1.0
		_skip_row.anchor_bottom = 1.0
		_skip_row.offset_left = -150.0
		_skip_row.offset_right = -10.0
		_skip_row.offset_top = -24.0
		_skip_row.offset_bottom = -10.0
		_skip_bar.anchor_top = 1.0
		_skip_bar.anchor_bottom = 1.0
		_skip_bar.offset_top = -9.0
		_skip_bar.offset_bottom = -8.0
		_skip_row.modulate.a = 1.0


## The skip prompt's caps: the Back button on the device in use.
func _fill_skip_caps() -> void:
	for child: Node in _skip_caps.get_children():
		_skip_caps.remove_child(child)
		child.queue_free()
	if glyphs == null:
		return
	for cap: Array in glyphs.caps(&"ui_cancel"):
		var text: String = cap[0]
		var kind: KeyCaps.Kind = cap[1]
		_skip_caps.add_child(KeyCaps.make(text, kind))
