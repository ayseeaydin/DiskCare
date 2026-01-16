import fs from "node:fs/promises";
import path from "node:path";

import type { RunLog } from "../types/RunLog.js";

type ReportSummary = {
  runCount: number;
  latestRunAt: string | null;

  // Latest scan snapshot
  latestScanAt: string | null;
  latestScanTotalBytes: number;
  latestScanMissingTargets: number;
  latestScanSkippedTargets: number;

  // Apply aggregates
  applyRuns: number;
  trashedCount: number;
  failedCount: number;
  latestApplyAt: string | null;
  trashedEstimatedBytes: number;
};

export class ReportService {
  constructor(private readonly logsDir: string) {}

  async summarize(): Promise<ReportSummary> {
    const logs = await this.readRunLogs();

    const runCount = logs.length;
    const latestRunAt = this.findLatestTimestamp(logs);

    // ---- Latest scan snapshot (single run) ----
    const latestScan = this.findLatestByCommand(logs, "scan");

    let latestScanAt: string | null = latestScan?.timestamp ?? null;
    let latestScanTotalBytes = 0;
    let latestScanMissingTargets = 0;
    let latestScanSkippedTargets = 0;

    if (latestScan) {
      for (const t of latestScan.targets ?? []) {
        if (t.exists === false) latestScanMissingTargets += 1;
        if (t.metrics?.skipped === true) latestScanSkippedTargets += 1;
        latestScanTotalBytes += t.metrics?.totalBytes ?? 0;
      }
    }

    // ---- CLEAN apply aggregates (across runs) ----
    let applyRuns = 0;
    let trashedCount = 0;
    let failedCount = 0;
    let latestApplyAt: string | null = null;
    let trashedEstimatedBytes = 0;

    for (const log of logs) {
      if (log.command !== "clean") continue;
      if (log.apply !== true) continue;

      applyRuns += 1;

      const ts = log.timestamp ?? null;
      if (ts && (!latestApplyAt || new Date(ts).getTime() > new Date(latestApplyAt).getTime())) {
        latestApplyAt = ts;
      }

      for (const r of log.applyResults ?? []) {
        if (r.status === "trashed") trashedCount += 1;
        if (r.status === "failed") failedCount += 1;
      }

      trashedEstimatedBytes += log.plan?.summary?.estimatedBytesTotal ?? 0;
    }

    return {
      runCount,
      latestRunAt,

      latestScanAt,
      latestScanTotalBytes,
      latestScanMissingTargets,
      latestScanSkippedTargets,

      applyRuns,
      trashedCount,
      failedCount,
      latestApplyAt,
      trashedEstimatedBytes,
    };
  }

  private async readRunLogs(): Promise<RunLog[]> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.logsDir);
    } catch {
      return [];
    }

    const runFiles = entries.filter((f) => f.startsWith("run-") && f.endsWith(".json")).sort();

    const logs: RunLog[] = [];

    for (const file of runFiles) {
      const fullPath = path.join(this.logsDir, file);

      try {
        const raw = await fs.readFile(fullPath, "utf-8");
        const parsed = JSON.parse(raw) as RunLog;

        if (!parsed || typeof parsed !== "object") continue;
        if (typeof parsed.timestamp !== "string") continue;
        if (typeof parsed.command !== "string") continue;

        logs.push(parsed);
      } catch {
        continue;
      }
    }

    return logs;
  }

  private findLatestTimestamp(logs: RunLog[]): string | null {
    let latest: string | null = null;

    for (const log of logs) {
      const ts = log.timestamp;
      if (!ts) continue;

      if (!latest || new Date(ts).getTime() > new Date(latest).getTime()) {
        latest = ts;
      }
    }

    return latest;
  }

  private findLatestByCommand(logs: RunLog[], command: RunLog["command"]): RunLog | null {
    let latest: RunLog | null = null;

    for (const log of logs) {
      if (log.command !== command) continue;

      if (!latest || new Date(log.timestamp).getTime() > new Date(latest.timestamp).getTime()) {
        latest = log;
      }
    }

    return latest;
  }
}
