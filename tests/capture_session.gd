extends SceneTree
## Renders the session's screens for visual review: the title, play with the HUD, the name of the
## place and a hint, a conversation, a manuscript, the pause menu, settings, the fall, the chapter's
## end, and the captain's fight at the last gate. Not a pass/fail check. Needs a window: node tools/run_godot_cli.mjs --path . --script res://tests/capture_session.gd

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	destination = ProjectSettings.globalize_path("res://captures/session")
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.2)
	game = current_scene as AbbasidGame
	await _save("01_title")
	game.title.close()
	game._enter_level(AbbasidGame.FIRST_LEVEL, &"", false, true)
	await _wait(0.6)
	game.hero.input.enabled = false
	game.hud.show_hint("HINT_ATTACK")
	await _wait(0.5)
	await _save("02_play")
	var guard: Node2D = game.level.interactables.get_node("wounded_guard") as Node2D
	game.hero.global_position = Vector2(guard.global_position.x + 20.0, guard.global_position.y - 4.0)
	await _wait(0.3)
	await _save("03_prompt")
	game.hero.input.press(&"interact")
	await _wait(1.4)
	await _save("04_dialogue")
	while game.dialogue.is_open():
		game.dialogue.advance()
		await _wait(0.05)
	await _wait(0.3)
	# A fight: a swordsman winding up at the hero.
	var soldier: MongolSoldier = game.level.soldiers()[0]
	game.hero.global_position = Vector2(soldier.global_position.x - 46.0, soldier.global_position.y - 4.0)
	await _wait(0.9)
	await _save("05_fight")
	var page: Node2D = game.level.interactables.get_node("optics") as Node2D
	game.hero.global_position = Vector2(page.global_position.x - 14.0, page.global_position.y - 8.0)
	await _wait(0.4)
	game.hero.input.press(&"interact")
	await _wait(1.0)
	await _save("06_manuscript")
	game.reader.chosen.emit(&"close")
	await _wait(0.3)
	game._pause()
	await _wait(0.3)
	await _save("07_pause")
	game.pause_menu.chosen.emit(&"settings")
	await _wait(0.3)
	await _save("08_settings")
	game.settings_screen.chosen.emit(&"back")
	game.pause_menu.chosen.emit(&"resume")
	await _wait(0.3)
	game.hero.take_damage(999.0)
	await _wait(3.2)
	await _save("09_game_over")
	game._show_complete()
	await _wait(0.4)
	await _save("10_complete")
	# The last gate: the square closes, the captain roars, the fight, the red glint of his smash.
	paused = false
	game._enter_level("res://features/levels/last_gate/last_gate.tscn", &"gate_lamp", false, true)
	await _wait(0.6)
	game.hero.input.enabled = false
	var trigger: Node2D = game.level.triggers.get_node("boss") as Node2D
	game.hero.global_position = Vector2(trigger.global_position.x, game.hero.global_position.y)
	await _wait(0.5)
	await _save("11_boss_roar")
	await _wait(2.2)
	await _save("12_boss_fight")
	var captain: MongolSoldier = game.level.arena.boss()
	(captain.get_node("Brain") as EnemyBrain).process_mode = Node.PROCESS_MODE_DISABLED
	captain.global_position = Vector2(game.hero.global_position.x + 70.0, captain.global_position.y)
	captain.cancel_attack()
	captain.state = MongolSoldier.State.READY
	captain.set_facing(-1.0)
	captain.attack(captain.profile.attacks[CaptainBrain.SMASH])
	await _wait(0.3)
	await _save("13_boss_glint")
	print("SESSION_CAPTURE_DONE %s" % destination)
	paused = false
	current_scene.queue_free()
	await process_frame
	OS.delay_msec(200)
	quit()


func _wait(seconds: float) -> void:
	await create_timer(seconds, true, false, true).timeout


func _save(label: String) -> void:
	await RenderingServer.frame_post_draw
	var image: Image = root.get_texture().get_image()
	image.save_png(destination.path_join(label + ".png"))
