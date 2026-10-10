class_name TechniquesScreen
extends MenuScreen
## The pause menu's page of everything the hero can do. On the left the moves and Arts; on the right
## the one in focus, shown: Yusuf performs it on a small stage while the buttons that make it light up
## in turn (for the device in use), with how to do it beneath, or, for one not yet his, where it comes
## from (so the road ahead shows).

const GOLD: Color = Color(1.0, 0.86, 0.5)
const DIM: Color = Color(0.5, 0.46, 0.42)
const KNOWN: Color = Color(0.92, 0.88, 0.78)
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")
const HONOUR_ICON: Texture2D = preload("res://assets/ui/icon_honour.png")
## Each entry: [technique (empty: always his), name key, how-to key (may hold {action} tokens), where it
## comes from (a key), icon, its demo (MoveDemos)].
const ENTRIES: Array[Array] = [
	[&"", "MOVE_CUTS", "HINT_ATTACK", "", "res://assets/ui/tech_delayed_cut.png", &"cuts"],
	[&"", "MOVE_GUARD", "HINT_GUARD", "", "res://assets/ui/tech_steady_guard.png", &"guard"],
	[&"", "MOVE_ROLL", "HINT_ROLL", "", "res://assets/ui/tech_running_thrust.png", &"roll"],
	[&"", "MOVE_STEADY_BREATH", "HINT_STEADY_BREATH", "", "res://assets/ui/tech_iron_will.png", &"steady_breath"],
	[&"", "MOVE_CLOSE_CALL", "HINT_CLOSE_CALL", "", "res://assets/ui/tech_quiet_step.png", &"close_call"],
	[&"", "MOVE_LEAP", "HINT_JUMP", "", "res://assets/ui/tech_death_from_above.png", &"leap"],
	[&"", "MOVE_FINISHER", "HINT_FINISHER", "", "res://assets/ui/tech_executioner.png", &"finisher"],
	[&"", "MOVE_GROUND_STAB", "HINT_GROUND_STAB", "", "res://assets/ui/tech_death_from_above.png", &"ground_stab"],
	[&"", "MOVE_REMEDY", "HINT_HEAL", "", "res://assets/ui/icon_remedy.png", &"remedy"],
	[&"", "MOVE_RIPOSTE", "HINT_RIPOSTE", "", "res://assets/ui/tech_riposte_mastery.png", &"riposte"],
	[&"kick", "MOVE_KICK", "HINT_KICK", "SOURCE_KICK", "res://assets/ui/tech_bash_mastery.png", &"kick"],
	[&"low_cut", "MOVE_LOW_CUT", "HINT_LOW_CUT", "SOURCE_LOW_CUT", "res://assets/ui/tech_delayed_cut.png", &"low_cut"],
	[&"rising_cleave", "MOVE_RISING_CLEAVE", "HINT_LEARNED_RISING_CLEAVE", "SOURCE_MASTER_LESSON",
		"res://assets/ui/tech_executioner.png", &"rising_cleave"],
	[&"running_slash", "MOVE_RUNNING_SLASH", "HINT_RUNNING_SLASH", "SOURCE_RUNNING_SLASH",
		"res://assets/ui/tech_running_thrust.png", &"running_slash"],
	[&"guarded_thrust", "MOVE_GUARDED_THRUST", "HINT_GUARDED_THRUST", "SOURCE_MASTER_LESSON",
		"res://assets/ui/tech_steady_guard.png", &"guarded_thrust"],
	[&"down_stab", "MOVE_DOWN_STAB", "HINT_DOWN_STAB", "SOURCE_MASTER_LESSON", "res://assets/ui/tech_death_from_above.png",
		&"down_stab"],
	[&"windmill", "MOVE_WINDMILL", "HINT_LEARNED_WINDMILL", "SOURCE_MASTER_LESSON", "res://assets/ui/tech_executioner.png",
		&"heavy_string"],
	[&"sweep", "MOVE_SWEEP", "HINT_LEARNED_SWEEP", "SOURCE_SWEEP", "res://assets/ui/tech_whirl.png", &"sweep"],
	[&"charge", "MOVE_CHARGE", "HINT_LEARNED_CHARGE", "SOURCE_CHARGE", "res://assets/ui/tech_iron_will.png", &"charge"],
	[&"bash", "MOVE_BASH", "HINT_LEARNED_BASH", "SOURCE_BASH", "res://assets/ui/tech_bash_mastery.png", &"bash"],
	[&"knives", "MOVE_KNIVES", "HINT_LEARNED_KNIVES", "SOURCE_KNIVES", "res://assets/ui/tech_bandolier.png", &"knives"],
	[&"plunge", "MOVE_PLUNGE", "HINT_LEARNED_PLUNGE", "SOURCE_PLUNGE", "res://assets/ui/tech_death_from_above.png", &"plunge"],
	[&"roll_cut", "MOVE_ROLL_CUT", "HINT_LEARNED_ROLL_CUT", "SOURCE_ROLL_CUT", "res://assets/ui/tech_whirl.png", &"roll_cut"],
	[&"pommel", "TECH_POMMEL", "HINT_LEARNED_POMMEL", "SOURCE_MASTER_TREE", "res://assets/ui/tech_pommel.png", &"pommel"],
	[&"whirl", "TECH_WHIRL", "HINT_LEARNED_WHIRL", "SOURCE_MASTER_TREE", "res://assets/ui/tech_whirl.png", &"whirl"],
	[&"delayed_cut", "TECH_DELAYED_CUT", "HINT_LEARNED_DELAYED_CUT", "SOURCE_MASTER_TREE", "res://assets/ui/tech_delayed_cut.png",
		&"delayed_cut"],
	[&"executioner", "TECH_EXECUTIONER", "HINT_LEARNED_EXECUTIONER", "SOURCE_MASTER_TREE", "res://assets/ui/tech_executioner.png",
		&"executioner"],
	[&"running_thrust", "TECH_RUNNING_THRUST", "HINT_LEARNED_RUNNING_THRUST", "SOURCE_MASTER_TREE",
		"res://assets/ui/tech_running_thrust.png", &"running_thrust"],
	[&"storm", "ART_STORM", "ART_STORM_DESC", "SOURCE_STORM", "res://assets/ui/art_storm.png", &"storm"],
	[&"pierce", "ART_PIERCE", "ART_PIERCE_DESC", "SOURCE_PIERCE", "res://assets/ui/art_pierce.png", &"pierce"],
	[&"naft", "ART_NAFT", "ART_NAFT_DESC", "SOURCE_NAFT", "res://assets/ui/art_naft.png", &"naft"],
	[&"second_wind", "ART_SECOND_WIND", "ART_SECOND_WIND_DESC", "SOURCE_SECOND_WIND", "res://assets/ui/art_second_wind.png",
		&"second_wind"],
	[&"judgment", "ART_JUDGMENT", "ART_JUDGMENT_DESC", "SOURCE_TREE", "res://assets/ui/art_judgment.png", &"judgment"],
]

