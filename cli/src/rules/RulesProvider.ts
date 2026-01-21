import path from "node:path";

import { RulesConfigError, RulesConfigLoader, RulesEngine } from "@diskcare/rules-engine";

import type { CommandContext } from "../types/CommandContext.js";
import { truncate } from "../formatters/truncate.js";
import { toErrorMessage, toOneLine } from "../utils/errors.js";

type RulesConfigLoaderLike = {
  loadFromFile: (filePath: string) => Promise<unknown>;
};

export class RulesProvider {
  constructor(
    private readonly rulesPath: string,
    private readonly loader: RulesConfigLoaderLike = new RulesConfigLoader(),
  ) {}

  static fromCwd(cwd: string): RulesProvider {
    const rulesPath = path.resolve(cwd, "config", "rules.json");
    return new RulesProvider(rulesPath);
  }

  async tryLoad(context: CommandContext): Promise<RulesEngine | null> {
    try {
      const rulesConfig = await this.loader.loadFromFile(this.rulesPath);
      return new RulesEngine(rulesConfig as any);
    } catch (err) {
      const msg = toOneLine(toErrorMessage(err));

      const filePath = err instanceof RulesConfigError ? err.filePath : this.rulesPath;
      context.output.warn(
        `rules: config not loaded; using safe defaults (${filePath}: ${truncate(msg, 140)})`,
      );
      return null;
    }
  }
}
