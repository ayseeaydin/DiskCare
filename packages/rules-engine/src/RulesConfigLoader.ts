import fs from "node:fs/promises";
import type { RuleConfig } from "./types/RuleConfig.js";

export class RulesConfigLoader {
  async loadFromFile(filePath: string): Promise<RuleConfig> {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as RuleConfig;
  }
}
