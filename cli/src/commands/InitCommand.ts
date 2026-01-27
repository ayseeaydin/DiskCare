import type { Command } from "commander";
import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ConfigWriteError, ValidationError } from "../errors/DiskcareError.js";
import { fromPromise } from "../utils/result.js";
import { getErrnoCode } from "../utils/errno.js";
import { getUserConfigPath } from "../utils/configPaths.js";

type InitOptions = {
  policy?: string;
  force?: boolean;
  listPolicies?: boolean;
  user?: boolean;
};

const InitOptionsSchema = z
  .object({
    policy: z.string().optional(),
    force: z.boolean().optional(),
    listPolicies: z.boolean().optional(),
    user: z.boolean().optional(),
  })
  .passthrough();

type InitFs = {
  mkdir: (dir: string, opts: { recursive: true }) => Promise<string | undefined>;
  writeFile: (filePath: string, content: string, encoding: "utf8") => Promise<void>;
  stat: (filePath: string) => Promise<{ isFile: () => boolean }>;
};

export type InitCommandDeps = {
  fs: InitFs;
};

type PolicyName = "conservative" | "aggressive" | "custom";

export class InitCommand extends BaseCommand {
  readonly name = "init";
  readonly description = "Create a starter rules.json (safe defaults)";

  constructor(private readonly deps?: InitCommandDeps) {
    super();
  }

  protected configure(cmd: Command): void {
    cmd.option(
      "--policy <name>",
      "Policy template: conservative|aggressive|custom",
      "conservative",
    );
    cmd.option("--force", "Overwrite existing config file (default: no)");
    cmd.option("--list-policies", "List available policy templates and exit");

    // Opt-in only: force writing to per-user config path.
    // Default remains context.configPath (selected by CliApp strategy).
    cmd.option("--user", "Write rules.json to the per-user config path");
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = this.parseOptions(args);

    if (options.listPolicies) {
      context.output.info("Available policies:");
      context.output.info("- conservative (safe defaults)");
      context.output.info("- aggressive (clean sooner; higher risk tolerance)");
      context.output.info("- custom (empty rules; edit manually)");
      return;
    }

    const policy = this.parsePolicy(options.policy);

    const configPath = options.user
      ? getUserConfigPath({
          platform: context.platform,
          env: context.env,
          homedir: context.homedir,
        })
      : context.configPath;

    const fsLike = this.fs();

    const existing = await this.getExistingConfigEntry(configPath);
    if (existing.exists) {
      if (!options.force) {
        throw new ValidationError(
          "Config file already exists. Use --force to overwrite, or choose a different path.",
          { configPath, hint: "Run 'diskcare init --force' to overwrite the existing config." },
        );
      }

      if (!existing.isFile) {
        throw new ValidationError(
          "Config path exists but is not a file. Please choose a different path.",
          { configPath },
        );
      }
    }

    const configJson = buildPolicyConfig(policy);
    const dir = path.dirname(configPath);

    const mkdirResult = await fromPromise(fsLike.mkdir(dir, { recursive: true }));
    if (!mkdirResult.ok) {
      throw new ConfigWriteError(
        "Failed to write rules config",
        { configPath, dir },
        mkdirResult.error,
      );
    }

    const writeResult = await fromPromise(
      fsLike.writeFile(configPath, JSON.stringify(configJson, null, 2) + "\n", "utf8"),
    );
    if (!writeResult.ok) {
      throw new ConfigWriteError(
        "Failed to write rules config",
        { configPath, dir },
        writeResult.error,
      );
    }

    context.output.info(`Created rules config: ${configPath}`);
    context.output.info(`Policy: ${policy}`);
  }

  private parseOptions(args: unknown[]): {
    policy: string;
    force: boolean;
    listPolicies: boolean;
    user: boolean;
  } {
    const parsed = InitOptionsSchema.safeParse(args[0] ?? {});
    if (!parsed.success) {
      throw new ValidationError("Invalid init command options", {
        issues: parsed.error.issues,
      });
    }

    const options: InitOptions = parsed.data;
    return {
      policy: String(options.policy ?? "conservative"),
      force: options.force ?? false,
      listPolicies: options.listPolicies ?? false,
      user: options.user ?? false,
    };
  }

  private parsePolicy(value: string): PolicyName {
    const v = value.trim().toLowerCase();
    if (v === "conservative" || v === "aggressive" || v === "custom") return v;
    throw new ValidationError("Unknown policy", { policy: value });
  }

  private fs(): InitFs {
    if (this.deps?.fs) return this.deps.fs;

    return {
      mkdir: (dir, opts) => fs.mkdir(dir, opts),
      writeFile: (filePath, content, encoding) => fs.writeFile(filePath, content, encoding),
      stat: (filePath) => fs.stat(filePath),
    };
  }

  private async getExistingConfigEntry(
    filePath: string,
  ): Promise<{ exists: boolean; isFile: boolean }> {
    const fsLike = this.fs();

    const s = await fromPromise(fsLike.stat(filePath));
    if (s.ok) {
      return { exists: true, isFile: s.value.isFile() };
    }

    const code = getErrnoCode(s.error);
    if (code === "ENOENT") {
      return { exists: false, isFile: false };
    }

    throw new ConfigWriteError("Failed to access config path", { configPath: filePath }, s.error);
  }
}

const CUSTOM_POLICY_CONFIG: unknown = {
  rules: [],
  defaults: {
    risk: "caution",
    safeAfterDays: 30,
  },
};

const AGGRESSIVE_POLICY_CONFIG: unknown = {
  rules: [
    {
      id: "npm-cache",
      risk: "safe",
      safeAfterDays: 7,
      description: "npm cache is reproducible; safe to clean when old.",
    },
    {
      id: "sandbox-cache",
      risk: "safe",
      safeAfterDays: 1,
      description: "sandbox cache is safe to remove; keep at least a day.",
    },
    {
      id: "os-temp",
      risk: "caution",
      safeAfterDays: 14,
      description: "OS temp can include in-use files; only clean older items.",
    },
  ],
  defaults: {
    risk: "caution",
    safeAfterDays: 14,
  },
};

const CONSERVATIVE_POLICY_CONFIG: unknown = {
  rules: [
    {
      id: "npm-cache",
      risk: "safe",
      safeAfterDays: 30,
      description: "npm cache is reproducible; safe to clean when old.",
    },
    {
      id: "sandbox-cache",
      risk: "safe",
      safeAfterDays: 14,
      description: "sandbox cache is safe to remove when old.",
    },
    {
      id: "os-temp",
      risk: "caution",
      safeAfterDays: 30,
      description: "OS temp can include in-use files; only clean older items.",
    },
  ],
  defaults: {
    risk: "caution",
    safeAfterDays: 30,
  },
};

function buildPolicyConfig(policy: PolicyName): unknown {
  switch (policy) {
    case "custom":
      return CUSTOM_POLICY_CONFIG;
    case "aggressive":
      return AGGRESSIVE_POLICY_CONFIG;
    case "conservative":
      return CONSERVATIVE_POLICY_CONFIG;
  }
}
