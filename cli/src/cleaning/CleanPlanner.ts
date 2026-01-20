import type { ScanTarget } from "@diskcare/scanner-core";
import type { RulesEngine } from "@diskcare/rules-engine";
import { truncate } from "../formatters/truncate.js";
import { MS_PER_DAY } from "../utils/constants.js";

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

type Decision = {
  risk: "safe" | "caution" | "do-not-touch";
  safeAfterDays: number;
  reasons: string[];
};

export function buildCleanPlan(input: PlanInput): CleanPlan {
  const { targets, rulesEngine, nowMs, dryRun, apply } = input;

  const items: CleanPlanItem[] = targets.map((t) =>
    buildPlanItem({ target: t, rulesEngine, nowMs }),
  );

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

function buildPlanItem(input: {
  target: ScanTarget;
  rulesEngine: RulesEngine | null;
  nowMs: number;
}): CleanPlanItem {
  const { target, rulesEngine, nowMs } = input;

  const decision = getDecision(target.id, rulesEngine);
  const exists = target.exists === true;

  const statusInfo = computeStatusAndReasons({ target, decision, nowMs, exists });
  const estimatedBytes = statusInfo.status === "eligible" ? target.metrics.totalBytes : 0;

  // Always include rule explanation as context
  const reasons = [...statusInfo.reasons, decision.reasons[0] ?? "No rule description."];

  return {
    id: target.id,
    displayName: target.displayName,
    path: target.path,
    exists,
    risk: decision.risk,
    safeAfterDays: decision.safeAfterDays,
    status: statusInfo.status,
    estimatedBytes,
    reasons,
  };
}

function getDecision(id: string, rulesEngine: RulesEngine | null): Decision {
  return (
    rulesEngine?.decide(id) ?? {
      risk: "caution" as const,
      safeAfterDays: 30,
      reasons: ["Rules config not loaded; using defaults."],
    }
  );
}

function computeStatusAndReasons(input: {
  target: ScanTarget;
  exists: boolean;
  decision: Decision;
  nowMs: number;
}): { status: PlanStatus; reasons: string[] } {
  const { target, decision, nowMs, exists } = input;

  const reasons: string[] = [];
  let status: PlanStatus = "caution";

  if (!exists) {
    status = "blocked";
    reasons.push("Target path does not exist.");
  }

  // Only report analyzer errors when the path exists; otherwise redundant (ENOENT).
  if (exists && target.metrics.skipped === true) {
    status = "blocked";
    const raw = target.metrics.error ? String(target.metrics.error) : "Unknown error";
    reasons.push(`Target analysis skipped: ${truncate(raw.replace(/\r?\n/g, " "), 160)}`);
  }

  if (decision.risk === "do-not-touch") {
    status = "blocked";
    reasons.push("Rule risk is do-not-touch.");
  }

  if (status === "blocked") return { status, reasons };

  status = decision.risk === "safe" ? "eligible" : "caution";

  if (target.metrics.partial === true) {
    status = "caution";
    const skippedEntries = target.metrics.skippedEntries ?? 0;
    reasons.push(
      `Partial analysis: ${skippedEntries} subpath(s) could not be read; not eligible for apply.`,
    );
    reasons.push("Estimated size may be inaccurate due to partial analysis.");
  }

  if (status !== "eligible") return { status, reasons };

  const lastModifiedAt = target.metrics.lastModifiedAt;
  const ageDays = lastModifiedAt === null ? null : daysBetween(nowMs, lastModifiedAt);
  if (ageDays === null) {
    reasons.push("Cannot determine lastModifiedAt; not eligible for apply.");
    return { status: "caution", reasons };
  }

  if (ageDays < decision.safeAfterDays) {
    reasons.push(
      `Too recent: last modified ${ageDays} day(s) ago (< safeAfterDays=${decision.safeAfterDays}).`,
    );
    return { status: "caution", reasons };
  }

  return { status, reasons };
}

function daysBetween(nowMs: number, pastMs: number): number {
  const diffMs = nowMs - pastMs;
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.floor(diffMs / MS_PER_DAY);
}
