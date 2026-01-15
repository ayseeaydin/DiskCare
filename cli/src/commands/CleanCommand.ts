import type { Command } from "commander";
import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";

type CleanOptions = {
  dryRun?: boolean;
  apply?: boolean;
};

export class CleanCommand extends BaseCommand {
  readonly name = "clean";
  readonly description = "Clean targets that match safe rules";

  protected configure(cmd: Command): void {
    cmd.option("--dry-run", "Plan only (no changes). Recommended.");
    cmd.option("--apply", "Actually perform cleaning actions (dangerous).");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = (args[0] ?? {}) as CleanOptions;

    // SAFE default: dry-run unless apply is explicitly true
    const apply = options.apply ?? false;
    const dryRun = options.dryRun ?? !apply;

    context.output.info(`clean: stub (dryRun=${dryRun}, apply=${apply})`);
  }
}
