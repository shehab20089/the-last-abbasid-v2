class_name TitleScreen
extends MenuScreen
## The front of the game over the burning skyline: Continue (when there is a journey to resume),
## New Game, Settings and Quit. Asking for a new game over a saved journey asks first.

@onready var continue_button: Button = %Continue
@onready var confirm: Control = %Confirm
@onready var main_list: Control = %MainList
@onready var drift: Control = %Drift

var has_save: bool = false
## Where the saved journey stands (the street and the time played), shown under Continue.
var save_place: String = ""
var _time: float = 0.0
var _place: Label


func _ready() -> void:
	super._ready()
	_place = Label.new()
	_place.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_place.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_place.add_theme_color_override(&"font_color", Color(0.82, 0.72, 0.52))
	main_list.add_child(_place)
	main_list.move_child(_place, continue_button.get_index() + 1)


func opened() -> void:
	continue_button.visible = has_save
	_place.visible = has_save and save_place != ""
	_place.text = save_place
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


## Back while asking "Begin anew?" answers no.
func _unhandled_input(event: InputEvent) -> void:
	if visible and confirm.visible and event.is_action_pressed(&"ui_cancel"):
		get_viewport().set_input_as_handled()
		chosen.emit(&"cancel_new")


func _process(delta: float) -> void:
	if not visible:
		return
	_time += delta
	# The key art drifts slowly back and forth behind the title.
	drift.position.x = roundf(-30.0 - sin(_time * 0.05) * 28.0)
