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
          "Disk bakımı ve temizlik için güvenli CLI. (Safe by default)",
          "",
          "Varsayılan olarak hiçbir dosya silinmez, sadece temizlik planı gösterilir.",
          "Gerçek temizlik için --apply --no-dry-run --yes bayraklarını kullanın.",
          "",
          "Komutlar: scan (tara), clean (temizle), report (rapor), config (yapılandırma), init (başlat)",
          "",
          "For help / yardım: diskcare <komut> --help",
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
          "\u001b[1mDiskcare'a hoş geldiniz!\u001b[0m / Welcome to diskcare!",
          "",
          "Henüz bir rules.json yapılandırmanız yok gibi görünüyor.",
          "",
          "Başlamak için:",
          "  1. \u001b[32mdiskcare init\u001b[0m komutunu çalıştırarak bir config oluşturun.",
          "  2. Ardından \u001b[32mdiskcare scan\u001b[0m veya \u001b[32mdiskcare clean\u001b[0m deneyin.",
          "",
          "For help / yardım: diskcare --help",
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
