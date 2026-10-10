class_name BurningGround
extends Area2D
## Naphtha burning where a fire pot broke: for a few seconds anyone of the side it burns standing in
## it is burned (no shield stops fire; the hero's invulnerability after a blow spaces the burns out),
## thrown a little away from its heart. Then it gutters out. The soldiers' fire burns the hero's side,
## and a soldier the hero throws into it (one walking knows to keep his feet out of it); the hero's own
## naphtha burns anyone in it, him too, and staggers each soldier the first time.

@export var duration: float = 2.8
## Seconds between burns.
@export var tick: float = 0.45
@export var damage: float = 7.0
@export var knockback: float = 110.0
## The side it burns (0 the hero's, 1 the soldiers'), or -1 for anyone.
@export var burns_team: int = 0
## Poise the first burn takes from each body (enough, and it staggers him).
@export var first_poise: float = 0.0
## A soldier caught in it is set ablaze for this long (s; 0: it only burns where it lies).
@export var ignites: float = 0.0

var _left: float = 0.0
var _next: float = 0.0
## Those it has burned once already.
var _burned: Array[Combatant] = []

@onready var flames: AnimatedSprite2D = $Flames


func _ready() -> void:
	_left = duration
	# A beat as it takes: long enough for it to know who stands in it.
	_next = 0.05
	add_to_group(&"hazards")


## Whether a point stands in the fire (a soldier will not step into it).
func covers(point: Vector2) -> bool:
	var shape: CollisionShape2D = get_node_or_null(^"Shape") as CollisionShape2D
	var rect: RectangleShape2D = shape.shape as RectangleShape2D if shape != null else null
	if rect == null or _left <= 0.0:
		return false
	var centre: Vector2 = shape.global_position
	return absf(point.x - centre.x) <= rect.size.x * 0.5 and absf(point.y - centre.y) <= rect.size.y * 0.5 + 24.0


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
		if target == null or target.dead:
			continue
		if burns_team >= 0 and target.team != burns_team and not target.is_reeling():
			continue
		var hit: HitData = HitData.new()
		hit.damage = damage
		hit.knockback = knockback
		var first: bool = not target in _burned
		if first:
			_burned.append(target)
			hit.poise_damage = first_poise
		hit.hit_stop = 0.03
		hit.unblockable = true
		hit.cause = &"fire"
		hit.direction = signf(target.global_position.x - global_position.x) if target.global_position.x != global_position.x else 1.0
		hit.position = target.global_position + Vector2(0, -8)
		target.receive_hit(hit)
		# Caught the first time, a soldier is set ablaze (after the burn, so he runs from it).
		if first and ignites > 0.0 and target.team != 0 and not target.dead:
			target.ignite(ignites, signf(target.global_position.x - global_position.x))


## True while it still burns (for tests and for soldiers who would keep out of it).
func burning() -> bool:
	return _left > 0.0
