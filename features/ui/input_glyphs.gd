class_name InputGlyphs
extends Node
## Names the button for an action on the device the player is using (keyboard and mouse, or a
## gamepad), and fills "{action}" tokens in hint text with them.

signal device_changed(gamepad: bool)

const PAD_BUTTONS: Dictionary[int, String] = {
	JOY_BUTTON_A: "A", JOY_BUTTON_B: "B", JOY_BUTTON_X: "X", JOY_BUTTON_Y: "Y",
	JOY_BUTTON_LEFT_SHOULDER: "LB", JOY_BUTTON_RIGHT_SHOULDER: "RB", JOY_BUTTON_START: "Start",
	JOY_BUTTON_BACK: "Back", JOY_BUTTON_LEFT_STICK: "L3", JOY_BUTTON_RIGHT_STICK: "R3",
	JOY_BUTTON_DPAD_UP: "D-Up", JOY_BUTTON_DPAD_DOWN: "D-Down", JOY_BUTTON_DPAD_LEFT: "D-Left",
	JOY_BUTTON_DPAD_RIGHT: "D-Right",
}
const MOUSE_BUTTONS: Array[String] = ["", "LMB", "RMB", "MMB"]
const PAD_AXES: Dictionary[int, String] = {
	JOY_AXIS_TRIGGER_LEFT: "LT", JOY_AXIS_TRIGGER_RIGHT: "RT", JOY_AXIS_LEFT_X: "Stick",
	JOY_AXIS_LEFT_Y: "Stick",
}

var gamepad: bool = false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func _input(event: InputEvent) -> void:
	var pad: bool = event is InputEventJoypadButton or (event is InputEventJoypadMotion
		and absf((event as InputEventJoypadMotion).axis_value) > 0.5)
	var keys: bool = event is InputEventKey or event is InputEventMouseButton
	if pad and not gamepad:
		gamepad = true
		device_changed.emit(true)
	elif keys and gamepad:
		gamepad = false
		device_changed.emit(false)


## The name of the first binding of `action` for the current device.
func label(action: StringName) -> String:
	if action == &"move":
		return "Stick" if gamepad else "A/D"
	for event: InputEvent in InputMap.action_get_events(action):
		if gamepad:
			var button: InputEventJoypadButton = event as InputEventJoypadButton
			if button != null and PAD_BUTTONS.has(button.button_index):
				return PAD_BUTTONS[button.button_index]
			var motion: InputEventJoypadMotion = event as InputEventJoypadMotion
			if motion != null and PAD_AXES.has(motion.axis):
				return PAD_AXES[motion.axis]
		else:
			var key: InputEventKey = event as InputEventKey
			if key != null:
				var code: Key = key.physical_keycode if key.physical_keycode != KEY_NONE else key.keycode
				return OS.get_keycode_string(code)
			var mouse: InputEventMouseButton = event as InputEventMouseButton
			if mouse != null:
				return MOUSE_BUTTONS[clampi(mouse.button_index, 0, 3)]
	return "?"


## Translates `key` and fills each {action} token with its button name, bracketed.
func format(key: String) -> String:
	var text: String = TranslationServer.translate(key)
	var start: int = text.find("{")
	while start >= 0:
		var end: int = text.find("}", start)
		if end < 0:
			break
		var action: String = text.substr(start + 1, end - start - 1)
		text = text.substr(0, start) + "[" + label(StringName(action)) + "]" + text.substr(end + 1)
		start = text.find("{")
	return text
