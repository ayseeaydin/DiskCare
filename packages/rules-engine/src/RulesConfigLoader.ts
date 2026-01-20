import fs from "node:fs/promises";
import type { RuleConfig } from "./types/RuleConfig.js";
import { isFiniteNumber, isNonEmptyString, isRecord } from "./utils/typeGuards.js";

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
  if (!isRecord(value)) return false;

  const obj = value as Record<string, unknown>;

  // Must have rules array and defaults object
  if (!Array.isArray(obj.rules)) return false;
  if (!isRecord(obj.defaults)) return false;

  const defaults = obj.defaults as Record<string, unknown>;
  if (!isNonEmptyString(defaults.risk)) return false;
  if (!isFiniteNumber(defaults.safeAfterDays)) return false;

  // Validate each rule
  for (const rule of obj.rules) {
    if (!isRecord(rule)) return false;
    const r = rule as Record<string, unknown>;
    if (!isNonEmptyString(r.id)) return false;
    if (!isNonEmptyString(r.risk)) return false;
    if (!isFiniteNumber(r.safeAfterDays)) return false;
    if (!isNonEmptyString(r.description)) return false;
  }

  return true;
}
