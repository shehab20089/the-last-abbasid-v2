class_name CodexScreen
extends MenuScreen
## The pause menu's Codex: every page rescued from the fires, to read again. On the left their titles; on the
## right the one in focus, its words, and for a leaf of the treatise on arms the move it teaches, performed.

const GOLD: Color = Color(1.0, 0.86, 0.5)
const INK: Color = Color(0.9, 0.85, 0.75)
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")
## A leaf of the treatise names its move after "furusiyya_"; where the move's name is another.
const TREATISE_MOVES: Dictionary[String, StringName] = {"roll": &"roll_cut"}

var glyphs: InputGlyphs
var _list: VBoxContainer
var _empty: Label
var _title: Label
var _body: Label
var _preview: MovePreview
var _how: KeyText


func _ready() -> void:
	back_action = &"codex_back"
	_build()
	super._ready()


## Shows the pages rescued (their ids, in the order found).
func open_with(pages: Array[StringName]) -> void:
	for child: Node in _list.get_children():
		_list.remove_child(child)
		child.queue_free()
	for id: StringName in pages:
		var button: Button = Button.new()
		button.text = "MANUSCRIPT_%s_TITLE" % String(id).to_upper()
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.clip_text = true
		button.custom_minimum_size = Vector2(196, 0)
		button.set_meta(&"page", id)
		button.focus_entered.connect(_read.bind(button))
		button.focus_entered.connect(_on_focus)
		button.mouse_entered.connect(button.grab_focus)
		_list.add_child(button)
	_empty.visible = pages.is_empty()
	_title.text = ""
	_body.text = ""
	_preview.show_demo({})
	_how.show_text("")
	open()


func focus_first() -> void:
	if _list.get_child_count() > 0:
		(_list.get_child(0) as Button).grab_focus()


func _read(button: Button) -> void:
	var id: StringName = button.get_meta(&"page")
	var key: String = "MANUSCRIPT_%s" % String(id).to_upper()
	_title.text = tr(key + "_TITLE")
	_body.text = tr(key + "_TEXT")
	var move: StringName = &""
	if String(id).begins_with("furusiyya_"):
		var name: String = String(id).trim_prefix("furusiyya_")
		move = TREATISE_MOVES.get(name, StringName(name))
	_preview.glyphs = glyphs
	_preview.show_demo(MoveDemos.of(move) if move != &"" else {})
	_how.glyphs = glyphs
	_how.show_text(tr("HINT_LEARNED_%s" % String(move).to_upper()) if move != &"" else "")


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
	heading.text = "MENU_CODEX"
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
	_title = Label.new()
	_title.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title.custom_minimum_size = Vector2(344, 0)
	_title.add_theme_font_override(&"font", KeyText.FONT)
	_title.add_theme_font_size_override(&"font_size", 12)
	_title.add_theme_color_override(&"font_color", GOLD)
	detail.add_child(_title)
	_body = Label.new()
	_body.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body.custom_minimum_size = Vector2(344, 0)
	_body.add_theme_color_override(&"font_color", INK)
	detail.add_child(_body)
	_preview = MovePreview.new()
	_preview.stage_height = 100.0
	detail.add_child(_preview)
	_how = KeyText.new()
	_how.custom_minimum_size = Vector2(344, 0)
	detail.add_child(_how)
	_empty = Label.new()
	_empty.text = "CODEX_EMPTY"
	_empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_empty.custom_minimum_size = Vector2(344, 0)
	detail.add_child(_empty)
