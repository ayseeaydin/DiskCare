import test from "node:test";
import assert from "node:assert/strict";

import { Command } from "commander";
import type { ScanTarget } from "@diskcare/scanner-core";
import { RulesEngine } from "@diskcare/rules-engine";

import { CleanCommand } from "../commands/CleanCommand.js";

class FakeOutput {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];

  info(message: string): void {
    this.infos.push(message);
  }
  warn(message: string): void {
    this.warns.push(message);
  }
  error(message: string): void {
    this.errors.push(message);
  }
}

function makeEligibleTarget(nowMs: number): ScanTarget {
  return {
    id: "sandbox-cache",
    kind: "sandbox-cache",
    path: "D:\\diskcare\\.sandbox-cache",
    displayName: "Sandbox Cache",
    exists: true,
    metrics: {
      totalBytes: 123,
      fileCount: 1,
      lastModifiedAt: nowMs - 8 * 24 * 60 * 60 * 1000,
      lastAccessedAt: nowMs - 8 * 24 * 60 * 60 * 1000,
      skipped: false,
      partial: false,
      skippedEntries: 0,
    },
  };
}

function makeRulesEngine(): RulesEngine {
  return new RulesEngine({
    rules: [
      {
        id: "sandbox-cache",
        risk: "safe",
        safeAfterDays: 7,
        description: "sandbox cache is safe",
      },
    ],
    defaults: { risk: "caution", safeAfterDays: 30 },
  });
}

test(
  "CleanCommand - should not call trash when --apply --no-dry-run but missing --yes",
  async () => {
  const output = new FakeOutput();
  const nowMs = Date.parse("2026-01-20T00:00:00.000Z");

  const trashedPaths: string[] = [];

  const cmd = new CleanCommand({
    nowMs: () => nowMs,
    scanAll: async (_context) => [makeEligibleTarget(nowMs)],
    loadRules: async () => makeRulesEngine(),
    trashFn: async (paths: string[]) => {
      trashedPaths.push(...paths);
    },
    writeLog: async () => "logs/run-test.json",
  });

  const program = new Command();
  program.exitOverride();
  cmd.register(program, {
    output,
    verbose: false,
    cwd: "D:\\diskcare",
    platform: "win32",
    env: {},
    homedir: "C:\\Users\\test",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath: "config/rules.json",
    setExitCode: () => {},
  });

  await program.parseAsync(["node", "diskcare", "clean", "--apply", "--no-dry-run"]);

  assert.deepEqual(trashedPaths, []);
  assert.ok(
    output.warns.some((w) => w.includes("confirmation is missing")),
    "should warn about missing confirmation",
  );
  },
);

test("CleanCommand - should call trash when --apply --no-dry-run --yes", async () => {
  const output = new FakeOutput();
  const nowMs = Date.parse("2026-01-20T00:00:00.000Z");

  const trashedBatches: string[][] = [];

  const cmd = new CleanCommand({
    nowMs: () => nowMs,
    scanAll: async (_context) => [makeEligibleTarget(nowMs)],
    loadRules: async () => makeRulesEngine(),
    trashFn: async (paths: string[]) => {
      trashedBatches.push([...paths]);
    },
    writeLog: async () => "logs/run-test.json",
  });

  const program = new Command();
  program.exitOverride();
  cmd.register(program, {
    output,
    verbose: false,
    cwd: "D:\\diskcare",
    platform: "win32",
    env: {},
    homedir: "C:\\Users\\test",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath: "config/rules.json",
    setExitCode: () => {},
  });

  await program.parseAsync([
    "node",
    "diskcare",
    "clean",
    "--apply",
    "--no-dry-run",
    "--yes",
  ]);

  assert.equal(trashedBatches.length, 1);
  assert.deepEqual(trashedBatches[0], ["D:\\diskcare\\.sandbox-cache"]);
  assert.ok(
    output.infos.some((l) => l.includes("apply results: trashed=1")),
    "should print apply results",
  );
});

test("CleanCommand - should report batch trash failure clearly", async () => {
  const output = new FakeOutput();
  const nowMs = Date.parse("2026-01-20T00:00:00.000Z");

  const cmd = new CleanCommand({
    nowMs: () => nowMs,
    scanAll: async (_context) => [makeEligibleTarget(nowMs)],
    loadRules: async () => makeRulesEngine(),
    trashFn: async () => {
      throw new Error("boom");
    },
    writeLog: async () => "logs/run-test.json",
  });

  const program = new Command();
  program.exitOverride();
  cmd.register(program, {
    output,
    verbose: false,
    cwd: "D:\\diskcare",
    platform: "win32",
    env: {},
    homedir: "C:\\Users\\test",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath: "config/rules.json",
    setExitCode: () => {},
  });

  await program.parseAsync(["node", "diskcare", "clean", "--apply", "--no-dry-run", "--yes"]);

  assert.ok(output.infos.some((l) => l.includes("apply results: trashed=0 failed=1")));
  assert.ok(output.warns.some((l) => l.includes("failed: sandbox-cache")));
  assert.ok(output.warns.some((l) => l.includes("batch trash failed")));
});