var glyphs: InputGlyphs
var _hero: Warrior
var _honour: int = 0
var _honour_label: Label
var _grid: GridContainer
var _detail_name: Label
var _preview: MovePreview
var _detail_text: KeyText
var _detail_state: Label


func _ready() -> void:
	back_action = &"techniques_back"
	_build()
	super._ready()


## Shows what `hero` can do now (and the Honour he holds).
func open_for(hero: Warrior, honour: int) -> void:
	_hero = hero
	_honour = honour
	open()


func opened() -> void:
	_honour_label.text = "%d" % _honour
	_preview.glyphs = glyphs
	for button: Node in _grid.get_children():
		_paint(button as Button)


func focus_first() -> void:
	if _grid.get_child_count() > 0:
		(_grid.get_child(0) as Button).grab_focus()


func _build() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var shade: ColorRect = ColorRect.new()
	shade.color = Color(0.02, 0.015, 0.03, 0.82)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	var panel: PanelContainer = PanelContainer.new()
	_place(panel, Rect2(30, 14, 580, 332))
	add_child(panel)
	var list: VBoxContainer = VBoxContainer.new()
	list.add_theme_constant_override(&"separation", 5)
	panel.add_child(list)
	var head: HBoxContainer = HBoxContainer.new()
	list.add_child(head)
	var heading: Label = Label.new()
	heading.text = "MENU_TECHNIQUES"
	heading.add_theme_font_override(&"font", TITLE_FONT)
	heading.add_theme_font_size_override(&"font_size", 18)
	heading.add_theme_color_override(&"font_color", Color(0.95, 0.86, 0.62))
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(heading)
	var coin: TextureRect = TextureRect.new()
	coin.texture = HONOUR_ICON
	coin.stretch_mode = TextureRect.STRETCH_KEEP_CENTERED
	head.add_child(coin)
	_honour_label = Label.new()
	_honour_label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_honour_label.add_theme_color_override(&"font_color", GOLD)
	head.add_child(_honour_label)
	var body: HBoxContainer = HBoxContainer.new()
	body.add_theme_constant_override(&"separation", 8)
	list.add_child(body)
	# The moves, one a row.
	var scroll: ScrollContainer = ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(206, 286)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	body.add_child(scroll)
	_grid = GridContainer.new()
	_grid.columns = 1
	_grid.add_theme_constant_override(&"v_separation", 1)
	scroll.add_child(_grid)
	for entry: Array in ENTRIES:
		var button: Button = Button.new()
		var icon_path: String = entry[4]
		button.icon = load(icon_path) as Texture2D
		var name_key: String = entry[1]
		button.text = name_key
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.clip_text = true
		button.custom_minimum_size = Vector2(196, 0)
		button.set_meta(&"entry", entry)
		button.focus_entered.connect(_describe.bind(button))
		_grid.add_child(button)
	# The one in focus: its name, shown on the stage with its buttons, and how to do it.
	var detail: VBoxContainer = VBoxContainer.new()
	detail.add_theme_constant_override(&"separation", 4)
	detail.custom_minimum_size = Vector2(344, 0)
	body.add_child(detail)
	_detail_name = Label.new()
	_detail_name.add_theme_color_override(&"font_color", GOLD)
	detail.add_child(_detail_name)
	_preview = MovePreview.new()
	_preview.stage_height = 150.0
	detail.add_child(_preview)
	_detail_text = KeyText.new()
	_detail_text.custom_minimum_size = Vector2(344, 24)
	detail.add_child(_detail_text)
	_detail_state = Label.new()
	_detail_state.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_detail_state.custom_minimum_size = Vector2(344, 0)
	_detail_state.add_theme_color_override(&"font_color", Color(0.82, 0.7, 0.5))
	detail.add_child(_detail_state)


