class_name SettingsScreen
extends MenuScreen
## The settings, on five pages chosen by tabs: Gameplay (move prompts, lessons, the charged cleave, gore,
## language), Controls (every action's key and pad button, each rebound by pressing the new one; all of them
## put back as they were), Audio (each volume), Display (fullscreen, the window's size, vsync, brightness), Access
## (screen shake, flashes, time stopped and slowed on great blows, the warnings' colours). Each row changes its
## setting at once: left and right (or the arrows at its ends, for a mouse) step it back and on, confirm steps it
## on. Back leaves (or, while a button is awaited, keeps the old one).

const PAGES: Array[StringName] = [&"gameplay", &"controls", &"audio", &"display", &"access"]
const ROWS: Dictionary[StringName, Array] = {
	&"gameplay": [&"prompts", &"lessons", &"charge", &"gore", &"language", &"playtest_log"],
	&"audio": [&"Master", &"Music", &"Effects", &"Ambience"],
	&"display": [&"fullscreen", &"window_scale", &"vsync", &"brightness"],
	&"access": [&"shake", &"flashes", &"time_effects", &"colourblind"],
}
const LABELS: Dictionary[StringName, String] = {
	&"prompts": "SETTINGS_PROMPTS", &"lessons": "SETTINGS_LESSONS", &"charge": "SETTINGS_CHARGE",
	&"gore": "SETTINGS_GORE", &"language": "SETTINGS_LANGUAGE", &"playtest_log": "SETTINGS_PLAYTEST_LOG",
	&"Master": "SETTINGS_MASTER", &"Music": "SETTINGS_MUSIC",
	&"Effects": "SETTINGS_EFFECTS", &"Ambience": "SETTINGS_AMBIENCE", &"fullscreen": "SETTINGS_FULLSCREEN",
	&"window_scale": "SETTINGS_WINDOW", &"vsync": "SETTINGS_VSYNC", &"brightness": "SETTINGS_BRIGHTNESS",
	&"shake": "SETTINGS_SHAKE", &"flashes": "SETTINGS_FLASHES", &"time_effects": "SETTINGS_TIME",
	&"colourblind": "SETTINGS_WARNINGS",
}
const GOLD: Color = Color(1.0, 0.86, 0.5)
const VALUE: Color = Color(1.0, 0.93, 0.78)
const DIM: Color = Color(0.55, 0.5, 0.45)
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")
## Seconds a new button is awaited before the old one is kept.
const LISTEN_TIME: float = 6.0

var settings: GameSettings
## The buttons' names (for the Controls page).
var glyphs: InputGlyphs
var page: StringName = &"gameplay"
var _tabs: Dictionary[StringName, Button] = {}
var _pages: Dictionary[StringName, Control] = {}
var _rows: Dictionary[StringName, Button] = {}
var _values: Dictionary[StringName, Label] = {}
var _control_rows: Dictionary[StringName, Button] = {}
var _listening: StringName = &""
var _listen_left: float = 0.0
var _listen_label: Label
var _back: Button


func _ready() -> void:
	_build()
	super._ready()


func opened() -> void:
	_listening = &""
	_listen_label.visible = false
	_show_page(page)


func focus_first() -> void:
	var first: Button = _first_row(page)
	if first != null:
		first.grab_focus()


## The value a row shows now (for checks).
func value_of(setting: StringName) -> String:
	return _values[setting].text if _values.has(setting) else ""


# --- Building ---------------------------------------------------------------------------------------

