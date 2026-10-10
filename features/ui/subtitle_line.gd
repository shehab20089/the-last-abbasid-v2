class_name SubtitleLine
extends Control
## What is said in passing, outside a conversation (a cry, a word to himself, the Captain's challenge): a
## framed line low on the screen, under the street, the speaker's name in gold above the words. Each stays
## long enough to read; more wait their turn, none is overwritten. The clocks stop, and the line hides, while
## the game waits on a menu or a conversation.

const BOTTOM: float = 6.0
## How far it rises while the boss's bar has the foot of the screen.
const RAISED: float = 34.0
const WIDTH: float = 420.0
const BASE_TIME: float = 2.0
const PER_CHARACTER: float = 1.0 / 14.0
const MIN_TIME: float = 3.0
const MAX_TIME: float = 9.0
const NAME_COLOR: Color = Color(1.0, 0.84, 0.48)
const INK: Color = Color(0.95, 0.91, 0.82)

## Set by the HUD while the boss's bar is shown.
var raised: bool = false
## Each waiting line: [speaker, words] (translated).
var _waiting: Array[PackedStringArray] = []
var _left: float = 0.0
var _alpha: float = 0.0
var _showing: bool = false
var _panel: PanelContainer
var _speaker: Label
var _words: Label


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_panel = PanelContainer.new()
	_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var plate: StyleBoxFlat = StyleBoxFlat.new()
	plate.anti_aliasing = false
	plate.bg_color = Color(0.03, 0.025, 0.03, 0.82)
	plate.border_color = Color(0.55, 0.42, 0.24, 0.9)
	plate.border_width_top = 1
	plate.border_width_bottom = 1
	plate.content_margin_left = 8.0
	plate.content_margin_right = 8.0
	plate.content_margin_top = 2.0
	plate.content_margin_bottom = 3.0
	_panel.add_theme_stylebox_override(&"panel", plate)
	add_child(_panel)
	var list: VBoxContainer = VBoxContainer.new()
	list.add_theme_constant_override(&"separation", 0)
	_panel.add_child(list)
	_speaker = _label(NAME_COLOR)
	list.add_child(_speaker)
	_words = _label(INK)
	_words.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	list.add_child(_words)
	_panel.visible = false


## A line said in passing (both already translated; an empty speaker is narration).
func say(speaker: String, words: String) -> void:
	if words == "":
		return
	_waiting.append(PackedStringArray([speaker, words]))


func clear() -> void:
	_waiting.clear()
	_showing = false
	_alpha = 0.0
	_panel.visible = false


## The words shown now, or empty.
func current() -> String:
	return _words.text if _showing else ""


## Every line shown and waiting, "speaker: words" (for checks).
func lines() -> PackedStringArray:
	var out: PackedStringArray = PackedStringArray()
	if _showing:
		out.append("%s: %s" % [_speaker.text, _words.text])
	for line: PackedStringArray in _waiting:
		out.append("%s: %s" % [line[0], line[1]])
	return out


func _process(delta: float) -> void:
	if get_tree().paused:
		_panel.visible = false
		return
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	if not _showing and not _waiting.is_empty():
		_begin(_waiting[0])
		_waiting.remove_at(0)
	if _showing:
		_left -= real
		_alpha = clampf(_alpha + real * (6.0 if _left > 0.0 else -3.0), 0.0, 1.0)
		if _left <= 0.0 and _alpha <= 0.0:
			_showing = false
	_panel.visible = _showing
	_panel.modulate.a = _alpha
	if _showing:
		# Its words wrap only once laid out: the frame is fitted to them every frame.
		_panel.reset_size()
		var screen: Vector2 = get_viewport_rect().size
		var lift: float = RAISED if raised else 0.0
		_panel.position = Vector2(roundf((screen.x - _panel.size.x) * 0.5), roundf(screen.y - BOTTOM - lift - _panel.size.y))


func _begin(line: PackedStringArray) -> void:
	_speaker.text = line[0]
	_speaker.visible = line[0] != ""
	_words.text = line[1]
	var width: float = KeyText.FONT.get_string_size(line[1], HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
	_words.custom_minimum_size = Vector2(minf(WIDTH, width + 2.0), 0.0)
	_panel.reset_size()
	_left = clampf(BASE_TIME + line[1].length() * PER_CHARACTER, MIN_TIME, MAX_TIME)
	_alpha = 0.0
	_showing = true


func _label(color: Color) -> Label:
	var label: Label = Label.new()
	label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_override(&"font", KeyText.FONT)
	label.add_theme_font_size_override(&"font_size", 12)
	label.add_theme_color_override(&"font_color", color)
	return label
