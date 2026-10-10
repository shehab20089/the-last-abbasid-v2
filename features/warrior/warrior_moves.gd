class_name WarriorMoves
extends RefCounted
## The hero's choice of move: what each of his buttons makes of the moment, and the string's memory that
## decides it. On his feet the light button is the riposte out of a parry or a close call, the low cut with
## down held, the running slash at a man ahead, the delayed cut a beat after the rising cut, the string's
## next step a beat after a step ends, or the string's first cut; the heavy button (once no man stands open
## to a finisher or lies before him) is the sweep with down held, the bash behind the shield, the running
## thrust, or the cleave. A press in a blow's live frames is kept for the moment it gives way: the light
## button carries the string on, the heavy one turns the step into its ender. It decides and remembers; the
## Warrior pays for each move and plays it (his states, his rules, his breath). A move is named by its
## combo index (`Warrior.HEAVY_INDEX` and the rest).

## How far ahead (px) a man must be for a run to end in a running blow (else the button is the plain one).
const RUN_REACH: float = 170.0
## How near a soldier must be for the run, the roll and the leap to be named as moves (open_techniques).
const COACH_REACH: float = 200.0
## How near a raised guard (the low cut), a crowd (the sweep) and a man (the guarded thrust) must be for the
## coach to name the move.
const LOW_CUT_COACH: float = 72.0
const SWEEP_COACH: float = 72.0
const GUARDED_COACH: float = 80.0

## A press kept from the live frames of the blow playing for the moment it gives way: the blow it calls
## for, and its index.
var queued_attack: AttackDefinition
var queued_index: int = 0
## Counting down after the rising cut ends: a light press now is the delayed cut.
var delay_window: float = 0.0
## A beat after a step of the string ends in which the light button still carries it on, and the step.
var string_grace: float = 0.0
var string_next: int = -1

var warrior: Warrior
var profile: WarriorProfile:
	get:
		return warrior.profile
var input: WarriorInput:
	get:
		return warrior.input


func _init(hero: Warrior) -> void:
	warrior = hero


# --- The string's memory -------------------------------------------------------------------------

## A new blow begins (or an Art, or a return to a lamp): no press kept, the string's beats closed.
func clear() -> void:
	queued_attack = null
	delay_window = 0.0
	string_grace = 0.0


## He turned to something else (the charge, a throw, a blow in the air, the plunge, a recoil, a finisher):
## the press kept for the blow that was playing is dropped.
func forget() -> void:
	queued_attack = null


## The shield raised, or a roll: the string's beats closed.
func break_string() -> void:
	delay_window = 0.0
	string_grace = 0.0


## The blow playing gave way (it ended, or he stepped out of it): after the rising cut (or the rolling cut)
## the light button is for a moment the delayed cut, and after any step of the string it still carries the
## string on from where it was.
func gave_way() -> void:
	if warrior.combo_index == 1 and warrior.knows(&"delayed_cut") and profile.delayed_cut != null:
		delay_window = profile.delay_window
	string_next = light_follow()
	string_grace = profile.string_grace if string_next >= 0 else 0.0


func tick(delta: float) -> void:
	delay_window = maxf(0.0, delay_window - delta)
	string_grace = maxf(0.0, string_grace - delta)


# --- What the buttons make of the moment ---------------------------------------------------------

## What the light button makes of a moment on his feet: out of a parry or a close call, the riposte; down,
## the low cut; running at a man, the running slash; a beat after the rising cut, the delayed cut; a beat
## after any step of the string, the next step; else the string's first cut.
func light_move() -> int:
	if warrior.riposte_ready() and profile.riposte_attack != null:
		return Warrior.RIPOSTE_INDEX
	if input.down_held and warrior.knows(&"low_cut") and profile.low_cut != null:
		return Warrior.LOW_INDEX
	if _running_at_foe() and warrior.knows(&"running_slash") and profile.running_slash != null:
		return Warrior.RUN_SLASH_INDEX
	if delay_window > 0.0 and profile.delayed_cut != null:
		return Warrior.DELAYED_INDEX
	if string_grace > 0.0 and string_next >= 0:
		return string_next
	return 0


