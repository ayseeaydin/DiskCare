import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { FileSystemAnalyzer } from "../analyzers/FileSystemAnalyzer.js";

async function makeTempDir(prefix = "diskcare-analyzer-"): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("FileSystemAnalyzer.analyze - returns metrics for nested files (bytes + count) and skipped=false", async () => {
  const dir = await makeTempDir();
  const nested = path.join(dir, "a", "b");
  await fs.mkdir(nested, { recursive: true });

  const f1 = path.join(dir, "root.txt");
  const f2 = path.join(nested, "nested.txt");

  await fs.writeFile(f1, "hello"); // 5 bytes
  await fs.writeFile(f2, "world!"); // 6 bytes

  // Set predictable mtimes (atime can be unreliable on some systems, so we don't assert exact atime)
  const t1 = new Date("2026-01-01T00:00:00.000Z");
  const t2 = new Date("2026-01-02T00:00:00.000Z");
  await fs.utimes(f1, t1, t1);
  await fs.utimes(f2, t2, t2);

  const analyzer = new FileSystemAnalyzer();
  const metrics = await analyzer.analyze(dir);

  assert.equal(metrics.skipped, false);
  assert.equal(metrics.fileCount, 2);
  assert.equal(metrics.totalBytes, 11);
  assert.ok(metrics.lastModifiedAt !== null, "lastModifiedAt should be set");
  assert.ok(metrics.lastModifiedAt! >= t2.getTime(), "lastModifiedAt should be >= newest mtime");
});

test("FileSystemAnalyzer.analyze - when path is not a directory, returns skipped=true with explainable error", async () => {
  const dir = await makeTempDir();
  const file = path.join(dir, "not-a-dir.txt");
  await fs.writeFile(file, "x");

  const analyzer = new FileSystemAnalyzer();
  const metrics = await analyzer.analyze(file);

  assert.equal(metrics.skipped, true);
  assert.equal(metrics.totalBytes, 0);
  assert.equal(metrics.fileCount, 0);
  assert.equal(metrics.lastModifiedAt, null);
  assert.equal(metrics.lastAccessedAt, null);
  assert.ok(
    metrics.error?.includes("Path is not a directory"),
    "error should explain non-directory",
  );
});

test("FileSystemAnalyzer.analyze - when path is missing/inaccessible, returns skipped=true with explainable error", async () => {
  const analyzer = new FileSystemAnalyzer();
  const missing = path.join(os.tmpdir(), `diskcare-missing-${Date.now()}-${Math.random()}`);

  const metrics = await analyzer.analyze(missing);

  assert.equal(metrics.skipped, true);
  assert.ok(
    metrics.error?.startsWith(`Cannot access path: ${missing}`),
    "error should include path",
  );
});
