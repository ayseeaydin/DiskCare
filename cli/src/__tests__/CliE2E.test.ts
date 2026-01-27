import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const cliPackage = require("../../package.json") as { version?: string };

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "diskcare-e2e-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

type RunResult = { exitCode: number; stdout: string; stderr: string };

async function runCli(
  args: string[],
  opts: { cwd: string; env?: Record<string, string | undefined> },
): Promise<RunResult> {
  const cliEntry = path.resolve(__dirname, "..", "index.js");

  return await new Promise<RunResult>((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
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

// v1: Incomplete feature (ScheduleCommand) testleri publish'de devre dışı

test("CLI E2E - init --list-policies exits cleanly", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCli(["init", "--list-policies"], { cwd });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.trim(), "");
    assert.ok(result.stdout.includes("Available policies:"));
    assert.ok(result.stdout.includes("conservative"));
  });
});

test("CLI E2E - report --json is parseable and stable", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCli(["report", "--json"], { cwd });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.trim(), "");

    const parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    assert.equal(parsed.command, "report");
    assert.equal(typeof parsed.runCount, "number");
    assert.ok(
      parsed.latestRunAt === null || typeof parsed.latestRunAt === "string",
      "latestRunAt should be null|string",
    );
    assert.ok(
      parsed.latestRunFile === null || typeof parsed.latestRunFile === "string",
      "latestRunFile should be null|string",
    );
    assert.equal(typeof parsed.scanTotalBytes, "number");
    assert.equal(typeof parsed.scanMissingTargets, "number");
    assert.equal(typeof parsed.scanSkippedTargets, "number");
    assert.equal(typeof parsed.applyRuns, "number");
    assert.equal(typeof parsed.trashedCount, "number");
    assert.equal(typeof parsed.failedCount, "number");
    assert.ok(
      typeof parsed.configPath === "string" && parsed.configPath.endsWith("rules.json"),
      "configPath should be present in report --json output",
    );
  });
});

test("CLI E2E - scan --json is parseable and stable", async () => {
  await withTempDir(async (cwd) => {
    const configPath = path.resolve(cwd, "config", "rules.json");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify({ rules: [], defaults: { risk: "caution", safeAfterDays: 30 } }, null, 2),
      "utf8",
    );

    const result = await runCli(["scan", "--json"], {
      cwd,
      env: {
        // Keep E2E fast and deterministic: only the sandbox target.
        DISKCARE_SCAN_ONLY: "sandbox",
      },
    });

    assert.equal(result.exitCode, 0);
    // Progress output is expected in stderr, do not assert it's empty

    // Parse all stdout as JSON (pretty-printed JSON support)
    let parsed: any;
    try {
      parsed = JSON.parse(result.stdout);
    } catch (e) {
      assert.fail(`Could not parse stdout as JSON. Output:\n${result.stdout}`);
    }
    assert.equal(parsed.command, "scan");
    assert.equal(typeof parsed.dryRun, "boolean");
    assert.ok(Array.isArray(parsed.targets));
    assert.ok(
      typeof parsed.configPath === "string" && parsed.configPath.endsWith("rules.json"),
      "configPath should be present in scan --json output",
    );
  });
});

test("CLI E2E - clean --json includes configPath", async () => {
  await withTempDir(async (cwd) => {
    const configPath = path.resolve(cwd, "config", "rules.json");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify({ rules: [], defaults: { risk: "caution", safeAfterDays: 30 } }, null, 2),
      "utf8",
    );

    const result = await runCli(["clean", "--json"], { cwd });

    assert.equal(result.exitCode, 0);
    let parsed: any;
    try {
      parsed = JSON.parse(result.stdout);
    } catch (e) {
      assert.fail(`Could not parse stdout as JSON. Output:\n${result.stdout}`);
    }
    assert.ok(
      typeof parsed.configPath === "string" && parsed.configPath.endsWith("rules.json"),
      "configPath should be present in clean --json output",
    );
  });
});

test("CLI E2E - --help prints usage", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCli(["--help"], { cwd });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.trim(), "");

    // Yeni help çıktısına uygun anahtar kelimeler
    assert.ok(
      result.stdout.includes("Disk bakımı ve temizlik için güvenli CLI") ||
        result.stdout.includes("safe by default"),
      "Help output should mention diskcare and safe by default",
    );
    assert.ok(result.stdout.includes("diskcare"), "Help output should mention diskcare");
    assert.ok(
      result.stdout.includes("Komutlar") || result.stdout.toLowerCase().includes("commands"),
      "Help output should mention commands",
    );
    assert.ok(
      result.stdout.includes("Varsayılan olarak hiçbir dosya silinmez") ||
        result.stdout.includes("dry-run"),
      "Help output should mention non-destructive/dry-run",
    );
    assert.ok(result.stdout.includes("--apply"), "Help output should mention --apply flag");
    assert.ok(
      result.stdout.includes("For help / yardım"),
      "Help output should mention help/yardım",
    );
  });
});

test("CLI E2E - --version prints version", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCli(["--version"], { cwd });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.trim(), "");

    const expected = cliPackage.version ?? "0.0.0";
    assert.ok(new RegExp(`^${expected.replace(/\./g, "\\.")}\\b`).test(result.stdout.trim()));
  });
});
