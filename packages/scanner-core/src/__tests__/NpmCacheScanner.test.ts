import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import type { CommandRunner } from "../utils/CommandRunner.js";
import { NpmCacheScanner } from "../scanners/NpmCacheScanner.js";

function makeRunner(result: { stdout: string; stderr?: string } | Error): CommandRunner {
  if (result instanceof Error) {
    return {
      async run() {
        throw result;
      },
    };
  }

  return {
    async run() {
      return { stdout: result.stdout, stderr: result.stderr ?? "" };
    },
  };
}

test("NpmCacheScanner - resolves via npm config (deterministic)", async () => {
  const runner = makeRunner({ stdout: "\"~/cache/\"\n" });
  const scanner = new NpmCacheScanner({
    runner,
    platform: "linux",
    homedir: "/home/testuser",
  });

  const targets = await scanner.scan();
  assert.equal(targets.length, 1);

  const t = targets[0]!;
  assert.equal(t.id, "npm-cache");
  assert.equal(t.kind, "npm-cache");
  assert.equal(t.path, path.posix.join("/home/testuser", "cache"));
  assert.equal(t.diagnostics, undefined);
});

test("NpmCacheScanner - falls back to APPDATA on win32", async () => {
  const runner = makeRunner(new Error("npm missing"));
  const scanner = new NpmCacheScanner({
    runner,
    platform: "win32",
    env: { APPDATA: "C:\\Users\\me\\AppData\\Roaming" },
    homedir: "C:\\Users\\me",
  });

  const targets = await scanner.scan();
  assert.equal(targets.length, 1);

  const t = targets[0]!;
  assert.equal(t.path, path.win32.join("C:\\Users\\me\\AppData\\Roaming", "npm-cache"));
  assert.ok(Array.isArray(t.diagnostics));
  assert.ok(t.diagnostics!.some((d) => d.includes("APPDATA")));
});

test("NpmCacheScanner - falls back to homedir on posix when npm fails and no env", async () => {
  const runner = makeRunner(new Error("npm missing"));
  const scanner = new NpmCacheScanner({
    runner,
    platform: "linux",
    env: {},
    homedir: "/home/testuser",
  });

  const targets = await scanner.scan();
  assert.equal(targets.length, 1);

  const t = targets[0]!;
  assert.equal(t.path, path.posix.join("/home/testuser", ".npm"));
  assert.ok(t.diagnostics!.some((d) => d.includes("homedir fallback")));
});
