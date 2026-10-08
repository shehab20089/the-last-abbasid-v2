param(
    [string]$GodotPath = $env:GODOT_PATH,
    [switch]$Visual
)
# Imports the project, then runs every headless suite with fixed 1/60 s frames (so timings are
# identical on any machine), and optionally the rendered captures (which need a window).
$ErrorActionPreference = 'Stop'
if ($GodotPath) { $env:GODOT_PATH = $GodotPath }
Push-Location (Split-Path $PSScriptRoot -Parent)
# The traversal plays the whole level in simulated time; give it room.
if (-not $env:GODOT_TIMEOUT_SECONDS) { $env:GODOT_TIMEOUT_SECONDS = '400' }
try {
    & node tools/run_godot_cli.mjs --headless --editor --path . --quit
    if ($LASTEXITCODE -ne 0) { throw 'Godot import failed.' }
    $suites = @(
        @{ Script = 'res://tests/gameplay_test.gd'; Marker = 'GAMEPLAY_TEST_COMPLETE'; Args = @() },
        @{ Script = 'res://tests/enemy_test.gd'; Marker = 'ENEMY_TEST_COMPLETE'; Args = @() },
        @{ Script = 'res://tests/session_test.gd'; Marker = 'SESSION_TEST_COMPLETE'; Args = @() }
    )
    # The autoplayer finishes every level of the chapter.
    foreach ($level in @('fallen_market', 'streets_of_ash', 'scholars_quarter', 'last_gate')) {
        $suites += @{ Script = 'res://tests/traversal_test.gd'; Marker = 'TRAVERSAL_TEST_COMPLETE'; Args = @('--', $level) }
    }
    foreach ($suite in $suites) {
        $output = @(& node tools/run_godot_cli.mjs --headless --fixed-fps 60 --path . --script $suite.Script @($suite.Args))
        $exit = $LASTEXITCODE
        $output | Write-Output
        if ($exit -ne 0 -or -not ($output -match "$($suite.Marker) passed=\d+ failed=0")) {
            throw "$($suite.Script) $($suite.Args -join ' ') failed or did not complete."
        }
    }
    if ($Visual) {
        foreach ($capture in @('res://tests/capture_level.gd', 'res://tests/capture_session.gd')) {
            & node tools/run_godot_cli.mjs --path . --script $capture
            if ($LASTEXITCODE -ne 0) { throw "$capture failed." }
        }
    }
    Write-Output 'PROJECT_TESTS_COMPLETE'
} finally {
    Pop-Location
}
