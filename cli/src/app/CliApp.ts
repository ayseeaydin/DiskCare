import { Command } from "commander";
import { ConsoleOutput } from "../output/ConsoleOutput.js";
import type { BaseCommand } from "../commands/BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";

export class CliApp {
  private readonly program: Command;
  private readonly context: CommandContext;

  constructor(private readonly commands: BaseCommand[]) {
    this.program = new Command();
    this.context = { output: new ConsoleOutput() };
  }

  run(argv: string[]): void {
    this.program
      .name("diskcare")
      .description("Developer-focused disk hygiene CLI (safe-by-default)")
      .version("0.0.1");

    for (const cmd of this.commands) {
      cmd.register(this.program, this.context);
    }

    this.program.parse(argv);
  }
}
