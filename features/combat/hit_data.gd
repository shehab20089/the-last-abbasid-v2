class_name HitData
extends RefCounted
## One blow in flight: who struck, how hard, and how it may be answered. The attacker's hitbox
## builds it, the defender judges it (Combatant.receive_hit) and both are told the outcome.

enum Outcome {HIT, BLOCKED, PARRIED, DODGED, GUARD_BROKEN, IGNORED}

var attacker: Combatant
var attack: AttackDefinition
var damage: float = 0.0
var stamina_damage: float = 0.0
var poise_damage: float = 0.0
var knockback: float = 0.0
var hit_stop: float = 0.0
## The way the blow travels along x: +1 toward the right, -1 toward the left.
var direction: float = 1.0
## Where the blow lands, for sparks and flecks.
var position: Vector2 = Vector2.ZERO
var unblockable: bool = false
var guard_break: bool = false
## Breaks even a shield wall.
var overwhelms: bool = false
var parryable: bool = true
## Sweeps the legs: no standing guard stops it.
var low: bool = false
## Drags the one struck toward the striker (a hooked axe) instead of driving him off.
var pulls: bool = false
var projectile: bool = false
## A counterattack into an opening made by a parry or a broken guard.
var riposte: bool = false
## Set by the one struck: the blow fell on him before he knew the attacker was there.
var surprise: bool = false
## How long a man this blow staggers stays staggered, as a share (the hero's keepsakes).
var stagger_scale: float = 1.0


static func from_attack(source: Combatant, definition: AttackDefinition) -> HitData:
	var hit: HitData = HitData.new()
	hit.attacker = source
	hit.attack = definition
	hit.damage = definition.damage
	hit.stamina_damage = definition.stamina_damage
	hit.poise_damage = definition.poise_damage
	hit.knockback = definition.knockback
	hit.hit_stop = definition.hit_stop
	hit.direction = source.facing
	hit.unblockable = definition.unblockable
	hit.guard_break = definition.guard_break
	hit.overwhelms = definition.overwhelms
	hit.parryable = definition.parryable
	hit.low = definition.low
	hit.pulls = definition.pulls
	return hit


## The speed this blow throws the one struck along x (its knockback, at least `minimum`, times
## `share`): away from the striker, or toward him for a blow that pulls.
func shove(minimum: float = 0.0, share: float = 1.0) -> float:
	return direction * maxf(knockback, minimum) * share * (-1.0 if pulls else 1.0)


static func outcome_name(outcome: Outcome) -> String:
	return Outcome.keys()[outcome]
