import { Command } from "commander";
import { ConsoleOutput } from "../output/ConsoleOutput.js";
import type { BaseCommand } from "../commands/BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { APP_VERSION } from "../utils/constants.js";
import { handleCommandError } from "../utils/commandErrors.js";

export class CliApp {
  private readonly program: Command;
  private readonly context: CommandContext;

  constructor(private readonly commands: BaseCommand[]) {
    this.program = new Command();
    this.context = { output: new ConsoleOutput(), verbose: false };
  }

  async run(argv: string[]): Promise<void> {
    this.program
      .name("diskcare")
      .description("Developer-focused disk hygiene CLI (safe-by-default)")
      .version(APP_VERSION)
      .option("--verbose", "Print stack traces and error causes");

    this.program.hook("preAction", () => {
      const opts = this.program.opts<{ verbose?: boolean }>();
      this.context.verbose = opts.verbose ?? false;
    });

    for (const cmd of this.commands) {
      cmd.register(this.program, this.context);
    }

    try {
      await this.program.parseAsync(argv);
    } catch (err) {
      handleCommandError(this.context, err);
    }
  }
}
