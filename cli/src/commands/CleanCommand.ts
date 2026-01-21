import type { Command } from "commander";
import path from "node:path";

import type { ScanTarget } from "@diskcare/scanner-core";
import {
  ScannerService,
  OsTempScanner,
  NpmCacheScanner,
  SandboxCacheScanner,
} from "@diskcare/scanner-core";
import type { RulesEngine } from "@diskcare/rules-engine";
import trash from "trash";

import { BaseCommand } from "./BaseCommand.js";
import type { ApplyResult, ApplySummary, CleanLog } from "../types/RunLog.js";
import type { CommandContext } from "../types/CommandContext.js";
import { formatBytes } from "../formatters/formatBytes.js";
import { truncate } from "../formatters/truncate.js";
import { LogWriter } from "../logging/LogWriter.js";
import { RulesProvider } from "../rules/RulesProvider.js";
import { buildCleanPlan } from "../cleaning/CleanPlanner.js";
import { APP_VERSION, MAX_DISPLAYED_REASONS } from "../utils/constants.js";
import { toErrorMessage, toOneLine } from "../utils/errors.js";

type CleanOptions = {
  json?: boolean;
  dryRun?: boolean; // commander sets this; default should be true (safe)
  apply?: boolean;
  yes?: boolean;
};

/**
 * Dependencies for CleanCommand (enables testing).
 */
export type CleanCommandDeps = {
  nowMs: () => number;
  scanAll: () => Promise<ScanTarget[]>;
  loadRules: (context: CommandContext) => Promise<RulesEngine | null>;
  trashFn: (paths: string[]) => Promise<void>;
  writeLog: (context: CommandContext, payload: unknown) => Promise<string>;
};

export class CleanCommand extends BaseCommand {
  readonly name = "clean";
  readonly description = "Clean targets that match safe rules (dry-run by default)";

  constructor(private readonly deps?: CleanCommandDeps) {
    super();
  }

  protected configure(cmd: Command): void {
    cmd.option("--json", "Output JSON plan");
    cmd.option("--apply", "Apply changes: move eligible targets to Trash/Recycle Bin");

    // IMPORTANT:
    // We define the NEGATABLE option so commander understands `--no-dry-run`.
    // Default is dryRun=true (safe-by-default). Passing `--no-dry-run` flips to false.
    cmd.option("--no-dry-run", "Disable dry-run (required to actually trash files)");

    // Extra confirmation gate for real applies.
    cmd.option("--yes", "Confirm destructive apply (required with --apply and --no-dry-run)");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = this.parseOptions(args);
    const deps = this.resolveDeps();

    const { targets, rulesEngine } = await this.collectInputs(context, deps);
    const plan = buildCleanPlan({
      targets,
      rulesEngine,
      nowMs: deps.nowMs(),
      dryRun: options.dryRun,
      apply: options.apply,
    });

    const canApply = this.canApply(options);
    const applyResults = await this.maybeApplyPlan(plan, options, deps, canApply);
    const applySummary = this.computeApplySummary(options.apply, canApply, applyResults);

    const logPath = await deps.writeLog(
      context,
      this.buildRunLogPayload({ options, plan, applyResults, applySummary }),
    );

    if (options.asJson) {
      context.output.info(
        JSON.stringify(options.apply ? { ...plan, applyResults } : plan, null, 2),
      );
      return;
    }

    this.printPlan(context, plan, options);
    this.printApplySection(context, options, canApply, applyResults);
    context.output.info(`Saved log: ${logPath}`);
  }

  private parseOptions(args: unknown[]): { dryRun: boolean; asJson: boolean; apply: boolean; yes: boolean } {
    const options = (args[0] ?? {}) as CleanOptions;
    return {
      dryRun: options.dryRun ?? true,
      asJson: options.json ?? false,
      apply: options.apply ?? false,
      yes: options.yes ?? false,
    };
  }

  private resolveDeps(): CleanCommandDeps {
    return {
      nowMs: this.deps?.nowMs ?? (() => Date.now()),
      scanAll: this.deps?.scanAll ?? this.defaultScanAll.bind(this),
      loadRules: this.deps?.loadRules ?? this.defaultLoadRules.bind(this),
      trashFn: this.deps?.trashFn ?? trash,
      writeLog: this.deps?.writeLog ?? this.defaultWriteLog.bind(this),
    };
  }

  private async collectInputs(
    context: CommandContext,
    deps: CleanCommandDeps,
  ): Promise<{ targets: ScanTarget[]; rulesEngine: RulesEngine | null }> {
    const targets = await deps.scanAll();
    const rulesEngine = await deps.loadRules(context);
    return { targets, rulesEngine };
  }

  private canApply(options: { dryRun: boolean; apply: boolean; yes: boolean }): boolean {
    return options.apply && options.dryRun === false && options.yes === true;
  }

