class_name BurningGround
extends Area2D
## Naphtha burning where a fire pot broke: for a few seconds anyone of the hero's side standing in it
## is burned (no shield stops fire; the hero's invulnerability after a blow spaces the burns out),
## thrown a little away from its heart. Then it gutters out.

@export var duration: float = 2.8
## Seconds between burns.
@export var tick: float = 0.45
@export var damage: float = 7.0
@export var knockback: float = 110.0

var _left: float = 0.0
var _next: float = 0.0

@onready var flames: AnimatedSprite2D = $Flames


func _ready() -> void:
	_left = duration
	add_to_group(&"hazards")


func _physics_process(delta: float) -> void:
	_left -= delta
	modulate.a = clampf(_left / 0.5, 0.0, 1.0)
	if _left <= 0.0:
		queue_free()
		return
	_next -= delta
	if _next > 0.0:
		return
	_next = tick
	for area: Area2D in get_overlapping_areas():
		var hurtbox: Hurtbox = area as Hurtbox
		if hurtbox == null:
			continue
		var target: Combatant = hurtbox.owner_body
		if target == null or target.dead or target.team != 0:
			continue
		var hit: HitData = HitData.new()
		hit.damage = damage
		hit.knockback = knockback
		hit.hit_stop = 0.03
		hit.unblockable = true
		hit.direction = signf(target.global_position.x - global_position.x) if target.global_position.x != global_position.x else 1.0
		hit.position = target.global_position + Vector2(0, -8)
		target.receive_hit(hit)


## True while it still burns (for tests and for soldiers who would keep out of it).
func burning() -> bool:
	return _left > 0.0