func _build() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var shade: ColorRect = ColorRect.new()
	shade.color = Color(0.02, 0.015, 0.03, 0.82)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	var panel: PanelContainer = PanelContainer.new()
	TechniquesScreen._place(panel, Rect2(70, 24, 500, 312))
	add_child(panel)
	var list: VBoxContainer = VBoxContainer.new()
	list.add_theme_constant_override(&"separation", 5)
	panel.add_child(list)
	var heading: Label = Label.new()
	heading.text = "MENU_SETTINGS"
	heading.add_theme_font_override(&"font", TITLE_FONT)
	heading.add_theme_font_size_override(&"font_size", 18)
	heading.add_theme_color_override(&"font_color", Color(0.95, 0.86, 0.62))
	list.add_child(heading)
	var tabs: HBoxContainer = HBoxContainer.new()
	tabs.add_theme_constant_override(&"separation", 4)
	list.add_child(tabs)
	for id: StringName in PAGES:
		var tab: Button = Button.new()
		tab.text = "SETTINGS_TAB_%s" % String(id).to_upper()
		tab.pressed.connect(_show_page.bind(id))
		tab.focus_entered.connect(_show_page.bind(id))
		tabs.add_child(tab)
		_tabs[id] = tab
	var stack: Control = Control.new()
	stack.custom_minimum_size = Vector2(480, 214)
	list.add_child(stack)
	for id: StringName in PAGES:
		var built: Control = _build_controls() if id == &"controls" else _build_rows(id)
		built.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		stack.add_child(built)
		_pages[id] = built
	_listen_label = Label.new()
	_listen_label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_listen_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_listen_label.add_theme_color_override(&"font_color", GOLD)
	_listen_label.visible = false
	list.add_child(_listen_label)
	_back = Button.new()
	_back.text = "MENU_BACK"
	_back.set_meta(&"action", &"back")
	_back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_back.custom_minimum_size = Vector2(120, 0)
	list.add_child(_back)


## A page of rows: each a button with the setting's name and value, and arrows at its ends for a mouse.
func _build_rows(id: StringName) -> Control:
	var rows: VBoxContainer = VBoxContainer.new()
	rows.add_theme_constant_override(&"separation", 4)
	var settings_on_page: Array = ROWS[id]
	for entry: Variant in settings_on_page:
		var setting: StringName = entry
		var line: HBoxContainer = HBoxContainer.new()
		line.add_theme_constant_override(&"separation", 3)
		rows.add_child(line)
		line.add_child(_arrow("‹", setting, -1))
		var button: Button = Button.new()
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.text = LABELS[setting]
		button.set_meta(&"setting", setting)
		button.pressed.connect(_step.bind(setting, 1))
		button.gui_input.connect(_on_row_input.bind(setting))
		line.add_child(button)
		var value: Label = Label.new()
		value.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
		value.mouse_filter = Control.MOUSE_FILTER_IGNORE
		value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		value.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		value.set_anchors_and_offsets_preset(Control.PRESET_RIGHT_WIDE)
		value.offset_left = -220.0
		value.offset_right = -8.0
		value.add_theme_color_override(&"font_color", VALUE)
		button.add_child(value)
		_values[setting] = value
		line.add_child(_arrow("›", setting, 1))
		_rows[setting] = button
	return rows


func _arrow(text: String, setting: StringName, direction: int) -> Button:
	var arrow: Button = Button.new()
	arrow.text = text
	arrow.focus_mode = Control.FOCUS_NONE
	arrow.custom_minimum_size = Vector2(16, 0)
	arrow.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	arrow.pressed.connect(_step.bind(setting, direction))
	return arrow


## The Controls page: every action, its key and its pad button; pressing a row awaits the new one.
func _build_controls() -> Control:
	var page_box: VBoxContainer = VBoxContainer.new()
	page_box.add_theme_constant_override(&"separation", 3)
	var head: HBoxContainer = HBoxContainer.new()
	page_box.add_child(head)
	for key: String in ["", "CONTROLS_KEYBOARD", "CONTROLS_PAD"]:
		var label: Label = Label.new()
		label.text = key
		label.custom_minimum_size = Vector2(200 if key == "" else 130, 0)
		label.add_theme_color_override(&"font_color", DIM)
		head.add_child(label)
	var scroll: ScrollContainer = ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(480, 168)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	page_box.add_child(scroll)
	var list: VBoxContainer = VBoxContainer.new()
	list.add_theme_constant_override(&"separation", 2)
	scroll.add_child(list)
	for action: StringName in GameSettings.REBINDABLE:
		var button: Button = Button.new()
		button.custom_minimum_size = Vector2(466, 17)
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.text = "ACTION_%s" % String(action).to_upper()
		button.pressed.connect(_listen.bind(action))
		for column: int in 2:
			var caps: HBoxContainer = HBoxContainer.new()
			caps.name = "Keys" if column == 0 else "Pad"
			caps.mouse_filter = Control.MOUSE_FILTER_IGNORE
			caps.add_theme_constant_override(&"separation", 2)
			caps.position = Vector2(200 + column * 130, 2)
			button.add_child(caps)
		list.add_child(button)
		_control_rows[action] = button
	var reset: Button = Button.new()
	reset.text = "CONTROLS_RESET"
	reset.size_flags_horizontal = Control.SIZE_SHRINK_END
	reset.pressed.connect(_reset_controls)
	page_box.add_child(reset)
	return page_box


