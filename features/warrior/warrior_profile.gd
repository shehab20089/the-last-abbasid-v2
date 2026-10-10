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
@export var roll_cost: float = 20.0
## The light button from this far into a roll (seconds) comes up out of it in the rolling cut.
@export var roll_cut_from: float = 0.2

@export_group("Breath")
## Breath (stamina): spent on every action, earned back by blows that land (AttackDefinition.breath_gain),
## by raising the shield in a blow's closing glint (Steady Breath), by a parry and by a close call.
@export var max_stamina: float = 100.0
@export var stamina_regen: float = 48.0
@export var stamina_regen_delay: float = 0.4
## A longer pause before breath returns once it has run out (he is winded).
@export var exhausted_delay: float = 1.1
## Steady Breath: as a blow's live frames end, steel glints on him for this long; the shield raised in
## the glint (or a moment before it) draws this much breath and turns the recovery into the guard.
@export var steady_window: float = 0.16
@export var steady_early: float = 0.05
@export var steady_breath: float = 20.0
## Breath a parry gives back.
@export var parry_breath: float = 12.0
## A close call: a blow that would have landed this early in a roll. It gives breath, slows the world a
## moment, and makes his next blow within counter_window a counter (as a riposte).
@export var close_call_window: float = 0.18
@export var close_call_breath: float = 20.0
@export var counter_window: float = 1.1

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
## His blade beaten aside by a duellist's shield: seconds he stands thrown open.
@export var thrown_open_time: float = 0.5
## Thrown down by a blow no guard turns (a mace's overhead): seconds he lies before he gets up, how long
## getting up takes, and how soon a roll gets him out of it.
@export var knockdown_time: float = 0.75
@export var getup_time: float = 0.42
@export var down_escape: float = 0.3
@export var max_remedies: int = 3
@export var remedy_heal: float = 45.0

@export_group("Attacks")
## The light combo, in order.
@export var combo: Array[AttackDefinition] = []
## Seconds after a step of the string ends (or he steps out of it) in which the light button still carries
## the string on, not back to its first cut.
@export var string_grace: float = 0.3
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
## The heavy button over a man thrown down: the blade driven down into him.
@export var ground_stab: AttackDefinition
## Down and the light button: a cut at the shins that passes under a raised round shield.
@export var low_cut: AttackDefinition
## Down and the heavy button (once taught): a whole turn at the shins that throws men down all round.
@export var sweep: AttackDefinition
## The heavy button again after the cleave, and again: the rising cleave, then the windmill.
@export var heavy_string: Array[AttackDefinition] = []
## The light button on the run: a leaping cut that closes the gap.
@export var running_slash: AttackDefinition
## The light button behind the raised shield: a thrust over its rim, the shield still up.
@export var shield_thrust: AttackDefinition
## The light button after a parry or a close call: the riposte, a lunge at the throat.
@export var riposte_attack: AttackDefinition
## The second slash of a jump (a backhand), and down and the light button in the air: the down-stab.
@export var air_slash_2: AttackDefinition
@export var down_stab: AttackDefinition
## How fast the down-stab throws him back up off what it struck.
@export var bounce_velocity: float = 330.0
## How long a light blow that glanced off a shield throws his arm back.
@export var glance_time: float = 0.22

@export_group("Enders")
## The heavy button in a light attack's live frames ends the string its own way (once learned): the
## pommel strike after the cut (the rising cut follows it), the whirling cut after the rising cut (or
## the delayed cut), the executioner's cleave after the thrust.
@export var pommel_strike: AttackDefinition
@export var whirling_cut: AttackDefinition
@export var executioner: AttackDefinition
## The light button a beat after the rising cut ends (within `delay_window` s): a heavier cut that
## comes as a soldier lowers his guard; the thrust follows it.
@export var delayed_cut: AttackDefinition
@export var delay_window: float = 0.4

@export_group("Charge")
## The heavy button held: the cleave's wind-up holds, and the blow grows. Released before
## `charge_times.x` s it is the plain cleave; after, the second of `charged_cleaves`; after
## `charge_times.y` s, the third.
@export var charged_cleaves: Array[AttackDefinition] = []
@export var charge_times: Vector2 = Vector2(0.75, 1.35)
## The frame of the cleave on which the raised blade can be held.
@export var charge_frame: int = 2

@export_group("Running thrust")
## The heavy button after running this long (s): the point driven forward in a long dash.
@export var running_thrust: AttackDefinition
@export var running_thrust_after: float = 0.2

@export_group("Resolve and Arts")
## The resolve meter: blows landed fill it (each attack's `resolve_gain`), as do a parry, a riposte
## and a finisher; a blow taken drains it; the Arts spend it.
@export var max_resolve: float = 100.0
@export var resolve_parry: float = 15.0
@export var resolve_riposte: float = 6.0
@export var resolve_finisher: float = 20.0
@export var resolve_hurt: float = 10.0
## Earned by a kill (more for one the dead man never saw coming, a surprise or a plunge), and by a
## captive saved from the headsman (the session pays these).
@export var resolve_kill: float = 5.0
@export var resolve_surprise_kill: float = 15.0
@export var resolve_saved: float = 25.0
## Out of the fight this long (s), resolve above `resolve_kept` ebbs back to it, `resolve_ebb` a second:
## an Art waits for the next fight, the rest must be earned in it.
@export var resolve_idle: float = 8.0
@export var resolve_kept: float = 50.0
@export var resolve_ebb: float = 4.0
## Every Art he can learn, in the order they come.
@export var arts: Array[ArtDefinition] = []

@export_group("Knives")
## Throwing knives he carries once he has them (lamps refill them), and the knife that flies.
@export var max_knives: int = 3
@export var knife_scene: PackedScene

@export_group("Finishers")
## Stamina a finisher gives back.
@export var finisher_stamina: float = 40.0
