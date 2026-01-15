import type { Decision } from "./types/Decision.js";
import type { RuleConfig } from "./types/RuleConfig.js";

export class RulesEngine {
    constructor(private readonly config: RuleConfig) { }

    decide(targetId: string): Decision {
        const rule = this.config.rules.find((r) => r.id === targetId);

        if (!rule) {
            return {
                risk: this.config.defaults.risk,
                safeAfterDays: this.config.defaults.safeAfterDays,
                reasons: [`No specific rule found for '${targetId}'. Using defaults.`],
            };
        }

        return {
            risk: rule.risk,
            safeAfterDays: rule.safeAfterDays,
            reasons: [rule.description],
        };
    }
}
