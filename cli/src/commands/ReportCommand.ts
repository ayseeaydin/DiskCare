import type { Command } from "commander";
import path from "node:path";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ReportService } from "../reporting/ReportService.js";
import { formatBytes } from "../formatters/formatBytes.js";

export class ReportCommand extends BaseCommand {
  readonly name = "report";
  readonly description = "Summarize past runs from logs";

  protected configure(_cmd: Command): void {
    // no options for now
  }

  protected async execute(_args: unknown[], context: CommandContext): Promise<void> {
    const logsDir = path.resolve(process.cwd(), "logs");
    const service = new ReportService(logsDir);

    const summary = await service.summarize();

    context.output.info("report");
    context.output.info(`  runs:                 ${summary.runCount}`);
    context.output.info(`  latest:               ${summary.latestRunAt ?? "-"}`);
    context.output.info("");

    context.output.info("scan (latest)");
    context.output.info(`  latest scan:          ${summary.latestScanAt ?? "-"}`);
    context.output.info(`  total bytes:          ${formatBytes(summary.latestScanTotalBytes)}`);
    context.output.info(`  missing targets:      ${summary.latestScanMissingTargets}`);
    context.output.info(`  skipped targets:      ${summary.latestScanSkippedTargets}`);
    context.output.info("");

    context.output.info("apply (clean --apply)");
    context.output.info(`  apply runs:           ${summary.applyRuns}`);
    context.output.info(`  trashed:              ${summary.trashedCount}`);
    context.output.info(`  failed:               ${summary.failedCount}`);
    context.output.info(`  latest apply:         ${summary.latestApplyAt ?? "-"}`);
    context.output.info(`  trashed est bytes:    ${formatBytes(summary.trashedEstimatedBytes)}`);
  }
}
