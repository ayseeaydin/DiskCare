import { Command } from "commander";
import path from "node:path";
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
    this.context = {
      output: new ConsoleOutput(),
      verbose: false,
      configPath: path.resolve(process.cwd(), "config", "rules.json"),
    };
  }

  async run(argv: string[]): Promise<void> {
    this.program
      .name("diskcare")
      .description("Developer-focused disk hygiene CLI (safe-by-default)")
      .version(APP_VERSION)
      .option("--verbose", "Print stack traces and error causes")
      .option("-c, --config <path>", "Path to rules config (rules.json)");

    this.program.hook("preAction", () => {
      const opts = this.program.opts<{ verbose?: boolean; config?: string }>();
      this.context.verbose = opts.verbose ?? false;
      if (typeof opts.config === "string" && opts.config.trim().length > 0) {
        this.context.configPath = path.resolve(process.cwd(), opts.config);
      }
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
