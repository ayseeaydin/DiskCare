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
    // Argüman zorunluluğu kaldırıldı, stub komut
    cmd.option("--apply", "Actually install schedule (default prints instructions only).");
  }

  protected async execute(_args: unknown[], context: CommandContext): Promise<void> {
    // Her durumda stub mesajı ve exitCode=0
    context.output.info("Coming soon: This feature is not yet available.");
    context.setExitCode(0);
    return;
  }
}
