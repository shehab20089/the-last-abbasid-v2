extends SceneTree
## Renders the menus as a player meets them: the title with a journey saved (Continue says where), the
## question before beginning anew, the pause menu and its question before a way out, the Journal, the Codex, the
## Guide, the lamp's tree with its marks, the game over with its tip, a story card being skipped, the chapter's
## end. Full frames into captures/menus/. Not a pass/fail check. Needs a window:
## node tools/run_godot_cli.mjs --path . --script res://tests/capture_menus.gd [-- ar]

const LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"

var destination: String
var game: AbbasidGame


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	destination = ProjectSettings.globalize_path("res://captures/menus" + ("/ar" if "ar" in args else ""))
	DirAccess.make_dir_recursive_absolute(destination)
	SaveGame.erase()
	# A journey part way through the market, saved.
	var journey: SaveGame = SaveGame.new()
	journey.level = LEVEL
	journey.checkpoint = &"potters_lamp"
	journey.lit = [&"potters_lamp"]
	journey.manuscripts = [&"optics", &"furusiyya_sweep"]
	journey.flags = [&"talked_wounded_guard", &"hamid_counsel", &"knows_charge", &"saved_gate_captive", &"seen_lamp_card",
		&"relic_token_stalls", &"knows_sweep"]
	journey.play_time = 1460.0
	journey.honour = 120
	journey.lessons = [&"HINT_MOVE", &"HINT_ATTACK", &"HINT_PEOPLE", &"HINT_LAMP", &"HINT_LAMP_CARD", &"HINT_GUARD",
		&"HINT_WARN_WHITE", &"HINT_LEARNED_CHARGE", &"HINT_HEAL"]
	journey.write()
	change_scene_to_file("res://app/main.tscn")
	await _wait(1.2)
	game = current_scene as AbbasidGame
	# The language asked for (the settings file may keep the last capture's).
	game.settings.set_language("ar" if "ar" in args else "en")
	game.show_title()
	await _wait(1.0)
	await _save("01_title")
	game.title.chosen.emit(&"new_game")
	await _wait(0.3)
	await _save("02_title_begin_anew")
	game.title.chosen.emit(&"cancel_new")
	await _wait(0.2)
	game.title.chosen.emit(&"continue")
	await _wait(2.6)
	game.hero.input.enabled = false
	for node: Node in root.get_tree().get_nodes_in_group(&"enemies"):
		var brain: Node = node.get_node_or_null(^"Brain")
		if brain != null:
			brain.process_mode = Node.PROCESS_MODE_DISABLED
	game._pause()
	await _wait(0.3)
	await _save("03_pause")
	game.pause_menu.chosen.emit(&"journal")
	await _wait(0.3)
	await _save("04_journal")
	game.journal_screen.chosen.emit(&"journal_back")
	game.pause_menu.chosen.emit(&"codex")
	await _wait(0.4)
	(game.codex_screen._list.get_child(1) as Button).grab_focus()
	await _wait(0.4)
	await _save("05_codex")
	game.codex_screen.chosen.emit(&"codex_back")
	game.pause_menu.chosen.emit(&"guide")
	await _wait(0.4)
	await _save("06_guide")
	game.guide_screen.chosen.emit(&"guide_back")
	await _wait(0.2)
	(game.pause_menu.get_node("Panel/List/Lamp") as Button).emit_signal(&"pressed")
	await _wait(0.3)
	await _save("07_pause_ask")
	game.pause_menu._answer(false)
	# The settings, page by page; a button awaited on the controls page.
	game.pause_menu.chosen.emit(&"settings")
	await _wait(0.3)
	await _save("07b_settings_gameplay")
	game.settings_screen._show_page(&"controls")
	game.settings_screen._listen(&"jump")
	await _wait(0.3)
	await _save("07c_settings_controls")
	game.settings_screen._stop_listening()
	game.settings_screen._show_page(&"display")
	await _wait(0.2)
	await _save("07d_settings_display")
	game.settings_screen._show_page(&"access")
	await _wait(0.2)
	await _save("07e_settings_access")
	game.settings_screen.chosen.emit(&"back")
	await _wait(0.2)
	game.pause_menu.chosen.emit(&"resume")
	await _wait(0.3)
	# The lamp's tree, with Honour to spend.
	game.save.honour = 150
	game.save.bought = [&"pommel"]
	var lamp: Checkpoint = game.level.checkpoint(&"potters_lamp")
	lamp.interact(game.hero)
	await _wait(0.6)
	await _save("08_lamp_tree")
	game.lamp_menu._show_page(&"keepsakes")
	await _wait(0.3)
	await _save("09_lamp_keepsakes")
	game.lamp_menu.chosen.emit(&"leave")
	await _wait(0.4)
	# A fall: the game over says where he rises and why he fell.
	var hit: HitData = HitData.new()
	hit.attacker = game.level.soldiers()[0]
	hit.attacker.global_position = game.hero.global_position + Vector2(40.0, 0.0)
	var sweep: AttackDefinition = load("res://features/enemies/definitions/spearman_sweep.tres") as AttackDefinition
	hit.attack = sweep
	game._last_blow = hit
	game.hero.take_damage(game.hero.max_health + 5.0)
	await _wait(3.4)
	await _save("10_game_over")
	# A story card, Back held to skip it.
	game.game_over.close()
	game.card.play(&"market_end", game._card_lines(&"market_end"), "LEVEL_STREETS_OF_ASH")
	await _wait(1.4)
	game.card._skip_held = 0.5
	game.card._skip_bar.visible = true
	game.card._skip_bar.offset_left = -10.0 - 140.0 * (0.5 / StoryCard.SKIP_HOLD)
	await _save("11_story_card")
	game.card.skip()
	await _wait(0.2)
	game._show_complete()
	await _wait(0.6)
	await _save("12_chapter_complete")
	print("MENUS_CAPTURE_DONE %s" % destination)
	SaveGame.erase()
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
