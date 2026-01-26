import test from "node:test";
import assert from "node:assert/strict";

import { Command } from "commander";

import { InitCommand } from "../commands/InitCommand.js";
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

test("InitCommand - creates rules.json using policy template", async () => {
  const output = new FakeOutput();
  const files = new Map<string, string>();

  const configPath = "/virtual/config/rules.json";
  const createdDirs: string[] = [];

  const cmd = new InitCommand({
    fs: {
      mkdir: async (dir: string) => {
        createdDirs.push(dir);
        return undefined;
      },
      writeFile: async (filePath: string, content: string) => {
        files.set(filePath, content);
      },
      stat: async (_filePath: string) => {
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
    platform: "linux",
    env: {},
    homedir: "/home/test",
  };
  cmd.register(program, context);

  await program.parseAsync(["node", "diskcare", "init", "--policy", "aggressive"]);

  const raw = files.get(configPath);
  assert.ok(raw, "should write config file");

  const parsed = JSON.parse(raw ?? "{}") as any;
  assert.equal(parsed.defaults.safeAfterDays, 14);
  assert.ok(Array.isArray(parsed.rules));
  assert.ok(createdDirs.some((d) => d.includes("/virtual/config")));

  assert.ok(output.infos.some((l) => l.includes("Created rules config")));
  assert.ok(output.infos.some((l) => l.includes("Policy: aggressive")));
});

test("InitCommand - does not overwrite existing config without --force", async () => {
  const output = new FakeOutput();
  const files = new Map<string, string>([["/virtual/config/rules.json", "{\n}\n"]]);

  const configPath = "/virtual/config/rules.json";

  const cmd = new InitCommand({
    fs: {
      mkdir: async () => undefined,
      writeFile: async (filePath: string, content: string) => {
        files.set(filePath, content);
      },
      stat: async (_filePath: string) => ({ isFile: () => true }),
    },
  });

  const program = new Command();
  program.exitOverride();

  let exitCode: number | undefined;
  const context: CommandContext = {
    output,
    verbose: false,
    cwd: "/virtual",
    platform: "linux",
    env: {},
    homedir: "/home/test",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath,
    setExitCode: (code) => {
      exitCode = code;
    },
  };
  cmd.register(program, context);

  await program.parseAsync(["node", "diskcare", "init"]);

  assert.equal(exitCode, 1);
  assert.ok(output.errors.some((l) => l.startsWith("error:")));
  assert.ok(output.errors.some((l) => l === "code: VALIDATION_ERROR"));
});

test("InitCommand - refuses to overwrite when config path exists but is not a file", async () => {
  const output = new FakeOutput();
  const configPath = "/virtual/config/rules.json";

  const cmd = new InitCommand({
    fs: {
      mkdir: async () => undefined,
      writeFile: async () => {
        throw new Error("should not write");
      },
      stat: async (_filePath: string) => ({ isFile: () => false }),
    },
  });

  const program = new Command();
  program.exitOverride();

  let exitCode: number | undefined;
  const context: CommandContext = {
    output,
    verbose: false,
    cwd: "/virtual",
    platform: "linux",
    env: {},
    homedir: "/home/test",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath,
    setExitCode: (code) => {
      exitCode = code;
    },
  };
  cmd.register(program, context);

  await program.parseAsync(["node", "diskcare", "init", "--force"]);

  assert.equal(exitCode, 1);
  assert.ok(output.errors.some((l) => l === "code: VALIDATION_ERROR"));
});

test("InitCommand - reports CONFIG_WRITE_ERROR when config path cannot be accessed", async () => {
  const output = new FakeOutput();
  const configPath = "/virtual/config/rules.json";

  const cmd = new InitCommand({
    fs: {
      mkdir: async () => undefined,
      writeFile: async () => {
        throw new Error("should not write");
      },
      stat: async (_filePath: string) => {
        const err = new Error("EACCES: permission denied");
        (err as any).code = "EACCES";
        throw err;
      },
    },
  });

  const program = new Command();
  program.exitOverride();

  let exitCode: number | undefined;
  const context: CommandContext = {
    output,
    verbose: false,
    cwd: "/virtual",
    platform: "linux",
    env: {},
    homedir: "/home/test",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath,
    setExitCode: (code) => {
      exitCode = code;
    },
  };
  cmd.register(program, context);

  await program.parseAsync(["node", "diskcare", "init"]);

  assert.equal(exitCode, 1);
  assert.ok(output.errors.some((l) => l === "code: CONFIG_WRITE_ERROR"));
});

test("InitCommand - lists policies without writing a config file", async () => {
  const output = new FakeOutput();
  const configPath = "/virtual/config/rules.json";

  const cmd = new InitCommand({
    fs: {
      mkdir: async () => {
        throw new Error("should not mkdir");
      },
      writeFile: async () => {
        throw new Error("should not write");
      },
      stat: async () => {
        throw new Error("should not stat");
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
    platform: "linux",
    env: {},
    homedir: "/home/test",
  };
  cmd.register(program, context);

  await program.parseAsync(["node", "diskcare", "init", "--list-policies"]);

  assert.ok(output.infos.some((l) => l.includes("Available policies")));
  assert.ok(output.infos.some((l) => l.includes("conservative")));
  assert.ok(output.infos.some((l) => l.includes("aggressive")));
  assert.ok(output.infos.some((l) => l.includes("custom")));
});
