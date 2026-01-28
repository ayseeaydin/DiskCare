import type { RiskLevel } from "./Decision.js";

export type Rule = {
  id: string;
  risk: RiskLevel;
  safeAfterDays: number;
  description: string;
  paths?: string[];
};

export type RuleDefaults = {
  risk: RiskLevel;
  safeAfterDays: number;
};

export type RuleConfig = {
  rules: Rule[];
  defaults: RuleDefaults;
};
