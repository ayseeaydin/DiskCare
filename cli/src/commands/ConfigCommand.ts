import type { Command } from "commander";
import fs from "node:fs/promises";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ValidationError } from "../errors/DiskcareError.js";
import { toOneLine } from "../utils/errors.js";

type ConfigFs = {
  stat: (filePath: string) => Promise<{ isFile: () => boolean }>;
};

export type ConfigCommandDeps = {
  fs: ConfigFs;
};

export class ConfigCommand extends BaseCommand {
  readonly name = "config";
  readonly description = "Inspect resolved configuration";

  constructor(private readonly deps?: ConfigCommandDeps) {
    super();
  }

  protected configure(cmd: Command): void {
    cmd.argument("[action]", "Subcommand (currently: path)");
    cmd.option("--json", "Output JSON");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const action = String(args[0] ?? "").trim();
    const options = (args[1] ?? {}) as { json?: boolean };

    if (action.length === 0) {
      context.output.info("config commands:");
      context.output.info("  diskcare config path    Print resolved rules config path");
      return;
    }

    if (action === "path") {
      await this.printPath(context, { asJson: options.json ?? false });
      return;
    }

    throw new ValidationError("Unknown config subcommand", { action });
  }

  private fs(): ConfigFs {
    if (this.deps?.fs) return this.deps.fs;
    return { stat: (filePath) => fs.stat(filePath) };
  }

  private async printPath(context: CommandContext, options: { asJson: boolean }): Promise<void> {
    const configPath = context.configPath;

    const meta = await this.tryGetMeta(configPath);
    if (options.asJson) {
      context.output.info(JSON.stringify({ configPath, ...meta }, null, 2));
      return;
    }

    context.output.info(`configPath: ${configPath}`);
    if (meta.exists === true) {
      context.output.info(`exists: yes (file=${meta.isFile === true ? "yes" : "no"})`);
    } else if (meta.exists === false) {
      context.output.info("exists: no");
    } else {
      context.output.warn(`exists: unknown (${toOneLine(meta.error ?? "")})`);
    }
  }

  private async tryGetMeta(
    configPath: string,
  ): Promise<{ exists: boolean | null; isFile?: boolean; error?: string }> {
    try {
      const s = await this.fs().stat(configPath);
      return { exists: true, isFile: s.isFile() };
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err ? String((err as any).code) : "";
      if (code === "ENOENT") {
        return { exists: false };
      }

      const msg = err instanceof Error ? err.message : String(err);
      return { exists: null, error: msg };
    }
  }
}
