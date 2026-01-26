// NOTE: SandboxCacheScanner is only used for test coverage and is not a production target.
// It simulates a cache directory for isolated test scenarios.
// See README for details.

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { SandboxCacheScanner } from "../scanners/SandboxCacheScanner.js";

test("SandboxCacheScanner - uses injected cwd", async () => {
  const cwd = path.join(path.sep, "virtual", "project");
  const scanner = new SandboxCacheScanner({ cwd });

  const targets = await scanner.scan();
  assert.equal(targets.length, 1);

  const t = targets[0]!;
  assert.equal(t.id, "sandbox-cache");
  assert.equal(t.kind, "sandbox-cache");
  assert.equal(t.path, path.resolve(cwd, ".sandbox-cache"));
});
