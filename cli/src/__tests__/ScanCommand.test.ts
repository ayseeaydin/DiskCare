import test from "node:test";
import assert from "node:assert/strict";

import { Command } from "commander";

import { ScanCommand } from "../commands/ScanCommand.js";
import type { CommandContext } from "../types/CommandContext.js";

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

test("ScanCommand - should use injected nowFn for payload timestamp", async () => {
  const output = new FakeOutput();
  const fixed = new Date("2026-01-21T12:34:56.000Z");

  let nowCalls = 0;
  let wrotePayload: any = null;

  const cmd = new ScanCommand({
    scanAll: async (_context) => [],
    loadRules: async () => null,
    writeLog: async (_context, payload) => {
      wrotePayload = payload;
      return "logs/run-test.json";
    },
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
    nowFn: () => {
      nowCalls++;
      return fixed;
    },
    configPath: "/virtual/config/rules.json",
    setExitCode: () => {},
  };

  cmd.register(program, context);
  await program.parseAsync(["node", "diskcare", "scan", "--json"]);

  assert.equal(nowCalls, 1);
  assert.ok(wrotePayload, "should write a run log payload");
  assert.equal(wrotePayload.timestamp, fixed.toISOString());

  const raw = output.infos.find((l) => l.trim().startsWith("{"));
  assert.ok(raw, "should print JSON output");
});
