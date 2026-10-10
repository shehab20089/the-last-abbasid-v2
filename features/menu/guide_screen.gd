class_name GuideScreen
extends MenuScreen
## The pause menu's Guide: every lesson met so far, kept to read again, by chapter (moving, fighting, the
## warnings, breath, techniques, Arts, lamps and Honour, people). On the left the lessons; on the right the one
## in focus: its title, the move performed on a small stage where there is one, and its words with the buttons
## drawn as keys (for the device in use).

const GOLD: Color = Color(1.0, 0.86, 0.5)
const CHAPTER_COLOR: Color = Color(0.86, 0.68, 0.38)
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")

var glyphs: InputGlyphs
var _list: VBoxContainer
var _empty: Label
var _detail_name: Label
var _preview: MovePreview
var _text: KeyText


func _ready() -> void:
	back_action = &"guide_back"
	_build()
	super._ready()


## Shows the lessons met (their text keys, in the order met).
func open_with(lessons: Array[StringName]) -> void:
	for child: Node in _list.get_children():
		_list.remove_child(child)
		child.queue_free()
	var by_chapter: Dictionary[int, Array] = {}
	for key: StringName in lessons:
		var chapter: int = Lessons.chapter_of(String(key))
		if not by_chapter.has(chapter):
			by_chapter[chapter] = []
		var keys: Array = by_chapter[chapter]
		if not keys.has(String(key)):
			keys.append(String(key))
	for chapter: int in Lessons.CHAPTER_KEYS.size():
		if not by_chapter.has(chapter):
			continue
		var heading: Label = Label.new()
		heading.text = Lessons.CHAPTER_KEYS[chapter]
		heading.add_theme_color_override(&"font_color", CHAPTER_COLOR)
		_list.add_child(heading)
		var keys: Array = by_chapter[chapter]
		for entry: Variant in keys:
			var key: String = entry
			var button: Button = Button.new()
			var title: String = Lessons.title_of(key)
			button.text = title if title != "" else key
			button.alignment = HORIZONTAL_ALIGNMENT_LEFT
			button.clip_text = true
			button.custom_minimum_size = Vector2(196, 0)
			button.set_meta(&"lesson", key)
			button.focus_entered.connect(_describe.bind(button))
			button.mouse_entered.connect(button.grab_focus)
			button.focus_entered.connect(_on_focus)
			_list.add_child(button)
	_empty.visible = lessons.is_empty()
	_detail_name.text = ""
	_text.show_text("")
	_preview.show_demo({})
	open()


func focus_first() -> void:
	for child: Node in _list.get_children():
		var button: Button = child as Button
		if button != null:
			button.grab_focus()
			return


func _describe(button: Button) -> void:
	var key: String = button.get_meta(&"lesson")
	var title: String = Lessons.title_of(key)
	_detail_name.text = tr(title) if title != "" else ""
	_text.glyphs = glyphs
	_text.show_key(key)
	_preview.glyphs = glyphs
	_preview.show_demo(MoveDemos.of(Lessons.demo_of(key)))


func _build() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var shade: ColorRect = ColorRect.new()
	shade.color = Color(0.02, 0.015, 0.03, 0.82)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	var panel: PanelContainer = PanelContainer.new()
	TechniquesScreen._place(panel, Rect2(30, 14, 580, 332))
	add_child(panel)
	var page: VBoxContainer = VBoxContainer.new()
	page.add_theme_constant_override(&"separation", 5)
	panel.add_child(page)
	var heading: Label = Label.new()
	heading.text = "MENU_GUIDE"
	heading.add_theme_font_override(&"font", TITLE_FONT)
	heading.add_theme_font_size_override(&"font_size", 18)
	heading.add_theme_color_override(&"font_color", Color(0.95, 0.86, 0.62))
	page.add_child(heading)
	var body: HBoxContainer = HBoxContainer.new()
	body.add_theme_constant_override(&"separation", 8)
	page.add_child(body)
	var scroll: ScrollContainer = ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(206, 286)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	body.add_child(scroll)
	_list = VBoxContainer.new()
	_list.add_theme_constant_override(&"separation", 1)
	scroll.add_child(_list)
	var detail: VBoxContainer = VBoxContainer.new()
	detail.add_theme_constant_override(&"separation", 4)
	detail.custom_minimum_size = Vector2(344, 0)
	body.add_child(detail)
	_detail_name = Label.new()
	_detail_name.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_detail_name.add_theme_font_override(&"font", KeyText.FONT)
	_detail_name.add_theme_font_size_override(&"font_size", 12)
	_detail_name.add_theme_color_override(&"font_color", GOLD)
	detail.add_child(_detail_name)
	_preview = MovePreview.new()
	_preview.stage_height = 132.0
	detail.add_child(_preview)
	_text = KeyText.new()
	_text.custom_minimum_size = Vector2(344, 0)
	detail.add_child(_text)
	_empty = Label.new()
	_empty.text = "GUIDE_EMPTY"
	_empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_empty.custom_minimum_size = Vector2(344, 0)
	detail.add_child(_empty)
