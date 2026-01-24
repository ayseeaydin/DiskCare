import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { LogWriter } from "../logging/LogWriter.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

test("LogWriter - should write latest-run pointer next to run log (best-effort)", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "diskcare-logwriter-"));
  const logsDir = path.join(tmpRoot, "logs");

  const fixed = new Date("2026-01-21T12:34:56.000Z");
  const writer = new LogWriter(logsDir, { nowFn: () => fixed, pid: 123 });

  const finalPath = await writer.writeRunLog({ hello: "world" });

  assert.ok(await pathExists(finalPath), "run log should exist");

  const metaPath = path.join(logsDir, "meta", "latest-run.json");
  assert.ok(await pathExists(metaPath), "latest-run.json should exist");

  const metaRaw = await fs.readFile(metaPath, { encoding: "utf8" });
  const meta = JSON.parse(metaRaw);

  assert.equal(meta.updatedAt, fixed.toISOString());
  assert.equal(meta.logFile, path.basename(finalPath));
});

test("LogWriter - should ignore latest-run pointer errors (does not fail main log write)", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "diskcare-logwriter-"));
  const logsDir = path.join(tmpRoot, "logs");

  await fs.mkdir(logsDir, { recursive: true });
  // Make `logs/meta` impossible by creating a file at `logs/meta`.
  await fs.writeFile(path.join(logsDir, "meta"), "not a dir", { encoding: "utf8" });

  const fixed = new Date("2026-01-21T12:34:56.000Z");
  const writer = new LogWriter(logsDir, { nowFn: () => fixed, pid: 123 });

  const finalPath = await writer.writeRunLog({ hello: "world" });

  assert.ok(await pathExists(finalPath), "run log should exist even if meta write fails");
  assert.equal(
    await pathExists(path.join(logsDir, "meta", "latest-run.json")),
    false,
    "latest-run.json should not exist when meta dir is blocked",
  );
});
