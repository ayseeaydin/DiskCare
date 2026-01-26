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
import { installSignalHandlers } from "../utils/signals.js";
import { fromPromise } from "../utils/result.js";

export class CliApp {
  private readonly program: Command;
  private readonly context: CommandContext;

  constructor(private readonly commands: BaseCommand[]) {
    this.program = new Command();
    const cwd = process.cwd();
    this.context = {
      output: new ConsoleOutput(),
      verbose: false,
      cwd,
      platform: process.platform,
      env: process.env,
      homedir: os.homedir(),
      pid: process.pid,
      nowFn: () => new Date(),
      setExitCode: (code) => {
        process.exitCode = code;
      },
      configPath: getDefaultConfigPath({
        cwd,
        platform: process.platform,
        env: process.env,
        homedir: os.homedir(),
        pathExists: (p) => fs.existsSync(p),
      }),
    };
  }

  async run(argv: string[]): Promise<void> {
    installSignalHandlers({ output: this.context.output, proc: process });

    this.program
      .name("diskcare")
      .description(
        [
          "Developer-focused disk hygiene CLI (safe-by-default)",
          "",
          "Safety gates: Temizlik işlemleri risk ve güvenlik kurallarına göre planlanır. Varsayılan olarak dosyalar silinmez, sadece temizlik planı gösterilir.",
          "Gerçek temizlik için --apply ve --yes bayraklarını kullanmalısınız.",
          "",
          "Komutlar: scan, clean, report, config, init, schedule",
          "",
          "Daha fazla bilgi için: diskcare <komut> --help",
        ].join("\n"),
      )
      .version(APP_VERSION)
      .option("--verbose", "Print stack traces and error causes")
      .option("-c, --config <path>", "Path to rules config (rules.json)");

    this.program.hook("preAction", () => {
      const opts = this.program.opts<{ verbose?: boolean; config?: string }>();
      this.context.verbose = opts.verbose ?? false;
      if (typeof opts.config === "string" && opts.config.trim().length > 0) {
        this.context.configPath = path.resolve(this.context.cwd, opts.config);
      }
    });

    // Onboarding mesajı: sadece config gerektiren komutlarda, --json yoksa ve config dosyası yoksa göster
    const userArgs = argv.slice(2).map((a) => a.toLowerCase());
    const onboardingCommands = ["scan", "clean", "report"];
    const isOnboardingCommand = onboardingCommands.some((cmd) => userArgs.includes(cmd));
    const isJson = userArgs.includes("--json");
    if (isOnboardingCommand && !isJson && !fs.existsSync(this.context.configPath)) {
      this.context.output.info(
        [
          "\u001b[1mWelcome to diskcare!\u001b[0m",
          "",
          "It looks like you don't have a rules config yet.",
          "",
          "To get started:",
          "  1. Run \u001b[32mdiskcare init\u001b[0m to create a config file.",
          "  2. Then try \u001b[32mdiskcare scan\u001b[0m or \u001b[32mdiskcare clean\u001b[0m.",
          "",
          "For help: diskcare --help",
        ].join("\n"),
      );
    }

    for (const cmd of this.commands) {
      cmd.register(this.program, this.context);
    }

    const parsed = await fromPromise(this.program.parseAsync(argv));
    if (!parsed.ok) {
      handleCommandError(this.context, parsed.error);
    }
  }
}
