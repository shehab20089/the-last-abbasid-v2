class_name InputGlyphs
extends Node
## Names the button for an action on the device the player is using (keyboard and mouse, or a
## gamepad), and fills "{action}" tokens in hint text with them: as bracketed names in plain text
## (`format`), or as the caps KeyCaps draws (`caps`, which KeyText sets among the words).

signal device_changed(gamepad: bool)

const PAD_BUTTONS: Dictionary[int, String] = {
	JOY_BUTTON_A: "A", JOY_BUTTON_B: "B", JOY_BUTTON_X: "X", JOY_BUTTON_Y: "Y",
	JOY_BUTTON_LEFT_SHOULDER: "LB", JOY_BUTTON_RIGHT_SHOULDER: "RB", JOY_BUTTON_START: "Start",
	JOY_BUTTON_BACK: "Back", JOY_BUTTON_LEFT_STICK: "L3", JOY_BUTTON_RIGHT_STICK: "R3",
	JOY_BUTTON_DPAD_UP: "↑", JOY_BUTTON_DPAD_DOWN: "↓", JOY_BUTTON_DPAD_LEFT: "←",
	JOY_BUTTON_DPAD_RIGHT: "→",
}
const MOUSE_BUTTONS: Array[String] = ["", "LMB", "RMB", "MMB"]
const PAD_AXES: Dictionary[int, String] = {
	JOY_AXIS_TRIGGER_LEFT: "LT", JOY_AXIS_TRIGGER_RIGHT: "RT", JOY_AXIS_LEFT_X: "L",
	JOY_AXIS_LEFT_Y: "L",
}
## Key names shortened to fit a cap.
const SHORT_KEYS: Dictionary[String, String] = {
	"Escape": "Esc", "Left": "←", "Right": "→", "Up": "↑", "Down": "↓", "Backspace": "Bksp",
	"Delete": "Del", "Insert": "Ins", "PageUp": "PgUp", "PageDown": "PgDn", "CapsLock": "Caps",
}
## The face buttons as each family of pad prints them (by position: bottom, right, left, top); a PlayStation
## pad's are shapes (KeyCaps draws them), a Nintendo pad's letters sit the other way about.
const FAMILY_FACES: Dictionary[String, Array] = {
	"xbox": ["A", "B", "X", "Y"],
	"playstation": ["cross", "circle", "square", "triangle"],
	"nintendo": ["B", "A", "Y", "X"],
}
const FAMILY_SHOULDERS: Dictionary[String, Array] = {
	"xbox": ["LB", "RB", "LT", "RT"],
	"playstation": ["L1", "R1", "L2", "R2"],
	"nintendo": ["L", "R", "ZL", "ZR"],
}

## Actions a pad makes with two buttons held together (the second Art: the shield's button with the Art's).
const PAD_CHORDS: Dictionary[StringName, Array] = {&"art_2": [&"block", &"art"]}

var gamepad: bool = false
## The family of the pad last used ("xbox", "playstation", "nintendo"), read from its name.
var family: String = "xbox"


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func _input(event: InputEvent) -> void:
	var pad: bool = event is InputEventJoypadButton or (event is InputEventJoypadMotion
		and absf((event as InputEventJoypadMotion).axis_value) > 0.5)
	var keys: bool = event is InputEventKey or event is InputEventMouseButton
	if pad:
		var named: String = family_of(Input.get_joy_name(event.device))
		if named != family:
			family = named
			if gamepad:
				device_changed.emit(true)
	if pad and not gamepad:
		gamepad = true
		device_changed.emit(true)
	elif keys and gamepad:
		gamepad = false
		device_changed.emit(false)


## The name of the first binding of `action` for the current device.
func label(action: StringName) -> String:
	var names: PackedStringArray = PackedStringArray()
	for cap: Array in caps(action):
		var text: String = cap[0]
		# A shape drawn on a cap is written as its name in plain text.
		names.append(text.capitalize() if text in KeyCaps.SHAPES else text)
	return "+".join(names) if not names.is_empty() else "?"