## Known entries in the light, those still ahead dimmed.
func _paint(button: Button) -> void:
	var entry: Array = button.get_meta(&"entry")
	var known: bool = _knows(entry)
	button.add_theme_color_override(&"font_color", KNOWN if known else DIM)
	button.modulate = Color.WHITE if known else Color(0.6, 0.6, 0.6)


func _knows(entry: Array) -> bool:
	var technique: StringName = entry[0]
	return technique == &"" or (_hero != null and _hero.knows(technique))


func _describe(button: Button) -> void:
	var entry: Array = button.get_meta(&"entry")
	var name_key: String = entry[1]
	var how_key: String = entry[2]
	var source_key: String = entry[3]
	var demo_id: StringName = entry[5]
	var technique: StringName = entry[0]
	_detail_name.text = tr(name_key)
	_preview.glyphs = glyphs
	_preview.show_demo(_demo(technique, demo_id))
	if _knows(entry):
		_detail_text.glyphs = glyphs
		_detail_text.show_key(how_key)
		_detail_state.text = ""
	else:
		_detail_text.show_key("TECHNIQUES_NOT_YET")
		_detail_state.text = tr(source_key)


## A move's demo; an Art carried second is shown on the second Art's own button.
func _demo(technique: StringName, demo_id: StringName) -> Dictionary:
	var demo: Dictionary = MoveDemos.of(demo_id)
	if _hero != null:
		var arts: Array[ArtDefinition] = _hero.carried_arts()
		if arts.size() > 1 and arts[1].id == technique:
			return MoveDemos.with_art_button(demo, &"art_2")
	return demo


## Puts a control at `rect` in its parent's space by its anchors and offsets, so a right-to-left layout
## (Arabic) mirrors it whole instead of losing it off the edge.
static func _place(control: Control, rect: Rect2) -> void:
	control.set_anchors_preset(Control.PRESET_TOP_LEFT)
	control.offset_left = rect.position.x
	control.offset_top = rect.position.y
	control.offset_right = rect.end.x
	control.offset_bottom = rect.end.y
