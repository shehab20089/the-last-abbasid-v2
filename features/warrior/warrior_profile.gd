@tool
class_name WarriorProfile
extends Resource
## Read-only tuning for the hero: how he moves, rolls, guards and fights. Mutable state (stamina,
## remedies, the combo in progress) belongs to the Warrior.

@export_group("Movement")
## He runs wherever the stick or keys push him; a light tilt of the stick, or a cutscene, walks.
@export var run_speed: float = 150.0
@export var walk_speed: float = 66.0
## A stick tilted less than this walks.
@export_range(0.0, 1.0) var run_tilt: float = 0.6
@export var ground_acceleration: float = 1500.0
@export var ground_deceleration: float = 1900.0
@export var air_acceleration: float = 720.0
@export var jump_velocity: float = 372.0
## Releasing jump while rising keeps this fraction of the upward speed (variable jump height).
@export_range(0.0, 1.0) var jump_cut: float = 0.45
@export var fall_gravity_scale: float = 1.35
## Seconds after leaving a ledge during which a jump still counts.
@export var coyote_time: float = 0.1
## Seconds a jump pressed before landing is remembered.
@export var jump_buffer: float = 0.13
## The walk and run animations' own foot speeds (px/s), so the feet match the ground.
@export var walk_animation_speed: float = 60.0
@export var run_animation_speed: float = 126.0

@export_group("Roll")
@export var roll_speed: float = 215.0
## The window, in seconds from the start of a roll, in which blows pass through.
@export var roll_invulnerable_from: float = 0.0
@export var roll_invulnerable_to: float = 0.3
@export var roll_cost: float = 22.0
## The light button from this far into a roll (seconds) comes up out of it in the rolling cut.
@export var roll_cut_from: float = 0.2

@export_group("Stamina")
@export var max_stamina: float = 100.0
@export var stamina_regen: float = 42.0
@export var stamina_regen_delay: float = 0.55
## A longer pause before stamina returns once it has run out.
@export var exhausted_delay: float = 1.0

@export_group("Guard")
## Seconds after raising the shield in which a blow is parried instead of blocked.
@export var parry_window: float = 0.17
@export var parry_cost: float = 6.0
## After a parry window passes without a blow, the next one opens only after this.
@export var parry_cooldown: float = 0.4
## Fraction of a blocked blow's damage that still gets through.
@export_range(0.0, 1.0) var block_chip: float = 0.0
@export var block_walk_speed: float = 34.0
## Seconds after a parry in which a counterattack lands as a riposte.
@export var riposte_window: float = 1.3
@export var riposte_multiplier: float = 1.8

@export_group("Health")
@export var max_health: float = 100.0
## Seconds a hit stuns the hero.
@export var hurt_time: float = 0.34
@export var guard_break_time: float = 0.75
## Seconds after a hit during which further blows pass harmlessly; longer than the stagger, so a
## hero who is hit always gets a moment to act before he can be hit again.
@export var hit_invulnerability: float = 0.9
## Seconds into a stagger after which a roll can break out of it.
@export var hurt_escape_time: float = 0.18
@export var max_remedies: int = 3
@export var remedy_heal: float = 45.0

@export_group("Attacks")
## The light combo, in order.
@export var combo: Array[AttackDefinition] = []
@export var heavy: AttackDefinition
## In the air: the slash (at most `air_slashes` in one jump) and the plunge (its falling blade, then its
## landing).
@export var air_attack: AttackDefinition
@export var air_slashes: int = 2
@export var plunge: AttackDefinition
@export var plunge_landing: AttackDefinition
## How fast the plunge drops (px/s).
@export var plunge_speed: float = 540.0
## The heavy button behind a raised shield: a bash that breaks a guard and shoves a man back.
@export var bash: AttackDefinition
## Up out of a roll, a rising cut (it chains into the thrust).
@export var roll_cut: AttackDefinition

@export_group("Knives")
## Throwing knives he carries once he has them (lamps refill them), and the knife that flies.
@export var max_knives: int = 3
@export var knife_scene: PackedScene

@export_group("Finishers")
## Stamina a finisher gives back.
@export var finisher_stamina: float = 40.0
