import type { Command } from "commander";
import {
  ScannerService,
  OsTempScanner,
  NpmCacheScanner,
  SandboxCacheScanner,
} from "@diskcare/scanner-core";
import type { ScanTarget } from "@diskcare/scanner-core";
import type { RulesEngine } from "@diskcare/rules-engine";
import path from "node:path";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import type { RunLog } from "../types/RunLog.js";
import { formatBytes } from "../formatters/formatBytes.js";
import { formatDate } from "../formatters/formatDate.js";
import { truncate } from "../formatters/truncate.js";
import { LogWriter } from "../logging/LogWriter.js";
import { RulesProvider } from "../rules/RulesProvider.js";
import { APP_VERSION } from "../utils/constants.js";
import { toOneLine } from "../utils/errors.js";

type ScanOptions = {
  json?: boolean;
  dryRun?: boolean;
};

type NowFn = () => Date;

export type ScanCommandDeps = {
  nowFn: NowFn;
  scanAll: () => Promise<ScanTarget[]>;
  loadRules: (context: CommandContext) => Promise<RulesEngine | null>;
  writeLog: (context: CommandContext, payload: unknown) => Promise<string>;
};

export class ScanCommand extends BaseCommand {
  readonly name = "scan";
  readonly description = "Analyze known cache/temp locations and print a report";

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
    const targets = await deps.scanAll();

    // Load rules config (do not crash CLI if missing; stay explainable)
    const rulesEngine = await deps.loadRules(context);

    const logPath = await deps.writeLog(
      context,
      this.buildRunLogPayload({ dryRun: options.dryRun, targets, timestamp: deps.nowFn().toISOString() }),
    );

    if (options.asJson) {
      // JSON output intentionally stays stable; we don't add logPath yet.
      context.output.info(
        JSON.stringify({ command: "scan", dryRun: options.dryRun, targets }, null, 2),
      );
      return;
    }

    this.printReport(context, { dryRun: options.dryRun, targets, rulesEngine, logPath });
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
    const options = (args[0] ?? {}) as ScanOptions;
    return {
      dryRun: options.dryRun ?? true,
      asJson: options.json ?? false,
    };
  }

  private async defaultScanAll(): Promise<ScanTarget[]> {
    const scannerService = new ScannerService([
      new OsTempScanner(),
      new NpmCacheScanner(),
      new SandboxCacheScanner(),
    ]);

    return scannerService.scanAll();
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
        ? (payload as any).timestamp
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
    },
  ): void {
    context.output.info(`scan report (dryRun=${input.dryRun})`);
    context.output.info("");

    for (const t of input.targets) {
      this.printTarget(context, t, input.rulesEngine);
      context.output.info("");
    }

    context.output.info(`Saved log: ${input.logPath}`);
  }

  private printTarget(context: CommandContext, t: ScanTarget, rulesEngine: RulesEngine | null): void {
    const exists = t.exists === true ? "yes" : "no";
    const skipped = t.metrics?.skipped === true ? "yes" : "no";

    const partial = t.metrics?.partial === true ? "yes" : "no";
    const skippedEntries = t.metrics?.skippedEntries ?? 0;

    const size = formatBytes(t.metrics?.totalBytes ?? 0);
    const files = String(t.metrics?.fileCount ?? 0).padStart(6, " ");
    const modified = formatDate(t.metrics?.lastModifiedAt);
    const accessed = formatDate(t.metrics?.lastAccessedAt);

    context.output.info(`${t.displayName}`);
    context.output.info(`  id:      ${t.id}`);
    context.output.info(`  path:    ${t.path}`);
    context.output.info(
      `  exists:  ${exists}   skipped: ${skipped}   partial: ${partial} (skippedEntries=${skippedEntries})`,
    );
    context.output.info(`  size:    ${size}   files: ${files}`);
    context.output.info(`  mtime:   ${modified}`);
    context.output.info(`  atime:   ${accessed}`);

    this.printDiagnostics(context, t);
    this.printRuleDecision(context, t, rulesEngine);
    this.printAnalyzerError(context, t);
  }

  private printDiagnostics(context: CommandContext, t: ScanTarget): void {
    if (!t.diagnostics || t.diagnostics.length === 0) return;
    for (const d of t.diagnostics.slice(0, 3)) {
      context.output.warn(`  note:    ${truncate(d, 160)}`);
    }
  }

  private printRuleDecision(
    context: CommandContext,
    t: ScanTarget,
    rulesEngine: RulesEngine | null,
  ): void {
    if (rulesEngine) {
      const decision = rulesEngine.decide(t.id);
      context.output.info(`  risk:    ${decision.risk}   safeAfterDays: ${decision.safeAfterDays}`);
      context.output.info(`  rule:    ${decision.reasons[0] ?? "-"}`);
      return;
    }

    context.output.info(`  risk:    -   safeAfterDays: -`);
    context.output.info(`  rule:    Rules config not loaded`);
  }

  private printAnalyzerError(context: CommandContext, t: ScanTarget): void {
    if (t.metrics?.skipped && t.metrics.error) {
      context.output.warn(`  error:   ${truncate(toOneLine(t.metrics.error), 140)}`);
    }
  }
}
