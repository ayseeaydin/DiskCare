import type { Command } from "commander";
import path from "node:path";

import type { ScanTarget } from "@diskcare/scanner-core";
import type { RulesEngine } from "@diskcare/rules-engine";
import trash from "trash";
import { z } from "zod";

import { BaseCommand } from "./BaseCommand.js";
import type { ApplyResult, ApplySummary, CleanLog } from "../types/RunLog.js";
import type { CommandContext } from "../types/CommandContext.js";
import { formatBytes } from "../formatters/formatBytes.js";
import { truncate } from "../formatters/truncate.js";
import { ValidationError } from "../errors/DiskcareError.js";
import { LogWriter } from "../logging/LogWriter.js";
import { RulesProvider } from "../rules/RulesProvider.js";
import { buildCleanPlan } from "../cleaning/CleanPlanner.js";
import { APP_VERSION, MAX_DISPLAYED_REASONS } from "../utils/constants.js";
import { toErrorMessage, toOneLine } from "../utils/errors.js";
import { fromPromise } from "../utils/result.js";
import { defaultScanAll } from "../scanning/defaultScanAll.js";

type CleanOptions = {
  json?: boolean;
  dryRun?: boolean; // commander sets this; default should be true (safe)
  apply?: boolean;
  yes?: boolean;
};

const CleanOptionsSchema = z
  .object({
    json: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    apply: z.boolean().optional(),
    yes: z.boolean().optional(),
  })
  .passthrough();

/**
 * Dependencies for CleanCommand (enables testing).
 */
