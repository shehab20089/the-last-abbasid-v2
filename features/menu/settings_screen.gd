class_name SettingsScreen
extends MenuScreen
## Volumes, fullscreen, screen shake, gore and language. Each row changes a GameSettings value at once;
## left and right (or a click) step a row's value.

var settings: GameSettings

@onready var rows: VBoxContainer = %Rows


func opened() -> void:
	_refresh()


func _ready() -> void:
	super._ready()
	for row: Node in rows.get_children():
		var button: Button = row as Button
		if button != null and button.has_meta(&"setting"):
			button.gui_input.connect(_on_row_input.bind(button))
			button.pressed.connect(_step.bind(button, 1))


func _on_row_input(event: InputEvent, button: Button) -> void:
	if event.is_action_pressed(&"ui_left"):
		_step(button, -1)
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed(&"ui_right"):
		_step(button, 1)
		get_viewport().set_input_as_handled()


func _step(button: Button, direction: int) -> void:
	if settings == null:
		return
	var setting: StringName = button.get_meta(&"setting")
	match setting:
		&"Master", &"Music", &"Effects", &"Ambience":
			settings.set_volume(setting, settings.volumes[setting] + direction)
		&"fullscreen":
			settings.set_fullscreen(not settings.fullscreen)
		&"shake":
			var steps: Array[float] = [0.0, 0.5, 1.0]
			var index: int = steps.find(settings.shake)
			settings.set_shake(steps[wrapi(index + direction, 0, steps.size())])
		&"gore":
			settings.set_gore(not settings.gore)
		&"language":
			var index: int = GameSettings.LANGUAGES.find(settings.language)
			settings.set_language(GameSettings.LANGUAGES[wrapi(index + direction, 0, GameSettings.LANGUAGES.size())])
	chosen.emit(&"step")
	_refresh()


func _refresh() -> void:
	if settings == null:
		return
	for row: Node in rows.get_children():
		var button: Button = row as Button
		if button == null or not button.has_meta(&"setting"):
			continue
		var setting: StringName = button.get_meta(&"setting")
		var label_key: String = button.get_meta(&"label", "")
		var label: String = tr(label_key)
		var value: String = ""
		match setting:
			&"Master", &"Music", &"Effects", &"Ambience":
				value = _meter(settings.volumes[setting])
			&"fullscreen":
				value = tr("SETTING_ON") if settings.fullscreen else tr("SETTING_OFF")
			&"shake":
				value = tr("SETTING_ON") if settings.shake >= 1.0 else (tr("SETTING_REDUCED") if settings.shake > 0.0
					else tr("SETTING_OFF"))
			&"gore":
				value = tr("SETTING_FULL") if settings.gore else tr("SETTING_REDUCED")
			&"language":
				value = "English" if settings.language == "en" else "العربية"
		button.text = "%s   < %s >" % [label, value]


static func _meter(steps: int) -> String:
	return "|".repeat(steps) + ".".repeat(GameSettings.VOLUME_STEPS - steps)
