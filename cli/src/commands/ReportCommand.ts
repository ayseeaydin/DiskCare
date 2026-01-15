import path from "node:path";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ReportService } from "../reporting/ReportService.js";
import { formatBytes } from "../formatters/formatBytes.js";

export class ReportCommand extends BaseCommand {
  readonly name = "report";
  readonly description = "Summarize past runs from logs";

  protected async execute(_args: unknown[], context: CommandContext): Promise<void> {
    const logsDir = path.resolve(process.cwd(), "logs");
    const service = new ReportService(logsDir);

    const runs = await service.listLatest(10);
    if (runs.length === 0) {
      context.output.warn("No run logs found yet. Run `diskcare scan` first.");
      return;
    }

    const summary = service.summarize(runs);

    context.output.info("report");
    context.output.info(`  runs:            ${summary.runCount}`);
    context.output.info(`  latest:          ${summary.latestTimestamp ?? "-"}`);
    context.output.info(`  total bytes:     ${formatBytes(summary.totalBytes)}`);
    context.output.info(`  missing targets: ${summary.missingTargets}`);
    context.output.info(`  skipped targets: ${summary.skippedTargets}`);
  }
}
