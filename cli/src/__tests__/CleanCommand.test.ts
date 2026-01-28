import test from "node:test";
import assert from "node:assert/strict";

import { Command } from "commander";
import type { ScanTarget } from "@diskcare/scanner-core";
import { RulesEngine } from "@diskcare/rules-engine";

import { CleanCommand } from "../commands/CleanCommand.js";
import type { Output } from "../output/Output.js";

class FakeOutput implements Output {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  readonly progresses: string[] = [];
  info(message: string): void {
    this.infos.push(message);
  }
  warn(message: string): void {
    this.warns.push(message);
  }
  error(message: string): void {
    this.errors.push(message);
  }
  progress(message: string): void {
    this.progresses.push(message);
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

test("CleanCommand - should not call trash when --apply --no-dry-run but missing --yes", async () => {
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
    nowFn: () => new Date(nowMs),
    configPath: "D:\\diskcare\\config\\rules.json",
    setExitCode: () => {},
  });
  await program.parseAsync(["node", "diskcare", "clean", "--apply", "--no-dry-run"]);

  assert.equal(trashedPaths.length, 0, "should not call trash without --yes");
  assert.ok(
    output.progresses.includes("Building clean plan..."),
    "Should show building clean plan progress",
  );
  assert.ok(
    output.progresses.some((m) => m.startsWith("Clean plan ready.")),
    "Should show clean plan ready progress",
  );
});

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
    nowFn: () => new Date(nowMs),
    configPath: "D:\\diskcare\\config\\rules.json",
    setExitCode: () => {},
  });

  await program.parseAsync(["node", "diskcare", "clean", "--apply", "--no-dry-run", "--yes"]);

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
    nowFn: () => new Date(nowMs),
    configPath: "D:\\diskcare\\config\\rules.json",
    setExitCode: () => {},
  });

  await program.parseAsync(["node", "diskcare", "clean", "--apply", "--no-dry-run", "--yes"]);

  assert.ok(output.infos.some((l) => l.includes("apply results: trashed=0 failed=1 skipped=0")));
  assert.ok(output.warns.some((l) => l.includes("failed: sandbox-cache")));
  assert.ok(
    output.warns.some((l) => l.includes("trash failed")),
    "Should report per-file trash failure",
  );
});

test("CleanCommand - missing path at apply time is skipped", async () => {
  const output = new FakeOutput();
  const nowMs = Date.parse("2026-01-20T00:00:00.000Z");

  const cmd = new CleanCommand({
    nowMs: () => nowMs,
    scanAll: async (_context) => [makeEligibleTarget(nowMs)],
    loadRules: async () => makeRulesEngine(),
    trashFn: async () => {
      const err = new Error("missing") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
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
    nowFn: () => new Date(nowMs),
    configPath: "D:\\diskcare\\config\\rules.json",
    setExitCode: () => {},
  });

  await program.parseAsync(["node", "diskcare", "clean", "--apply", "--no-dry-run", "--yes"]);

  assert.ok(output.infos.some((l) => l.includes("skipped=1")));
  assert.ok(output.warns.some((l) => l.includes("skipped: sandbox-cache")));
});
