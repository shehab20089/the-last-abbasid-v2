class_name DialogueBox
extends CanvasLayer
## Shows a conversation line by line at the foot of the screen: the speaker's name in brass and
## the line typed out. Confirm (or attack, or interact) finishes the line, then moves on; after the
## last line `finished` is emitted. Works while the game is paused.

signal finished(dialogue: StringName)
signal line_shown(index: int)

const CHARACTERS_PER_SECOND: float = 46.0

var _lines: Array[PackedStringArray] = []
var _index: int = -1
var _id: StringName = &""
var _typed: float = 0.0
var _blink: float = 0.0

@onready var root: Control = $Root
@onready var speaker: Label = %Speaker
@onready var text: Label = %Text
@onready var more: Label = %More


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	root.visible = false


func is_open() -> bool:
	return root.visible


## Plays lines of [speaker key, text key]; an empty speaker key is narration.
func play(id: StringName, lines: Array[PackedStringArray]) -> void:
	_id = id
	_lines = lines
	_index = -1
	root.visible = true
	_next()


func advance() -> void:
	if not is_open():
		return
	if text.visible_ratio < 1.0:
		text.visible_ratio = 1.0
		return
	_next()


func close() -> void:
	root.visible = false
	_lines = []


func _next() -> void:
	_index += 1
	if _index >= _lines.size():
		root.visible = false
		finished.emit(_id)
		return
	var line: PackedStringArray = _lines[_index]
	speaker.text = tr(line[0]) if line[0] != "" else ""
	speaker.visible = line[0] != ""
	text.text = tr(line[1])
	text.visible_characters = 0
	_typed = 0.0
	line_shown.emit(_index)


func _process(delta: float) -> void:
	if not is_open():
		return
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	var total: int = text.get_total_character_count()
	if text.visible_characters >= 0 and text.visible_characters < total:
		_typed += real * CHARACTERS_PER_SECOND
		text.visible_characters = mini(total, int(_typed))
		if text.visible_characters >= total:
			text.visible_characters = -1
	_blink += real
	more.visible = text.visible_ratio >= 1.0 and int(_blink * 2.5) % 2 == 0


func _unhandled_input(event: InputEvent) -> void:
	if not is_open():
		return
	if (event.is_action_pressed(&"ui_accept") or event.is_action_pressed(&"attack")
			or event.is_action_pressed(&"interact")):
		get_viewport().set_input_as_handled()
		advance()
