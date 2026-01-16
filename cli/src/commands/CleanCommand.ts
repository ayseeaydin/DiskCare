import type { Command } from "commander";
import path from "node:path";

import { ScannerService, OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";
import { RulesConfigLoader, RulesEngine } from "@diskcare/rules-engine";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { formatBytes } from "../formatters/formatBytes.js";
import { truncate } from "../formatters/truncate.js";
import { LogWriter } from "../logging/LogWriter.js";

type CleanOptions = {
  json?: boolean;
  dryRun?: boolean;
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
    cmd.option("--dry-run", "Plan only (no changes). Default behavior is non-destructive.");
    cmd.option("--apply", "Apply changes (not implemented yet; currently outputs plan only)");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = (args[0] ?? {}) as CleanOptions;

    const dryRun = options.dryRun ?? true; // SAFE-BY-DEFAULT
    const asJson = options.json ?? false;

    // For this step, apply is accepted but not executed.
    const apply = options.apply ?? false;

    const scannerService = new ScannerService([new OsTempScanner(), new NpmCacheScanner()]);
    const targets = await scannerService.scanAll();

    const rulesEngine = await this.tryCreateRulesEngine(context);

    const items: CleanPlanItem[] = targets.map((t) => {
      const decision = rulesEngine?.decide(t.id) ?? {
        risk: "caution" as const,
        safeAfterDays: 30,
        reasons: ["Rules config not loaded; using defaults."],
      };

      const exists = t.exists === true;
      const skipped = t.metrics?.skipped === true;

      const reasons: string[] = [];
      let status: PlanStatus = "caution";

      // Hard blocks
      if (!exists) {
        status = "blocked";
        reasons.push("Target path does not exist.");
      }

      // Only report analyzer errors when the path exists; otherwise it is redundant (ENOENT).
      if (exists && skipped) {
        status = "blocked";
        const err = t.metrics?.error ? t.metrics.error.replace(/\r?\n/g, " ") : "Unknown error";
        reasons.push(`Target analysis skipped: ${truncate(err, 160)}`);
      }

      if (decision.risk === "do-not-touch") {
        status = "blocked";
        reasons.push("Rule risk is do-not-touch.");
      }

      // If not blocked, classify by risk
      if (status !== "blocked") {
        status = decision.risk === "safe" ? "eligible" : "caution";
      }

      // For MVP, estimated bytes is target totalBytes (not file-level eligible bytes yet)
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

    // Log plan
    const logWriter = new LogWriter(path.resolve(process.cwd(), "logs"));
    const payload = {
      version: "0.0.1",
      timestamp: new Date().toISOString(),
      command: "clean",
      dryRun,
      apply,
      plan,
    };
    const logPath = await logWriter.writeRunLog(payload);

    if (asJson) {
      context.output.info(JSON.stringify(plan, null, 2));
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

      // show first 2 reasons max to keep output tight
      const shown = item.reasons.slice(0, 2);
      for (const r of shown) {
        context.output.info(`  why:     ${truncate(r, 160)}`);
      }

      context.output.info("");
    }

    context.output.info(`Saved log: ${logPath}`);

    if (apply) {
      context.output.warn("apply: not implemented yet. No changes were made.");
    }
  }

  private async tryCreateRulesEngine(context: CommandContext): Promise<RulesEngine | null> {
    const rulesPath = path.resolve(process.cwd(), "config", "rules.json");

    try {
      const rulesConfig = await new RulesConfigLoader().loadFromFile(rulesPath);
      return new RulesEngine(rulesConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.output.warn(
        `rules: config not loaded (${truncate(message.replace(/\r?\n/g, " "), 140)})`,
      );
      return null;
    }
  }
}
