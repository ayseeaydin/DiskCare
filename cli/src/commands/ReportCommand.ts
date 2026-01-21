import type { Command } from "commander";
import path from "node:path";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ReportService } from "../reporting/ReportService.js";
import type { ReportSummary } from "../reporting/ReportService.js";
import { formatBytes } from "../formatters/formatBytes.js";

type ReportOptions = {
  json?: boolean;
};

export type ReportCommandDeps = {
  summarize: (context: CommandContext) => Promise<ReportSummary>;
};

export class ReportCommand extends BaseCommand {
  readonly name = "report";
  readonly description = "Summarize past runs from logs";

  constructor(private readonly deps?: Partial<ReportCommandDeps>) {
    super();
  }

  protected configure(cmd: Command): void {
    cmd.option("--json", "Output JSON");
  }

  protected async execute(_args: unknown[], context: CommandContext): Promise<void> {
    const options = this.parseOptions(_args);
    const deps = this.resolveDeps();

    const summary = await deps.summarize(context);

    if (options.asJson) {
      context.output.info(JSON.stringify({ command: "report", ...summary }, null, 2));
      return;
    }

    context.output.info("report");
    context.output.info(`  runs:                 ${summary.runCount}`);
    context.output.info(`  latest:               ${summary.latestRunAt ?? "-"}`);
    context.output.info("");

    context.output.info("scan (latest)");
    context.output.info(`  latest scan:          ${summary.latestScanAt ?? "-"}`);
    context.output.info(`  total bytes:          ${formatBytes(summary.scanTotalBytes)}`);
    context.output.info(`  missing targets:      ${summary.scanMissingTargets}`);
    context.output.info(`  skipped targets:      ${summary.scanSkippedTargets}`);
    context.output.info("");

    context.output.info("apply (clean --apply)");
    context.output.info(`  apply runs:           ${summary.applyRuns}`);
    context.output.info(`  trashed:              ${summary.trashedCount}`);
    context.output.info(`  failed:               ${summary.failedCount}`);
    context.output.info(`  latest apply:         ${summary.latestApplyAt ?? "-"}`);
    context.output.info(
      `  trashed est bytes:    ${formatBytes(summary.trashedEstimatedBytes)}`,
    );
  }

  private resolveDeps(): ReportCommandDeps {
    return {
      summarize: this.deps?.summarize ?? this.defaultSummarize.bind(this),
    };
  }

  private parseOptions(args: unknown[]): { asJson: boolean } {
    const options = (args[0] ?? {}) as ReportOptions;
    return {
      asJson: options.json ?? false,
    };
  }

  private async defaultSummarize(context: CommandContext): Promise<ReportSummary> {
    const logsDir = path.resolve(context.cwd, "logs");
    const service = new ReportService(logsDir);
    return service.summarize();
  }
}