## How the button for `action` is drawn on the device in use (or on the pad, or on the keyboard, when `on_pad`
## is 1 or 0): one or more caps, each [text, KeyCaps.Kind] (more than one for buttons held together).
func caps(action: StringName, on_pad: int = -1) -> Array[Array]:
	var out: Array[Array] = []
	var pad: bool = gamepad if on_pad < 0 else on_pad == 1
	if action == &"move":
		if pad:
			out.append(["L", KeyCaps.Kind.STICK])
		else:
			out.append([_key_name(&"move_left") + "/" + _key_name(&"move_right"), KeyCaps.Kind.KEY])
		return out
	if pad and PAD_CHORDS.has(action) and _pad_events(action) == 0:
		for part: StringName in PAD_CHORDS[action]:
			out.append_array(caps(part, 1))
		return out
	for event: InputEvent in InputMap.action_get_events(action):
		if pad:
			var button: InputEventJoypadButton = event as InputEventJoypadButton
			if button != null and PAD_BUTTONS.has(button.button_index):
				out.append([_pad_name(button.button_index), _pad_kind(button.button_index)])
				return out
			var motion: InputEventJoypadMotion = event as InputEventJoypadMotion
			if motion != null and PAD_AXES.has(motion.axis):
				var stick: bool = motion.axis == JOY_AXIS_LEFT_X or motion.axis == JOY_AXIS_LEFT_Y
				var axis_name: String = PAD_AXES[motion.axis]
				if not stick:
					var shoulders: Array = FAMILY_SHOULDERS[family]
					axis_name = shoulders[2 if motion.axis == JOY_AXIS_TRIGGER_LEFT else 3]
				out.append([axis_name, KeyCaps.Kind.STICK if stick else KeyCaps.Kind.SHOULDER])
				return out
		else:
			var key: InputEventKey = event as InputEventKey
			if key != null:
				out.append([_name_of(key), KeyCaps.Kind.KEY])
				return out
			var mouse: InputEventMouseButton = event as InputEventMouseButton
			if mouse != null:
				out.append([MOUSE_BUTTONS[clampi(mouse.button_index, 0, 3)], KeyCaps.Kind.MOUSE])
				return out
	return out


## How many pad buttons an action has of its own.
func _pad_events(action: StringName) -> int:
	var count: int = 0
	for event: InputEvent in InputMap.action_get_events(action):
		if event is InputEventJoypadButton or event is InputEventJoypadMotion:
			count += 1
	return count


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


## The first key bound to `action`, by name (for "A/D").
func _key_name(action: StringName) -> String:
	for event: InputEvent in InputMap.action_get_events(action):
		var key: InputEventKey = event as InputEventKey
		if key != null:
			return _name_of(key)
	return "?"


## A key's name as the player's keyboard prints it (the layout's, where the system can tell), shortened.
func _name_of(key: InputEventKey) -> String:
	var code: Key = key.physical_keycode if key.physical_keycode != KEY_NONE else key.keycode
	if key.physical_keycode != KEY_NONE and DisplayServer.get_name() != "headless":
		var local: Key = DisplayServer.keyboard_get_label_from_physical(key.physical_keycode)
		if local != KEY_NONE:
			code = local
	var name: String = OS.get_keycode_string(code)
	var short: String = SHORT_KEYS.get(name, name)
	return short


## A pad button's name on the family in use.
func _pad_name(button: int) -> String:
	if button <= JOY_BUTTON_Y:
		var faces: Array = FAMILY_FACES[family]
		var face: String = faces[button]
		return face
	if button == JOY_BUTTON_LEFT_SHOULDER or button == JOY_BUTTON_RIGHT_SHOULDER:
		var shoulders: Array = FAMILY_SHOULDERS[family]
		var shoulder: String = shoulders[0 if button == JOY_BUTTON_LEFT_SHOULDER else 1]
		return shoulder
	var name: String = PAD_BUTTONS[button]
	return name


## The family a pad belongs to, by its name.
static func family_of(joy_name: String) -> String:
	var lower: String = joy_name.to_lower()
	for mark: String in ["playstation", "ps3", "ps4", "ps5", "dualshock", "dualsense", "sony"]:
		if lower.contains(mark):
			return "playstation"
	for mark: String in ["nintendo", "switch", "joy-con", "pro controller"]:
		if lower.contains(mark):
			return "nintendo"
	return "xbox"


static func _pad_kind(button: int) -> KeyCaps.Kind:
	if button <= JOY_BUTTON_Y:
		return KeyCaps.Kind.FACE
	if button == JOY_BUTTON_LEFT_SHOULDER or button == JOY_BUTTON_RIGHT_SHOULDER:
		return KeyCaps.Kind.SHOULDER
	return KeyCaps.Kind.STICK
