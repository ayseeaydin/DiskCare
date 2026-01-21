import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { NpmCacheScanner } from "../scanners/NpmCacheScanner.js";
import { OsTempScanner } from "../scanners/OsTempScanner.js";
import { SandboxCacheScanner } from "../scanners/SandboxCacheScanner.js";

function assertNonEmptyString(value: unknown, label: string): void {
  assert.equal(typeof value, "string", `${label} should be a string`);
  assert.ok((value as string).trim().length > 0, `${label} should be non-empty`);
}

function assertAbsolutePath(p: unknown, label: string): void {
  assertNonEmptyString(p, label);
  assert.ok(path.isAbsolute(p as string), `${label} should be absolute`);
}

test("Scanner contract - scan() returns well-formed targets", async () => {
  const scanners = [new OsTempScanner(), new NpmCacheScanner(), new SandboxCacheScanner()];

  for (const scanner of scanners) {
    const targets = await scanner.scan();

    assert.ok(Array.isArray(targets), "scan() should return an array");
    assert.ok(targets.length >= 1, "scan() should return at least one target");

    for (const t of targets) {
      assertNonEmptyString(t.id, "id");
      assertNonEmptyString(t.kind, "kind");
      assertNonEmptyString(t.displayName, "displayName");
      assertAbsolutePath(t.path, "path");

      if (t.diagnostics !== undefined) {
        assert.ok(Array.isArray(t.diagnostics), "diagnostics should be an array when provided");
      }
    }
  }
});
