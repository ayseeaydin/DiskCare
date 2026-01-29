import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import { RulesEngine } from "@diskcare/rules-engine";
import type { RiskLevel } from "@diskcare/rules-engine";

const riskArb = fc.constantFrom<RiskLevel>("safe", "caution", "do-not-touch");
const safeAfterArb = fc.integer({ min: 0, max: 9999 });

const ruleIdArb = fc
  .stringMatching(/^[a-z][a-z0-9-]{0,12}$/)
  .filter((id) => !id.endsWith("-") && !id.startsWith("-"));

test("RulesEngine property: missing id falls back to defaults", async () => {
  await fc.assert(
    fc.property(
      fc.uniqueArray(ruleIdArb, { minLength: 1, maxLength: 10 }),
      riskArb,
      safeAfterArb,
      (ruleIds: string[], defaultRisk, defaultSafeAfter) => {
        const rules = ruleIds.map((id, i) => ({
          id,
          risk: (i % 2 === 0 ? "safe" : "caution") as RiskLevel,
          safeAfterDays: i,
          description: `rule-${id}`,
        }));

        const engine = new RulesEngine({
          rules,
          defaults: { risk: defaultRisk, safeAfterDays: defaultSafeAfter },
        });

        const missingId = "missing-target-id";
        const decision = engine.decide(missingId);

        assert.equal(decision.risk, defaultRisk);
        assert.equal(decision.safeAfterDays, defaultSafeAfter);
        assert.ok(
          decision.reasons[0]?.includes("Using defaults"),
          "reason should mention defaults",
        );
      },
    ),
    { numRuns: 100 },
  );
});

test("RulesEngine property: existing id uses rule values", async () => {
  await fc.assert(
    fc.property(ruleIdArb, riskArb, safeAfterArb, (id, risk, safeAfterDays) => {
      const engine = new RulesEngine({
        rules: [
          {
            id,
            risk,
            safeAfterDays,
            description: `desc-${id}`,
          },
        ],
        defaults: { risk: "caution", safeAfterDays: 30 },
      });

      const decision = engine.decide(id);
      assert.equal(decision.risk, risk);
      assert.equal(decision.safeAfterDays, safeAfterDays);
      assert.equal(decision.reasons[0], `desc-${id}`);
    }),
    { numRuns: 100 },
  );
});
