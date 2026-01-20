import path from "node:path";

import { RulesConfigError, RulesConfigLoader, RulesEngine } from "@diskcare/rules-engine";

import type { CommandContext } from "../types/CommandContext.js";
import { truncate } from "../formatters/truncate.js";
import { ConfigLoadError } from "../errors/DiskcareError.js";
import { toErrorMessage, toOneLine } from "../utils/errors.js";

export class RulesProvider {
  constructor(private readonly rulesPath: string) {}

  static fromCwd(): RulesProvider {
    const rulesPath = path.resolve(process.cwd(), "config", "rules.json");
    return new RulesProvider(rulesPath);
  }

  async tryLoad(context: CommandContext): Promise<RulesEngine | null> {
    try {
      const rulesConfig = await new RulesConfigLoader().loadFromFile(this.rulesPath);
      return new RulesEngine(rulesConfig);
    } catch (err) {
      const contextInfo: Record<string, unknown> = { rulesPath: this.rulesPath };
      if (err instanceof RulesConfigError) {
        contextInfo.filePath = err.filePath;
      }

      const wrapped = new ConfigLoadError("rules: config not loaded", contextInfo);
      (wrapped as any).cause = err;

      const msg = toOneLine(toErrorMessage(err));
      context.output.warn(`rules: config not loaded (${truncate(msg, 140)})`);
      return null;
    }
  }
}