# --- Showing ----------------------------------------------------------------------------------------

func _show_page(id: StringName) -> void:
	page = id
	for each: StringName in PAGES:
		_pages[each].visible = each == id
		_tabs[each].add_theme_color_override(&"font_color", GOLD if each == id else Color(0.74, 0.67, 0.55))
	_refresh()


func _first_row(id: StringName) -> Button:
	if id == &"controls":
		return _control_rows[GameSettings.REBINDABLE[0]]
	var settings_on_page: Array = ROWS[id]
	var first: StringName = settings_on_page[0]
	return _rows[first]


func _refresh() -> void:
	if settings == null:
		return
	for setting: StringName in _values:
		_values[setting].text = _value_text(setting)
	_refresh_controls()


func _value_text(setting: StringName) -> String:
	match setting:
		&"Master", &"Music", &"Effects", &"Ambience":
			var steps: int = settings.volumes[setting]
			return "|".repeat(steps) + "·".repeat(GameSettings.VOLUME_STEPS - steps)
		&"fullscreen":
			return tr("SETTING_ON") if settings.fullscreen else tr("SETTING_OFF")
		&"window_scale":
			return tr("SETTING_AUTO") if settings.window_scale == 0 else "%d×" % settings.window_scale
		&"vsync":
			return tr("SETTING_ON") if settings.vsync else tr("SETTING_OFF")
		&"brightness":
			return "%d%%" % roundi(settings.brightness * 100.0)
		&"shake":
			return tr("SETTING_ON") if settings.shake >= 1.0 else (tr("SETTING_REDUCED") if settings.shake > 0.0
				else tr("SETTING_OFF"))
		&"flashes":
			return tr("SETTING_ON") if settings.flashes else tr("SETTING_OFF")
		&"time_effects":
			return tr("SETTING_ON") if settings.time_effects else tr("SETTING_OFF")
		&"colourblind":
			return tr("SETTING_COLOURBLIND") if settings.colourblind else tr("SETTING_STANDARD")
		&"gore":
			return tr("SETTING_FULL") if settings.gore else tr("SETTING_REDUCED")
		&"charge":
			return tr("SETTING_TOGGLE") if settings.charge_toggle else tr("SETTING_HOLD")
		&"prompts":
			var names: Array[String] = ["SETTING_LEARNING", "SETTING_ALWAYS", "SETTING_OFF"]
			return tr(names[int(settings.move_prompts)])
		&"lessons":
			var modes: Array[String] = ["SETTING_LESSONS_FULL", "SETTING_LESSONS_SHORT", "SETTING_OFF"]
			return tr(modes[int(settings.lessons)])
		&"language":
			return "English" if settings.language == "en" else "العربية"
		&"playtest_log":
			return tr("SETTING_ON") if settings.playtest_log else tr("SETTING_OFF")
	return ""


func _refresh_controls() -> void:
	for action: StringName in _control_rows:
		var button: Button = _control_rows[action]
		for column: int in 2:
			var holder: HBoxContainer = button.get_node("Keys" if column == 0 else "Pad") as HBoxContainer
			for child: Node in holder.get_children():
				holder.remove_child(child)
				child.queue_free()
			if glyphs == null:
				continue
			var listening: bool = action == _listening
			for cap: Array in glyphs.caps(action, column):
				var text: String = cap[0]
				var kind: KeyCaps.Kind = cap[1]
				var key: Control = KeyCaps.make(text, kind)
				key.modulate = Color(1, 1, 1, 0.35) if listening else Color.WHITE
				holder.add_child(key)


# --- Changing ---------------------------------------------------------------------------------------

