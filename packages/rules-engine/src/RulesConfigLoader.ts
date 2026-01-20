import fs from "node:fs/promises";
import type { RuleConfig } from "./types/RuleConfig.js";

/**
 * Error thrown when rules config cannot be loaded or is invalid.
 */
export class RulesConfigError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RulesConfigError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class RulesConfigLoader {
  async loadFromFile(filePath: string): Promise<RuleConfig> {
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch (err) {
      throw new RulesConfigError(
        `Cannot read rules config file: ${filePath}`,
        filePath,
        err,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new RulesConfigError(
        `Invalid JSON in rules config: ${filePath}`,
        filePath,
        err,
      );
    }

    // Basic validation
    if (!isValidRuleConfig(parsed)) {
      throw new RulesConfigError(
        `Invalid rules config schema in: ${filePath}`,
        filePath,
      );
    }

    return parsed;
  }
}

function isValidRuleConfig(value: unknown): value is RuleConfig {
  if (typeof value !== "object" || value === null) return false;
  
  const obj = value as Record<string, unknown>;
  
  // Must have rules array and defaults object
  if (!Array.isArray(obj.rules)) return false;
  if (typeof obj.defaults !== "object" || obj.defaults === null) return false;
  
  const defaults = obj.defaults as Record<string, unknown>;
  if (typeof defaults.risk !== "string") return false;
  if (typeof defaults.safeAfterDays !== "number") return false;
  
  // Validate each rule
  for (const rule of obj.rules) {
    if (typeof rule !== "object" || rule === null) return false;
    const r = rule as Record<string, unknown>;
    if (typeof r.id !== "string") return false;
    if (typeof r.risk !== "string") return false;
    if (typeof r.safeAfterDays !== "number") return false;
    if (typeof r.description !== "string") return false;
  }
  
  return true;
}
