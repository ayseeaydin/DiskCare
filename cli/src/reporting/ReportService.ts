// NOTE: Log migration pipeline is version-aware. See LOG_SCHEMA.md for versioning and migration policy.
// When log format changes, add a migration function and update the version field accordingly.

// Migration helpers for log versioning
function migrateLogV1toV2(log: ParsedLog): ParsedLog {
  // Example: if v1 has no applySummary, derive it from applyResults.
  if (log.version >= 2) return log;
  let applySummary = log.applySummary;
  if (!applySummary && Array.isArray(log.applyResults)) {
    const trashed = log.applyResults.filter((r: any) => r.status === "trashed").length;
    const failed = log.applyResults.filter((r: any) => r.status === "failed").length;
    const trashedEstimatedBytes = log.applyResults.reduce((acc: number, r: any) => {
      if (r.status !== "trashed") return acc;
      return acc + (typeof r.estimatedBytes === "number" ? r.estimatedBytes : 0);
    }, 0);
    applySummary = { trashed, failed, trashedEstimatedBytes };
  }
  return { ...log, applySummary, version: 2 };
}

function migrateLogToLatest(log: ParsedLog): ParsedLog {
  let migrated = log;
  if (migrated.version < 2) migrated = migrateLogV1toV2(migrated);
  // Future migration functions can be chained here.
  return migrated;
}

function normalizeLogForReporting(log: ParsedLog): ParsedLog {
  // Normalize all logs to the latest version.
  return migrateLogToLatest(log);
}
import path from "node:path";

import fs from "node:fs/promises";

import { fromPromise } from "../utils/result.js";

type ReportFs = {
  readdir: (dir: string) => Promise<string[]>;
  readFile: (file: string, encoding: "utf8") => Promise<string>;
};

type JsonObject = Record<string, unknown>;

function isObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asBoolean(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asArray<T = unknown>(v: unknown): T[] | null {
  return Array.isArray(v) ? (v as T[]) : null;
}

/**
 * Minimal shape we need from scan targets in logs.
 */
type LoggedTarget = {
  exists?: unknown;
  metrics?: unknown;
};

type LoggedMetrics = {
  totalBytes?: unknown;
  skipped?: unknown;
};

type LoggedApplySummary = {
  trashed?: unknown;
  failed?: unknown;
  trashedEstimatedBytes?: unknown;
};

type LoggedApplyResult = {
  status?: unknown;
  estimatedBytes?: unknown;
};

export type ReportSummary = {
  runCount: number;
  latestRunAt: string | null;
  latestRunFile: string | null;

  // latest scan snapshot
  latestScanAt: string | null;
  scanTotalBytes: number;
  scanMissingTargets: number;
  scanSkippedTargets: number;

  // Backward-compatible aliases
  totalBytes: number;
  missingTargets: number;
  skippedTargets: number;

  // apply aggregates (clean --apply)
  applyRuns: number;
  trashedCount: number;
  failedCount: number;
  latestApplyAt: string | null;
  trashedEstimatedBytes: number;
};

type ParsedLog = {
  file: string;
  command: string;
  timestamp: string;
  dryRun: boolean;
  apply: boolean;
  targets: unknown;
  plan: unknown;
  applyResults: unknown;
  applySummary: unknown;
  version: number;
};

export class ReportService {
  constructor(
    private readonly logsDir: string,
    private readonly reportFs: ReportFs = fs,
  ) {}

  async summarize(): Promise<ReportSummary> {
    const logs = await this.loadLogs();

    const runCount = logs.length;
    const latest = this.pickLatestByTimestamp(logs);
    const latestRunAt = latest?.timestamp ?? null;
    const latestRunFile = latest ? path.basename(latest.file) : null;

    const scan = this.summarizeLatestScan(logs);
    const apply = this.summarizeApplyRuns(logs);

    return {
      runCount,
      latestRunAt,
      latestRunFile,

      latestScanAt: scan.latestScanAt,
      scanTotalBytes: scan.scanTotalBytes,
      scanMissingTargets: scan.scanMissingTargets,
      scanSkippedTargets: scan.scanSkippedTargets,

      // aliases
      totalBytes: scan.scanTotalBytes,
      missingTargets: scan.scanMissingTargets,
      skippedTargets: scan.scanSkippedTargets,

      applyRuns: apply.applyRuns,
      trashedCount: apply.trashedCount,
      failedCount: apply.failedCount,
      latestApplyAt: apply.latestApplyAt,
      trashedEstimatedBytes: apply.trashedEstimatedBytes,
    };
  }

  private async loadLogs(): Promise<ParsedLog[]> {
    const [files, latest] = await Promise.all([
      this.listJsonFilesSafe(this.logsDir),
      this.readLatestRunLogPathSafe(),
    ]);

    const unique = new Set<string>(files);
    if (latest) unique.add(latest);

    return this.readLogsSafe([...unique]);
  }

  private async readLatestRunLogPathSafe(): Promise<string | null> {
    const metaPath = path.join(this.logsDir, "meta", "latest-run.json");

    const rawRes = await fromPromise(this.reportFs.readFile(metaPath, "utf8"));
    if (!rawRes.ok) return null;

    const parsedRes = await fromPromise(
      Promise.resolve().then(() => JSON.parse(rawRes.value) as unknown),
    );
    if (!parsedRes.ok) return null;

    const parsed = parsedRes.value;
    if (!isObject(parsed)) return null;

    const logFile = asString((parsed as JsonObject).logFile);
    if (!logFile) return null;

    // Defensive: only allow a simple filename; no path traversal.
    if (logFile !== path.basename(logFile)) return null;
    if (logFile.includes("/") || logFile.includes("\\")) return null;
    if (!logFile.endsWith(".json")) return null;

    return path.join(this.logsDir, logFile);
  }

  private summarizeLatestScan(logs: ParsedLog[]): {
    latestScanAt: string | null;
    scanTotalBytes: number;
    scanMissingTargets: number;
    scanSkippedTargets: number;
  } {
    const scanLogs = logs.filter((l) => l.command === "scan");
    const latestScan = this.pickLatestByTimestamp(scanLogs);

    const latestScanAt = latestScan?.timestamp ?? null;
    const scanTargets = latestScan ? this.extractScanTargets(latestScan) : [];

    const scanMissingTargets = scanTargets.filter((t) => t.exists === false).length;
    const scanSkippedTargets = scanTargets.filter((t) => t.metrics?.skipped === true).length;

    // sum bytes only for non-skipped targets
    const scanTotalBytes = scanTargets.reduce((acc, t) => {
      if (t.metrics?.skipped) return acc;
      return acc + (t.metrics?.totalBytes ?? 0);
    }, 0);

    return {
      latestScanAt,
      scanTotalBytes,
      scanMissingTargets,
      scanSkippedTargets,
    };
  }

  private summarizeApplyRuns(logs: ParsedLog[]): {
    applyRuns: number;
    trashedCount: number;
    failedCount: number;
    latestApplyAt: string | null;
    trashedEstimatedBytes: number;
  } {
    const cleanApplyLogs = logs.filter((l) => l.command === "clean" && l.apply === true);
    const applyRuns = cleanApplyLogs.length;

    const latestApply = this.pickLatestByTimestamp(
      cleanApplyLogs.filter((l) => l.dryRun === false),
    );
    const latestApplyAt = latestApply?.timestamp ?? null;

    let trashedCount = 0;
    let failedCount = 0;
    let trashedEstimatedBytes = 0;

    for (const l of cleanApplyLogs) {
      const derived = this.deriveApplyStatsFromLog(l);
      trashedCount += derived.trashedCount;
      failedCount += derived.failedCount;
      trashedEstimatedBytes += derived.trashedEstimatedBytes;
    }

    return {
      applyRuns,
      trashedCount,
      failedCount,
      latestApplyAt,
      trashedEstimatedBytes,
    };
  }

  private deriveApplyStatsFromLog(log: ParsedLog): {
    trashedCount: number;
    failedCount: number;
    trashedEstimatedBytes: number;
  } {
    // With the migration pipeline, only the latest format is expected here.
    if (isObject(log.applySummary)) {
      const s = log.applySummary as LoggedApplySummary;
      return {
        trashedCount: asNumber(s.trashed) ?? 0,
        failedCount: asNumber(s.failed) ?? 0,
        trashedEstimatedBytes: asNumber(s.trashedEstimatedBytes) ?? 0,
      };
    }
    // If migration is missing, return zeros.
    return { trashedCount: 0, failedCount: 0, trashedEstimatedBytes: 0 };
  }

  private async listJsonFilesSafe(dir: string): Promise<string[]> {
    const entriesRes = await fromPromise(this.reportFs.readdir(dir));
    if (!entriesRes.ok) return [];

    return entriesRes.value.filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
  }

  private async readLogsSafe(files: string[]): Promise<ParsedLog[]> {
    const out: ParsedLog[] = [];

    for (const file of files) {
      const rawRes = await fromPromise(this.reportFs.readFile(file, "utf8"));
      if (!rawRes.ok) continue;

      const parsedRes = await fromPromise(
        Promise.resolve().then(() => JSON.parse(rawRes.value) as unknown),
      );
      if (!parsedRes.ok) continue;

      const parsed = parsedRes.value;
      if (!isObject(parsed)) continue;

      const command = asString(parsed.command);
      const timestamp = asString(parsed.timestamp);

      if (!command || !timestamp) continue;

      let log: ParsedLog = {
        file,
        command,
        timestamp,
        dryRun: asBoolean(parsed.dryRun) ?? true,
        apply: asBoolean(parsed.apply) ?? false,
        targets: (parsed as JsonObject).targets,
        plan: (parsed as JsonObject).plan,
        applyResults: (parsed as JsonObject).applyResults,
        applySummary: (parsed as JsonObject).applySummary,
        version: asNumber((parsed as JsonObject).version) ?? 1,
      };
      log = normalizeLogForReporting(log);
      out.push(log);
    }

    return out;
  }

  private pickLatestByTimestamp<T extends { timestamp?: string }>(items: T[]): T | null {
    if (items.length === 0) return null;

    let best: T | null = null;
    let bestMs = -Infinity;

    for (const it of items) {
      const ts = it.timestamp;
      if (!ts) continue;

      const ms = Date.parse(ts);
      if (!Number.isFinite(ms)) continue;

      if (ms > bestMs) {
        bestMs = ms;
        best = it;
      }
    }

    return best;
  }

  private extractScanTargets(
    log: ParsedLog,
  ): Array<{ exists: boolean; metrics?: { totalBytes?: number; skipped?: boolean } }> {
    const rawTargets = asArray<LoggedTarget>(log.targets) ?? [];

    return rawTargets.map((t) => {
      const exists = asBoolean(t.exists) ?? false;

      let metrics: { totalBytes?: number; skipped?: boolean } | undefined;
      if (isObject(t.metrics)) {
        const m = t.metrics as LoggedMetrics;
        metrics = {
          totalBytes: asNumber(m.totalBytes) ?? 0,
          skipped: asBoolean(m.skipped) ?? false,
        };
      }

      return { exists, metrics };
    });
  }
}