  private async maybeApplyPlan(
    plan: ReturnType<typeof buildCleanPlan>,
    options: { dryRun: boolean; apply: boolean; yes: boolean },
    deps: Pick<CleanCommandDeps, "trashFn">,
    canApply: boolean,
  ): Promise<ApplyResult[]> {
    if (!options.apply) return [];

    const eligible = plan.items.filter((i) => i.status === "eligible");
    const results: ApplyResult[] = [];

    for (const item of eligible) {
      if (!canApply) {
        results.push({
          id: item.id,
          path: item.path,
          status: "skipped",
          estimatedBytes: item.estimatedBytes,
          message: options.dryRun
            ? "dry-run is enabled; no changes were made."
            : "confirmation required: pass --yes to apply",
        });
        continue;
      }

      results.push(await this.trashItem(deps, item.id, item.path, item.estimatedBytes));
    }

    return results;
  }

  private async trashItem(
    deps: Pick<CleanCommandDeps, "trashFn">,
    id: string,
    itemPath: string,
    estimatedBytes: number,
  ): Promise<ApplyResult> {
    try {
      await deps.trashFn([itemPath]);
      return { id, path: itemPath, status: "trashed", estimatedBytes };
    } catch (err) {
      const message = toOneLine(toErrorMessage(err));
      return {
        id,
        path: itemPath,
        status: "failed",
        estimatedBytes,
        message: truncate(message, 180),
      };
    }
  }

  private computeApplySummary(
    apply: boolean,
    canApply: boolean,
    applyResults: ApplyResult[],
  ): ApplySummary | undefined {
    if (!apply) return undefined;
    if (!canApply) return { trashed: 0, failed: 0, trashedEstimatedBytes: 0 };

    const trashed = applyResults.filter((r) => r.status === "trashed").length;
    const failed = applyResults.filter((r) => r.status === "failed").length;
    const trashedEstimatedBytes = applyResults.reduce((acc, r) => {
      if (r.status !== "trashed") return acc;
      return acc + (r.estimatedBytes ?? 0);
    }, 0);

    return { trashed, failed, trashedEstimatedBytes };
  }

  private buildRunLogPayload(input: {
    options: { dryRun: boolean; apply: boolean };
    plan: ReturnType<typeof buildCleanPlan>;
    applyResults: ApplyResult[];
    applySummary: ApplySummary | undefined;
  }): CleanLog {
    const { options, plan, applyResults, applySummary } = input;

    return {
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      command: "clean",
      dryRun: options.dryRun,
      apply: options.apply,
      plan,
      applyResults: options.apply ? applyResults : undefined,
      applySummary,
    };
  }

  private printPlan(context: CommandContext, plan: ReturnType<typeof buildCleanPlan>, options: { dryRun: boolean; apply: boolean }): void {
    const { items, summary } = plan;

    context.output.info(`clean plan (dryRun=${options.dryRun}, apply=${options.apply})`);
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

      const shown = item.reasons.slice(0, MAX_DISPLAYED_REASONS);
      for (const r of shown) {
        context.output.info(`  why:     ${truncate(r, 160)}`);
      }

      context.output.info("");
    }
  }

  private printApplySection(
    context: CommandContext,
    options: { dryRun: boolean; apply: boolean; yes: boolean },
    canApply: boolean,
    applyResults: ApplyResult[],
  ): void {
    if (!options.apply) return;

    if (!canApply) {
      this.printApplyBlocked(context, options);
      return;
    }

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

  private printApplyBlocked(
    context: CommandContext,
    options: { dryRun: boolean; yes: boolean },
  ): void {
    if (options.dryRun) {
      context.output.warn("apply requested, but dry-run is enabled; nothing was moved to Trash.");
    } else if (!options.yes) {
      context.output.warn("apply requested, but confirmation is missing; nothing was moved to Trash.");
    } else {
      context.output.warn("apply requested, but apply gates were not satisfied; nothing was moved to Trash.");
    }

    context.output.warn("To actually apply, run: diskcare clean --apply --no-dry-run --yes");
    context.output.info("");
  }

  /**
   * Default implementations (used when no deps injected).
   */
  private async defaultScanAll(): Promise<ScanTarget[]> {
    const scannerService = new ScannerService([
      new OsTempScanner(),
      new NpmCacheScanner(),
      new SandboxCacheScanner(),
    ]);
    return scannerService.scanAll();
  }

  private async defaultLoadRules(context: CommandContext): Promise<RulesEngine | null> {
    return new RulesProvider(context.configPath).tryLoad(context);
  }

  private async defaultWriteLog(context: CommandContext, payload: unknown): Promise<string> {
    const logWriter = new LogWriter(path.resolve(context.cwd, "logs"), { pid: context.pid });
    return logWriter.writeRunLog(payload);
  }
}
