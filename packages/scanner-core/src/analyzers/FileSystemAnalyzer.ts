import fs from "node:fs/promises";
import path from "node:path";
import type { ScanMetrics } from "../types/ScanMetrics.js";

export class FileSystemAnalyzer {
  async analyze(rootPath: string): Promise<ScanMetrics> {
    // Verify root is accessible early (explainable behavior)
    try {
      const rootStat = await fs.stat(rootPath);
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

    const walk = async (currentPath: string): Promise<void> => {
      let entries: Array<import("node:fs").Dirent>;
      try {
        entries = await fs.readdir(currentPath, { withFileTypes: true });
      } catch {
        // Permission denied or IO error → skip this subtree
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        let stat;
        try {
          stat = await fs.stat(fullPath);
        } catch {
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
