import type { Command } from "commander";
import path from "node:path";

import {
  ScannerService,
  OsTempScanner,
  NpmCacheScanner,
  SandboxCacheScanner,
} from "@diskcare/scanner-core";
import trash from "trash";

import { BaseCommand } from "./BaseCommand.js";
import type { RunLog, ApplyResult } from "../types/RunLog.js";
import type { CommandContext } from "../types/CommandContext.js";
import { formatBytes } from "../formatters/formatBytes.js";
import { truncate } from "../formatters/truncate.js";
import { LogWriter } from "../logging/LogWriter.js";
import { RulesProvider } from "../rules/RulesProvider.js";

type CleanOptions = {
  json?: boolean;
  dryRun?: boolean; // commander sets this; default should be true (safe)
  apply?: boolean;
};

type PlanStatus = "eligible" | "caution" | "blocked";

type CleanPlanItem = {
  id: string;
  displayName: string;
  path: string;
  exists: boolean;
  risk: "safe" | "caution" | "do-not-touch";
  safeAfterDays: number;
  status: PlanStatus;
  estimatedBytes: number;
  reasons: string[];
};

type CleanPlan = {
  command: "clean";
  dryRun: boolean;
  apply: boolean;
  summary: {
    eligibleCount: number;
    cautionCount: number;
    blockedCount: number;
    estimatedBytesTotal: number;
  };
  items: CleanPlanItem[];
};

export class CleanCommand extends BaseCommand {
  readonly name = "clean";
  readonly description = "Clean targets that match safe rules (dry-run by default)";

