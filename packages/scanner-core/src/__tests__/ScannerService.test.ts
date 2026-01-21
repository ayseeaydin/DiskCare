import test from "node:test";
import assert from "node:assert/strict";

import { ScannerService } from "../ScannerService.js";
import type { Scanner } from "../scanners/BaseScanner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";

const VIRTUAL_EXISTING_DIR = "/virtual/existing";
const VIRTUAL_MISSING_DIR = "/virtual/missing";

class FakeScanner implements Scanner {
  constructor(private readonly out: DiscoveredTarget[]) {}
  async scan(): Promise<DiscoveredTarget[]> {
    return this.out;
  }
}

test("ScannerService.scanAll - sorts targets deterministically by id and sets exists + metrics", async () => {
  const fakePathExists = async (p: string) => p === VIRTUAL_EXISTING_DIR;
  const fakeAnalyzer = {
    analyze: async (p: string) => {
      if (p === VIRTUAL_MISSING_DIR) {
        return {
          totalBytes: 0,
          fileCount: 0,
          lastModifiedAt: null,
          lastAccessedAt: null,
          skipped: true,
          error: "ENOENT",
          partial: false,
          skippedEntries: 0,
        };
      }

      return {
        totalBytes: 5,
        fileCount: 1,
        lastModifiedAt: 1,
        lastAccessedAt: 1,
        skipped: false,
        partial: false,
        skippedEntries: 0,
      };
    },
  };

  // Note: provide in reverse order on purpose
  const scanner1 = new FakeScanner([
    {
      id: "z-last",
      kind: "os-temp",
      path: VIRTUAL_EXISTING_DIR,
      displayName: "Z",
    },
  ]);

  const scanner2 = new FakeScanner([
    {
      id: "a-first",
      kind: "npm-cache",
      path: VIRTUAL_MISSING_DIR,
      displayName: "A",
    },
  ]);

  const service = new ScannerService([scanner1, scanner2], {
    analyzer: fakeAnalyzer,
    pathExists: fakePathExists,
  });
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
