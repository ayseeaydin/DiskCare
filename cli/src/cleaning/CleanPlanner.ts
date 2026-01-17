import type { ScanTarget } from "@diskcare/scanner-core";
import type { RulesEngine } from "@diskcare/rules-engine";

export type PlanStatus = "eligible" | "caution" | "blocked";

export type CleanPlanItem = {
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

export type CleanPlan = {
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

export type PlanInput = {
  targets: ScanTarget[];
  rulesEngine: RulesEngine | null;
  nowMs: number;
  dryRun: boolean;
  apply: boolean;
};

export function buildCleanPlan(input: PlanInput): CleanPlan {
  const { targets, rulesEngine, nowMs, dryRun, apply } = input;

  const items: CleanPlanItem[] = targets.map((t) => {
    const decision = rulesEngine?.decide(t.id) ?? {
      risk: "caution" as const,
      safeAfterDays: 30,
      reasons: ["Rules config not loaded; using defaults."],
    };

    const exists = t.exists === true;

    const skipped = t.metrics?.skipped === true;

    // NOTE: scanner-core metrics were extended; until types are updated everywhere,
    // we read these fields safely.
    const partial =
      typeof (t.metrics as unknown as { partial?: unknown } | undefined)?.partial === "boolean"
        ? (t.metrics as unknown as { partial: boolean }).partial
        : false;

    const skippedEntries =
      typeof (t.metrics as unknown as { skippedEntries?: unknown } | undefined)?.skippedEntries ===
      "number"
        ? (t.metrics as unknown as { skippedEntries: number }).skippedEntries
        : 0;

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
      const err = t.metrics?.error
        ? String(t.metrics.error).replace(/\r?\n/g, " ")
        : "Unknown error";
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

  return {
    command: "clean",
    dryRun,
    apply,
    summary,
    items,
  };
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

function daysBetween(nowMs: number, pastMs: number): number {
  const diffMs = nowMs - pastMs;
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
