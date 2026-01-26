import test from "node:test";
import assert from "node:assert/strict";

import { Command } from "commander";

import { ReportCommand } from "../commands/ReportCommand.js";
import type { CommandContext } from "../types/CommandContext.js";

class FakeOutput {
  readonly progresses: string[] = [];
  progress(message: string): void {
    this.progresses.push(message);
  }
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

test("ReportCommand - --json includes latestRunFile", async () => {
  const output = new FakeOutput();

  const cmd = new ReportCommand({
    summarize: async () => ({
      runCount: 3,
      latestRunAt: new Date("2026-01-21T12:34:56.000Z").toISOString(),
      latestRunFile: "run-20260121-123456-123-abcdef01.json",

      latestScanAt: null,
      scanTotalBytes: 0,
      scanMissingTargets: 0,
      scanSkippedTargets: 0,

      totalBytes: 0,
      missingTargets: 0,
      skippedTargets: 0,

      applyRuns: 0,
      trashedCount: 0,
      failedCount: 0,
      latestApplyAt: null,
      trashedEstimatedBytes: 0,
    }),
  });

  const program = new Command();
  program.exitOverride();

  const context: CommandContext = {
    output,
    verbose: false,
    cwd: "/virtual",
    platform: "win32",
    env: {},
    homedir: "C:\\Users\\test",
    pid: 123,
    nowFn: () => new Date("2026-01-21T12:34:56.000Z"),
    configPath: "/virtual/config/rules.json",
    setExitCode: () => {},
  };

  cmd.register(program, context);
  await program.parseAsync(["node", "diskcare", "report", "--json"]);

  const raw = output.infos.find((l) => l.trim().startsWith("{"));
  assert.ok(raw, "should print JSON output");

  const obj = JSON.parse(raw);
  assert.equal(obj.command, "report");
  assert.equal(obj.latestRunFile, "run-20260121-123456-123-abcdef01.json");
});