## What the heavy button makes of a moment on his feet, once no man stands open to a finisher or lies
## before him (the hero looks for those himself): down, the sweep; behind the shield, the bash; running at
## a man, the running thrust; else the cleave. NO_INDEX when he has none of them.
func heavy_move() -> int:
	if input.down_held and profile.sweep != null and warrior.knows(&"sweep"):
		return Warrior.SWEEP_INDEX
	if input.block_held and profile.bash != null and warrior.knows(&"bash"):
		return Warrior.BASH_INDEX
	if _running_at_foe() and profile.running_thrust != null and warrior.knows(&"running_thrust"):
		return Warrior.RUNNING_INDEX
	if profile.heavy != null:
		return Warrior.HEAVY_INDEX
	return Warrior.NO_INDEX


## From the live frames of the blow playing on, a press waits for the moment it gives way: the light
## button carries the string on, the heavy one turns it into the step's ender (not over a man open to a
## finisher, whom the heavy button finishes). The first such press is kept.
func keep_press() -> void:
	if queued_attack != null:
		return
	var follow: int = light_next()
	if follow != Warrior.NO_INDEX and input.has(&"attack"):
		input.consume(&"attack")
		queued_attack = attack_of(follow)
		queued_index = follow
	elif input.has(&"heavy_attack") and warrior.finisher_target == null:
		var ender: int = ender_index()
		if ender != Warrior.NO_INDEX:
			input.consume(&"heavy_attack")
			queued_attack = ender_attack(ender)
			queued_index = ender


## What the light button makes of the move playing, once it gives way: the low cut (down held, once
## learned), the string's next step, or the string from its first cut. NO_INDEX behind the shield after the
## guarded thrust (the button repeats that).
func light_next() -> int:
	if profile.combo.is_empty() or (warrior.combo_index == Warrior.GUARDED_INDEX and input.block_held):
		return Warrior.NO_INDEX
	if input.down_held and warrior.knows(&"low_cut") and profile.low_cut != null:
		return Warrior.LOW_INDEX
	var follow: int = light_follow()
	return follow if follow >= 0 else 0


## The step of the combo the light button carries on to from the move playing, or -1 (none: the string
## starts again).
func light_follow() -> int:
	match warrior.combo_index:
		0, Warrior.POMMEL_INDEX, Warrior.RUNNING_INDEX, Warrior.LOW_INDEX, Warrior.RUN_SLASH_INDEX, Warrior.RIPOSTE_INDEX:
			return 1 if profile.combo.size() > 1 else -1
		1, Warrior.DELAYED_INDEX:
			return 2 if profile.combo.size() > 2 else -1
		2:
			return Warrior.KICK_INDEX if profile.combo.size() > Warrior.KICK_INDEX and warrior.knows(&"kick") else -1
	return -1


## The ender the heavy button makes of the move playing, once learned: the pommel strike after the cut,
## the whirling cut after the rising cut (or the rolling or delayed cut), the executioner's cleave after
## the thrust, the heavy string's next blow after the cleave. NO_INDEX when there is none.
func ender_index() -> int:
	match warrior.combo_index:
		0:
			if warrior.knows(&"pommel") and profile.pommel_strike != null:
				return Warrior.POMMEL_INDEX
		1, Warrior.DELAYED_INDEX:
			if warrior.knows(&"whirl") and profile.whirling_cut != null:
				return Warrior.WHIRL_INDEX
		2:
			if warrior.knows(&"executioner") and profile.executioner != null:
				return Warrior.EXECUTIONER_INDEX
		Warrior.HEAVY_INDEX, Warrior.CHARGED_INDEX:
			if warrior.knows(&"rising_cleave") and profile.heavy_string.size() > 0:
				return Warrior.HEAVY_2_INDEX
		Warrior.HEAVY_2_INDEX:
			if warrior.knows(&"windmill") and profile.heavy_string.size() > 1:
				return Warrior.HEAVY_3_INDEX
	return Warrior.NO_INDEX


