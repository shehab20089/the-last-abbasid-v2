@AGENTS.md

## Claude Code notes

- `AGENTS.md` (imported above) is the shared briefing. When project facts, rules or open decisions change, update it and `PROGRESS.md` in the same change.
- Run, inspect and stop the game with the Coding-Solo Godot MCP tools when available; otherwise `node tools/run_godot_cli.mjs` and `tools/run_tests.ps1`.
- Shells: PowerShell is primary; Git Bash also works. Use absolute paths. When editing files from PowerShell, write UTF-8 without a BOM (`New-Object System.Text.UTF8Encoding($false)`).
- Review art by opening the generated PNGs in `captures/` (art review sheets are enlarged 4×) before and after changes.
