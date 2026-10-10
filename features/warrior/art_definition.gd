@tool
class_name ArtDefinition
extends Resource
## One of the hero's Arts: a great technique paid for with resolve (the meter a fight fought well
## fills). Shared and read-only like an AttackDefinition; the Warrior plays it. An Art strikes with
## its `attack` (whose frames drive the hitbox like any blow), throws a `projectile`, gives back breath,
## or passes judgment on the nearest man.

@export var id: StringName = &"art"
@export var cost: float = 50.0
## The animation it plays when it strikes nothing of its own (a throw, a breath).
@export var animation: StringName = &""
## The blow it strikes, or none, and the blow that follows it at once as it ends (the Storm's rising cut).
@export var attack: AttackDefinition
@export var finale: AttackDefinition

@export_group("While it plays")
## Nothing staggers him (blows still wound him).
@export var armoured: bool = false
## No blow touches him (a dash through a line of men).
@export var invulnerable: bool = false
## It may be used in the air.
@export var in_air: bool = false
## The stick steers him while it plays (px/s; the Storm's turns).
@export var steer_speed: float = 0.0
## How hard he stops once its lunge is spent (px/s/s; 0: as any blow).
@export var brake: float = 0.0
## On `effect_frame` every man it struck takes this blow too (the Line's wounds opening).
@export var opens_wounds: AttackDefinition

@export_group("Throw")
## What it throws, on which frame of its animation, from where (body space facing right).
@export var projectile: PackedScene
@export var release_frame: int = -1
@export var release_offset: Vector2 = Vector2(16, -60)

@export_group("Second wind")
## Health it gives back, whether it fills his breath, and for how long after it his blows cost no
## stamina and light blows (below `steel_threshold` damage) do not stagger him.
@export var heal: float = 0.0
@export var restores_stamina: bool = false
@export var steel_time: float = 0.0
@export var steel_threshold: float = 15.0
## The frame of its animation on which it takes effect.
@export var effect_frame: int = 0
## The cry: every soldier within `cry_radius` px is thrown back (`cry_knockback`) and staggered
## (`cry_stagger` s); a boss in his armour only gives ground.
@export var cry_radius: float = 0.0
@export var cry_knockback: float = 0.0
@export var cry_stagger: float = 0.0
## The fury that follows: his blows come `fury_speed` times faster, each that lands gives back
## `fury_heal` health, and each kill holds it `fury_kill_time` s longer (up to 5 s more).
@export var fury_speed: float = 1.0
@export var fury_heal: float = 0.0
@export var fury_kill_time: float = 0.0

@export_group("Judgment")
## Finishes the nearest man within `judgment_reach` px before him at once (a scripted kill); one who
## cannot be finished (a captain in his armour, a hardened man still fresh) takes `attack` instead.
@export var judgment: bool = false
@export var judgment_reach: float = 64.0
## How many men one judgment takes, one after another, nearest first.
@export var judgment_chain: int = 1

@export_group("Presentation")
## Translation keys for its name and what it does, its icon, and the sting it sounds as it begins.
@export var name_key: String = ""
@export var description_key: String = ""
@export var icon: Texture2D
@export var cue: StringName = &""
