import test from "node:test";
import assert from "node:assert/strict";

import { RulesEngine } from "../RulesEngine.js";
import type { RuleConfig } from "../types/RuleConfig.js";

test("RulesEngine.decide - should return rule decision when rule exists", () => {
  const config: RuleConfig = {
    rules: [
      {
        id: "npm-cache",
        risk: "safe",
        safeAfterDays: 14,
        description: "npm cache is reproducible; safe to clean when old.",
      },
    ],
    defaults: {
      risk: "caution",
      safeAfterDays: 30,
    },
  };

  const engine = new RulesEngine(config);

  const decision = engine.decide("npm-cache");

  assert.equal(decision.risk, "safe");
  assert.equal(decision.safeAfterDays, 14);
  assert.deepEqual(decision.reasons, ["npm cache is reproducible; safe to clean when old."]);
});

test(
  "RulesEngine.decide - should fall back to defaults with explainable reason when rule does not exist",
  () => {
  const config: RuleConfig = {
    rules: [
      {
        id: "os-temp",
        risk: "caution",
        safeAfterDays: 7,
        description: "OS temp can contain installers or in-use files; only clean old items.",
      },
    ],
    defaults: {
      risk: "caution",
      safeAfterDays: 30,
    },
  };

  const engine = new RulesEngine(config);

  const decision = engine.decide("unknown-target");

  assert.equal(decision.risk, "caution");
  assert.equal(decision.safeAfterDays, 30);

  // Make TS happy: ensure index 0 exists before matching
  assert.equal(decision.reasons.length, 1);
  const reason0 = decision.reasons[0];
  assert.ok(typeof reason0 === "string");
  assert.match(reason0, /No specific rule found for 'unknown-target'\. Using defaults\./);
  },
);

test("RulesEngine.decide - supports do-not-touch", () => {
  const config: RuleConfig = {
    rules: [
      {
        id: "node_modules",
        risk: "do-not-touch",
        safeAfterDays: 9999,
        description: "Active project dependencies; never clean automatically.",
      },
    ],
    defaults: {
      risk: "caution",
      safeAfterDays: 30,
    },
  };

  const engine = new RulesEngine(config);

  const decision = engine.decide("node_modules");

  assert.equal(decision.risk, "do-not-touch");
  assert.equal(decision.safeAfterDays, 9999);
  assert.deepEqual(decision.reasons, ["Active project dependencies; never clean automatically."]);
});
