# @diskcare/rules-engine

Rule engine for DiskCare. It decides risk and eligibility based on rule config.

## What it provides

- `RulesEngine` to evaluate rules by target id
- `RulesConfigLoader` to load and validate rule files
- Types for rule configs and decisions

## Usage

```ts
import { RulesEngine } from "@diskcare/rules-engine";

const engine = new RulesEngine({
  rules: [
    { id: "npm-cache", risk: "safe", safeAfterDays: 14, description: "npm cache is reproducible" },
  ],
  defaults: { risk: "caution", safeAfterDays: 30 },
});

const decision = engine.decide("npm-cache");
```

## Notes

- Validation errors throw `RulesConfigError` with filePath and cause.
- When no rule matches, defaults are used.
- Rules may include optional `paths` for custom target discovery (handled by the CLI).

## Standalone usage

You can embed the rules engine in another tool by providing a `RuleConfig` object and
calling `decide(targetId)` for each target you discover.
