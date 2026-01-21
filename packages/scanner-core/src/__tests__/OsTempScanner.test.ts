import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { OsTempScanner } from "../scanners/OsTempScanner.js";

test("OsTempScanner - uses injected tmpdir", async () => {
  const tmpdir = path.join(path.sep, "virtual", "tmp");
  const scanner = new OsTempScanner({ tmpdir });

  const targets = await scanner.scan();
  assert.equal(targets.length, 1);

  const t = targets[0]!;
  assert.equal(t.id, "os-temp");
  assert.equal(t.kind, "os-temp");
  assert.equal(t.path, tmpdir);
});
