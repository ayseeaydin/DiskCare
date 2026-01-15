import type { Command } from "commander";
import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ScannerService, OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";

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

    // DI: scanners are composed here (later moved to a composition root)
    const scannerService = new ScannerService([new OsTempScanner(), new NpmCacheScanner()]);
    const targets = await scannerService.scanAll();

    if (asJson) {
      context.output.info(JSON.stringify({ command: "scan", dryRun, targets }, null, 2));
      return;
    }

    context.output.info(`scan (dryRun=${dryRun})`);
    for (const t of targets) {
      context.output.info(`- ${t.id} | ${t.displayName} | ${t.path}`);
    }
  }
}
