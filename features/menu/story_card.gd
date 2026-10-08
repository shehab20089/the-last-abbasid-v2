class_name StoryCard
extends Control
## Full-screen narration over black: each line fades in, holds, and fades out. Confirm skips to the
## next line; Back skips the whole card. Used for the chapter's opening, between levels and for its
## ending.

signal finished(id: StringName)

const FADE: float = 0.7
const HOLD_PER_CHARACTER: float = 0.045
const MIN_HOLD: float = 2.4

var _lines: Array[String] = []
var _index: int = -1
var _id: StringName = &""
var _time: float = 0.0
var _hold: float = 0.0

@onready var text: Label = %Text
@onready var title: Label = %Title


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layout_direction = Control.LAYOUT_DIRECTION_LOCALE
	visible = false


func play(id: StringName, lines: Array[String], heading: String = "") -> void:
	_id = id
	_lines = lines
	_index = -1
	visible = true
	title.text = tr(heading) if heading != "" else ""
	_next()


## Ends the card at once (Back does the same).
func skip() -> void:
	if visible:
		_index = _lines.size()
		_next()


func _next() -> void:
	_index += 1
	if _index >= _lines.size():
		visible = false
		finished.emit(_id)
		return
	text.text = tr(_lines[_index])
	_time = 0.0
	_hold = maxf(MIN_HOLD, text.text.length() * HOLD_PER_CHARACTER)
	text.modulate.a = 0.0


func _process(delta: float) -> void:
	if not visible:
		return
	_time += delta
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
		if _time < FADE + _hold:
			_time = FADE + _hold
		else:
			_next()
	elif event.is_action_pressed(&"ui_cancel"):
		get_viewport().set_input_as_handled()
		_index = _lines.size()
		_next()
