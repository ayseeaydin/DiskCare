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
  readonly description = "Set up scheduled runs (v2, not yet available).";

  protected configure(cmd: Command): void {
    // Stub command for v2; no required args yet.
    cmd.option("--apply", "Actually install schedule (default prints instructions only).");
  }

  protected async execute(_args: unknown[], context: CommandContext): Promise<void> {
    // Always prints stub message and exits cleanly.
    context.output.info("Coming soon: This feature is not yet available.");
    context.setExitCode(0);
    return;
  }
}

