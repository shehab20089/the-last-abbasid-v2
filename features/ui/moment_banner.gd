class_name MomentBanner
extends Control
## The moments that change what the player does next, across the upper middle of the screen on a band of
## shade: a new objective and its words, a lamp lit and what it did. A small gold heading, the title in the
## title face, a line under it. One at a time (more wait, none is lost); they wait too while the name of a
## place is shown; their clocks stop, and the banner hides, while the game waits on a menu or a conversation.

const CENTRE: float = 150.0
const HOLD: float = 3.4
const PER_CHARACTER: float = 1.0 / 16.0
const MAX_HOLD: float = 6.0
const HEADING_COLOR: Color = Color(1.0, 0.8, 0.42)
const TITLE_COLOR: Color = Color(0.97, 0.9, 0.72)
const LINE_COLOR: Color = Color(0.9, 0.86, 0.78)
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")

## Set by the HUD while the name of a place is shown (the banner waits).
var held: bool = false
## Each waiting: [heading, title, line] (translated).
var _waiting: Array[PackedStringArray] = []
var _left: float = 0.0
var _alpha: float = 0.0
var _showing: bool = false
var _heading: Label
var _title: Label
var _line: Label


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_heading = _label(KeyText.FONT, 12, HEADING_COLOR)
	_title = _label(TITLE_FONT, 18, TITLE_COLOR)
	_line = _label(KeyText.FONT, 12, LINE_COLOR)
	for label: Label in [_heading, _title, _line]:
		add_child(label)
	_layout()
	visible = false


## A moment: a heading over its title, and a line under (all translated; the heading and line may be empty).
func show_moment(heading: String, title: String, line: String = "") -> void:
	_waiting.append(PackedStringArray([heading, title, line]))


func clear() -> void:
	_waiting.clear()
	_showing = false
	_alpha = 0.0
	visible = false


## The title shown now, or empty.
func current() -> String:
	return _title.text if _showing else ""


## Every moment shown and waiting, as titles (for checks).
func titles() -> PackedStringArray:
	var out: PackedStringArray = PackedStringArray()
	if _showing:
		out.append(_title.text)
	for moment: PackedStringArray in _waiting:
		out.append(moment[1])
	return out


func _process(delta: float) -> void:
	if get_tree().paused:
		visible = false
		return
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	if not _showing and not _waiting.is_empty() and not held:
		_begin(_waiting[0])
		_waiting.remove_at(0)
	if _showing:
		_left -= real
		_alpha = clampf(_alpha + real * (4.0 if _left > 0.0 else -2.0), 0.0, 1.0)
		if _left <= 0.0 and _alpha <= 0.0:
			_showing = false
	visible = _showing
	modulate.a = _alpha
	queue_redraw()


func _draw() -> void:
	if not _showing:
		return
	# A band of shade behind the words, soft at its top and bottom edges.
	var screen: Vector2 = get_viewport_rect().size
	var top: float = CENTRE - 30.0
	var height: float = 60.0
	for i: int in int(height):
		var t: float = absf(float(i) - height * 0.5) / (height * 0.5)
		var shade: float = 0.62 * (1.0 - t * t)
		draw_rect(Rect2(0.0, top + i, screen.x, 1.0), Color(0.02, 0.015, 0.02, shade))
	var rule: float = 90.0
	draw_rect(Rect2(roundf(screen.x * 0.5 - rule), CENTRE - 14.0, rule * 2.0, 1.0), Color(0.85, 0.62, 0.36, 0.55))


func _begin(moment: PackedStringArray) -> void:
	_heading.text = moment[0]
	_title.text = moment[1]
	_line.text = moment[2]
	_left = clampf(HOLD + (moment[1].length() + moment[2].length()) * PER_CHARACTER * 0.5, HOLD, MAX_HOLD)
	_alpha = 0.0
	_showing = true
	_layout()


func _layout() -> void:
	var width: float = 600.0
	var screen_width: float = 640.0
	if is_inside_tree():
		screen_width = get_viewport_rect().size.x
	# Size before place: right to left (Arabic) a control is mirrored by its size as it is placed.
	for label: Label in [_heading, _title, _line]:
		label.size = Vector2(width, 14.0 if label != _title else 22.0)
	_heading.position = Vector2(roundf((screen_width - width) * 0.5), CENTRE - 28.0)
	_title.position = Vector2(roundf((screen_width - width) * 0.5), CENTRE - 12.0)
	_line.position = Vector2(roundf((screen_width - width) * 0.5), CENTRE + 9.0)


func _label(font: Font, size: int, color: Color) -> Label:
	var label: Label = Label.new()
	label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.add_theme_font_override(&"font", font)
	label.add_theme_font_size_override(&"font_size", size)
	label.add_theme_color_override(&"font_color", color)
	label.add_theme_color_override(&"font_shadow_color", Color(0.04, 0.02, 0.02, 1.0))
	label.add_theme_constant_override(&"shadow_offset_x", 1)
	label.add_theme_constant_override(&"shadow_offset_y", 1)
	return label
