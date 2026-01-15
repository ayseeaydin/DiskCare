import type { Command } from "commander";
import { ScannerService, OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";
import path from "node:path";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { formatBytes } from "../formatters/formatBytes.js";
import { formatDate } from "../formatters/formatDate.js";
import { truncate } from "../formatters/truncate.js";
import { LogWriter } from "../logging/LogWriter.js";

type ScanOptions = {
  json?: boolean;
  dryRun?: boolean;
};

export class ScanCommand extends BaseCommand {
  readonly name = "scan";
  readonly description = "Analyze known cache/temp locations and print a report";

  protected configure(cmd: Command): void {
    cmd.option("--json", "Output JSON");
    cmd.option("--dry-run", "Plan only (no changes). Default behavior is non-destructive.");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = (args[0] ?? {}) as ScanOptions;

    const dryRun = options.dryRun ?? true; // SAFE-BY-DEFAULT
    const asJson = options.json ?? false;

    const scannerService = new ScannerService([new OsTempScanner(), new NpmCacheScanner()]);
    const targets = await scannerService.scanAll();

    const logWriter = new LogWriter(path.resolve(process.cwd(), "logs"));

    const payload = {
      version: "0.0.1",
      timestamp: new Date().toISOString(),
      command: "scan",
      dryRun,
      targets,
    };

    const logPath = await logWriter.writeRunLog(payload);

    if (asJson) {
      // JSON output intentionally stays stable; we don't add logPath yet.
      context.output.info(JSON.stringify({ command: "scan", dryRun, targets }, null, 2));
      return;
    }

    context.output.info(`scan report (dryRun=${dryRun})`);
    context.output.info("");

    for (const t of targets) {
      const exists = t.exists === true ? "yes" : "no";
      const skipped = t.metrics?.skipped === true ? "yes" : "no";

      const size = formatBytes(t.metrics?.totalBytes ?? 0);
      const files = String(t.metrics?.fileCount ?? 0).padStart(6, " ");
      const modified = formatDate(t.metrics?.lastModifiedAt);
      const accessed = formatDate(t.metrics?.lastAccessedAt);

      context.output.info(`${t.displayName}`);
      context.output.info(`  id:      ${t.id}`);
      context.output.info(`  path:    ${t.path}`);
      context.output.info(`  exists:  ${exists}   skipped: ${skipped}`);
      context.output.info(`  size:    ${size}   files: ${files}`);
      context.output.info(`  mtime:   ${modified}`);
      context.output.info(`  atime:   ${accessed}`);

      if (t.metrics?.skipped && t.metrics.error) {
        const cleanError = t.metrics.error.replace(/\r?\n/g, " ");
        context.output.warn(`  error:   ${truncate(cleanError, 140)}`);
      }

      context.output.info("");
    }

    context.output.info(`Saved log: ${logPath}`);
  }
}