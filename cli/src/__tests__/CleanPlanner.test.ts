import test from "node:test";
import assert from "node:assert/strict";

import { buildCleanPlan } from "../cleaning/CleanPlanner.js";
import type { ScanTarget } from "@diskcare/scanner-core";
import type { RulesEngine } from "@diskcare/rules-engine";

// Minimal fake RulesEngine
function makeRulesEngine(decision: {
  risk: "safe" | "caution" | "do-not-touch";
  safeAfterDays: number;
}): RulesEngine {
  return {
    decide() {
      return {
        ...decision,
        reasons: ["rule reason"],
      };
    },
  } as unknown as RulesEngine;
}

function baseTarget(overrides?: Partial<ScanTarget>): ScanTarget {
  const nowMs = Date.now();

  return {
    id: "test-target",
    kind: "os-temp",
    path: "/tmp/test",
    displayName: "Test Target",
    exists: true,
    metrics: {
      totalBytes: 100,
      fileCount: 1,
      lastModifiedAt: nowMs - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      lastAccessedAt: null,
      skipped: false,
    },
    ...overrides,
  };
}

test("eligible when risk=safe and age >= safeAfterDays", () => {
  const nowMs = Date.now();

  const plan = buildCleanPlan({
    targets: [
      baseTarget({
        metrics: {
          totalBytes: 100,
          fileCount: 1,
          lastModifiedAt: nowMs - 10 * 24 * 60 * 60 * 1000,
          lastAccessedAt: null,
          skipped: false,
        },
      }),
    ],
    rulesEngine: makeRulesEngine({ risk: "safe", safeAfterDays: 7 }),
    nowMs,
    dryRun: true,
    apply: false,
  });

  assert.equal(plan.items[0]?.status, "eligible");
});

test("caution when risk=safe but age < safeAfterDays", () => {
  const nowMs = Date.now();

  const plan = buildCleanPlan({
    targets: [
      baseTarget({
        metrics: {
          totalBytes: 100,
          fileCount: 1,
          lastModifiedAt: nowMs - 3 * 24 * 60 * 60 * 1000,
          lastAccessedAt: null,
          skipped: false,
        },
      }),
    ],
    rulesEngine: makeRulesEngine({ risk: "safe", safeAfterDays: 7 }),
    nowMs,
    dryRun: true,
    apply: false,
  });

  assert.equal(plan.items[0]?.status, "caution");
});

test("partial analysis forces caution", () => {
  const nowMs = Date.now();

  const plan = buildCleanPlan({
    targets: [
      baseTarget({
        metrics: {
          totalBytes: 100,
          fileCount: 1,
          lastModifiedAt: nowMs - 20 * 24 * 60 * 60 * 1000,
          lastAccessedAt: null,
          skipped: false,
          partial: true,
          skippedEntries: 2,
        } as any,
      }),
    ],
    rulesEngine: makeRulesEngine({ risk: "safe", safeAfterDays: 0 }),
    nowMs,
    dryRun: true,
    apply: false,
  });

  assert.equal(plan.items[0]?.status, "caution");
});

test("missing path is blocked", () => {
  const nowMs = Date.now();

  const plan = buildCleanPlan({
    targets: [
      baseTarget({
        exists: false,
      }),
    ],
    rulesEngine: makeRulesEngine({ risk: "safe", safeAfterDays: 0 }),
    nowMs,
    dryRun: true,
    apply: false,
  });

  assert.equal(plan.items[0]?.status, "blocked");
});

test("do-not-touch is always blocked", () => {
  const nowMs = Date.now();

  const plan = buildCleanPlan({
    targets: [baseTarget()],
    rulesEngine: makeRulesEngine({ risk: "do-not-touch", safeAfterDays: 999 }),
    nowMs,
    dryRun: true,
    apply: false,
  });

  assert.equal(plan.items[0]?.status, "blocked");
});

test("caution when lastModifiedAt is null (cannot determine age)", () => {
  const nowMs = Date.now();

  const plan = buildCleanPlan({
    targets: [
      baseTarget({
        metrics: {
          totalBytes: 100,
          fileCount: 1,
          lastModifiedAt: null,
          lastAccessedAt: null,
          skipped: false,
        },
      }),
    ],
    rulesEngine: makeRulesEngine({ risk: "safe", safeAfterDays: 0 }),
    nowMs,
    dryRun: true,
    apply: false,
  });

  assert.equal(plan.items[0]?.status, "caution");
});
