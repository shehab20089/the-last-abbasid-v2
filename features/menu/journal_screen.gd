class_name JournalScreen
extends MenuScreen
## The pause menu's Journal: what to do now (the objective); this street, and what is to be found in it (lamps
## lit, pages rescued, guardsmen's tokens, captives saved, each of how many); the people met here and how they
## stand; and the chapter's streets, behind, here and ahead. The session gathers it (`open_with`).

const GOLD: Color = Color(1.0, 0.86, 0.5)
const HEADING: Color = Color(0.86, 0.68, 0.38)
const INK: Color = Color(0.92, 0.88, 0.8)
const DIM: Color = Color(0.55, 0.5, 0.45)
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")

var _left: VBoxContainer
var _right: VBoxContainer


func _ready() -> void:
	back_action = &"journal_back"
	_build()
	super._ready()


## Shows the journal: {"objective": text, "street": name, "counts": [[label key, found, of], ...],
## "people": [[name, state key, news], ...], "chapter": [[name, "done" | "here" | "ahead"], ...]} (texts translated).
func open_with(journal: Dictionary) -> void:
	for column: VBoxContainer in [_left, _right]:
		for child: Node in column.get_children():
			column.remove_child(child)
			child.queue_free()
	_heading(_left, "JOURNAL_NOW")
	var objective: String = journal.get("objective", "")
	_line(_left, objective, GOLD, true)
	_gap(_left)
	var street: String = journal.get("street", "")
	_heading(_left, street, false)
	var counts: Array = journal.get("counts", [])
	for entry: Variant in counts:
		var count: Array = entry
		var key: String = count[0]
		var found: int = count[1]
		var of: int = count[2]
		if of <= 0:
			continue
		var row: HBoxContainer = HBoxContainer.new()
		_left.add_child(row)
		var label: Label = _line(row, tr(key), INK, false)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_line(row, "%d / %d" % [found, of], GOLD if found >= of else INK, false)
	_gap(_left)
	_heading(_left, "JOURNAL_CHAPTER")
	var chapter: Array = journal.get("chapter", [])
	for entry: Variant in chapter:
		var place: Array = entry
		var name: String = place[0]
		var state: String = place[1]
		var mark: String = {"done": "JOURNAL_DONE", "here": "JOURNAL_HERE", "ahead": "JOURNAL_AHEAD"}.get(state, "")
		var row: HBoxContainer = HBoxContainer.new()
		_left.add_child(row)
		var label: Label = _line(row, name, GOLD if state == "here" else (INK if state == "done" else DIM), false)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_line(row, tr(mark), DIM, false)
	_heading(_right, "JOURNAL_PEOPLE")
	var people: Array = journal.get("people", [])
	if people.is_empty():
		_line(_right, tr("JOURNAL_NO_ONE"), DIM, true)
	for entry: Variant in people:
		var person: Array = entry
		var name: String = person[0]
		var state: String = person[1]
		_line(_right, name, GOLD, false)
		_line(_right, tr(state), INK if state == "JOURNAL_HAS_NEWS" else DIM, true)
		_gap(_right)
	open()


func focus_first() -> void:
	pass


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
	page.add_theme_constant_override(&"separation", 6)
	panel.add_child(page)
	var heading: Label = Label.new()
	heading.text = "MENU_JOURNAL"
	heading.add_theme_font_override(&"font", TITLE_FONT)
	heading.add_theme_font_size_override(&"font_size", 18)
	heading.add_theme_color_override(&"font_color", Color(0.95, 0.86, 0.62))
	page.add_child(heading)
	var body: HBoxContainer = HBoxContainer.new()
	body.add_theme_constant_override(&"separation", 18)
	page.add_child(body)
	_left = VBoxContainer.new()
	_left.custom_minimum_size = Vector2(280, 0)
	_left.add_theme_constant_override(&"separation", 2)
	body.add_child(_left)
	_right = VBoxContainer.new()
	_right.custom_minimum_size = Vector2(250, 0)
	_right.add_theme_constant_override(&"separation", 1)
	body.add_child(_right)


func _heading(column: Control, key: String, translate: bool = true) -> void:
	var label: Label = Label.new()
	label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	label.text = tr(key) if translate else key
	label.add_theme_color_override(&"font_color", HEADING)
	column.add_child(label)


func _line(parent: Control, text: String, color: Color, wrap: bool) -> Label:
	var label: Label = Label.new()
	label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	label.text = text
	label.add_theme_font_override(&"font", KeyText.FONT)
	label.add_theme_font_size_override(&"font_size", 12)
	label.add_theme_color_override(&"font_color", color)
	if wrap:
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.custom_minimum_size = Vector2(250, 0)
	parent.add_child(label)
	return label


func _gap(column: Control) -> void:
	var gap: Control = Control.new()
	gap.custom_minimum_size = Vector2(0, 4)
	column.add_child(gap)
