import test from "node:test";
import assert from "node:assert/strict";

import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { RulesConfigLoader } from "../RulesConfigLoader.js";
import type { RuleConfig } from "../types/RuleConfig.js";

test("RulesConfigLoader.loadFromFile - loads valid JSON and returns RuleConfig", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "diskcare-rules-"));
  const rulesPath = path.join(tmpDir, "rules.json");

  const expected: RuleConfig = {
    rules: [
      {
        id: "os-temp",
        risk: "caution",
        safeAfterDays: 7,
        description: "OS temp can contain installers or in-use files; only clean old items.",
      },
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

  await fs.writeFile(rulesPath, JSON.stringify(expected, null, 2), "utf8");

  const loader = new RulesConfigLoader();
  const config = await loader.loadFromFile(rulesPath);

  assert.deepEqual(config, expected);

  // cleanup
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("RulesConfigLoader.loadFromFile - throws on invalid JSON", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "diskcare-rules-"));
  const rulesPath = path.join(tmpDir, "rules.json");

  await fs.writeFile(rulesPath, "{ invalid json", "utf8");

  const loader = new RulesConfigLoader();

  await assert.rejects(async () => loader.loadFromFile(rulesPath));

  // cleanup
  await fs.rm(tmpDir, { recursive: true, force: true });
});
