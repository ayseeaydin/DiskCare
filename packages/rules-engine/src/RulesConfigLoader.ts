import fs from "node:fs/promises";
import type { RuleConfig } from "./types/RuleConfig.js";
import type { RiskLevel } from "./types/Decision.js";
import { isFiniteNumber, isNonEmptyString, isRecord } from "./utils/typeGuards.js";
import { MAX_SAFE_AFTER_DAYS, MIN_SAFE_AFTER_DAYS } from "./utils/constants.js";

type RulesFs = {
  readFile: (filePath: string, encoding: "utf8") => Promise<string>;
};

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
  constructor(private readonly rulesFs: RulesFs = fs) {}

  async loadFromFile(filePath: string): Promise<RuleConfig> {
    let raw: string;
    try {
      raw = await this.rulesFs.readFile(filePath, "utf8");
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
  if (!isRiskLevel(defaults.risk)) return false;
  if (!isValidSafeAfterDays(defaults.safeAfterDays)) return false;

  // Validate each rule
  for (const rule of obj.rules) {
    if (!isRecord(rule)) return false;
    const r = rule as Record<string, unknown>;
    if (!isValidRuleId(r.id)) return false;
    if (!isRiskLevel(r.risk)) return false;
    if (!isValidSafeAfterDays(r.safeAfterDays)) return false;
    if (!isNonEmptyString(r.description)) return false;
  }

  return true;
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === "safe" || value === "caution" || value === "do-not-touch";
}

function isValidSafeAfterDays(value: unknown): value is number {
  if (!isFiniteNumber(value)) return false;
  if (!Number.isInteger(value)) return false;
  if (value < MIN_SAFE_AFTER_DAYS) return false;
  if (value > MAX_SAFE_AFTER_DAYS) return false;
  return true;
}

function isValidRuleId(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  // lowercase alphanumeric plus dashes, no leading/trailing dash
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
