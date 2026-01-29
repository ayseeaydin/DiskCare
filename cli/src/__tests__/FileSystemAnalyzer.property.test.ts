import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fc from "fast-check";

import { FileSystemAnalyzer } from "@diskcare/scanner-core";
import type { FsLike } from "@diskcare/scanner-core";

function dirent(name: string, kind: "file" | "dir") {
  return {
    name,
    isFile: () => kind === "file",
    isDirectory: () => kind === "dir",
  };
}

test("FileSystemAnalyzer property: sums bytes and counts files for flat dirs", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.integer({ min: 0, max: 1024 * 1024 }), { minLength: 1, maxLength: 20 }),
      fc.array(fc.integer({ min: 1, max: 10_000_000 }), { minLength: 1, maxLength: 20 }),
      async (sizes, times) => {
        const root = path.join(path.sep, "root");
        const files = sizes.map((_, i) => path.join(root, `file-${i}.txt`));
        const mtime = times.slice(0, sizes.length);

        const fsLike: FsLike = {
          async stat(p: string) {
            if (p === root) {
              return { isDirectory: () => true, size: 0, mtimeMs: 1, atimeMs: 1 };
            }
            const index = files.indexOf(p);
            if (index >= 0) {
              const size = sizes[index] ?? 0;
              const t = mtime[index] ?? 1;
              return { isDirectory: () => false, size, mtimeMs: t, atimeMs: t };
            }
            throw new Error("ENOENT");
          },
          async readdir(p: string) {
            if (p !== root) return [];
            return files.map((f) => dirent(path.basename(f), "file") as any);
          },
        };

        const analyzer = new FileSystemAnalyzer(fsLike);
        const metrics = await analyzer.analyze(root);

        const expectedTotal = sizes.reduce((acc, v) => acc + v, 0);
        const expectedFiles = sizes.length;
        const expectedMaxTime = mtime.reduce((acc, v) => Math.max(acc, v), 0);

        assert.equal(metrics.skipped, false);
        assert.equal(metrics.fileCount, expectedFiles);
        assert.equal(metrics.totalBytes, expectedTotal);
        assert.equal(metrics.lastModifiedAt, expectedMaxTime);
        assert.equal(metrics.lastAccessedAt, expectedMaxTime);
      },
    ),
    { numRuns: 100 },
  );
});

test("FileSystemAnalyzer property: partial true when any directory read fails", async () => {
  await fc.assert(
    fc.asyncProperty(fc.boolean(), fc.boolean(), async (failA, failB) => {
      const root = path.join(path.sep, "root");
      const aDir = path.join(root, "a");
      const bDir = path.join(root, "b");

      const fsLike: FsLike = {
        async stat(p: string) {
          if (p === root || p === aDir || p === bDir) {
            return { isDirectory: () => true, size: 0, mtimeMs: 1, atimeMs: 1 };
          }
          return { isDirectory: () => false, size: 1, mtimeMs: 1, atimeMs: 1 };
        },
        async readdir(p: string) {
          if (p === root) {
            return [dirent("a", "dir") as any, dirent("b", "dir") as any];
          }
          if (p === aDir && failA) throw new Error("EACCES");
          if (p === bDir && failB) throw new Error("EACCES");
          return [];
        },
      };

      const analyzer = new FileSystemAnalyzer(fsLike);
      const metrics = await analyzer.analyze(root);
      const expectedPartial = failA || failB;
      assert.equal(metrics.partial, expectedPartial);
    }),
    { numRuns: 100 },
  );
});
