// Writing generated files on Windows, where another program (a virus scan, the search indexer) may hold a file
// it has just seen change for a moment: the write is tried again a few times, a little later each time, before
// the build gives up.
import { writeFileSync } from "node:fs";

/** The errors Windows gives while a file is held by another program. */
const HELD = ["UNKNOWN", "EBUSY", "EPERM", "EACCES"];

/** writeFileSync, tried again while the file is held. */
export function writeSteadily(path, data) {
  for (let attempt = 1; ; attempt++) {
    try {
      writeFileSync(path, data);
      return;
    } catch (error) {
      if (attempt >= 8 || !HELD.includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 * attempt);
    }
  }
}
