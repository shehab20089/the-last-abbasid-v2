class_name LampMenu
extends MenuScreen
## Resting by a lamp: what the hero has earned and how he grows. Three pages: the technique tree (three
## branches of five, bought with Honour, unlearned for free), the keepsakes he owns (worn two at a time,
## three with the Shield's last node), and the two Arts he carries. A line below tells what the focused
## entry is and why it may not be had yet. It reads and changes a Progression; the session applies the
## result to the hero when he rises ("leave").

const PAGES: Array[StringName] = [&"tree", &"keepsakes", &"arts"]
const BRANCH_KEYS: Array[String] = ["BRANCH_BLADE", "BRANCH_SHIELD", "BRANCH_SHADOW"]
const BRANCH_COLOURS: Array[Color] = [Color(0.95, 0.78, 0.42), Color(0.75, 0.82, 0.88), Color(0.62, 0.66, 0.92)]
const GOLD: Color = Color(1.0, 0.86, 0.5)
const DIM: Color = Color(0.55, 0.5, 0.45)
const OPEN: Color = Color(0.92, 0.88, 0.78)
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")
const HONOUR_ICON: Texture2D = preload("res://assets/ui/icon_honour.png")
const EMPTY_ART: Texture2D = preload("res://assets/ui/art_none.png")
## A node's marks: learned, not yet open; and its price beside it while it can be had.
const TICK: Texture2D = preload("res://assets/ui/icon_tick.png")
const LOCK: Texture2D = preload("res://assets/ui/icon_lock.png")
const TOO_DEAR: Color = Color(0.72, 0.42, 0.36)

var progression: Progression
## The Arts he knows (the session sets them as the menu opens).
var known_arts: Array[ArtDefinition] = []
var page: StringName = &"tree"

var _honour_label: Label
var _tabs: Dictionary[StringName, Button] = {}
var _pages: Dictionary[StringName, Control] = {}
var _node_buttons: Dictionary[StringName, Button] = {}
var _keepsake_buttons: Dictionary[StringName, Button] = {}
var _art_buttons: Array[Button] = []
var _respec: Button
var _worn_label: Label
var _detail_name: Label
var _detail_text: Label
var _detail_state: Label
## The focused technique or Art, shown: Yusuf performs it while its buttons light up.
var _preview: MovePreview
## The buttons' names for the device in use.
var glyphs: InputGlyphs


func _ready() -> void:
	back_action = &"leave"
	_build()
	super._ready()


## Shows the menu over the game, on the technique tree.
func open_for(growth: Progression, arts: Array[ArtDefinition]) -> void:
	progression = growth
	known_arts = arts
	if not progression.changed.is_connected(_refresh):
		progression.changed.connect(_refresh)
	page = &"tree"
	open()


func opened() -> void:
	_show_page(page)


func focus_first() -> void:
	var first: Button = _first_button(page)
	if first != null:
		first.grab_focus()


# --- Building ---------------------------------------------------------------------------------------

