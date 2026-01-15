import type { Command } from "commander";
import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";

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
    // commander passes options as last argument (Command object in some versions),
    // so we take the first arg that looks like options.
    const options = (args[0] ?? {}) as ScanOptions;

    const dryRun = options.dryRun ?? true; // SAFE-BY-DEFAULT
    const asJson = options.json ?? false;

    if (asJson) {
      context.output.info(JSON.stringify({ command: "scan", dryRun, status: "stub" }, null, 2));
      return;
    }

    context.output.info(`scan: stub (dryRun=${dryRun})`);
  }
}