  protected configure(cmd: Command): void {
    cmd.option("--json", "Output JSON plan");
    cmd.option("--apply", "Apply changes: move eligible targets to Trash/Recycle Bin");

    // IMPORTANT:
    // We define the NEGATABLE option so commander understands `--no-dry-run`.
    // Default is dryRun=true (safe-by-default). Passing `--no-dry-run` flips to false.
    cmd.option("--no-dry-run", "Disable dry-run (required to actually trash files)");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = (args[0] ?? {}) as CleanOptions;

    const dryRun = options.dryRun ?? true; // SAFE-BY-DEFAULT
    const asJson = options.json ?? false;
    const apply = options.apply ?? false;

    const scannerService = new ScannerService([
      new OsTempScanner(),
      new NpmCacheScanner(),
      new SandboxCacheScanner(),
    ]);
    const targets = await scannerService.scanAll();

    const rulesEngine = await RulesProvider.fromCwd().tryLoad(context);

    // Used for safeAfterDays age gate
    const nowMs = Date.now();

    const items: CleanPlanItem[] = targets.map((t) => {
      const decision = rulesEngine?.decide(t.id) ?? {
        risk: "caution" as const,
        safeAfterDays: 30,
        reasons: ["Rules config not loaded; using defaults."],
      };

      const exists = t.exists === true;
      const skipped = t.metrics?.skipped === true;
      const partial = t.metrics?.partial === true;
      const skippedEntries = t.metrics?.skippedEntries ?? 0;

      const lastModifiedAt = t.metrics?.lastModifiedAt ?? null;
      const ageDays = lastModifiedAt === null ? null : daysBetween(nowMs, lastModifiedAt);

      const reasons: string[] = [];
      let status: PlanStatus = "caution";

      // Hard blocks
      if (!exists) {
        status = "blocked";
        reasons.push("Target path does not exist.");
      }

      // Only report analyzer errors when the path exists; otherwise redundant (ENOENT).
      if (exists && skipped) {
        status = "blocked";
        const err = t.metrics?.error ? t.metrics.error.replace(/\r?\n/g, " ") : "Unknown error";
        reasons.push(`Target analysis skipped: ${truncate(err, 160)}`);
      }

      if (decision.risk === "do-not-touch") {
        status = "blocked";
        reasons.push("Rule risk is do-not-touch.");
      }

      // If not blocked, classify by risk (but never eligible if analysis is partial)
      if (status !== "blocked") {
        status = decision.risk === "safe" ? "eligible" : "caution";

        if (partial) {
          status = "caution";
          reasons.push(
            `Partial analysis: ${skippedEntries} subpath(s) could not be read; not eligible for apply.`,
          );
        }

        // Age gate: even "safe" targets must be older than safeAfterDays
        if (status === "eligible") {
          if (ageDays === null) {
            status = "caution";
            reasons.push("Cannot determine lastModifiedAt; not eligible for apply.");
          } else if (ageDays < decision.safeAfterDays) {
            status = "caution";
            reasons.push(
              `Too recent: last modified ${ageDays} day(s) ago (< safeAfterDays=${decision.safeAfterDays}).`,
            );
          }
        }
      }

      // MVP: estimated bytes = target totalBytes (file-level filtering later)
      const estimatedBytes = status === "eligible" ? (t.metrics?.totalBytes ?? 0) : 0;

      // Always include rule explanation as context
      reasons.push(decision.reasons[0] ?? "No rule description.");

      return {
        id: t.id,
        displayName: t.displayName,
        path: t.path,
        exists,
        risk: decision.risk,
        safeAfterDays: decision.safeAfterDays,
        status,
        estimatedBytes,
        reasons,
      };
    });

    // Deterministic order
    items.sort((a, b) => a.id.localeCompare(b.id));

    const summary = {
      eligibleCount: items.filter((i) => i.status === "eligible").length,
      cautionCount: items.filter((i) => i.status === "caution").length,
      blockedCount: items.filter((i) => i.status === "blocked").length,
      estimatedBytesTotal: items.reduce((acc, i) => acc + i.estimatedBytes, 0),
    };

    const plan: CleanPlan = {
      command: "clean",
      dryRun,
      apply,
      summary,
      items,
    };

    const applyResults: ApplyResult[] = [];

    if (apply) {
      const eligible = items.filter((i) => i.status === "eligible");

      for (const item of eligible) {
        if (dryRun) {
          applyResults.push({
            id: item.id,
            path: item.path,
            status: "skipped",
            estimatedBytes: item.estimatedBytes,
            message: "dry-run is enabled; no changes were made.",
          });
          continue;
        }

        try {
          await trash([item.path]);
          applyResults.push({
            id: item.id,
            path: item.path,
            status: "trashed",
            estimatedBytes: item.estimatedBytes,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          applyResults.push({
            id: item.id,
            path: item.path,
            status: "failed",
            estimatedBytes: item.estimatedBytes,
            message: truncate(message.replace(/\r?\n/g, " "), 180),
          });
        }
      }
    }

    const applySummary =
      apply && !dryRun
        ? {
            trashed: applyResults.filter((r) => r.status === "trashed").length,
            failed: applyResults.filter((r) => r.status === "failed").length,
            trashedEstimatedBytes: applyResults.reduce((acc, r) => {
              if (r.status !== "trashed") return acc;
              return acc + (r.estimatedBytes ?? 0);
            }, 0),
          }
        : apply
          ? {
              trashed: 0,
              failed: 0,
              trashedEstimatedBytes: 0,
            }
          : undefined;

    // Log
    const logWriter = new LogWriter(path.resolve(process.cwd(), "logs"));
    const payload = {
      version: "0.0.1",
      timestamp: new Date().toISOString(),
      command: "clean",
      dryRun,
      apply,
      plan,
      applyResults: apply ? applyResults : undefined,
      applySummary,
    } satisfies RunLog;

    const logPath = await logWriter.writeRunLog(payload);

    if (asJson) {
      context.output.info(JSON.stringify(apply ? { ...plan, applyResults } : plan, null, 2));
      return;
    }

    context.output.info(`clean plan (dryRun=${dryRun}, apply=${apply})`);
    context.output.info("");
    context.output.info(
      `summary: eligible=${summary.eligibleCount} | caution=${summary.cautionCount} | blocked=${summary.blockedCount} | estimatedFree=${formatBytes(
        summary.estimatedBytesTotal,
      )}`,
    );
    context.output.info("");

    for (const item of items) {
      context.output.info(`${item.displayName}`);
      context.output.info(`  id:      ${item.id}`);
      context.output.info(`  path:    ${item.path}`);
      context.output.info(`  status:  ${item.status}`);
      context.output.info(`  risk:    ${item.risk}   safeAfterDays: ${item.safeAfterDays}`);
      context.output.info(`  est:     ${formatBytes(item.estimatedBytes)}`);

      const shown = item.reasons.slice(0, 2);
      for (const r of shown) {
        context.output.info(`  why:     ${truncate(r, 160)}`);
      }

      context.output.info("");
    }

    if (apply) {
      if (dryRun) {
        context.output.warn("apply requested, but dry-run is enabled; nothing was moved to Trash.");
        context.output.warn("To actually apply, run: diskcare clean --apply --no-dry-run");
        context.output.info("");
      } else {
        const trashedCount = applyResults.filter((r) => r.status === "trashed").length;
        const failedCount = applyResults.filter((r) => r.status === "failed").length;

        context.output.info(`apply results: trashed=${trashedCount} failed=${failedCount}`);
        for (const r of applyResults) {
          if (r.status === "failed") {
            context.output.warn(`  failed: ${r.id} (${r.path}) - ${r.message ?? "unknown error"}`);
          }
        }
        context.output.info("");
      }
    }

    context.output.info(`Saved log: ${logPath}`);
  }
}

function daysBetween(nowMs: number, pastMs: number): number {
  const diffMs = nowMs - pastMs;
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
