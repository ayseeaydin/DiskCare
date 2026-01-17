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

test("FileSystemAnalyzer.analyze - marks partial=true when a subtree cannot be read", async () => {
  const root = "/root";
  const locked = path.join(root, "locked");
  const okFile = path.join(root, "ok.txt");

  const fsLike: FsLike = {
    async stat(p: string) {
      if (p === root) {
        return { isDirectory: () => true, size: 0, mtimeMs: 1, atimeMs: 1 };
      }
      if (p === okFile) {
        return { isDirectory: () => false, size: 5, mtimeMs: 10, atimeMs: 10 };
      }
      if (p === locked) {
        return { isDirectory: () => true, size: 0, mtimeMs: 2, atimeMs: 2 };
      }
      throw new Error("ENOENT");
    },

    async readdir(p: string) {
      if (p === root) {
        return [dirent("ok.txt", "file") as any, dirent("locked", "dir") as any];
      }
      if (p === locked) {
        throw new Error("EACCES");
      }
      return [];
    },
  };

  const analyzer = new FileSystemAnalyzer(fsLike);
  const metrics = await analyzer.analyze(root);

  assert.equal(metrics.skipped, false);
  assert.equal(metrics.partial, true);
  assert.equal(metrics.skippedEntries, 1);

  assert.equal(metrics.fileCount, 1);
  assert.equal(metrics.totalBytes, 5);
});
