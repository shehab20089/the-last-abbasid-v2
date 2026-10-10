class_name MoveDemos
extends RefCounted
## How each move is shown on a MovePreview's stage: the buttons that make it, in order, and the
## animations it is made of, with the moment each button is pressed.
##
## A demo is { "keys": [[action, how], ...], "steps": [step, ...] }. A key's `how` is "" (pressed),
## "hold" (held down) or "wait" (a beat with no button, drawn as an ellipsis). A step plays `anim`
## (to the end, to `upto`, or `cut` off where the next move of a string takes over, `loops` times) or
## stands for `wait` seconds; `light` is [[key, frame], ...] (each key lights as that frame begins),
## `hold` a key held lit through the step, `run` carries him at a run, `lift` [from, to] raises him off
## the street over the step (a leap), `from` starts the animation part way, `speed` plays the step slower
## (a close call's slowed world), `glint` flashes him bright as it begins, `echo` leaves fading copies of
## him behind. An Art's key is the art button; the screen showing it swaps in the second Art's button
## when it is carried second.

const DEMOS: Dictionary[StringName, Dictionary] = {
	&"cuts": {
		"keys": [[&"attack", ""], [&"attack", ""], [&"attack", ""], [&"attack", ""], [&"", "wait"], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"attack_1", "cut": true, "light": [[0, 0]]},
			{"anim": &"attack_2", "cut": true, "light": [[1, 0]]},
			{"anim": &"attack_3", "cut": true, "light": [[2, 0]]},
			{"anim": &"attack_4", "light": [[3, 0]]},
			{"wait": 0.3},
			{"anim": &"heavy", "light": [[5, 0]]},
		],
	},
	&"kick": {
		"keys": [[&"attack", ""], [&"attack", ""], [&"attack", ""], [&"attack", ""]],
		"steps": [
			{"anim": &"attack_1", "cut": true, "light": [[0, 0]]},
			{"anim": &"attack_2", "cut": true, "light": [[1, 0]]},
			{"anim": &"attack_3", "cut": true, "light": [[2, 0]]},
			{"anim": &"attack_4", "light": [[3, 0]]},
		],
	},
	&"low_cut": {
		"keys": [[&"move_down", "hold"], [&"attack", ""], [&"attack", ""]],
		"steps": [
			{"wait": 0.2, "hold": 0},
			{"anim": &"low_cut", "cut": true, "light": [[1, 0]], "hold": 0},
			{"anim": &"attack_2", "light": [[2, 0]]},
		],
	},
	&"sweep": {
		"keys": [[&"move_down", "hold"], [&"heavy_attack", ""]],
		"steps": [{"wait": 0.2, "hold": 0}, {"anim": &"sweep", "light": [[1, 0]], "hold": 0}],
	},
	&"rising_cleave": {
		"keys": [[&"heavy_attack", ""], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"heavy", "cut": true, "light": [[0, 0]]},
			{"anim": &"heavy_2", "light": [[1, 0]]},
		],
	},
	&"heavy_string": {
		"keys": [[&"heavy_attack", ""], [&"heavy_attack", ""], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"heavy", "cut": true, "light": [[0, 0]]},
			{"anim": &"heavy_2", "cut": true, "light": [[1, 0]]},
			{"anim": &"heavy_3", "light": [[2, 0]]},
		],
	},
	&"running_slash": {
		"keys": [[&"move", "hold"], [&"attack", ""], [&"attack", ""]],
		"steps": [
			{"anim": &"run", "loops": 1, "run": true, "hold": 0},
			{"anim": &"running_slash", "cut": true, "light": [[1, 0]]},
			{"anim": &"attack_2", "light": [[2, 0]]},
		],
	},
	&"guarded_thrust": {
		"keys": [[&"block", "hold"], [&"attack", ""], [&"attack", ""]],
		"steps": [
			{"anim": &"block_start", "hold": 0},
			{"anim": &"block", "loops": 1, "hold": 0},
			{"anim": &"guarded_thrust", "light": [[1, 0]], "hold": 0},
			{"anim": &"guarded_thrust", "light": [[2, 0]], "hold": 0},
			{"anim": &"block", "loops": 1, "hold": 0},
		],
	},
	&"riposte": {
		"keys": [[&"block", ""], [&"attack", ""]],
		"steps": [
			{"anim": &"block_start", "light": [[0, 0]]},
			{"anim": &"parry", "upto": 2},
			{"anim": &"riposte", "light": [[1, 0]]},
		],
	},
	&"down_stab": {
		"keys": [[&"jump", ""], [&"move_down", "hold"], [&"attack", ""]],
		"steps": [
			{"anim": &"jump", "light": [[0, 0]], "lift": [0.0, -34.0]},
			{"anim": &"apex", "lift": [-34.0, -38.0], "hold": 1},
			{"anim": &"down_stab", "upto": 3, "light": [[2, 0]], "hold": 1, "lift": [-38.0, -22.0]},
			{"anim": &"jump", "lift": [-22.0, -42.0]},
			{"anim": &"air_attack", "lift": [-42.0, -30.0]},
			{"anim": &"fall", "lift": [-30.0, 0.0]},
			{"anim": &"land"},
		],
	},
	&"guard": {
		"keys": [[&"block", "hold"], [&"attack", ""]],
		"steps": [
			{"anim": &"block_start", "hold": 0},
			{"anim": &"block", "loops": 3, "hold": 0},
			{"anim": &"parry", "hold": 0},
			{"anim": &"attack_1", "light": [[1, 0]]},
		],
	},
	&"roll": {
		"keys": [[&"dodge", ""]],
		"steps": [{"wait": 0.25}, {"anim": &"roll", "light": [[0, 0]]}],
	},
	&"steady_breath": {
		"keys": [[&"attack", ""], [&"block", ""]],
		"steps": [
			{"anim": &"attack_1", "cut": true, "light": [[0, 0]]},
			{"anim": &"block_start", "light": [[1, 0]], "glint": true},
			{"anim": &"block", "loops": 2, "hold": 1},
		],
	},
	&"close_call": {
		"keys": [[&"dodge", ""], [&"attack", ""]],
		"steps": [
			{"wait": 0.3},
			{"anim": &"roll", "upto": 2, "light": [[0, 0]], "speed": 0.35, "echo": true},
			{"anim": &"roll", "from": 3, "echo": true},
			{"anim": &"attack_3", "light": [[1, 0]]},
		],
	},
	&"ground_stab": {
		"keys": [[&"heavy_attack", ""]],
		"steps": [{"wait": 0.3}, {"anim": &"ground_stab", "light": [[0, 0]]}, {"wait": 0.2}, {"anim": &"finish_ground"}],
	},
	&"leap": {
		"keys": [[&"jump", ""], [&"attack", ""], [&"attack", ""]],
		"steps": [
			{"anim": &"jump", "light": [[0, 0]], "lift": [0.0, -30.0]},
			{"anim": &"apex", "lift": [-30.0, -36.0]},
			{"anim": &"air_attack", "light": [[1, 0]], "lift": [-36.0, -32.0]},
			{"anim": &"air_attack_2", "light": [[2, 0]], "lift": [-32.0, -26.0]},
			{"anim": &"fall", "lift": [-26.0, 0.0]},
			{"anim": &"land"},
		],
	},
	&"finisher": {
		"keys": [[&"heavy_attack", ""]],
		"steps": [{"wait": 0.3}, {"anim": &"finish_behead", "light": [[0, 0]]}],
	},
	&"remedy": {
		"keys": [[&"heal", ""]],
		"steps": [{"anim": &"heal", "light": [[0, 0]]}],
	},
	&"charge": {
		"keys": [[&"heavy_attack", "hold"]],
		"steps": [
			{"anim": &"heavy", "upto": 2, "hold": 0},
			{"anim": &"charge_hold", "loops": 4, "hold": 0},
			{"anim": &"cleave_charged"},
		],
	},
	&"bash": {
		"keys": [[&"block", "hold"], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"block_start", "hold": 0},
			{"anim": &"block", "loops": 2, "hold": 0},
			{"anim": &"bash", "light": [[1, 0]], "hold": 0},
		],
	},
	&"knives": {
		"keys": [[&"throw", ""]],
		"steps": [{"wait": 0.25}, {"anim": &"throw", "light": [[0, 0]]}],
	},
	&"plunge": {
		"keys": [[&"jump", ""], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"jump", "light": [[0, 0]], "lift": [0.0, -34.0]},
			{"anim": &"apex", "lift": [-34.0, -38.0]},
			{"anim": &"plunge", "light": [[1, 0]], "lift": [-38.0, -40.0]},
			{"anim": &"plunge_fall", "loops": 2, "lift": [-40.0, 0.0]},
			{"anim": &"plunge_land"},
		],
	},
	&"roll_cut": {
		"keys": [[&"dodge", ""], [&"attack", ""]],
		"steps": [
			{"anim": &"roll", "upto": 4, "light": [[0, 0], [1, 3]]},
			{"anim": &"roll_cut"},
		],
	},
	&"pommel": {
		"keys": [[&"attack", ""], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"attack_1", "cut": true, "light": [[0, 0], [1, 2]]},
			{"anim": &"pommel_strike"},
		],
	},
	&"whirl": {
		"keys": [[&"attack", ""], [&"attack", ""], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"attack_1", "cut": true, "light": [[0, 0]]},
			{"anim": &"attack_2", "cut": true, "light": [[1, 0], [2, 2]]},
			{"anim": &"whirling_cut"},
		],
	},
	&"delayed_cut": {
		"keys": [[&"attack", ""], [&"attack", ""], [&"", "wait"], [&"attack", ""]],
		"steps": [
			{"anim": &"attack_1", "cut": true, "light": [[0, 0]]},
			{"anim": &"attack_2", "light": [[1, 0]]},
			{"wait": 0.2, "light": [[2, 0]]},
			{"anim": &"delayed_cut", "light": [[3, 0]]},
		],
	},
	&"executioner": {
		"keys": [[&"attack", ""], [&"attack", ""], [&"attack", ""], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"attack_1", "cut": true, "light": [[0, 0]]},
			{"anim": &"attack_2", "cut": true, "light": [[1, 0]]},
			{"anim": &"attack_3", "cut": true, "light": [[2, 0], [3, 2]]},
			{"anim": &"executioner"},
		],
	},
	&"running_thrust": {
		"keys": [[&"move", "hold"], [&"heavy_attack", ""]],
		"steps": [
			{"anim": &"run", "loops": 1, "run": true, "hold": 0},
			{"anim": &"running_thrust", "light": [[1, 0]]},
		],
	},
	&"storm": {"keys": [[&"art", ""]], "steps": [{"wait": 0.2}, {"anim": &"art_storm", "cut": true, "light": [[0, 0]]},
		{"anim": &"art_storm_burst"}]},
	&"pierce": {"keys": [[&"art", ""]], "steps": [{"wait": 0.2}, {"anim": &"art_pierce", "light": [[0, 0]]}]},
	&"naft": {"keys": [[&"art", ""]], "steps": [{"wait": 0.2}, {"anim": &"art_naft", "light": [[0, 0]]}]},
	&"second_wind": {"keys": [[&"art", ""]], "steps": [{"wait": 0.2}, {"anim": &"art_second_wind", "light": [[0, 0]]}]},
	&"judgment": {"keys": [[&"art", ""]], "steps": [{"wait": 0.2}, {"anim": &"finish_impale", "light": [[0, 0]]},
		{"anim": &"art_flit", "loops": 1, "echo": true}, {"anim": &"finish_spin"}]},
}


## The demo for a move, technique or Art, or an empty Dictionary.
static func of(id: StringName) -> Dictionary:
	return DEMOS[id] if DEMOS.has(id) else {}


## The same demo with the art button changed to `action` (the second Art's own button).
static func with_art_button(demo: Dictionary, action: StringName) -> Dictionary:
	var out: Dictionary = demo.duplicate(true)
	var keys: Array = out["keys"]
	for key: Variant in keys:
		var pair: Array = key
		if pair[0] == &"art":
			pair[0] = action
	return out
