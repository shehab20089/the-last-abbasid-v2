class_name NoticeStack
extends Control
## Short news at the top left of the screen, under the hero's panel and the counters it speaks of: Honour earned,
## a page found, a technique bought, a keepsake given. Up to three at once, the newest lowest, each long enough to read, sliding in from the edge
## and fading out; more wait their turn, none is overwritten. The clocks stop, and the stack hides, while the
## game waits on a menu or a conversation.

const MARGIN: float = 8.0
const GAP: float = 3.0
const MAX_SHOWN: int = 3
const MAX_WIDTH: float = 146.0
## How long a notice stays: a base and a second for every 16 characters, within these bounds (real seconds).
const BASE_TIME: float = 1.6
const PER_CHARACTER: float = 1.0 / 16.0
const MIN_TIME: float = 2.6
const MAX_TIME: float = 7.0
const SLIDE: float = 16.0
const INK: Color = Color(1.0, 0.9, 0.66)

## Where the stack begins (the HUD keeps it under the hero's panel).
var top: float = 44.0
var _waiting: Array[String] = []
## Each shown: {"panel": PanelContainer, "left": float, "alpha": float, "y": float}.
var _rows: Array[Dictionary] = []
var _plate: StyleBoxFlat


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_plate = StyleBoxFlat.new()
	_plate.anti_aliasing = false
	_plate.bg_color = Color(0.04, 0.03, 0.03, 0.84)
	_plate.border_color = Color(0.85, 0.66, 0.34)
	_plate.border_width_left = 2
	_plate.content_margin_left = 6.0
	_plate.content_margin_right = 6.0
	_plate.content_margin_top = 2.0
	_plate.content_margin_bottom = 3.0


## A line of news (already translated): shown when there is room, for long enough to read.
func notice(text: String) -> void:
	if text == "":
		return
	_waiting.append(text)


## Forgets every notice (a level left).
func clear() -> void:
	_waiting.clear()
	for row: Dictionary in _rows:
		var panel: PanelContainer = row["panel"]
		panel.queue_free()
	_rows.clear()


## What is shown and what waits, in order (for checks).
func texts() -> PackedStringArray:
	var out: PackedStringArray = PackedStringArray()
	for row: Dictionary in _rows:
		var panel: PanelContainer = row["panel"]
		out.append((panel.get_child(0) as Label).text)
	out.append_array(PackedStringArray(_waiting))
	return out


func _process(delta: float) -> void:
	var waiting: bool = get_tree().paused
	visible = not waiting
	if waiting:
		return
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	while not _waiting.is_empty() and _rows.size() < MAX_SHOWN:
		var next: String = _waiting.pop_front()
		_add(next)
	var screen: Vector2 = get_viewport_rect().size
	# Right to left (Arabic) the hero's panel, and the news under it, are at the right.
	var rtl: bool = is_layout_rtl()
	_plate.border_width_left = 0 if rtl else 2
	_plate.border_width_right = 2 if rtl else 0
	var y: float = top
	for i: int in range(_rows.size() - 1, -1, -1):
		var row: Dictionary = _rows[i]
		var left: float = row["left"]
		var alpha: float = row["alpha"]
		left -= real
		alpha = clampf(alpha + real * (5.0 if left > 0.0 else -3.0), 0.0, 1.0)
		row["left"] = left
		row["alpha"] = alpha
		if left <= 0.0 and alpha <= 0.0:
			var gone: PanelContainer = row["panel"]
			gone.queue_free()
			_rows.remove_at(i)
	for row: Dictionary in _rows:
		var panel: PanelContainer = row["panel"]
		var alpha: float = row["alpha"]
		var at: float = row["y"]
		at = y if at < 0.0 else lerpf(at, y, minf(1.0, real * 12.0))
		row["y"] = at
		panel.reset_size()
		panel.modulate.a = alpha
		var x: float = screen.x - MARGIN - panel.size.x + SLIDE * (1.0 - alpha) if rtl else MARGIN - SLIDE * (1.0 - alpha)
		panel.position = Vector2(roundf(x), roundf(at))
		y += panel.size.y + GAP


func _add(text: String) -> void:
	var panel: PanelContainer = PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override(&"panel", _plate)
	var label: Label = Label.new()
	label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	label.text = text
	label.add_theme_font_override(&"font", KeyText.FONT)
	label.add_theme_font_size_override(&"font_size", 12)
	label.add_theme_color_override(&"font_color", INK)
	var width: float = KeyText.FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
	if width > MAX_WIDTH:
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.custom_minimum_size = Vector2(MAX_WIDTH, 0.0)
	panel.add_child(label)
	add_child(panel)
	panel.modulate.a = 0.0
	var time: float = clampf(BASE_TIME + text.length() * PER_CHARACTER, MIN_TIME, MAX_TIME)
	_rows.append({"panel": panel, "left": time, "alpha": 0.0, "y": -1.0})
