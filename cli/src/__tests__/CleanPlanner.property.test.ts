import test from "node:test";
import assert from "node:assert/strict";

import fc from "fast-check";

import { buildCleanPlan } from "../cleaning/CleanPlanner.js";
import type { ScanTarget } from "@diskcare/scanner-core";
import type { RulesEngine } from "@diskcare/rules-engine";

function rulesEngineSafeZeroDays(): RulesEngine {
  return {
    decide() {
      return {
        risk: "safe",
        safeAfterDays: 0,
        reasons: ["rule reason"],
      };
    },
  } as unknown as RulesEngine;
}

function makeTarget(overrides: Partial<ScanTarget>): ScanTarget {
  return {
    id: "test-target",
    kind: "os-temp",
    path: "C:\\Temp",
    displayName: "Test Target",
    exists: true,
    metrics: {
      totalBytes: 0,
      fileCount: 0,
      lastModifiedAt: 0,
      lastAccessedAt: null,
      skipped: false,
    },
    ...overrides,
  };
}

test("buildCleanPlan property: never returns negative estimatedBytes", () => {
  const nowMs = Date.now();

  const arbTarget = fc.record({
    exists: fc.boolean(),
    totalBytes: fc.nat({ max: 10_000_000 }),
    fileCount: fc.nat({ max: 100_000 }),
    lastModifiedAt: fc.option(fc.integer({ min: 0, max: nowMs + 10_000 }), { nil: null }),
    lastAccessedAt: fc.option(fc.integer({ min: 0, max: nowMs + 10_000 }), { nil: null }),
    skipped: fc.boolean(),
    partial: fc.boolean(),
    skippedEntries: fc.nat({ max: 10_000 }),
    error: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  });

  fc.assert(
    fc.property(arbTarget, (a) => {
      const target = makeTarget({
        exists: a.exists,
        metrics: {
          totalBytes: a.totalBytes,
          fileCount: a.fileCount,
          lastModifiedAt: a.lastModifiedAt,
          lastAccessedAt: a.lastAccessedAt,
          skipped: a.skipped,
          ...(a.error ? { error: a.error } : {}),
          ...(a.partial ? { partial: true, skippedEntries: a.skippedEntries } : {}),
        },
      });

      const plan = buildCleanPlan({
        targets: [target],
        rulesEngine: rulesEngineSafeZeroDays(),
        nowMs,
        dryRun: true,
        apply: false,
      });

      const item = plan.items[0];
      assert.ok(item);

      // Invariant: never negative
      assert.ok(item.estimatedBytes >= 0);

      // Invariant: only eligible items can have estimatedBytes > 0
      if (item.status !== "eligible") {
        assert.equal(item.estimatedBytes, 0);
      }

      // Invariant: missing path always blocked
      if (a.exists === false) {
        assert.equal(item.status, "blocked");
      }

      // Invariant: skipped analysis blocks, but only when the path exists
      if (a.exists === true && a.skipped === true) {
        assert.equal(item.status, "blocked");
      }

      // Invariant: partial analysis is never eligible
      if (a.partial === true && a.exists === true && a.skipped === false) {
        assert.notEqual(item.status, "eligible");
      }
    }),
    { numRuns: 200 },
  );
});