## The blow an ender's index stands for.
func ender_attack(index: int) -> AttackDefinition:
	match index:
		Warrior.POMMEL_INDEX:
			return profile.pommel_strike
		Warrior.WHIRL_INDEX:
			return profile.whirling_cut
		Warrior.EXECUTIONER_INDEX:
			return profile.executioner
		Warrior.HEAVY_2_INDEX:
			return profile.heavy_string[0]
		Warrior.HEAVY_3_INDEX:
			return profile.heavy_string[1]
	return null


## The blow a move's index stands for: a step of the string, a move a button chose, or an ender.
func attack_of(index: int) -> AttackDefinition:
	if index >= 0:
		return profile.combo[index]
	match index:
		Warrior.LOW_INDEX:
			return profile.low_cut
		Warrior.RIPOSTE_INDEX:
			return profile.riposte_attack
		Warrior.RUN_SLASH_INDEX:
			return profile.running_slash
		Warrior.DELAYED_INDEX:
			return profile.delayed_cut
		Warrior.SWEEP_INDEX:
			return profile.sweep
		Warrior.BASH_INDEX:
			return profile.bash
		Warrior.RUNNING_INDEX:
			return profile.running_thrust
		Warrior.HEAVY_INDEX:
			return profile.heavy
	return ender_attack(index)


## Whether the plain cleave may follow the move playing (once it gives way): after a cut with no
## ender learned, a bash, the pommel strike, the delayed cut or the running thrust.
func cleave_follows() -> bool:
	var playing: int = warrior.combo_index
	return playing >= 0 or playing in [Warrior.BASH_INDEX, Warrior.POMMEL_INDEX, Warrior.DELAYED_INDEX,
		Warrior.RUNNING_INDEX, Warrior.LOW_INDEX, Warrior.RUN_SLASH_INDEX, Warrior.RIPOSTE_INDEX, Warrior.GUARDED_INDEX]


# --- The coach's reading -------------------------------------------------------------------------

## The learned techniques a button would make of this moment, for a coach to name (nothing is decided
## here): the ender while a cut plays, the delayed cut a beat after the rising cut, the charge as the
## cleave's blade rises, the running thrust on the run, the bash behind the shield, the rolling cut late
## in a roll, the plunge in the air (those three with a soldier near, not on every run or leap), and in a
## fight each Art he carries and can pay for. The heavy button finishes a man who stands open, so no
## ender is named then.
func open_techniques() -> Array[StringName]:
	var out: Array[StringName] = []
	var current_attack: AttackDefinition = warrior.current_attack
	match warrior.state:
		Warrior.State.ATTACK:
			if current_attack != null and queued_attack == null and warrior.finisher_target == null:
				var ender: int = ender_index()
				var live: bool = warrior.sprite.frame >= current_attack.active_from
				# The heavy string's next blow is named once this one is live (the charge comes first).
				if ender != Warrior.NO_INDEX and (live or not ender in [Warrior.HEAVY_2_INDEX, Warrior.HEAVY_3_INDEX]):
					out.append(Warrior.INDEX_TECHNIQUES[ender])
				# After the thrust, the kick (the light button).
				if live and light_follow() == Warrior.KICK_INDEX:
					out.append(&"kick")
				if (warrior.combo_index == Warrior.HEAVY_INDEX and current_attack == profile.heavy
						and not warrior.charge_decided() and warrior.knows(&"charge") and not profile.charged_cleaves.is_empty()):
					out.append(&"charge")
				# Short of breath, the shield raised as the blow ends draws it back.
				if (out.is_empty() and warrior.blow_met() and warrior.stamina < profile.max_stamina * 0.5
						and warrior.sprite.frame >= current_attack.active_from):
					out.append(&"steady_breath")
		Warrior.State.IDLE, Warrior.State.MOVE:
			if (warrior.finisher_target == null and profile.ground_stab != null
					and downed_foe(Warrior.GROUND_REACH) != null):
				out.append(&"ground_stab")
			if warrior.riposte_ready() and profile.riposte_attack != null:
				out.append(&"riposte")
			if warrior.knows(&"low_cut") and profile.low_cut != null and _guard_ahead(LOW_CUT_COACH):
				out.append(&"low_cut")
			if warrior.knows(&"sweep") and profile.sweep != null and _foes_near(SWEEP_COACH) >= 2:
				out.append(&"sweep")
			if delay_window > 0.0 and warrior.knows(&"delayed_cut") and profile.delayed_cut != null:
				out.append(&"delayed_cut")
			if _running_at_foe() and warrior.knows(&"running_thrust") and profile.running_thrust != null:
				out.append(&"running_thrust")
			if _running_at_foe() and warrior.knows(&"running_slash") and profile.running_slash != null:
				out.append(&"running_slash")
			if warrior.has_resolve() and warrior.foe_still_fighting(null):
				for art: ArtDefinition in warrior.carried_arts():
					if warrior.resolve >= art.cost:
						out.append(art.id)
		Warrior.State.BLOCK:
			if warrior.knows(&"guarded_thrust") and profile.shield_thrust != null and _foe_near(GUARDED_COACH):
				out.append(&"guarded_thrust")
			if warrior.knows(&"bash") and profile.bash != null:
				out.append(&"bash")
		Warrior.State.PARRY:
			if profile.riposte_attack != null:
				out.append(&"riposte")
		Warrior.State.ROLL:
			if (warrior.time_in_state() >= profile.roll_cut_from and warrior.knows(&"roll_cut")
					and profile.roll_cut != null and _foe_near(COACH_REACH)):
				out.append(&"roll_cut")
		Warrior.State.AIR:
			if warrior.knows(&"down_stab") and profile.down_stab != null and _foe_below():
				out.append(&"down_stab")
			if (warrior.knows(&"plunge") and profile.plunge != null and warrior.velocity.y > -60.0
					and _foe_near(COACH_REACH)):
				out.append(&"plunge")
	return out


