import fs from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";

import type { ScanMetrics } from "../types/ScanMetrics.js";
import type { FsLike } from "./FsLike.js";
import { toErrorMessageOneLine } from "../utils/errorMessage.js";

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
    try {
      const rootStat = await this.fsLike.stat(rootPath);
      if (!rootStat.isDirectory()) {
        return emptyMetrics(`Path is not a directory: ${rootPath}`);
      }
    } catch (err) {
      return emptyMetrics(`Cannot access path: ${rootPath} (${toErrorMessageOneLine(err)})`);
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

        let entries: Dirent[];
        try {
          entries = await fsLike.readdir(currentDir, { withFileTypes: true });
        } catch {
          skippedEntries += 1;
          continue;
        }

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
      let stat;
      try {
        stat = await this.fsLike.stat(fullPath);
      } catch {
        skippedEntries += 1;
        continue;
      }

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
