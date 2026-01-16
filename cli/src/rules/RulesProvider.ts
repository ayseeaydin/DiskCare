import path from "node:path";

import { RulesConfigLoader, RulesEngine } from "@diskcare/rules-engine";

import type { CommandContext } from "../types/CommandContext.js";
import { truncate } from "../formatters/truncate.js";

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
      const message = err instanceof Error ? err.message : String(err);
      context.output.warn(
        `rules: config not loaded (${truncate(message.replace(/\r?\n/g, " "), 140)})`,
      );
      return null;
    }
  }
}
