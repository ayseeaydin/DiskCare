import type { Command } from "commander";
import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";

type ScheduleOptions = {
  apply?: boolean;
};

export class ScheduleCommand extends BaseCommand {
  readonly name = "schedule";
  readonly description = "Set up a scheduled run (weekly/daily)";

  protected configure(cmd: Command): void {
    cmd.argument("<frequency>", "weekly|daily");
    cmd.option("--apply", "Actually install schedule (default prints instructions only).");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const frequency = String(args[0] ?? "");
    const options = (args[1] ?? {}) as ScheduleOptions;

    const apply = options.apply ?? false;

    context.output.info(`schedule: stub (frequency=${frequency}, apply=${apply})`);
  }
}
