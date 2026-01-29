import type { Command } from "commander";
import path from "node:path";
import { z } from "zod";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ReportService } from "../reporting/ReportService.js";
import type { ReportSummary } from "../reporting/ReportService.js";
import { formatBytes } from "../formatters/formatBytes.js";
import { ValidationError } from "../errors/DiskcareError.js";
import { MessageFormatter } from "../utils/MessageFormatter.js";
import { JSON_INDENT, REPORT_LABEL_PAD } from "../utils/constants.js";

type ReportOptions = {
  json?: boolean;
};

const ReportOptionsSchema = z
  .object({
    json: z.boolean().optional(),
  })
  .passthrough();

export type ReportCommandDeps = {
  summarize: (context: CommandContext) => Promise<ReportSummary>;
};

export class ReportCommand extends BaseCommand {
  readonly name = "report";
  readonly description = "Summarize past runs.";

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
      context.output.info(
        JSON.stringify(
          { command: "report", ...summary, configPath: context.configPath },
          null,
          JSON_INDENT,
        ),
      );
      return;
    }

    context.output.info(MessageFormatter.reportHeader());
    context.output.info(MessageFormatter.configPathLine(context.configPath));
    context.output.info(
      MessageFormatter.reportLine("runs:", String(summary.runCount), REPORT_LABEL_PAD),
    );
    context.output.info(
      MessageFormatter.reportLine("latest:", summary.latestRunAt ?? "-", REPORT_LABEL_PAD),
    );
    context.output.info("");

    context.output.info(MessageFormatter.reportSection("scan (latest)"));
    context.output.info(
      MessageFormatter.reportLine("latest scan:", summary.latestScanAt ?? "-", REPORT_LABEL_PAD),
    );
    context.output.info(
      MessageFormatter.reportLine(
        "total bytes:",
        formatBytes(summary.scanTotalBytes),
        REPORT_LABEL_PAD,
      ),
    );
    context.output.info(
      MessageFormatter.reportLine(
        "missing targets:",
        String(summary.scanMissingTargets),
        REPORT_LABEL_PAD,
      ),
    );
    context.output.info(
      MessageFormatter.reportLine(
        "skipped targets:",
        String(summary.scanSkippedTargets),
        REPORT_LABEL_PAD,
      ),
    );
    context.output.info("");

    context.output.info(MessageFormatter.reportSection("apply (clean --apply)"));
    context.output.info(
      MessageFormatter.reportLine("apply runs:", String(summary.applyRuns), REPORT_LABEL_PAD),
    );
    context.output.info(
      MessageFormatter.reportLine("trashed:", String(summary.trashedCount), REPORT_LABEL_PAD),
    );
    context.output.info(
      MessageFormatter.reportLine("failed:", String(summary.failedCount), REPORT_LABEL_PAD),
    );
    context.output.info(
      MessageFormatter.reportLine("latest apply:", summary.latestApplyAt ?? "-", REPORT_LABEL_PAD),
    );
    context.output.info(
      MessageFormatter.reportLine(
        "trashed est bytes:",
        formatBytes(summary.trashedEstimatedBytes),
        REPORT_LABEL_PAD,
      ),
    );
  }

  private resolveDeps(): ReportCommandDeps {
    return {
      summarize: this.deps?.summarize ?? this.defaultSummarize.bind(this),
    };
  }

  private parseOptions(args: unknown[]): { asJson: boolean } {
    const parsed = ReportOptionsSchema.safeParse(args[0] ?? {});
    if (!parsed.success) {
      throw new ValidationError("Invalid report command options. Check arguments and try again.", {
        issues: parsed.error.issues,
        hint: "Run 'diskcare report --help' for usage examples.",
      });
    }

    const options = parsed.data;
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
