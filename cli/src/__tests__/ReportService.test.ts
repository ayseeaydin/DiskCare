import test from "node:test";
import assert from "node:assert/strict";

import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { ReportService } from "../reporting/ReportService.js";

test("ReportService.summarize - aggregates latest scan snapshot and apply aggregates from logs", async () => {
  const logsDir = await fs.mkdtemp(path.join(os.tmpdir(), "diskcare-logs-"));

  // minimal scan log
  const scanLog = {
    version: "0.0.1",
    timestamp: new Date("2026-01-16T10:00:00.000Z").toISOString(),
    command: "scan",
    dryRun: true,
    targets: [
      {
        id: "os-temp",
        kind: "os-temp",
        path: "C:\\Temp",
        displayName: "OS Temp Directory",
        exists: true,
        metrics: {
          totalBytes: 100,
          fileCount: 2,
          lastModifiedAt: 1,
          lastAccessedAt: 1,
          skipped: false,
        },
      },
      {
        id: "npm-cache",
        kind: "npm-cache",
        path: "C:\\NpmCache",
        displayName: "npm Cache Directory",
        exists: false,
        metrics: {
          totalBytes: 0,
          fileCount: 0,
          lastModifiedAt: null,
          lastAccessedAt: null,
          skipped: true,
          error: "ENOENT",
        },
      },
    ],
  };

  // minimal apply log (clean --apply)
  // NOTE: field names here must match what ReportService reads.
  // If your ReportService uses different names, tell me and I'll align the fixture.
  const applyLog = {
    version: "0.0.1",
    timestamp: new Date("2026-01-16T11:00:00.000Z").toISOString(),
    command: "clean",
    dryRun: false,
    apply: true,
    plan: {
      command: "clean",
      dryRun: false,
      apply: true,
      summary: {
        eligibleCount: 1,
        cautionCount: 0,
        blockedCount: 0,
        estimatedBytesTotal: 50,
      },
      items: [
        {
          id: "sandbox-cache",
          displayName: "Sandbox Cache",
          path: "D:\\diskcare\\.sandbox-cache",
          exists: true,
          risk: "safe",
          safeAfterDays: 0,
          status: "eligible",
          estimatedBytes: 50,
          reasons: ["test"],
        },
      ],
    },
    applyResults: {
      trashed: 1,
      failed: 0,
      trashedEstimatedBytes: 50,
    },
  };

  await fs.writeFile(path.join(logsDir, "run-scan.json"), JSON.stringify(scanLog, null, 2), "utf8");
  await fs.writeFile(
    path.join(logsDir, "run-apply.json"),
    JSON.stringify(applyLog, null, 2),
    "utf8",
  );

  const service = new ReportService(logsDir);
  const summary = await service.summarize();

  // top-level
  assert.equal(summary.runCount, 2);
  assert.equal(summary.latestRunAt, new Date("2026-01-16T11:00:00.000Z").toISOString());

  // scan (latest)
  assert.equal(summary.latestScanAt, new Date("2026-01-16T10:00:00.000Z").toISOString());
  assert.equal(summary.scanTotalBytes, 100);
  assert.equal(summary.scanMissingTargets, 1);
  assert.equal(summary.scanSkippedTargets, 1);

  // apply aggregates
  assert.equal(summary.applyRuns, 1);
  assert.equal(summary.trashedCount, 1);
  assert.equal(summary.failedCount, 0);
  assert.equal(summary.latestApplyAt, new Date("2026-01-16T11:00:00.000Z").toISOString());
  assert.equal(summary.trashedEstimatedBytes, 50);

  await fs.rm(logsDir, { recursive: true, force: true });
});
