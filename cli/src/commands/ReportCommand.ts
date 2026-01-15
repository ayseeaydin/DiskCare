import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";

export class ReportCommand extends BaseCommand {
  readonly name = "report";
  readonly description = "Summarize past runs from logs";

  protected async execute(_args: unknown[], context: CommandContext): Promise<void> {
    context.output.info("report: stub");
  }
}
