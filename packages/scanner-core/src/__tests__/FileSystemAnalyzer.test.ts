import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { FileSystemAnalyzer } from "../analyzers/FileSystemAnalyzer.js";
import type { FsLike } from "../analyzers/FsLike.js";

function dirent(name: string, kind: "file" | "dir") {
  return {
    name,
    isFile: () => kind === "file",
    isDirectory: () => kind === "dir",
  };
}

test("FileSystemAnalyzer.analyze - returns metrics for nested files (bytes + count) and skipped=false", async () => {
  const root = path.join("/", "root");
  const aDir = path.join(root, "a");
  const bDir = path.join(aDir, "b");
  const f1 = path.join(root, "root.txt");
  const f2 = path.join(bDir, "nested.txt");

  const t1 = new Date("2026-01-01T00:00:00.000Z").getTime();
  const t2 = new Date("2026-01-02T00:00:00.000Z").getTime();

  const fsLike: FsLike = {
    async stat(p: string) {
      if (p === root || p === aDir || p === bDir) {
        return { isDirectory: () => true, size: 0, mtimeMs: 1, atimeMs: 1 };
      }
      if (p === f1) {
        return { isDirectory: () => false, size: 5, mtimeMs: t1, atimeMs: t1 };
      }
      if (p === f2) {
        return { isDirectory: () => false, size: 6, mtimeMs: t2, atimeMs: t2 };
      }
      throw new Error("ENOENT");
    },

    async readdir(p: string) {
      if (p === root) {
        return [dirent("root.txt", "file") as any, dirent("a", "dir") as any];
      }
      if (p === aDir) {
        return [dirent("b", "dir") as any];
      }
      if (p === bDir) {
        return [dirent("nested.txt", "file") as any];
      }
      return [];
    },
  };

  const analyzer = new FileSystemAnalyzer(fsLike);
  const metrics = await analyzer.analyze(root);

  assert.equal(metrics.skipped, false);
  assert.equal(metrics.fileCount, 2);
  assert.equal(metrics.totalBytes, 11);
  assert.ok(metrics.lastModifiedAt !== null, "lastModifiedAt should be set");
  assert.ok(metrics.lastModifiedAt! >= t2, "lastModifiedAt should be >= newest mtime");
});

test("FileSystemAnalyzer.analyze - when path is not a directory, returns skipped=true with explainable error", async () => {
  const fsLike: FsLike = {
    async stat(p: string) {
      if (p === "/not-a-dir") {
        return { isDirectory: () => false, size: 1, mtimeMs: 1, atimeMs: 1 };
      }
      throw new Error("ENOENT");
    },
    async readdir() {
      return [];
    },
  };

  const analyzer = new FileSystemAnalyzer(fsLike);
  const metrics = await analyzer.analyze("/not-a-dir");

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
  const fsLike: FsLike = {
    async stat() {
      throw new Error("EACCES");
    },
    async readdir() {
      return [];
    },
  };

  const analyzer = new FileSystemAnalyzer(fsLike);
  const missing = "/missing";
  const metrics = await analyzer.analyze(missing);

  assert.equal(metrics.skipped, true);
  assert.ok(
    metrics.error?.startsWith(`Cannot access path: ${missing}`),
    "error should include path",
  );
});
