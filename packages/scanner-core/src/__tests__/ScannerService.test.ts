import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { ScannerService } from "../ScannerService.js";
import type { BaseScanner } from "../scanners/BaseScanner.js";
import type { ScanTarget } from "../types/ScanTarget.js";

async function makeTempDir(prefix = "diskcare-service-"): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

class FakeScanner implements BaseScanner {
  constructor(private readonly out: ScanTarget[]) {}
  async scan(): Promise<ScanTarget[]> {
    return this.out;
  }
}

test("ScannerService.scanAll - sorts targets deterministically by id and sets exists + metrics", async () => {
  const dir = await makeTempDir();
  const file = path.join(dir, "a.txt");
  await fs.writeFile(file, "hello"); // 5 bytes

  const missing = path.join(dir, "missing-dir");

  // Note: provide in reverse order on purpose
  const scanner1 = new FakeScanner([
    {
      id: "z-last",
      kind: "os-temp",
      path: dir,
      displayName: "Z",
      exists: false,
    },
  ]);

  const scanner2 = new FakeScanner([
    {
      id: "a-first",
      kind: "npm-cache",
      path: missing,
      displayName: "A",
      exists: false,
    },
  ]);

  const service = new ScannerService([scanner1, scanner2]);
  const targets = await service.scanAll();

  // deterministic sort
  assert.equal(targets[0]?.id, "a-first");
  assert.equal(targets[1]?.id, "z-last");

  // exists calculation
  const a = targets[0]!;
  const z = targets[1]!;

  assert.equal(a.exists, false);
  assert.equal(z.exists, true);

  // metrics attached
  assert.ok(a.metrics, "metrics should be attached");
  assert.ok(z.metrics, "metrics should be attached");

  // missing path should be skipped
  assert.equal(a.metrics!.skipped, true);

  // existing dir should be analyzed
  assert.equal(z.metrics!.skipped, false);
  assert.ok(z.metrics!.fileCount >= 1);
  assert.ok(z.metrics!.totalBytes >= 5);
});