func _build() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var shade: ColorRect = ColorRect.new()
	shade.color = Color(0.02, 0.015, 0.03, 0.8)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	var panel: PanelContainer = PanelContainer.new()
	_place(panel, Rect2(30, 10, 580, 340))
	add_child(panel)
	var list: VBoxContainer = VBoxContainer.new()
	list.add_theme_constant_override(&"separation", 5)
	panel.add_child(list)
	# The heading, and the Honour held.
	var head: HBoxContainer = HBoxContainer.new()
	list.add_child(head)
	var heading: Label = Label.new()
	heading.text = "MENU_LAMP"
	heading.add_theme_font_override(&"font", TITLE_FONT)
	heading.add_theme_font_size_override(&"font_size", 18)
	heading.add_theme_color_override(&"font_color", Color(0.95, 0.86, 0.62))
	head.add_child(heading)
	# What resting here did, and that he rises here if he falls.
	var rested: Label = Label.new()
	rested.text = "LAMP_RESTED"
	rested.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	rested.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rested.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	rested.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rested.add_theme_color_override(&"font_color", Color(0.86, 0.8, 0.66))
	head.add_child(rested)
	var coin: TextureRect = TextureRect.new()
	coin.texture = HONOUR_ICON
	coin.stretch_mode = TextureRect.STRETCH_KEEP_CENTERED
	head.add_child(coin)
	_honour_label = Label.new()
	_honour_label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_honour_label.add_theme_color_override(&"font_color", GOLD)
	head.add_child(_honour_label)
	# The pages' tabs, and the way out.
	var tabs: HBoxContainer = HBoxContainer.new()
	tabs.add_theme_constant_override(&"separation", 4)
	list.add_child(tabs)
	for id: StringName in PAGES:
		var tab: Button = Button.new()
		tab.text = "LAMP_%s" % String(id).to_upper()
		tab.pressed.connect(_show_page.bind(id))
		tab.focus_entered.connect(_on_tab_focus.bind(id))
		tabs.add_child(tab)
		_tabs[id] = tab
	var spacer: Control = Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tabs.add_child(spacer)
	var leave: Button = Button.new()
	leave.text = "LAMP_LEAVE"
	leave.set_meta(&"action", &"leave")
	tabs.add_child(leave)
	# The pages.
	var stack: Control = Control.new()
	stack.custom_minimum_size = Vector2(564, 146)
	list.add_child(stack)
	_pages[&"tree"] = _build_tree()
	_pages[&"keepsakes"] = _build_keepsakes()
	_pages[&"arts"] = _build_arts()
	for id: StringName in PAGES:
		stack.add_child(_pages[id])
	# What the focused entry is, and the move it teaches shown beside it.
	var below: HBoxContainer = HBoxContainer.new()
	below.add_theme_constant_override(&"separation", 8)
	list.add_child(below)
	var detail: VBoxContainer = VBoxContainer.new()
	detail.add_theme_constant_override(&"separation", 2)
	detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	below.add_child(detail)
	_detail_name = Label.new()
	_detail_name.add_theme_color_override(&"font_color", GOLD)
	detail.add_child(_detail_name)
	_detail_text = Label.new()
	_detail_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_detail_text.custom_minimum_size = Vector2(340, 24)
	detail.add_child(_detail_text)
	_detail_state = Label.new()
	_detail_state.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_detail_state.add_theme_color_override(&"font_color", Color(0.82, 0.7, 0.5))
	detail.add_child(_detail_state)
	_preview = MovePreview.new()
	_preview.stage_height = 98.0
	_preview.custom_minimum_size = Vector2(214, 0)
	below.add_child(_preview)


func _build_tree() -> Control:
	var page_box: VBoxContainer = VBoxContainer.new()
	page_box.set_anchors_preset(Control.PRESET_FULL_RECT)
	var columns: HBoxContainer = HBoxContainer.new()
	columns.add_theme_constant_override(&"separation", 6)
	page_box.add_child(columns)
	for branch: int in 3:
		var column: VBoxContainer = VBoxContainer.new()
		column.add_theme_constant_override(&"separation", 2)
		column.custom_minimum_size = Vector2(180, 0)
		columns.add_child(column)
		var title: Label = Label.new()
		title.text = BRANCH_KEYS[branch]
		title.add_theme_color_override(&"font_color", BRANCH_COLOURS[branch])
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		column.add_child(title)
		column.set_meta(&"branch", branch)
	_respec = Button.new()
	_respec.text = "LAMP_RESPEC"
	_respec.pressed.connect(_on_respec)
	_respec.focus_entered.connect(_on_respec_focus)
	_respec.size_flags_horizontal = Control.SIZE_SHRINK_END
	page_box.add_child(_respec)
	return page_box


func _build_keepsakes() -> Control:
	var page_box: VBoxContainer = VBoxContainer.new()
	page_box.set_anchors_preset(Control.PRESET_FULL_RECT)
	_worn_label = Label.new()
	_worn_label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_worn_label.add_theme_color_override(&"font_color", Color(0.82, 0.7, 0.5))
	page_box.add_child(_worn_label)
	var grid: GridContainer = GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override(&"h_separation", 6)
	grid.add_theme_constant_override(&"v_separation", 3)
	grid.name = "Grid"
	page_box.add_child(grid)
	return page_box


