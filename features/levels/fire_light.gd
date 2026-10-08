class_name FireLight
extends PointLight2D
## Firelight that breathes: its energy and reach waver like a real flame. Purely visual.

@export var base_energy: float = 0.9
@export var flicker: float = 0.25
@export var speed: float = 9.0

var _time: float = 0.0
var _seed: float = 0.0


func _ready() -> void:
	_seed = float(get_instance_id() % 997)


func _process(delta: float) -> void:
	_time += delta
	var wave: float = sin(_time * speed + _seed) * 0.5 + sin(_time * speed * 2.3 + _seed * 1.7) * 0.3
	energy = base_energy * (1.0 + wave * flicker)
	texture_scale = 1.0 + wave * 0.03