func _on_row_input(event: InputEvent, setting: StringName) -> void:
	# Right to left (Arabic) a row grows toward the left, as its meter fills from the right.
	var onward: int = -1 if is_layout_rtl() else 1
	if event.is_action_pressed(&"ui_left"):
		_step(setting, -onward)
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed(&"ui_right"):
		_step(setting, onward)
		get_viewport().set_input_as_handled()


func _step(setting: StringName, direction: int) -> void:
	if settings == null:
		return
	match setting:
		&"Master", &"Music", &"Effects", &"Ambience":
			settings.set_volume(setting, settings.volumes[setting] + direction)
		&"fullscreen":
			settings.set_fullscreen(not settings.fullscreen)
		&"window_scale":
			var index: int = GameSettings.WINDOW_SCALES.find(settings.window_scale)
			settings.set_window_scale(GameSettings.WINDOW_SCALES[wrapi(index + direction, 0, GameSettings.WINDOW_SCALES.size())])
		&"vsync":
			settings.set_vsync(not settings.vsync)
		&"brightness":
			var steps: Array[float] = GameSettings.BRIGHTNESS_STEPS
			var at: int = 2
			for i: int in steps.size():
				if absf(steps[i] - settings.brightness) < 0.01:
					at = i
			settings.set_brightness(steps[clampi(at + direction, 0, steps.size() - 1)])
		&"shake":
			var steps: Array[float] = [0.0, 0.5, 1.0]
			var index: int = steps.find(settings.shake)
			settings.set_shake(steps[wrapi(index + direction, 0, steps.size())])
		&"flashes":
			settings.set_flashes(not settings.flashes)
		&"time_effects":
			settings.set_time_effects(not settings.time_effects)
		&"colourblind":
			settings.set_colourblind(not settings.colourblind)
		&"gore":
			settings.set_gore(not settings.gore)
		&"charge":
			settings.set_charge_toggle(not settings.charge_toggle)
		&"playtest_log":
			settings.set_playtest_log(not settings.playtest_log)
		&"prompts":
			var count: int = GameSettings.Prompts.size()
			settings.set_move_prompts(wrapi(int(settings.move_prompts) + direction, 0, count) as GameSettings.Prompts)
		&"lessons":
			var count: int = GameSettings.LessonMode.size()
			settings.set_lessons(wrapi(int(settings.lessons) + direction, 0, count) as GameSettings.LessonMode)
		&"language":
			var index: int = GameSettings.LANGUAGES.find(settings.language)
			settings.set_language(GameSettings.LANGUAGES[wrapi(index + direction, 0, GameSettings.LANGUAGES.size())])
	chosen.emit(&"step")
	_refresh()


## Awaits a new button for `action` (the next key, mouse button or pad button pressed).
func _listen(action: StringName) -> void:
	_listening = action
	_listen_left = LISTEN_TIME
	_listen_label.text = tr("CONTROLS_PRESS") % tr("ACTION_%s" % String(action).to_upper())
	_listen_label.visible = true
	_refresh_controls()
	chosen.emit(&"step")


func _stop_listening() -> void:
	_listening = &""
	_listen_label.visible = false
	_refresh_controls()


func _reset_controls() -> void:
	if settings != null:
		settings.reset_bindings()
	chosen.emit(&"step")
	_refresh()


func _process(delta: float) -> void:
	if _listening != &"":
		_listen_left -= delta
		if _listen_left <= 0.0:
			_stop_listening()


func _input(event: InputEvent) -> void:
	if _listening == &"" or not visible:
		return
	var key: InputEventKey = event as InputEventKey
	var pressed: bool = event.is_pressed() and not event.is_echo()
	if not pressed:
		return
	get_viewport().set_input_as_handled()
	# Escape keeps the button as it was.
	if key != null and key.physical_keycode == KEY_ESCAPE:
		_stop_listening()
		chosen.emit(&"cancel_ask")
		return
	if GameSettings.event_name(event) == "":
		return
	var action: StringName = _listening
	_stop_listening()
	settings.rebind(action, event)
	chosen.emit(&"bought")
	_refresh()
	_control_rows[action].grab_focus()


func _unhandled_input(event: InputEvent) -> void:
	if not visible or _listening != &"":
		return
	if event.is_action_pressed(&"ui_cancel"):
		get_viewport().set_input_as_handled()
		chosen.emit(back_action)
