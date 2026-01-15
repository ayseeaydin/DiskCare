import fs from "node:fs/promises";
import path from "node:path";

type RunLog = {
  timestamp?: string;
  command?: string;
  dryRun?: boolean;
  targets?: Array<{
    id?: string;
    displayName?: string;
    exists?: boolean;
    metrics?: {
      totalBytes?: number;
      skipped?: boolean;
    };
  }>;
};

export class ReportService {
  constructor(private readonly logsDir: string) {}

  async listLatest(limit: number): Promise<Array<{ file: string; data: RunLog }>> {
    let files: string[] = [];
    try {
      files = await fs.readdir(this.logsDir);
    } catch {
      return [];
    }

    const runFiles = files
      .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, limit);

    const result: Array<{ file: string; data: RunLog }> = [];

    for (const file of runFiles) {
      const full = path.join(this.logsDir, file);
      try {
        const content = await fs.readFile(full, "utf8");
        result.push({ file, data: JSON.parse(content) as RunLog });
      } catch {
        // ignore unreadable files
      }
    }

    return result;
  }

  summarize(runs: Array<{ file: string; data: RunLog }>): {
    runCount: number;
    latestTimestamp: string | null;
    totalBytes: number;
    missingTargets: number;
    skippedTargets: number;
  } {
    let totalBytes = 0;
    let missingTargets = 0;
    let skippedTargets = 0;

    for (const run of runs) {
      for (const t of run.data.targets ?? []) {
        if (t.exists === false) missingTargets += 1;
        if (t.metrics?.skipped === true) skippedTargets += 1;
        totalBytes += t.metrics?.totalBytes ?? 0;
      }
    }

    const latestTimestamp = runs[0]?.data.timestamp ?? null;

    return {
      runCount: runs.length,
      latestTimestamp,
      totalBytes,
      missingTargets,
      skippedTargets,
    };
  }
}
