@tool
class_name Modifiers
extends Resource
## How a technique bought at a lamp or a keepsake worn changes the hero: multipliers (1.0 changes
## nothing) and bonuses (0 changes nothing). The session sums every bought node and worn keepsake into
## one (combine) and gives it to the Warrior, who reads it where each applies. Read-only.

@export_group("The shield")
## Stamina a blocked blow costs, as a share of its price.
@export var block_cost: float = 1.0
## Seconds added to the parry window, and to the riposte's multiplier.
@export var parry_window: float = 0.0
@export var riposte_bonus: float = 0.0
## A parry gives back this much stamina and resolve.
@export var parry_stamina: float = 0.0
@export var parry_resolve: float = 0.0
## The shield bash's stamina, as a share of its price; and whether it staggers a man who is not guarding.
@export var bash_cost: float = 1.0
@export var bash_staggers: bool = false
## How long a blow or a broken guard leaves him reeling, as a share.
@export var hurt_time: float = 1.0

@export_group("The blade")
## Damage his blows deal while his health is below `low_health_at` of its whole, as a share added.
@export var low_health_damage: float = 0.0
@export var low_health_at: float = 0.3
## How long a soldier he staggers stays staggered, as a share.
@export var enemy_stagger: float = 1.0
## Health a finisher gives back.
@export var finisher_heal: float = 0.0

@export_group("Shadow")
## How far busy soldiers hear him, as a share; and seconds added to their startle.
@export var hearing: float = 1.0
@export var startle: float = 0.0
## Knives added, and whether a knife that kills comes back to him.
@export var extra_knives: int = 0
@export var knife_returns: bool = false
## The plunge's damage, as a share; and the reach (px) about its landing in which men flinch.
@export var plunge_damage: float = 1.0
@export var plunge_flinch: float = 0.0
## Health and resolve a surprise or a plunge kill gives back.
@export var stealth_heal: float = 0.0
@export var stealth_resolve: float = 0.0

@export_group("Body and spirit")
## Health a remedy gives back, added.
@export var remedy_heal: float = 0.0
## Resolve earned, and damage taken, as shares.
@export var resolve_gain: float = 1.0
@export var damage_taken: float = 1.0
## Honour pages give, as a share.
@export var page_honour: float = 1.0
## Keepsakes he can wear, added to the two.
@export var keepsake_slots: int = 0


## Everything in `parts` at once: multipliers multiplied, bonuses added, switches on if any is on.
static func combine(parts: Array[Modifiers]) -> Modifiers:
	var out: Modifiers = Modifiers.new()
	for part: Modifiers in parts:
		if part == null:
			continue
		out.block_cost *= part.block_cost
		out.parry_window += part.parry_window
		out.riposte_bonus += part.riposte_bonus
		out.parry_stamina += part.parry_stamina
		out.parry_resolve += part.parry_resolve
		out.bash_cost *= part.bash_cost
		out.bash_staggers = out.bash_staggers or part.bash_staggers
		out.hurt_time *= part.hurt_time
		out.low_health_damage += part.low_health_damage
		out.low_health_at = maxf(out.low_health_at, part.low_health_at)
		out.enemy_stagger *= part.enemy_stagger
		out.finisher_heal += part.finisher_heal
		out.hearing *= part.hearing
		out.startle += part.startle
		out.extra_knives += part.extra_knives
		out.knife_returns = out.knife_returns or part.knife_returns
		out.plunge_damage *= part.plunge_damage
		out.plunge_flinch = maxf(out.plunge_flinch, part.plunge_flinch)
		out.stealth_heal += part.stealth_heal
		out.stealth_resolve += part.stealth_resolve
		out.remedy_heal += part.remedy_heal
		out.resolve_gain *= part.resolve_gain
		out.damage_taken *= part.damage_taken
		out.page_honour *= part.page_honour
		out.keepsake_slots += part.keepsake_slots
	return out
