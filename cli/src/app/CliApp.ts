import { Command } from "commander";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { ConsoleOutput } from "../output/ConsoleOutput.js";
import type { BaseCommand } from "../commands/BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { APP_VERSION } from "../utils/constants.js";
import { handleCommandError } from "../utils/commandErrors.js";
import { getDefaultConfigPath } from "../utils/configPaths.js";

export class CliApp {
  private readonly program: Command;
  private readonly context: CommandContext;

  constructor(private readonly commands: BaseCommand[]) {
    this.program = new Command();
    this.context = {
      output: new ConsoleOutput(),
      verbose: false,
      configPath: getDefaultConfigPath({
        cwd: process.cwd(),
        platform: process.platform,
        env: process.env,
        homedir: os.homedir(),
        pathExists: (p) => fs.existsSync(p),
      }),
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
