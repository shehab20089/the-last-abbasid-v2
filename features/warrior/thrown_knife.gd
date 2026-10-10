class_name ThrownKnife
extends Area2D
## A throwing knife in flight: fast and flat. It strikes the first soldier it reaches (a raised
## shield turns it aside; a man who never saw it coming dies of it), and otherwise sticks in the
## first wall it meets.

## A wall (-1) or the struck body's outcome (HitData.Outcome) where the knife ended.
signal impacted(at: Vector2, outcome: int)

@export var speed: float = 430.0
@export var drop: float = 40.0
@export var damage: float = 12.0
@export var stamina_damage: float = 12.0
@export var poise_damage: float = 14.0
@export var knockback: float = 80.0
@export var lifetime: float = 1.6

## +1 flying right, -1 flying left. Set before the knife enters the tree.
var direction: float = 1.0
var thrower: Combatant
var _velocity: Vector2 = Vector2.ZERO
var _done: bool = false
var _fade: float = 0.0

@onready var sprite: Sprite2D = $Sprite


func _ready() -> void:
	_velocity = Vector2(direction * speed, -6.0)
	sprite.flip_h = direction < 0.0
	area_entered.connect(_on_area_entered)
	body_entered.connect(_on_body_entered)


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
	if target == null or target.dead or target.team == 0:
		return
	var hit: HitData = HitData.new()
	hit.attacker = thrower if is_instance_valid(thrower) else null
	hit.damage = damage
	hit.stamina_damage = stamina_damage
	hit.poise_damage = poise_damage
	hit.knockback = knockback
	hit.hit_stop = 0.05
	hit.direction = direction
	hit.projectile = true
	hit.position = global_position
	var outcome: HitData.Outcome = target.receive_hit(hit)
	if outcome == HitData.Outcome.DODGED or outcome == HitData.Outcome.IGNORED:
		return
	impacted.emit(global_position, outcome)
	if outcome == HitData.Outcome.BLOCKED or outcome == HitData.Outcome.PARRIED:
		# Turned aside: it spins away and falls.
		_velocity = Vector2(-direction * 80.0, -110.0)
		set_deferred(&"monitoring", false)
		direction = -direction
		sprite.flip_h = not sprite.flip_h
		lifetime = 0.4
		return
	# A knife that killed may come back to his belt (a keepsake's gift).
	var hero: Warrior = thrower as Warrior
	if target.dead and hero != null and is_instance_valid(hero):
		hero.knife_returned()
	queue_free()


func _on_body_entered(_body: Node2D) -> void:
	if _done:
		return
	_done = true
	_fade = 1.4
	impacted.emit(global_position, -1)
	set_deferred(&"monitoring", false)
