import type { Command } from "commander";
import fs from "node:fs/promises";
import { z } from "zod";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ValidationError } from "../errors/DiskcareError.js";
import { toOneLine } from "../utils/errors.js";
import { fromPromise } from "../utils/result.js";
import { getErrnoCode } from "../utils/errno.js";
import { MessageFormatter } from "../utils/MessageFormatter.js";
import { JSON_INDENT } from "../utils/constants.js";

type ConfigOptions = {
  json?: boolean;
};

const ConfigOptionsSchema = z
  .object({
    json: z.boolean().optional(),
  })
  .passthrough();

type ConfigFs = {
  stat: (filePath: string) => Promise<{ isFile: () => boolean }>;
};

export type ConfigCommandDeps = {
  fs: ConfigFs;
};

export class ConfigCommand extends BaseCommand {
  readonly name = "config";
  readonly description = "Show the resolved config.";

  constructor(private readonly deps?: ConfigCommandDeps) {
    super();
  }

  protected configure(cmd: Command): void {
    cmd.argument("[action]", "Subcommand (currently: path)");
    cmd.option("--json", "Output JSON");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const action = String(args[0] ?? "").trim();
    const optionsParsed = ConfigOptionsSchema.safeParse(args[1] ?? {});
    if (!optionsParsed.success) {
      throw new ValidationError("Invalid config command options", {
        issues: optionsParsed.error.issues,
      });
    }

    const options: ConfigOptions = optionsParsed.data;

    if (action.length === 0) {
      context.output.info(MessageFormatter.configCommandsHeader());
      context.output.info(MessageFormatter.configCommandsPath());
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
      context.output.info(JSON.stringify({ configPath, ...meta }, null, JSON_INDENT));
      return;
    }

    context.output.info(MessageFormatter.configPathLine(configPath));
    if (meta.exists === true) {
      context.output.info(MessageFormatter.configExistsYes(meta.isFile === true));
    } else if (meta.exists === false) {
      context.output.info(MessageFormatter.configExistsNo());
    } else {
      context.output.warn(MessageFormatter.configExistsUnknown(toOneLine(meta.error ?? "")));
    }
  }

  private async tryGetMeta(
    configPath: string,
  ): Promise<{ exists: boolean | null; isFile?: boolean; error?: string }> {
    const s = await fromPromise(this.fs().stat(configPath));
    if (s.ok) {
      return { exists: true, isFile: s.value.isFile() };
    }

    const code = getErrnoCode(s.error);
    if (code === "ENOENT") {
      return { exists: false };
    }

    const msg = s.error instanceof Error ? s.error.message : String(s.error);
    return { exists: null, error: msg };
  }
}
