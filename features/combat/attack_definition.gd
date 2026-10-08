@tool
class_name AttackDefinition
extends Resource
## Shared, read-only description of one attack: its animation, the frames on which its blade is
## live, its force and its cost. Mutable cadence (combo state, who a swing already hit) belongs to
## the actor performing it. Frame numbers index the attack's animation strip.

@export var display_name: String = "Attack"
@export var animation: StringName = &"attack_1"

@export_group("Timing")
## First and last frame (inclusive) on which the blade can hit.
@export var active_from: int = 2
@export var active_to: int = 3
## From this frame on the attack may be cut short: by the next attack of a combo, a roll or a block.
@export var recovery_from: int = 4
## Enemy attacks: the frame on which the wind-up warning glints (-1 for none).
@export var telegraph_frame: int = -1
## A follow-up only ever thrown straight after another blow of a chain: the chain's rhythm is its
## warning, so it need not glint. Every other enemy attack glints at least 0.22 s before it lands.
@export var chained: bool = false
## Enemy attacks: a flinch from a light blow does not interrupt the wind-up or the strike.
@export var super_armor: bool = false
## The frame on which a projectile (an arrow) leaves, or -1.
@export var projectile_frame: int = -1

@export_group("Force")
@export_range(0.0, 200.0) var damage: float = 12.0
@export_range(0.0, 200.0) var poise_damage: float = 10.0
## What blocking this blow costs the defender in stamina.
@export_range(0.0, 200.0) var stamina_damage: float = 14.0
@export_range(0.0, 600.0) var knockback: float = 90.0
## Real seconds the action freezes when the blow lands, so it lands with weight.
@export_range(0.0, 0.3, 0.005) var hit_stop: float = 0.06
@export_range(0.0, 8.0) var camera_shake: float = 1.5
## Breaks a guard outright (heavy blows).
@export var guard_break: bool = false
## Breaks even a shield-bearer's tall shield (the shield bash's shove, the plunge from above).
@export var overwhelms: bool = false
## Cannot be blocked or parried (shown by a different telegraph).
@export var unblockable: bool = false
@export var parryable: bool = true
## Strikes low (a sweep at the legs): no standing guard stops it; jump over it or roll through.
## Shown by an amber glint.
@export var low: bool = false
## What this blow can cut off a man it kills (head, arm, leg, waist), and how often it does.
@export var severs: Array[StringName] = []
@export_range(0.0, 1.0) var sever_chance: float = 0.0

@export_group("Movement")
## Forward speed (px/s) the attacker moves at between lunge_from and lunge_to.
@export var lunge_speed: float = 0.0
@export var lunge_from: int = 0
@export var lunge_to: int = -1

@export_group("Cost")
@export_range(0.0, 100.0) var stamina_cost: float = 10.0

@export_group("Hitbox")
## Strike with the blade's swept area from the animation; false strikes with fallback_hitbox (a
## shield charge).
@export var use_blade_sweep: bool = true
## Used when the animation carries no blade sweep for an active frame (or use_blade_sweep is off).
## In body space facing right (x forward, y down, origin at the feet).
@export var fallback_hitbox: Rect2 = Rect2(8, -60, 40, 40)

@export_group("Presentation")
@export var swing_cue: StringName = &"sword_swing"
@export var hit_cue: StringName = &"sword_hit"
## The effect a landed blow throws up across the target: a cut's streak or a thrust's.
@export var impact_effect: StringName = &"hit_slash"


func is_active_frame(frame: int) -> bool:
	return frame >= active_from and frame <= active_to


func is_lunge_frame(frame: int) -> bool:
	return lunge_speed != 0.0 and frame >= lunge_from and frame <= lunge_to


func validation_errors() -> PackedStringArray:
	var errors: PackedStringArray = []
	if active_to < active_from:
		errors.append("%s: active_to is before active_from." % display_name)
	if recovery_from < active_from:
		errors.append("%s: recovery starts before the blade is live." % display_name)
	if damage < 0.0 or stamina_cost < 0.0:
		errors.append("%s: damage and cost must be nonnegative." % display_name)
	return errors
