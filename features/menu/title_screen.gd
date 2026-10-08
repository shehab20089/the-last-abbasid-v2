class_name TitleScreen
extends MenuScreen
## The front of the game over the burning skyline: Continue (when there is a journey to resume),
## New Game, Settings and Quit. Asking for a new game over a saved journey asks first.

@onready var continue_button: Button = %Continue
@onready var confirm: Control = %Confirm
@onready var main_list: Control = %MainList
@onready var drift: Control = %Drift

var has_save: bool = false
var _time: float = 0.0


func opened() -> void:
	continue_button.visible = has_save
	confirm.visible = false
	main_list.visible = true


func ask_new_game() -> void:
	main_list.visible = false
	confirm.visible = true
	focus_first()


func cancel_confirm() -> void:
	confirm.visible = false
	main_list.visible = true
	focus_first()


func is_confirming() -> bool:
	return confirm.visible


func _process(delta: float) -> void:
	if not visible:
		return
	_time += delta
	# The key art drifts slowly back and forth behind the title.
	drift.position.x = roundf(-30.0 - sin(_time * 0.05) * 28.0)
