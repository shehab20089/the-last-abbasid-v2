class_name Arrow
extends Area2D
## An arrow in flight: fast, nearly level, dropping a little (loosed from a roof, or up at one, it is
## aimed at the hero, as steeply as it must, up to MAX_ANGLE). It strikes the first body of the
## other side it reaches, which may block it on a shield, parry it aside or roll through it, and
## otherwise sticks in the first wall it meets.

## A wall (-1) or the struck body's outcome (HitData.Outcome) where the arrow ended.
signal impacted(at: Vector2, outcome: int)

@export var speed: float = 330.0
@export var drop: float = 70.0
@export var damage: float = 10.0
@export var stamina_damage: float = 12.0
@export var poise_damage: float = 8.0
@export var knockback: float = 70.0
@export var hit_stop: float = 0.05
@export var lifetime: float = 2.4

## The steepest an arrow is loosed (radians), and the height (px) below which it flies level.
const MAX_ANGLE: float = 0.9
const LEVEL_HEIGHT: float = 28.0

## +1 flying right, -1 flying left. Set before the arrow enters the tree.
var direction: float = 1.0
var shooter: Combatant
var _velocity: Vector2 = Vector2.ZERO
var _done: bool = false
var _fade: float = 0.0

@onready var sprite: Sprite2D = $Sprite


func _ready() -> void:
	_velocity = _loosed()
	sprite.flip_h = direction < 0.0
	area_entered.connect(_on_area_entered)
	body_entered.connect(_on_body_entered)


## Level and fast, as a rule; at a hero well above or below, aimed at his chest (a little high, for the
## drop), never steeper than MAX_ANGLE, and never back over the archer's shoulder.
func _loosed() -> Vector2:
	var level: Vector2 = Vector2(direction * speed, -12.0)
	var hero: Node2D = get_tree().get_first_node_in_group(&"player") as Node2D
	if hero == null:
		return level
	var to: Vector2 = hero.global_position + Vector2(0.0, -40.0) - global_position
	if absf(to.y) < LEVEL_HEIGHT or signf(to.x) != direction:
		return level
	var angle: float = clampf(atan2(to.y, absf(to.x)), -MAX_ANGLE, MAX_ANGLE)
	return Vector2(direction * cos(angle), sin(angle)) * speed


func _physics_process(delta: float) -> void:
	if _done:
		_fade -= delta
		modulate.a = clampf(_fade / 0.4, 0.0, 1.0)
		if _fade <= 0.0:
			queue_free()
		return
	_velocity.y += drop * delta
	position += _velocity * delta
	sprite.rotation = atan2(_velocity.y, absf(_velocity.x)) * direction
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()


func _on_area_entered(area: Area2D) -> void:
	var hurtbox: Hurtbox = area as Hurtbox
	if _done or hurtbox == null:
		return
	var target: Combatant = hurtbox.owner_body
	if target == null or target.dead or target.team == 1:
		return
	var hit: HitData = HitData.new()
	hit.attacker = shooter if is_instance_valid(shooter) else null
	hit.damage = damage
	hit.stamina_damage = stamina_damage
	hit.poise_damage = poise_damage
	hit.knockback = knockback
	hit.hit_stop = hit_stop
	hit.direction = direction
	hit.projectile = true
	hit.position = global_position
	var outcome: HitData.Outcome = target.receive_hit(hit)
	if outcome == HitData.Outcome.DODGED or outcome == HitData.Outcome.IGNORED:
		return
	impacted.emit(global_position, outcome)
	if outcome == HitData.Outcome.PARRIED or outcome == HitData.Outcome.BLOCKED:
		# Turned aside: it spins away and falls.
		_velocity = Vector2(-direction * 90.0, -120.0)
		_done = false
		set_deferred(&"monitoring", false)
		direction = -direction
		sprite.flip_h = not sprite.flip_h
		lifetime = 0.45
		return
	queue_free()


func _on_body_entered(_body: Node2D) -> void:
	if _done:
		return
	_done = true
	_fade = 1.6
	impacted.emit(global_position, -1)
	set_deferred(&"monitoring", false)
