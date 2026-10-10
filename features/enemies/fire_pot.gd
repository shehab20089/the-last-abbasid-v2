class_name FirePot
extends Area2D
## A clay pot of burning naphtha, lobbed in an arc at where the hero is going. It breaks on whatever
## it meets: on the hero (a shield takes the blow, not the fire), or on the street, and where it
## breaks the naphtha burns (BurningGround) for a while. Rolling carries the hero through it. The
## hero's own flasks (his Naft Flask) are the same pot thrown the other way, at the nearest soldier.

## Where it broke: on a body (that body's HitData.Outcome) or on the street (-1).
signal burst(at: Vector2, outcome: int)

## Horizontal speed (px/s) of the lob, and how fast it falls.
@export var speed: float = 200.0
@export var fall: float = 640.0
@export var damage: float = 9.0
@export var stamina_damage: float = 10.0
@export var poise_damage: float = 10.0
@export var knockback: float = 70.0
@export var lifetime: float = 3.0
@export var fire_scene: PackedScene
## The side that threw it (0 the hero's, 1 the soldiers'): it breaks on the other side's bodies.
@export var team: int = 1
## The hero's flask: how far ahead it lands when no soldier is near before him (px).
@export var lob_distance: float = 110.0

## +1 thrown to the right, -1 to the left. Set before the pot enters the tree.
var direction: float = 1.0
var shooter: Combatant
var _velocity: Vector2 = Vector2.ZERO
var _broken: bool = false
## Aimed on its first step, once the thrower has set it at his hand.
var _aimed: bool = false

@onready var sprite: Sprite2D = $Sprite


func _ready() -> void:
	area_entered.connect(_on_area_entered)
	body_entered.connect(_on_body_entered)


## The lob that lands where its mark will be: his place, led by his speed over the flight. A soldier's
## pot is thrown at the hero; the hero's at the nearest soldier before him, or a little way ahead.
func _aim() -> Vector2:
	var mark: Node2D = _mark()
	var goal: Vector2 = global_position + Vector2(direction * lob_distance, 40.0)
	if mark != null:
		var body: CharacterBody2D = mark as CharacterBody2D
		var lead: Vector2 = body.velocity * 0.35 if body != null else Vector2.ZERO
		goal = mark.global_position + Vector2(lead.x, -6.0)
	var dx: float = goal.x - global_position.x
	# Thrown the way he faces, however close the hero is.
	if signf(dx) != direction:
		dx = direction * 24.0
	var time: float = clampf(absf(dx) / speed, 0.45, 1.3)
	var dy: float = goal.y - global_position.y
	return Vector2(dx / time, (dy - 0.5 * fall * time * time) / time)


## Who it is thrown at: the hero, or (thrown by him) the nearest soldier before him.
func _mark() -> Node2D:
	if team == 1:
		return get_tree().get_first_node_in_group(&"player") as Node2D
	var best: Node2D = null
	var nearest: float = 220.0
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var soldier: Combatant = node as Combatant
		if soldier == null or soldier.dead:
			continue
		var dx: float = (soldier.global_position.x - global_position.x) * direction
		if dx > 12.0 and dx < nearest and absf(soldier.global_position.y - global_position.y) < 90.0:
			nearest = dx
			best = soldier
	return best


func _physics_process(delta: float) -> void:
	if _broken:
		return
	if not _aimed:
		_aimed = true
		_velocity = _aim()
	_velocity.y += fall * delta
	position += _velocity * delta
	sprite.rotation += direction * 9.0 * delta
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()


func _on_area_entered(area: Area2D) -> void:
	var hurtbox: Hurtbox = area as Hurtbox
	if _broken or hurtbox == null:
		return
	var target: Combatant = hurtbox.owner_body
	if target == null or target.dead or target.team == team:
		return
	var hit: HitData = HitData.new()
	hit.attacker = shooter if is_instance_valid(shooter) else null
	hit.damage = damage
	hit.stamina_damage = stamina_damage
	hit.poise_damage = poise_damage
	hit.knockback = knockback
	hit.hit_stop = 0.05
	hit.direction = signf(_velocity.x) if _velocity.x != 0.0 else direction
	hit.projectile = true
	hit.cause = &"fire_pot"
	hit.position = global_position
	var outcome: HitData.Outcome = target.receive_hit(hit)
	if outcome == HitData.Outcome.DODGED or outcome == HitData.Outcome.IGNORED:
		return
	_break(outcome)


func _on_body_entered(_body: Node2D) -> void:
	_break(-1)


## The pot shatters; the naphtha burns on the street below where it broke.
func _break(outcome: int) -> void:
	if _broken:
		return
	_broken = true
	sprite.visible = false
	set_deferred(&"monitoring", false)
	burst.emit(global_position, outcome)
	# Out of the physics step: the fire is set down, then the pot is gone.
	_burn.call_deferred(global_position)


func _burn(at: Vector2) -> void:
	if fire_scene != null and get_parent() != null:
		var fire: Node2D = fire_scene.instantiate() as Node2D
		get_parent().add_child(fire)
		fire.global_position = _ground_below(at)
	queue_free()


## The street beneath a point (or the point itself, if nothing is near below).
func _ground_below(at: Vector2) -> Vector2:
	var space: PhysicsDirectSpaceState2D = get_world_2d().direct_space_state
	var query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(at + Vector2(0, -8), at + Vector2(0, 96), 1)
	var hit: Dictionary = space.intersect_ray(query)
	if hit.is_empty():
		return at
	var point: Vector2 = hit["position"]
	return point
