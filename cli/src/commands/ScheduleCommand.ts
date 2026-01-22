import type { Command } from "commander";
import { z } from "zod";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ValidationError } from "../errors/DiskcareError.js";

type ScheduleOptions = {
  apply?: boolean;
};

const ScheduleFrequencySchema = z.enum(["weekly", "daily"]);

const ScheduleOptionsSchema = z
  .object({
    apply: z.boolean().optional(),
  })
  .passthrough();

export class ScheduleCommand extends BaseCommand {
  readonly name = "schedule";
  readonly description = "Set up a scheduled run (weekly/daily)";

  protected configure(cmd: Command): void {
    cmd.argument("<frequency>", "weekly|daily");
    cmd.option("--apply", "Actually install schedule (default prints instructions only).");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const frequencyParsed = ScheduleFrequencySchema.safeParse(String(args[0] ?? ""));
    if (!frequencyParsed.success) {
      throw new ValidationError("Invalid schedule frequency", {
        issues: frequencyParsed.error.issues,
      });
    }

    const optionsParsed = ScheduleOptionsSchema.safeParse(args[1] ?? {});
    if (!optionsParsed.success) {
      throw new ValidationError("Invalid schedule command options", {
        issues: optionsParsed.error.issues,
      });
    }

    const frequency = frequencyParsed.data;
    const options: ScheduleOptions = optionsParsed.data;
    const apply = options.apply ?? false;

    context.output.info(`schedule: stub (frequency=${frequency}, apply=${apply})`);
  }
}
