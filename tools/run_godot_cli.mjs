// Runs Godot from the command line and fails on script errors, which the Windows GUI executable
// does not reflect in its exit code. Godot is stopped after 60 seconds, or GODOT_TIMEOUT_SECONDS.
// Usage: node tools/run_godot_cli.mjs --headless --path . --script res://tests/gameplay_test.gd
import { spawn } from "node:child_process";

const executable = process.env.GODOT_PATH
  || "D:\\SteamLibrary\\steamapps\\common\\Godot Engine\\godot.windows.opt.tools.64.exe";
// Checks never read or write the player's own save or settings.
process.env.ABBASID_USER_PREFIX = process.env.ABBASID_USER_PREFIX || "cli_";
const timeoutSeconds = Number(process.env.GODOT_TIMEOUT_SECONDS) || 60;
const child = spawn(executable, process.argv.slice(2), { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
let runtimeFailure = false;
let timedOut = false;
const inspect = (data) => {
  if (/SCRIPT ERROR:|(?:^|\n)ERROR:|Parse Error|Debugger Break/i.test(data.toString())) runtimeFailure = true;
};
child.stdout.on("data", inspect);
child.stderr.on("data", inspect);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
const timer = setTimeout(() => {
  console.error(`Godot timed out after ${timeoutSeconds} seconds`);
  timedOut = true;
  child.kill();
  process.exitCode = 124;
}, timeoutSeconds * 1000);
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  clearTimeout(timer);
  process.exitCode = timedOut ? 124 : (code ?? (signal ? 1 : 0)) || (runtimeFailure ? 1 : 0);
});
