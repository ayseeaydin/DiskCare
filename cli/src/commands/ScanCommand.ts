import type { Command } from "commander";
import type { ScanTarget } from "@diskcare/scanner-core";
import type { RulesEngine } from "@diskcare/rules-engine";
import path from "node:path";
import { z } from "zod";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import type { RunLog } from "../types/RunLog.js";
import { formatBytes } from "../formatters/formatBytes.js";
import { formatDate } from "../formatters/formatDate.js";
import { truncate } from "../formatters/truncate.js";
import { LogWriter } from "../logging/LogWriter.js";
import { RulesProvider } from "../rules/RulesProvider.js";
import {
  ANALYZER_ERROR_TRUNCATE_LIMIT,
  APP_VERSION,
  DIAGNOSTIC_TRUNCATE_LIMIT,
  FILE_COUNT_PAD_WIDTH,
  JSON_INDENT,
  MAX_DIAGNOSTIC_LINES,
} from "../utils/constants.js";
import { toOneLine } from "../utils/errors.js";
import { defaultScanAll } from "../scanning/defaultScanAll.js";
import { ValidationError } from "../errors/DiskcareError.js";
import { MessageFormatter } from "../utils/MessageFormatter.js";

type ScanOptions = {
  json?: boolean;
  dryRun?: boolean;
};

const ScanOptionsSchema = z
  .object({
    json: z.boolean().optional(),
    dryRun: z.boolean().optional(),
  })
  .passthrough();

type NowFn = () => Date;

export type ScanCommandDeps = {
  nowFn: NowFn;
  scanAll: (context: CommandContext) => Promise<ScanTarget[]>;
  loadRules: (context: CommandContext) => Promise<RulesEngine | null>;
  writeLog: (context: CommandContext, payload: unknown) => Promise<string>;
};

export class ScanCommand extends BaseCommand {
  readonly name = "scan";
  readonly description = "Analyze known cache/temp locations.";

  constructor(private readonly deps?: Partial<ScanCommandDeps>) {
    super();
  }

  protected configure(cmd: Command): void {
    cmd.option("--json", "Output JSON");
    cmd.option("--dry-run", "Plan only (no changes). Default behavior is non-destructive.");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = this.parseOptions(args);
    const deps = this.resolveDeps(context);
    context.output.progress(MessageFormatter.progressScanningTargets());
    const targets = await deps.scanAll(context);
    context.output.progress(MessageFormatter.progressScanCompleted(targets.length));

    // Load rules config (do not crash CLI if missing; stay explainable)
    const rulesEngine = await deps.loadRules(context);

    const logPath = await deps.writeLog(
      context,
      this.buildRunLogPayload({
        dryRun: options.dryRun,
        targets,
        timestamp: deps.nowFn().toISOString(),
      }),
    );

    if (options.asJson) {
      context.output.info(
        JSON.stringify(
          {
            command: "scan",
            dryRun: options.dryRun,
            configPath: context.configPath,
            targets,
          },
          null,
          JSON_INDENT,
        ),
      );
      return;
    }

    this.printReport(context, {
      dryRun: options.dryRun,
      targets,
      rulesEngine,
      logPath,
      configPath: context.configPath,
    });
  }

  private resolveDeps(context: CommandContext): ScanCommandDeps {
    return {
      nowFn: this.deps?.nowFn ?? context.nowFn,
      scanAll: this.deps?.scanAll ?? this.defaultScanAll.bind(this),
      loadRules: this.deps?.loadRules ?? this.defaultLoadRules.bind(this),
      writeLog: this.deps?.writeLog ?? this.defaultWriteLog.bind(this),
    };
  }

  private parseOptions(args: unknown[]): { dryRun: boolean; asJson: boolean } {
    const parsed = ScanOptionsSchema.safeParse(args[0] ?? {});
    if (!parsed.success) {
      throw new ValidationError("Invalid scan command options. Check arguments and try again.", {
        issues: parsed.error.issues,
        hint: "Run 'diskcare scan --help' for usage examples.",
      });
    }

    const options = parsed.data;
    return {
      dryRun: options.dryRun ?? true,
      asJson: options.json ?? false,
    };
  }

  private async defaultScanAll(context: CommandContext): Promise<ScanTarget[]> {
    return defaultScanAll(context);
  }

  private buildRunLogPayload(input: {
    dryRun: boolean;
    targets: ScanTarget[];
    timestamp: string;
  }): RunLog {
    return {
      version: APP_VERSION,
      timestamp: input.timestamp,
      command: "scan" as const,
      dryRun: input.dryRun,
      targets: input.targets,
    } satisfies RunLog;
  }

  private async defaultLoadRules(context: CommandContext): Promise<RulesEngine | null> {
    return new RulesProvider(context.configPath).tryLoad(context);
  }