func _build_arts() -> Control:
	var page_box: VBoxContainer = VBoxContainer.new()
	page_box.set_anchors_preset(Control.PRESET_FULL_RECT)
	page_box.add_theme_constant_override(&"separation", 4)
	for slot: int in 2:
		var row: HBoxContainer = HBoxContainer.new()
		page_box.add_child(row)
		var label: Label = Label.new()
		label.text = "LAMP_ART_SLOT_%d" % (slot + 1)
		label.custom_minimum_size = Vector2(150, 0)
		row.add_child(label)
		var button: Button = Button.new()
		button.custom_minimum_size = Vector2(300, 0)
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
		button.pressed.connect(_on_art_slot.bind(slot))
		button.focus_entered.connect(_on_art_focus.bind(slot))
		button.gui_input.connect(_on_art_input.bind(slot))
		row.add_child(button)
		_art_buttons.append(button)
	var note: Label = Label.new()
	note.text = "LAMP_ART_NOTE"
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.custom_minimum_size = Vector2(540, 0)
	note.add_theme_color_override(&"font_color", DIM)
	page_box.add_child(note)
	return page_box


# --- Showing --------------------------------------------------------------------------------------

func _show_page(id: StringName) -> void:
	page = id
	for each: StringName in PAGES:
		_pages[each].visible = each == id
		_tabs[each].add_theme_color_override(&"font_color", GOLD if each == id else Color(0.78, 0.71, 0.58))
	_refresh()
	var first: Button = _first_button(id)
	if first != null and visible:
		first.grab_focus()


func _refresh() -> void:
	if progression == null:
		return
	_honour_label.text = "%d" % progression.honour()
	_refresh_tree()
	_refresh_keepsakes()
	_refresh_arts()
	var focused: Control = get_viewport().gui_get_focus_owner() if is_inside_tree() else null
	if focused is Button and is_ancestor_of(focused):
		_describe(focused as Button)


func _refresh_tree() -> void:
	var columns: HBoxContainer = _pages[&"tree"].get_child(0) as HBoxContainer
	for column_node: Node in columns.get_children():
		var column: VBoxContainer = column_node as VBoxContainer
		var branch: int = column.get_meta(&"branch")
		for each: TechniqueDefinition in progression.branch(branch):
			var button: Button = _node_buttons[each.id] if _node_buttons.has(each.id) else null
			if button == null:
				button = Button.new()
				button.icon = each.icon
				button.alignment = HORIZONTAL_ALIGNMENT_LEFT
				button.custom_minimum_size = Vector2(180, 0)
				button.clip_text = true
				button.pressed.connect(_on_node_pressed.bind(each.id))
				button.focus_entered.connect(_on_entry_focus.bind(button))
				button.mouse_entered.connect(button.grab_focus)
				button.set_meta(&"node", each.id)
				_add_marks(button)
				column.add_child(button)
				_node_buttons[each.id] = button
			button.text = tr(each.name_key)
			var mark: TextureRect = button.get_node(^"Mark") as TextureRect
			var price: Label = button.get_node(^"Price") as Label
			price.text = "%d" % each.cost
			match progression.state_of(each):
				Progression.NodeState.BOUGHT:
					button.add_theme_color_override(&"font_color", GOLD)
					button.modulate = Color.WHITE
					mark.texture = TICK
					price.visible = false
				Progression.NodeState.OPEN:
					button.add_theme_color_override(&"font_color", OPEN)
					button.modulate = Color.WHITE
					mark.texture = null
					price.visible = true
					price.add_theme_color_override(&"font_color", GOLD)
				Progression.NodeState.TOO_DEAR:
					button.add_theme_color_override(&"font_color", DIM)
					button.modulate = Color.WHITE
					mark.texture = null
					price.visible = true
					price.add_theme_color_override(&"font_color", TOO_DEAR)
				Progression.NodeState.LOCKED:
					button.add_theme_color_override(&"font_color", DIM)
					button.modulate = Color(0.6, 0.6, 0.6)
					mark.texture = LOCK
					price.visible = false
	_respec.disabled = progression.save.bought.is_empty()


