class_name LessonScreen
extends MenuScreen
## A lesson that stops the game, in the middle of the screen: a new technique (Yusuf performs it on a small
## stage while its buttons light in order), the first lamp, the first warning of each colour (its sign beside
## the heading). A small gold heading, the title, the move or a picture, two or three lines of how and when,
## and the way on. Interact, attack or confirm closes it, after a breath (the press that brought it does not).

## Seconds before a press closes it.
const SETTLE: float = 0.45
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")
const EFFECTS: SpriteFrames = preload("res://assets/effects/effect_frames.tres")
const HEADING_COLOR: Color = Color(1.0, 0.8, 0.42)
const TITLE_COLOR: Color = Color(0.97, 0.9, 0.72)
const WIDTH: float = 392.0

## The buttons' names for the device in use.
var glyphs: InputGlyphs:
	set(value):
		glyphs = value
		if _text != null:
			_text.glyphs = value
			_preview.glyphs = value
## What the lesson was (its text's key), for the Guide.
var lesson: String = ""
var _settle: float = 0.0
var _panel: PanelContainer
var _heading: Label
var _title: Label
var _sign: AnimatedSprite2D
var _sign_holder: Control
var _preview: MovePreview
var _picture: TextureRect
var _text: KeyText
var _go_on: Button
var _go_caps: HBoxContainer


func _ready() -> void:
	back_action = &"lesson_done"
	_build()
	super._ready()


## Shows a lesson: `heading` and `title` (translated), the text's key (with {action} tokens), a move to perform
## (a MoveDemos demo, or empty), a picture (or null), and a warning's sign (an effect's animation and colour).
func show_lesson(heading: String, title: String, text_key: String, demo: Dictionary = {},
		picture: Texture2D = null, sign: StringName = &"", sign_color: Color = Color.WHITE) -> void:
	lesson = text_key
	_heading.text = heading
	_title.text = title
	_text.glyphs = glyphs
	_text.show_key(text_key)
	_preview.glyphs = glyphs
	_preview.visible = not demo.is_empty()
	if not demo.is_empty():
		_preview.show_demo(demo)
	_picture.texture = picture
	_picture.visible = picture != null
	_sign_holder.visible = sign != &""
	if sign != &"":
		_sign.modulate = sign_color
		_sign.play(sign)
	_refresh_go_on()
	_settle = SETTLE
	open()
	_panel.reset_size()
	call_deferred(&"_centre")


## The way on takes the focus only once the card has settled (a press already on its way does not close it).
func focus_first() -> void:
	pass


func _process(delta: float) -> void:
	if not visible:
		return
	# Its words wrap only once laid out: it is fitted to them and kept in the middle every frame.
	_centre()
	if _settle > 0.0:
		_settle -= delta / maxf(Engine.time_scale, 0.001)
		if _settle <= 0.0:
			_go_on.grab_focus()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if (event.is_action_pressed(&"interact") or event.is_action_pressed(&"attack")
			or event.is_action_pressed(&"ui_accept") or event.is_action_pressed(&"ui_cancel")):
		get_viewport().set_input_as_handled()
		if _settle <= 0.0:
			chosen.emit(&"lesson_done")


func _build() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var shade: ColorRect = ColorRect.new()
	shade.color = Color(0.02, 0.015, 0.03, 0.66)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(WIDTH, 0.0)
	add_child(_panel)
	var list: VBoxContainer = VBoxContainer.new()
	list.add_theme_constant_override(&"separation", 4)
	_panel.add_child(list)
	# The heading, with a warning's sign beside it.
	var top: HBoxContainer = HBoxContainer.new()
	top.alignment = BoxContainer.ALIGNMENT_CENTER
	top.add_theme_constant_override(&"separation", 6)
	list.add_child(top)
	_sign_holder = Control.new()
	_sign_holder.custom_minimum_size = Vector2(22, 16)
	top.add_child(_sign_holder)
	_sign = AnimatedSprite2D.new()
	_sign.sprite_frames = EFFECTS
	_sign.position = Vector2(9, 7)
	_sign.scale = Vector2(2.0, 2.0)
	_sign_holder.add_child(_sign)
	_heading = _label(KeyText.FONT, 12, HEADING_COLOR)
	top.add_child(_heading)
	_title = _label(TITLE_FONT, 18, TITLE_COLOR)
	list.add_child(_title)
	_preview = MovePreview.new()
	_preview.stage_height = 104.0
	list.add_child(_preview)
	_picture = TextureRect.new()
	_picture.stretch_mode = TextureRect.STRETCH_KEEP_CENTERED
	_picture.custom_minimum_size = Vector2(0, 76)
	list.add_child(_picture)
	_text = KeyText.new()
	_text.centred = true
	_text.custom_minimum_size = Vector2(WIDTH - 24.0, 0.0)
	list.add_child(_text)
	# The way on: the button, and the keys that press it.
	var below: HBoxContainer = HBoxContainer.new()
	below.alignment = BoxContainer.ALIGNMENT_CENTER
	below.add_theme_constant_override(&"separation", 4)
	list.add_child(below)
	_go_caps = HBoxContainer.new()
	_go_caps.add_theme_constant_override(&"separation", 2)
	below.add_child(_go_caps)
	_go_on = Button.new()
	_go_on.text = "LESSON_CONTINUE"
	_go_on.set_meta(&"action", &"lesson_done")
	below.add_child(_go_on)


func _refresh_go_on() -> void:
	for child: Node in _go_caps.get_children():
		child.queue_free()
	if glyphs == null:
		return
	for cap: Array in glyphs.caps(&"interact"):
		var text: String = cap[0]
		var kind: KeyCaps.Kind = cap[1]
		_go_caps.add_child(KeyCaps.make(text, kind))


func _centre() -> void:
	var screen: Vector2 = get_viewport_rect().size
	_panel.reset_size()
	_panel.position = ((screen - _panel.size) * 0.5).round()


func _label(font: Font, size: int, color: Color) -> Label:
	var label: Label = Label.new()
	label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_override(&"font", font)
	label.add_theme_font_size_override(&"font_size", size)
	label.add_theme_color_override(&"font_color", color)
	return label
