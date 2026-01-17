import fs from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";

import type { ScanMetrics } from "../types/ScanMetrics.js";
import type { FsLike } from "./FsLike.js";

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
      return emptyMetrics(`Cannot access path: ${rootPath} (${toErrorMessage(err)})`);
    }

    let totalBytes = 0;
    let fileCount = 0;
    let lastModifiedAt: number | null = null;
    let lastAccessedAt: number | null = null;

    let skippedEntries = 0;

    const walk = async (currentPath: string): Promise<void> => {
      let entries: Dirent[];
      try {
        entries = await this.fsLike.readdir(currentPath, { withFileTypes: true });
      } catch {
        skippedEntries += 1;
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        let stat;
        try {
          stat = await this.fsLike.stat(fullPath);
        } catch {
          skippedEntries += 1;
          continue;
        }

        if (entry.isFile()) {
          fileCount += 1;
          totalBytes += stat.size;

          lastModifiedAt = maxTimestamp(lastModifiedAt, stat.mtimeMs);
          lastAccessedAt = maxTimestamp(lastAccessedAt, stat.atimeMs);
        } else if (entry.isDirectory()) {
          await walk(fullPath);
        }
      }
    };

    await walk(rootPath);

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

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