export type CleanCommandDeps = {
  nowMs: () => number;
  scanAll: (context: CommandContext) => Promise<ScanTarget[]>;
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

    // Commander needs a negatable option to support `--no-dry-run`.
    cmd.option("--no-dry-run", "Disable dry-run (required to actually trash files)");

    // Extra confirmation gate for real applies.
    cmd.option("--yes", "Confirm destructive apply (required with --apply and --no-dry-run)");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = this.parseOptions(args);
    const deps = this.resolveDeps(context);

    context.output.progress("Building clean plan...");
    const timestampMs = deps.nowMs();
    const plan = await this.buildPlan(context, deps, options, timestampMs);
    context.output.progress(`Clean plan ready. ${plan.items.length} items in plan.`);

    const { canApply, applyResults, applySummary } = await this.applyIfNeeded(plan, options, deps);
    const logPath = await this.writeRunLog(context, deps, {
      options,
      plan,
      applyResults,
      applySummary,
      timestampMs,
    });

    this.printOutput(context, { options, plan, canApply, applyResults, logPath });
  }

  private async buildPlan(
    context: CommandContext,
    deps: Pick<CleanCommandDeps, "scanAll" | "loadRules">,
    options: { dryRun: boolean; apply: boolean },
    timestampMs: number,
  ): Promise<ReturnType<typeof buildCleanPlan>> {
    const { targets, rulesEngine } = await this.collectInputs(context, deps);
    return buildCleanPlan({
      targets,
      rulesEngine,
      nowMs: timestampMs,
      dryRun: options.dryRun,
      apply: options.apply,
    });
  }

  private async applyIfNeeded(
    plan: ReturnType<typeof buildCleanPlan>,
    options: { dryRun: boolean; apply: boolean; yes: boolean },
    deps: Pick<CleanCommandDeps, "trashFn">,
  ): Promise<{
    canApply: boolean;
    applyResults: ApplyResult[];
    applySummary: ApplySummary | undefined;
  }> {
    const canApply = this.canApply(options);
    const applyResults = await this.maybeApplyPlan(plan, options, deps, canApply);
    const applySummary = this.computeApplySummary(options.apply, canApply, applyResults);
    return { canApply, applyResults, applySummary };
  }

  private async writeRunLog(
    context: CommandContext,
    deps: Pick<CleanCommandDeps, "writeLog">,
    input: {
      options: { dryRun: boolean; apply: boolean };
      plan: ReturnType<typeof buildCleanPlan>;
      applyResults: ApplyResult[];
      applySummary: ApplySummary | undefined;
      timestampMs: number;
    },
  ): Promise<string> {
    return deps.writeLog(
      context,
      this.buildRunLogPayload({
        options: input.options,
        plan: input.plan,
        applyResults: input.applyResults,
        applySummary: input.applySummary,
        timestampMs: input.timestampMs,
      }),
    );
  }

  private printOutput(
    context: CommandContext,
    input: {
      options: { dryRun: boolean; asJson: boolean; apply: boolean; yes: boolean };
      plan: ReturnType<typeof buildCleanPlan>;
      canApply: boolean;
      applyResults: ApplyResult[];
      logPath: string;
    },
  ): void {
    if (input.options.asJson) {
      context.output.info(
        JSON.stringify(
          input.options.apply ? { ...input.plan, applyResults: input.applyResults } : input.plan,
          null,
          2,
        ),
      );
      return;
    }

    this.printPlan(context, input.plan, input.options);
    this.printApplySection(context, input.options, input.canApply, input.applyResults);
    context.output.info(`Saved log: ${input.logPath}`);
  }

  private parseOptions(args: unknown[]): {
    dryRun: boolean;
    asJson: boolean;
    apply: boolean;
    yes: boolean;
  } {
    const parsed = CleanOptionsSchema.safeParse(args[0] ?? {});
    if (!parsed.success) {
      throw new ValidationError("Invalid clean command options", {
        issues: parsed.error.issues,
      });
    }

    const options: CleanOptions = parsed.data;
    return {
      dryRun: options.dryRun ?? true,
      asJson: options.json ?? false,
      apply: options.apply ?? false,
      yes: options.yes ?? false,
    };
  }

  private resolveDeps(context: CommandContext): CleanCommandDeps {
    return {
      nowMs: this.deps?.nowMs ?? (() => context.nowFn().getTime()),
      scanAll: this.deps?.scanAll ?? this.defaultScanAll.bind(this),
      loadRules: this.deps?.loadRules ?? this.defaultLoadRules.bind(this),
      trashFn: this.deps?.trashFn ?? trash,
      writeLog: this.deps?.writeLog ?? this.defaultWriteLog.bind(this),
    };
  }

  private async collectInputs(
    context: CommandContext,
    deps: Pick<CleanCommandDeps, "scanAll" | "loadRules">,
  ): Promise<{ targets: ScanTarget[]; rulesEngine: RulesEngine | null }> {
    const targets = await deps.scanAll(context);
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
    if (!canApply) {
      return eligible.map((item) => ({
        id: item.id,
        path: item.path,
        status: "skipped" as const,
        estimatedBytes: item.estimatedBytes,
        message: options.dryRun
          ? "dry-run is enabled; no changes were made."
          : "confirmation required: pass --yes to apply",
      }));
    }

    const paths = eligible.map((i) => i.path);

    const trashResult = await fromPromise(deps.trashFn(paths));
    if (trashResult.ok) {
      return eligible.map((item) => ({
        id: item.id,
        path: item.path,
        status: "trashed" as const,
        estimatedBytes: item.estimatedBytes,
      }));
    }

    const message = truncate(
      `batch trash failed: ${toOneLine(toErrorMessage(trashResult.error))}`,
      180,
    );
    return eligible.map((item) => ({
      id: item.id,
      path: item.path,
      status: "failed" as const,
      estimatedBytes: item.estimatedBytes,
      message,
    }));
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
    timestampMs: number;
  }): CleanLog {
    const { options, plan, applyResults, applySummary, timestampMs } = input;

    return {
      version: APP_VERSION,
      timestamp: new Date(timestampMs).toISOString(),
      command: "clean",
      dryRun: options.dryRun,
      apply: options.apply,
      plan,
      applyResults: options.apply ? applyResults : undefined,
      applySummary,
    };
  }

  private printPlan(
    context: CommandContext,
    plan: ReturnType<typeof buildCleanPlan>,
    options: { dryRun: boolean; apply: boolean },
  ): void {
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

    // Cesur ve rehberli özet mesajı
    if (summary.eligibleCount > 0) {
      context.output.info(
        `\u001b[1m${formatBytes(summary.estimatedBytesTotal)} can be freed.\u001b[0m To actually clean, run: diskcare clean --apply --no-dry-run --yes`
      );
    } else {
      context.output.info("No eligible items to clean.");
    }
    context.output.info("");
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
      context.output.warn(
        "apply requested, but confirmation is missing; nothing was moved to Trash.",
      );
    } else {
      context.output.warn(
        "apply requested, but apply gates were not satisfied; nothing was moved to Trash.",
      );
    }

    context.output.warn("To actually apply, run: diskcare clean --apply --no-dry-run --yes");
    context.output.info("");
  }

  /**
   * Default implementations (used when no deps injected).
   */
  private async defaultScanAll(context: CommandContext): Promise<ScanTarget[]> {
    return defaultScanAll(context);
  }

  private async defaultLoadRules(context: CommandContext): Promise<RulesEngine | null> {
    return new RulesProvider(context.configPath).tryLoad(context);
  }

  private async defaultWriteLog(context: CommandContext, payload: unknown): Promise<string> {
    const logWriter = new LogWriter(path.resolve(context.cwd, "logs"), { pid: context.pid });
    return logWriter.writeRunLog(payload);
  }
}