func _refresh_keepsakes() -> void:
	_worn_label.text = tr("LAMP_WORN") % [progression.save.worn.size(), progression.slots()]
	var grid: GridContainer = _pages[&"keepsakes"].get_node(^"Grid") as GridContainer
	for each: KeepsakeDefinition in progression.catalog.keepsakes:
		var button: Button = _keepsake_buttons[each.id] if _keepsake_buttons.has(each.id) else null
		if button == null:
			button = Button.new()
			button.alignment = HORIZONTAL_ALIGNMENT_LEFT
			button.custom_minimum_size = Vector2(272, 0)
			button.pressed.connect(_on_keepsake_pressed.bind(each.id))
			button.focus_entered.connect(_on_entry_focus.bind(button))
			button.mouse_entered.connect(button.grab_focus)
			button.set_meta(&"keepsake", each.id)
			_add_marks(button)
			grid.add_child(button)
			_keepsake_buttons[each.id] = button
		var owned: bool = progression.owns(each.id)
		button.icon = each.icon if owned else EMPTY_ART
		button.text = tr(each.name_key) if owned else tr("KEEPSAKE_UNKNOWN")
		button.add_theme_color_override(&"font_color", GOLD if progression.wears(each.id) else (OPEN if owned else DIM))
		(button.get_node(^"Mark") as TextureRect).texture = TICK if progression.wears(each.id) else null
		(button.get_node(^"Price") as Label).visible = false


func _refresh_arts() -> void:
	var carried: Array[StringName] = progression.save.arts
	for slot: int in _art_buttons.size():
		var button: Button = _art_buttons[slot]
		var id: StringName = carried[slot] if slot < carried.size() else &""
		var art: ArtDefinition = _known_art(id)
		button.icon = art.icon if art != null else EMPTY_ART
		button.text = ("< %s >" % tr(art.name_key)) if art != null else ("< %s >" % tr("LAMP_NO_ART"))
		button.disabled = known_arts.is_empty()


## The line below the pages: what the focused entry is and where it stands.
func _describe(button: Button) -> void:
	if button.has_meta(&"node"):
		var node_id: StringName = button.get_meta(&"node")
		var each: TechniqueDefinition = progression.node(node_id)
		_detail_name.text = tr(each.name_key)
		_detail_text.text = tr(each.description_key)
		_show_demo(each.demo if each.demo != &"" else each.grants, 0)
		match progression.state_of(each):
			Progression.NodeState.BOUGHT:
				_detail_state.text = tr("LAMP_BOUGHT")
			Progression.NodeState.LOCKED:
				_detail_state.text = tr(progression.lock_reason(each))
			Progression.NodeState.TOO_DEAR:
				_detail_state.text = "%s   %s" % [tr("LAMP_COST") % each.cost, tr("LAMP_TOO_DEAR")]
			_:
				_detail_state.text = tr("LAMP_COST") % each.cost
	elif button.has_meta(&"keepsake"):
		var keepsake_id: StringName = button.get_meta(&"keepsake")
		var keepsake: KeepsakeDefinition = progression.keepsake(keepsake_id)
		_show_demo(&"", 0)
		if progression.owns(keepsake.id):
			_detail_name.text = tr(keepsake.name_key)
			_detail_text.text = tr(keepsake.description_key)
			_detail_state.text = "%s   %s" % [tr(keepsake.source_key), tr("LAMP_WORN_ONE") if progression.wears(keepsake.id)
				else tr("LAMP_NOT_WORN")]
		else:
			_detail_name.text = tr("KEEPSAKE_UNKNOWN")
			_detail_text.text = tr("KEEPSAKE_UNKNOWN_DESC")
			_detail_state.text = ""


func _first_button(id: StringName) -> Button:
	match id:
		&"tree":
			if progression != null:
				var blade: Array[TechniqueDefinition] = progression.branch(TechniqueDefinition.Branch.BLADE)
				if not blade.is_empty() and _node_buttons.has(blade[0].id):
					return _node_buttons[blade[0].id]
		&"keepsakes":
			if progression != null and not progression.catalog.keepsakes.is_empty():
				var first: StringName = progression.catalog.keepsakes[0].id
				if _keepsake_buttons.has(first):
					return _keepsake_buttons[first]
		&"arts":
			return _art_buttons[0] if not _art_buttons.is_empty() else null
	return _tabs[id]


func _known_art(id: StringName) -> ArtDefinition:
	for art: ArtDefinition in known_arts:
		if art.id == id:
			return art
	return null


# --- Answering --------------------------------------------------------------------------------------

