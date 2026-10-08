class_name WarriorInput
extends Node
## Reads the player's controls into intents the Warrior acts on. A press is remembered for a short
## while (input buffering), so a button pushed a little early, during an attack or in the air,
## still counts. Disabled, it reads nothing, and scripts (cutscenes, tests) drive the fields and
## press() directly.

## Seconds a press is remembered.
const BUFFER: float = 0.16
const ACTIONS: Array[StringName] = [&"jump", &"attack", &"heavy_attack", &"dodge", &"block",
	&"interact", &"heal"]

## Reads the devices when true; when false the fields are left to a script.
var enabled: bool = true
## -1 .. 1 horizontal intent.
var move: float = 0.0
var jump_held: bool = false
var block_held: bool = false
var _buffered: Dictionary[StringName, float] = {}
var _hold_off: float = 0.0


## Refreshes the intents for this physics step.
func poll(delta: float) -> void:
	for action: StringName in _buffered.keys():
		_buffered[action] -= delta
		if _buffered[action] <= 0.0:
			_buffered.erase(action)
	if not enabled:
		return
	if _hold_off > 0.0:
		# Just back from a menu or a conversation: the button that closed it must not act.
		_hold_off -= delta
		move = 0.0
		jump_held = false
		block_held = false
		return
	move = Input.get_axis(&"move_left", &"move_right")
	if absf(move) < 0.2:
		move = 0.0
	jump_held = Input.is_action_pressed(&"jump")
	block_held = Input.is_action_pressed(&"block")
	for action: StringName in ACTIONS:
		if Input.is_action_just_pressed(action):
			press(action)


## Records a press as if the button had just been pushed.
func press(action: StringName) -> void:
	_buffered[action] = BUFFER


## True while a press of `action` is remembered.
func has(action: StringName) -> bool:
	return _buffered.has(action)


## Takes a remembered press: true once, then forgotten.
func consume(action: StringName) -> bool:
	if _buffered.has(action):
		_buffered.erase(action)
		return true
	return false


## Ignores the devices for a moment (after a menu or a conversation closes).
func hold_off(seconds: float) -> void:
	_hold_off = seconds
	clear()


## Forgets every press and lets go of every held intent (pause, death, cutscenes).
func clear() -> void:
	_buffered.clear()
	move = 0.0
	jump_held = false
	block_held = false
