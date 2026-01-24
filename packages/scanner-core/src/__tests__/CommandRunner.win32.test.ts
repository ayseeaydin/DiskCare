import assert from "node:assert/strict";
import test from "node:test";

import { NodeCommandRunner } from "../utils/CommandRunner.js";

test("NodeCommandRunner (win32) - can run npm via cmd.exe without ENOENT", async (t) => {
  if (process.platform !== "win32") {
    t.skip("win32 only");
    return;
  }

  const runner = new NodeCommandRunner();

  const res = await runner.run("npm", ["--version"]);
  assert.ok(res.stdout.trim().length > 0, "expected npm --version to produce stdout");
});

test("NodeCommandRunner (win32) - npm config get cache returns a path (workspaces disabled)", async (t) => {
  if (process.platform !== "win32") {
    t.skip("win32 only");
    return;
  }

  const runner = new NodeCommandRunner();

  // In a monorepo workspace root, some npm versions/configs throw ENOWORKSPACES for `npm config get`.
  // Disable workspaces explicitly to keep this test stable.
  const res = await runner.run("npm", ["--workspaces=false", "config", "get", "cache"]);

  const out = res.stdout.trim();
  assert.ok(out.length > 0, "expected npm cache path in stdout");
  assert.ok(/[A-Za-z]:\\|\\/.test(out), `expected a path-like value, got: ${out}`);
});