func _on_tab_focus(id: StringName) -> void:
	chosen.emit(&"focus")
	if id != page:
		_show_page(id)
		_tabs[id].grab_focus()


func _on_entry_focus(button: Button) -> void:
	chosen.emit(&"focus")
	_describe(button)


func _on_node_pressed(id: StringName) -> void:
	var each: TechniqueDefinition = progression.node(id)
	if progression.buy(each):
		chosen.emit(&"bought")
	else:
		chosen.emit(&"refused")


func _on_respec() -> void:
	if progression.respec() > 0:
		chosen.emit(&"respec")
	var first: Button = _first_button(&"tree")
	if first != null:
		first.grab_focus()


func _on_respec_focus() -> void:
	chosen.emit(&"focus")
	_detail_name.text = tr("LAMP_RESPEC")
	_detail_text.text = tr("LAMP_RESPEC_DESC")
	_detail_state.text = ""
	_show_demo(&"", 0)


func _on_keepsake_pressed(id: StringName) -> void:
	if progression.toggle_wear(id):
		chosen.emit(&"step")
	else:
		chosen.emit(&"refused")


func _on_art_focus(slot: int) -> void:
	chosen.emit(&"focus")
	var carried: Array[StringName] = progression.save.arts
	var art: ArtDefinition = _known_art(carried[slot] if slot < carried.size() else &"")
	_detail_name.text = tr(art.name_key) if art != null else tr("LAMP_NO_ART")
	_detail_text.text = tr(art.description_key) if art != null else tr("LAMP_ART_NOTE")
	_detail_state.text = (tr("LAMP_ART_COST") % int(art.cost)) if art != null else ""
	_show_demo(art.id if art != null else &"", slot)


## The move a demo shows (nothing for an empty id); an Art in the second slot on its own button.
func _show_demo(id: StringName, slot: int) -> void:
	var demo: Dictionary = MoveDemos.of(id)
	if slot == 1:
		demo = MoveDemos.with_art_button(demo, &"art_2")
	_preview.glyphs = glyphs
	_preview.show_demo(demo)


## Pressing an Art's slot (or left and right on it) steps through the Arts he knows.
func _on_art_slot(slot: int) -> void:
	_step_art(slot, 1)


func _on_art_input(event: InputEvent, slot: int) -> void:
	if event.is_action_pressed(&"ui_left"):
		_step_art(slot, -1)
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed(&"ui_right"):
		_step_art(slot, 1)
		get_viewport().set_input_as_handled()


func _step_art(slot: int, direction: int) -> void:
	if known_arts.is_empty():
		return
	var carried: Array[StringName] = progression.save.arts
	var current: StringName = carried[slot] if slot < carried.size() else &""
	var index: int = -1
	for i: int in known_arts.size():
		if known_arts[i].id == current:
			index = i
	index = wrapi(index + direction, 0, known_arts.size())
	progression.carry_art(slot, known_arts[index].id)
	chosen.emit(&"step")
	_on_art_focus(slot)

## Puts a control at `rect` in its parent's space by its anchors and offsets, so a right-to-left layout
## (Arabic) mirrors it whole instead of losing it off the edge.
## A node's or a keepsake's marks at its far end: a tick or a lock, or its price.
func _add_marks(button: Button) -> void:
	var mark: TextureRect = TextureRect.new()
	mark.name = "Mark"
	mark.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mark.stretch_mode = TextureRect.STRETCH_KEEP_CENTERED
	mark.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	mark.offset_left = -15.0
	mark.offset_right = -4.0
	mark.offset_top = -6.0
	mark.offset_bottom = 6.0
	button.add_child(mark)
	var price: Label = Label.new()
	price.name = "Price"
	price.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	price.mouse_filter = Control.MOUSE_FILTER_IGNORE
	price.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	price.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	price.offset_left = -36.0
	price.offset_right = -5.0
	price.offset_top = -6.0
	price.offset_bottom = 6.0
	price.visible = false
	button.add_child(price)


static func _place(control: Control, rect: Rect2) -> void:
	control.set_anchors_preset(Control.PRESET_TOP_LEFT)
	control.offset_left = rect.position.x
	control.offset_top = rect.position.y
	control.offset_right = rect.end.x
	control.offset_bottom = rect.end.y
