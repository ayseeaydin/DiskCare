import type { Command } from "commander";
import path from "node:path";
import fs from "node:fs/promises";

import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../types/CommandContext.js";
import { ConfigWriteError, ValidationError } from "../errors/DiskcareError.js";

type InitOptions = {
  policy?: string;
  force?: boolean;
};

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
  }

  protected async execute(args: unknown[], context: CommandContext): Promise<void> {
    const options = this.parseOptions(args);

    const policy = this.parsePolicy(options.policy);
    const configPath = context.configPath;

    const existing = await this.getExistingConfigEntry(configPath);
    if (existing.exists) {
      if (!options.force) {
        throw new ValidationError("Config path already exists (use --force to overwrite)", {
          configPath,
        });
      }

      if (!existing.isFile) {
        throw new ValidationError("Config path exists and is not a file", { configPath });
      }
    }

    const configJson = buildPolicyConfig(policy);
    const dir = path.dirname(configPath);

    try {
      await this.fs().mkdir(dir, { recursive: true });
      await this.fs().writeFile(configPath, JSON.stringify(configJson, null, 2) + "\n", "utf8");
    } catch (err) {
      throw new ConfigWriteError("Failed to write rules config", { configPath, dir }, err);
    }

    context.output.info(`Created rules config: ${configPath}`);
    context.output.info(`Policy: ${policy}`);
  }

  private parseOptions(args: unknown[]): { policy: string; force: boolean } {
    const options = (args[0] ?? {}) as InitOptions;
    return {
      policy: String(options.policy ?? "conservative"),
      force: options.force ?? false,
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
    try {
      const s = await this.fs().stat(filePath);
      return { exists: true, isFile: s.isFile() };
    } catch (err) {
      if (isErrno(err, "ENOENT")) {
        return { exists: false, isFile: false };
      }
      throw new ConfigWriteError("Failed to access config path", { configPath: filePath }, err);
    }
  }
}

function isErrno(err: unknown, code: string): boolean {
  if (!err) return false;
  if (typeof err === "object" && "code" in err && (err as any).code === code) return true;
  if (err instanceof Error && typeof err.message === "string" && err.message.includes(code)) {
    return true;
  }
  return false;
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
