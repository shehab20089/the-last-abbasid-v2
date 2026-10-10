class_name HitStop
extends Node
## Freezes the action for a heartbeat when a blow lands, so it lands with weight, and slows it for a
## boss's fall or a finisher. Everything slows together (Engine.time_scale), so no timing rule
## changes; both are measured in unscaled frame time, so they last the same on any machine and in
## fixed-step tests. A freeze inside slow time gives way to the slow time again.

const SLOW: float = 0.05

## Off (a setting): no blow stops time and nothing slows it.
var enabled: bool = true
var _left: float = 0.0
var _slow_left: float = 0.0
var _slow_scale: float = 1.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


## Holds the freeze for `seconds`; a longer stop replaces a shorter one.
func trigger(seconds: float) -> void:
	if seconds <= 0.0 or not enabled:
		return
	_left = maxf(_left, seconds)
	_apply()


## Slows everything to `scale` for `seconds` (a boss's fall, a finisher's blow).
func slow(scale: float, seconds: float) -> void:
	if not enabled:
		return
	_slow_left = maxf(_slow_left, seconds)
	_slow_scale = scale
	_apply()


func clear() -> void:
	_left = 0.0
	_slow_left = 0.0
	Engine.time_scale = 1.0


func _apply() -> void:
	if _left > 0.0:
		Engine.time_scale = SLOW
	elif _slow_left > 0.0:
		Engine.time_scale = _slow_scale
	else:
		Engine.time_scale = 1.0


func _process(delta: float) -> void:
	if _left <= 0.0 and _slow_left <= 0.0:
		return
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	_left = maxf(_left - real, 0.0)
	_slow_left = maxf(_slow_left - real, 0.0)
	_apply()


func _exit_tree() -> void:
	Engine.time_scale = 1.0
