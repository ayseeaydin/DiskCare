import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "diskcare-e2e-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

type RunResult = { exitCode: number; stdout: string; stderr: string };

async function runCli(args: string[], opts: { cwd: string }): Promise<RunResult> {
  const cliEntry = path.resolve(__dirname, "..", "index.js");

  return await new Promise<RunResult>((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd: opts.cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });
  });
}

test("CLI E2E - config path --json prefers local config", async () => {
  await withTempDir(async (cwd) => {
    const configPath = path.resolve(cwd, "config", "rules.json");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify({ rules: [], defaults: { risk: "caution", safeAfterDays: 30 } }, null, 2),
      "utf8",
    );

    const result = await runCli(["config", "path", "--json"], { cwd });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.trim(), "");

    const parsed = JSON.parse(result.stdout.trim()) as {
      configPath: string;
      exists: boolean;
      isFile: boolean;
    };

    assert.equal(parsed.configPath, configPath);
    assert.equal(parsed.exists, true);
    assert.equal(parsed.isFile, true);
  });
});

test("CLI E2E - --config overrides resolved configPath", async () => {
  await withTempDir(async (cwd) => {
    const configPath = path.resolve(cwd, "custom-rules.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({ rules: [], defaults: { risk: "caution", safeAfterDays: 30 } }, null, 2),
      "utf8",
    );

    const result = await runCli(["--config", configPath, "config", "path", "--json"], { cwd });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.trim(), "");

    const parsed = JSON.parse(result.stdout.trim()) as { configPath: string };
    assert.equal(parsed.configPath, configPath);
  });
});

test("CLI E2E - schedule rejects invalid frequency", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCli(["schedule", "monthly"], { cwd });

    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.includes("code: VALIDATION_ERROR"));
    assert.ok(result.stderr.includes("Invalid schedule frequency"));
    assert.ok(result.stderr.includes("hint: re-run with --verbose for more detail"));

    // Non-verbose output should not include a stack trace.
    assert.equal(/\n\s+at\s/.test(result.stderr), false);
  });
});

test("CLI E2E - --verbose includes stack trace on errors", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCli(["--verbose", "schedule", "monthly"], { cwd });

    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.includes("code: VALIDATION_ERROR"));
    assert.ok(result.stderr.includes("Invalid schedule frequency"));

    // Verbose mode should not print the generic re-run hint.
    assert.equal(result.stderr.includes("hint: re-run with --verbose for more detail"), false);

    // Verbose mode should include a stack trace.
    assert.equal(/\n\s+at\s/.test(result.stderr), true);
  });
});

test("CLI E2E - init --list-policies exits cleanly", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCli(["init", "--list-policies"], { cwd });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.trim(), "");
    assert.ok(result.stdout.includes("Available policies:"));
    assert.ok(result.stdout.includes("conservative"));
  });
});
