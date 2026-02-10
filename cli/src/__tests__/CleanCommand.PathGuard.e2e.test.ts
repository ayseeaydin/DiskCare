/**
 * E2E Test: CleanCommand rejects forbidden paths (PathGuard integration)
 *
 * Scenario:
 * 1. User adds C:\Windows\Temp to rules.json (forbidden path)
 * 2. scan discovers it
 * 3. clean plan marks it eligible
 * 4. clean --apply attempts to trash it
 * 5. PathGuard BLOCKS it with "blocked" status
 *
 * Expected:
 * - ApplyResult.status = "blocked"
 * - ApplyResult.message contains "forbidden directory"
 * - No trash() call happens
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Command } from "commander";
import { CleanCommand } from "../commands/CleanCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import type { Output } from "../output/Output.js";
import type { ScanTarget } from "@diskcare/scanner-core";
import { RulesEngine } from "@diskcare/rules-engine";
import type { ApplyResult } from "../types/RunLog.js";

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

test("CleanCommand E2E - forbidden path is blocked by PathGuard", async () => {
  // Setup: Forbidden path (C:\Windows\Temp)
  const forbiddenPath = "C:\\Windows\\Temp";
  const nowMs = Date.now();

  const mockTargets: ScanTarget[] = [
    {
      id: "os-temp",
      kind: "os-temp",
      path: forbiddenPath,
      displayName: "Windows Temp",
      exists: true,
      metrics: {
        totalBytes: 100000,
        fileCount: 10,
        lastModifiedAt: nowMs - 86400000 * 30, // 30 days old
        lastAccessedAt: nowMs - 86400000 * 30,
        skipped: false,
        partial: false,
        skippedEntries: 0,
      },
    },
  ];

  const mockRulesEngine = new RulesEngine({
    rules: [
      {
        id: "os-temp",
        risk: "safe",
        safeAfterDays: 7,
        description: "Test rule",
      },
    ],
    defaults: { risk: "caution", safeAfterDays: 30 },
  });

  let trashCalled = false;
  const mockTrashFn = async (_paths: string[]) => {
    trashCalled = true;
    throw new Error("trash() should NOT be called for forbidden paths");
  };

  const logPayloads: unknown[] = [];
  const mockWriteLog = async (_ctx: CommandContext, payload: unknown) => {
    logPayloads.push(payload);
    return "/fake/log/path.json";
  };

  const output = new FakeOutput();
  const context: CommandContext = {
    cwd: "D:\\diskcare",
    configPath: "D:\\diskcare\\config\\rules.json",
    nowFn: () => new Date(nowMs),
    pid: 12345,
    env: {},
    platform: "win32",
    homedir: "C:\\Users\\test",
    setExitCode: () => {},
    output,
  };

  const command = new CleanCommand({
    nowMs: () => nowMs,
    scanAll: async () => mockTargets,
    loadRules: async () => mockRulesEngine,
    trashFn: mockTrashFn,
    writeLog: mockWriteLog,
  });

  const program = new Command();
  program.exitOverride();
  command.register(program, context);

  // Execute: clean --apply --no-dry-run --yes
  await program.parseAsync(["node", "diskcare", "clean", "--apply", "--no-dry-run", "--yes"]);

  // Assert: trash() was NOT called
  assert.equal(trashCalled, false, "trash() should not be called for forbidden paths");

  // Assert: Log contains "blocked" status
  assert.equal(logPayloads.length, 1);
  const log = logPayloads[0] as any;
  assert.ok(log.applyResults, "Log should contain applyResults");

  const blockedResult = log.applyResults.find((r: ApplyResult) => r.path === forbiddenPath);
  assert.ok(blockedResult, "Forbidden path should be in applyResults");
  assert.equal(blockedResult.status, "blocked", "Status should be 'blocked'");
  assert.ok(
    blockedResult.message?.includes("forbidden"),
    `Message should mention 'forbidden', got: ${blockedResult.message}`,
  );
  assert.ok(
    blockedResult.message?.includes("C:\\Windows"),
    `Message should mention matched prefix 'C:\\Windows', got: ${blockedResult.message}`,
  );
});

test("CleanCommand E2E - safe path is trashed normally", async () => {
  // Setup: Safe path (user temp)
  const safePath = "C:\\Users\\user\\AppData\\Local\\Temp";
  const nowMs = Date.now();

  const mockTargets: ScanTarget[] = [
    {
      id: "os-temp",
      kind: "os-temp",
      path: safePath,
      displayName: "User Temp",
      exists: true,
      metrics: {
        totalBytes: 100000,
        fileCount: 10,
        lastModifiedAt: nowMs - 86400000 * 30,
        lastAccessedAt: nowMs - 86400000 * 30,
        skipped: false,
        partial: false,
        skippedEntries: 0,
      },
    },
  ];

  const mockRulesEngine = new RulesEngine({
    rules: [
      {
        id: "os-temp",
        risk: "safe",
        safeAfterDays: 7,
        description: "Test rule",
      },
    ],
    defaults: { risk: "caution", safeAfterDays: 30 },
  });

  let trashedPaths: string[] = [];
  const mockTrashFn = async (paths: string[]) => {
    trashedPaths = paths;
  };

  const logPayloads: unknown[] = [];
  const mockWriteLog = async (_ctx: CommandContext, payload: unknown) => {
    logPayloads.push(payload);
    return "/fake/log/path.json";
  };

  const output = new FakeOutput();
  const context: CommandContext = {
    cwd: "D:\\diskcare",
    configPath: "D:\\diskcare\\config\\rules.json",
    nowFn: () => new Date(nowMs),
    pid: 12345,
    env: {},
    platform: "win32",
    homedir: "C:\\Users\\test",
    setExitCode: () => {},
    output,
  };

  const command = new CleanCommand({
    nowMs: () => nowMs,
    scanAll: async () => mockTargets,
    loadRules: async () => mockRulesEngine,
    trashFn: mockTrashFn,
    writeLog: mockWriteLog,
  });

  const program = new Command();
  program.exitOverride();
  command.register(program, context);

  // Execute
  await program.parseAsync(["node", "diskcare", "clean", "--apply", "--no-dry-run", "--yes"]);

  // Assert: trash() WAS called
  assert.equal(trashedPaths.length, 1);
  assert.equal(trashedPaths[0], safePath);

  // Assert: Log contains "trashed" status
  const log = logPayloads[0] as any;
  const trashedResult = log.applyResults.find((r: ApplyResult) => r.path === safePath);
  assert.ok(trashedResult);
  assert.equal(trashedResult.status, "trashed");
});
