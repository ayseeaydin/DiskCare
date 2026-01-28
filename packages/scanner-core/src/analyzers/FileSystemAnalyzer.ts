import fs from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";

import type { ScanMetrics } from "../types/ScanMetrics.js";
import type { FsLike } from "./FsLike.js";
import { toErrorMessageOneLine } from "../utils/errorMessage.js";
import { fromPromise } from "../utils/result.js";

function defaultFs(): FsLike {
  return {
    stat: (p: string) => fs.stat(p),
    readdir: (p: string, opts: { withFileTypes: true }) => fs.readdir(p, opts) as Promise<Dirent[]>,
  };
}

export class FileSystemAnalyzer {
  constructor(private readonly fsLike: FsLike = defaultFs()) {}

  async analyze(rootPath: string): Promise<ScanMetrics> {
    // Verify root is accessible early (explainable behavior)
    const rootStatRes = await fromPromise(this.fsLike.stat(rootPath));
    if (!rootStatRes.ok) {
      return emptyMetrics(
        `Cannot access path: ${rootPath} (${toErrorMessageOneLine(rootStatRes.error)})`,
      );
    }
    const rootStat = rootStatRes.value;
    if (!rootStat.isDirectory()) {
      return {
        totalBytes: rootStat.size,
        fileCount: 1,
        lastModifiedAt: rootStat.mtimeMs,
        lastAccessedAt: rootStat.atimeMs,
        skipped: false,
        partial: false,
        skippedEntries: 0,
      };
    }

    let totalBytes = 0;
    let fileCount = 0;
    let lastModifiedAt: number | null = null;
    let lastAccessedAt: number | null = null;

    let skippedEntries = 0;

    const fsLike = this.fsLike;

    const walkFiles = async function* (
      startDir: string,
    ): AsyncGenerator<{ fullPath: string; entry: Dirent }, void, void> {
      const stack: string[] = [startDir];

      while (stack.length > 0) {
        const currentDir = stack.pop() as string;

        const entriesRes = await fromPromise(fsLike.readdir(currentDir, { withFileTypes: true }));
        if (!entriesRes.ok) {
          skippedEntries += 1;
          continue;
        }
        const entries = entriesRes.value;

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            stack.push(fullPath);
            continue;
          }

          if (entry.isFile()) {
            yield { fullPath, entry };
          }
        }
      }
    };

    for await (const { fullPath } of walkFiles(rootPath)) {
      const statRes = await fromPromise(this.fsLike.stat(fullPath));
      if (!statRes.ok) {
        skippedEntries += 1;
        continue;
      }
      const stat = statRes.value;

      fileCount += 1;
      totalBytes += stat.size;

      lastModifiedAt = maxTimestamp(lastModifiedAt, stat.mtimeMs);
      lastAccessedAt = maxTimestamp(lastAccessedAt, stat.atimeMs);
    }

    return {
      totalBytes,
      fileCount,
      lastModifiedAt,
      lastAccessedAt,
      skipped: false,
      partial: skippedEntries > 0,
      skippedEntries,
    };
  }
}

function maxTimestamp(a: number | null, b: number): number {
  if (a === null) return b;
  return Math.max(a, b);
}

function emptyMetrics(error: string): ScanMetrics {
  return {
    totalBytes: 0,
    fileCount: 0,
    lastModifiedAt: null,
    lastAccessedAt: null,
    skipped: true,
    error,
    partial: false,
    skippedEntries: 0,
  };
}