  private async defaultWriteLog(context: CommandContext, payload: unknown): Promise<string> {
    // Freeze a single timestamp for filename + fallback stringify.
    // Prefer payload.timestamp to keep filename time aligned with payload time.
    const extractedTimestamp =
      payload && typeof payload === "object" && "timestamp" in payload
        ? (payload as Record<string, unknown>).timestamp
        : undefined;
    const parsed = typeof extractedTimestamp === "string" ? new Date(extractedTimestamp) : null;
    const now = parsed && Number.isFinite(parsed.getTime()) ? parsed : context.nowFn();

    const logWriter = new LogWriter(path.resolve(context.cwd, "logs"), {
      pid: context.pid,
      nowFn: () => now,
    });
    return logWriter.writeRunLog(payload);
  }

  private printReport(
    context: CommandContext,
    input: {
      dryRun: boolean;
      targets: ScanTarget[];
      rulesEngine: RulesEngine | null;
      logPath: string;
      configPath: string;
    },
  ): void {
    context.output.info(MessageFormatter.scanReportHeader(input.dryRun));
    context.output.info("");
    context.output.info(MessageFormatter.configPathLine(input.configPath));
    context.output.info("");

    for (const t of input.targets) {
      this.printTarget(context, t, input.rulesEngine);
      context.output.info("");
    }

    context.output.info(MessageFormatter.savedLog(input.logPath));
  }

  private printTarget(
    context: CommandContext,
    t: ScanTarget,
    rulesEngine: RulesEngine | null,
  ): void {
    const exists = t.exists === true ? "yes" : "no";
    const skipped = t.metrics?.skipped === true ? "yes" : "no";

    const partial = t.metrics?.partial === true ? "yes" : "no";
    const skippedEntries = t.metrics?.skippedEntries ?? 0;

    const size = formatBytes(t.metrics?.totalBytes ?? 0);
    const files = String(t.metrics?.fileCount ?? 0).padStart(FILE_COUNT_PAD_WIDTH, " ");
    const modified = formatDate(t.metrics?.lastModifiedAt);
    const accessed = formatDate(t.metrics?.lastAccessedAt);

    context.output.info(`${t.displayName}`);
    context.output.info(MessageFormatter.targetIdLine(t.id));
    if (t.ruleId && t.ruleId !== t.id) {
      context.output.info(MessageFormatter.targetRuleIdLine(t.ruleId));
    }
    context.output.info(MessageFormatter.targetPathLine(t.path));
    context.output.info(
      MessageFormatter.targetExistsLine(exists, skipped, partial, skippedEntries),
    );
    context.output.info(MessageFormatter.targetSizeLine(size, files));
    context.output.info(MessageFormatter.targetMtimeLine(modified));
    context.output.info(MessageFormatter.targetAtimeLine(accessed));

    this.printDiagnostics(context, t);
    this.printRuleDecision(context, t, rulesEngine);
    this.printAnalyzerError(context, t);
    this.printPartialNote(context, t);
  }

  private printDiagnostics(context: CommandContext, t: ScanTarget): void {
    if (!t.diagnostics || t.diagnostics.length === 0) return;
    for (const d of t.diagnostics.slice(0, MAX_DIAGNOSTIC_LINES)) {
      context.output.warn(MessageFormatter.targetNoteLine(truncate(d, DIAGNOSTIC_TRUNCATE_LIMIT)));
    }
  }

  private printRuleDecision(
    context: CommandContext,
    t: ScanTarget,
    rulesEngine: RulesEngine | null,
  ): void {
    const ruleId = t.ruleId ?? t.id;
    if (rulesEngine) {
      const decision = rulesEngine.decide(ruleId);
      context.output.info(MessageFormatter.targetRiskLine(decision.risk, decision.safeAfterDays));
      context.output.info(MessageFormatter.targetRuleLine(decision.reasons[0] ?? "-"));
      return;
    }

    context.output.info(MessageFormatter.targetRiskLine("-", "-"));
    context.output.info(MessageFormatter.targetRuleLine(MessageFormatter.rulesConfigNotLoaded()));
  }

  private printAnalyzerError(context: CommandContext, t: ScanTarget): void {
    if (t.metrics?.skipped && t.metrics.error) {
      context.output.warn(
        MessageFormatter.targetErrorLine(
          truncate(toOneLine(t.metrics.error), ANALYZER_ERROR_TRUNCATE_LIMIT),
        ),
      );
    }
  }

  private printPartialNote(context: CommandContext, t: ScanTarget): void {
    if (t.metrics?.partial === true) {
      context.output.warn(
        MessageFormatter.targetNoteLine(MessageFormatter.partialEstimatedBytes()),
      );
    }
  }
}
