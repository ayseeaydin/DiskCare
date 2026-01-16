import fs from "node:fs/promises";
import path from "node:path";

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
  id?: unknown;
  exists?: unknown;
  metrics?: unknown;
};

type LoggedMetrics = {
  totalBytes?: unknown;
  skipped?: unknown;
};

export type ReportSummary = {
  runCount: number;
  latestRunAt: string | null;

  // latest scan snapshot
  latestScanAt: string | null;
  scanTotalBytes: number;
  scanMissingTargets: number;
  scanSkippedTargets: number;

  // Backward-compatible aliases (keeps older code/tests working)
  totalBytes: number;
  missingTargets: number;
  skippedTargets: number;

  // apply aggregates (clean --apply, dryRun=false)
  applyRuns: number;
  trashedCount: number;
  failedCount: number;
  latestApplyAt: string | null;
  trashedEstimatedBytes: number;
};

export class ReportService {
  constructor(private readonly logsDir: string) {}

  async summarize(): Promise<ReportSummary> {
    const files = await this.listJsonFilesSafe(this.logsDir);
    const logs = await this.readLogsSafe(files);

    const runCount = logs.length;
    const latestRunAt = this.maxTimestamp(logs);

    // --- latest scan snapshot ---
    const scanLogs = logs.filter((l) => l.command === "scan");
    const latestScan = this.pickLatestByTimestamp(scanLogs);

    const latestScanAt = latestScan?.timestamp ?? null;
    const scanTargets = latestScan ? this.extractScanTargets(latestScan) : [];

    const scanMissingTargets = scanTargets.filter((t) => t.exists === false).length;
    const scanSkippedTargets = scanTargets.filter((t) => t.metrics?.skipped === true).length;

    // sum bytes for targets that are not skipped (otherwise it’s 0 and misleading)
    const scanTotalBytes = scanTargets.reduce((acc, t) => {
      if (t.metrics?.skipped) return acc;
      return acc + (t.metrics?.totalBytes ?? 0);
    }, 0);

    // --- apply aggregates ---
    // “apply run” = command clean + apply=true (dryRun can be true/false; we track both but
    //              trashed/failed should only come from actual apply executions if present)
    const cleanLogs = logs.filter((l) => l.command === "clean" && l.apply === true);

    const applyRuns = cleanLogs.length;

    const latestApply = this.pickLatestByTimestamp(
      cleanLogs.filter((l) => l.dryRun === false), // “real apply” only
    );
    const latestApplyAt = latestApply?.timestamp ?? null;

    let trashedCount = 0;
    let failedCount = 0;
    let trashedEstimatedBytes = 0;

    for (const l of cleanLogs) {
      // Prefer explicit applyResults if present (most reliable)
      if (isObject(l.applyResults)) {
        trashedCount += asNumber(l.applyResults.trashed) ?? 0;
        failedCount += asNumber(l.applyResults.failed) ?? 0;
        trashedEstimatedBytes += asNumber(l.applyResults.trashedEstimatedBytes) ?? 0;
        continue;
      }

      // Fallback: infer from plan if it exists (less reliable)
      if (isObject(l.plan)) {
        const items = asArray<JsonObject>((l.plan as JsonObject).items) ?? [];
        // If it was a dry-run, do not count as trashed.
        if (l.dryRun === false) {
          const eligible = items.filter((it) => (it.status as unknown) === "eligible").length;
          trashedCount += eligible;
        }
        trashedEstimatedBytes += items.reduce((acc, it) => {
          const est = asNumber(it.estimatedBytes) ?? 0;
          return acc + est;
        }, 0);
      }
    }

    return {
      runCount,
      latestRunAt,

      latestScanAt,
      scanTotalBytes,
      scanMissingTargets,
      scanSkippedTargets,

      // aliases
      totalBytes: scanTotalBytes,
      missingTargets: scanMissingTargets,
      skippedTargets: scanSkippedTargets,

      applyRuns,
      trashedCount,
      failedCount,
      latestApplyAt,
      trashedEstimatedBytes,
    };
  }

  private async listJsonFilesSafe(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir);
      return entries.filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
    } catch {
      return [];
    }
  }

  private async readLogsSafe(files: string[]): Promise<Array<Record<string, any>>> {
    const out: Array<Record<string, any>> = [];

    for (const file of files) {
      try {
        const raw = await fs.readFile(file, "utf8");
        const parsed = JSON.parse(raw) as unknown;
        if (!isObject(parsed)) continue;

        const command = asString(parsed.command);
        const timestamp = asString(parsed.timestamp);

        if (!command || !timestamp) continue;

        // Keep only fields we use; everything else is passthrough-safe.
        out.push({
          command,
          timestamp,
          dryRun: asBoolean(parsed.dryRun) ?? true,
          apply: asBoolean(parsed.apply) ?? false,
          targets: parsed.targets,
          plan: parsed.plan,
          applyResults: (parsed as JsonObject).applyResults,
        });
      } catch {
        // ignore unreadable / invalid JSON
      }
    }

    return out;
  }

  private maxTimestamp(logs: Array<Record<string, any>>): string | null {
    const latest = this.pickLatestByTimestamp(logs);
    return latest?.timestamp ?? null;
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
    log: Record<string, any>,
  ): Array<{ exists: boolean; metrics?: { totalBytes?: number; skipped?: boolean } }> {
    const rawTargets = asArray<LoggedTarget>(log.targets) ?? [];

    const targets = rawTargets.map((t) => {
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

    return targets;
  }
}