# --- The men about him ---------------------------------------------------------------------------

## A soldier lying on the street within `reach` px of him (a great blow threw him down), or null.
func downed_foe(reach: float) -> Combatant:
	var at: Vector2 = warrior.global_position
	for node: Node in warrior.get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or not other.is_down():
			continue
		var offset: Vector2 = other.global_position - at
		if absf(offset.y) <= Warrior.FINISH_LEVEL and absf(offset.x) <= reach:
			return other
	return null


## A soldier before him within `reach` px, standing behind a raised guard.
func _guard_ahead(reach: float) -> bool:
	var at: Vector2 = warrior.global_position
	for node: Node in warrior.get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or other.dead or not other.is_guarding():
			continue
		var ahead: float = (other.global_position.x - at.x) * warrior.facing
		if ahead > 0.0 and ahead <= reach and absf(other.global_position.y - at.y) <= 30.0:
			return true
	return false


## How many living soldiers stand within `reach` px of him.
func _foes_near(reach: float) -> int:
	var at: Vector2 = warrior.global_position
	var count: int = 0
	for node: Node in warrior.get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if (other != null and not other.dead and absf(other.global_position.x - at.x) <= reach
				and absf(other.global_position.y - at.y) <= 30.0):
			count += 1
	return count


## A living soldier under him, near enough below his feet for the down-stab.
func _foe_below() -> bool:
	var at: Vector2 = warrior.global_position
	for node: Node in warrior.get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or other.dead:
			continue
		var below: float = other.global_position.y - at.y
		if absf(other.global_position.x - at.x) <= 28.0 and below > 16.0 and below < 150.0:
			return true
	return false


## Running (long enough) at a living soldier before him, within RUN_REACH and level with him: the run's
## light and heavy buttons are its running blows only then.
func _running_at_foe() -> bool:
	if not warrior.in_full_run():
		return false
	var at: Vector2 = warrior.global_position
	for node: Node in warrior.get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or other.dead:
			continue
		var ahead: float = (other.global_position.x - at.x) * warrior.facing
		if ahead > 0.0 and ahead <= RUN_REACH and absf(other.global_position.y - at.y) <= 40.0:
			return true
	return false


## Whether a living soldier stands within `reach` px of him (and not far above or below).
func _foe_near(reach: float) -> bool:
	var at: Vector2 = warrior.global_position
	for node: Node in warrior.get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if (other != null and not other.dead and absf(other.global_position.x - at.x) <= reach
				and absf(other.global_position.y - at.y) <= 120.0):
			return true
	return false
