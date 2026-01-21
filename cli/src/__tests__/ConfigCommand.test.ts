import test from "node:test";
import assert from "node:assert/strict";

import { Command } from "commander";

import { ConfigCommand } from "../commands/ConfigCommand.js";
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

test("ConfigCommand - prints resolved config path and existence", async () => {
  const output = new FakeOutput();
  const configPath = "/virtual/config/rules.json";

  const cmd = new ConfigCommand({
    fs: {
      stat: async () => {
        const err = new Error("ENOENT");
        (err as any).code = "ENOENT";
        throw err;
      },
    },
  });

  const program = new Command();
  program.exitOverride();

  const context: CommandContext = {
    output,
    verbose: false,
    cwd: "/virtual",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath,
    setExitCode: () => {},
  };
  cmd.register(program, context);

  await program.parseAsync(["node", "diskcare", "config", "path"]);

  assert.ok(output.infos.some((l) => l.includes(`configPath: ${configPath}`)));
  assert.ok(output.infos.some((l) => l.includes("exists: no")));
});

test("ConfigCommand - supports JSON output", async () => {
  const output = new FakeOutput();
  const configPath = "/virtual/config/rules.json";

  const cmd = new ConfigCommand({
    fs: {
      stat: async () => ({ isFile: () => true }),
    },
  });

  const program = new Command();
  program.exitOverride();

  const context: CommandContext = {
    output,
    verbose: false,
    cwd: "/virtual",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath,
    setExitCode: () => {},
  };
  cmd.register(program, context);

  await program.parseAsync(["node", "diskcare", "config", "path", "--json"]);

  const raw = output.infos.find((l) => l.trim().startsWith("{"));
  assert.ok(raw, "should print JSON");

  const parsed = JSON.parse(raw ?? "{}") as any;
  assert.equal(parsed.configPath, configPath);
  assert.equal(parsed.exists, true);
  assert.equal(parsed.isFile, true);
});
