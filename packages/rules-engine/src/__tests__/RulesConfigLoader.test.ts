import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { RulesConfigLoader } from "../RulesConfigLoader.js";
import type { RuleConfig } from "../types/RuleConfig.js";

test("RulesConfigLoader.loadFromFile - loads valid JSON and returns RuleConfig", async () => {
  const rulesPath = path.join(path.sep, "virtual", "rules.json");

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

  const filesByPath = new Map<string, string>([[rulesPath, JSON.stringify(expected, null, 2)]]);

  const fakeFs = {
    readFile: async (filePath: string, encoding: "utf8") => {
      assert.equal(encoding, "utf8");
      const content = filesByPath.get(filePath);
      if (content === undefined) throw new Error(`ENOENT: no such file ${filePath}`);
      return content;
    },
  };

  const loader = new RulesConfigLoader(fakeFs);
  const config = await loader.loadFromFile(rulesPath);

  assert.deepEqual(config, expected);

});

test("RulesConfigLoader.loadFromFile - throws on invalid JSON", async () => {
  const rulesPath = path.join(path.sep, "virtual", "rules.json");
  const filesByPath = new Map<string, string>([[rulesPath, "{ invalid json"]]);

  const fakeFs = {
    readFile: async (filePath: string, encoding: "utf8") => {
      assert.equal(encoding, "utf8");
      const content = filesByPath.get(filePath);
      if (content === undefined) throw new Error(`ENOENT: no such file ${filePath}`);
      return content;
    },
  };

  const loader = new RulesConfigLoader(fakeFs);

  await assert.rejects(async () => loader.loadFromFile(rulesPath));
});
