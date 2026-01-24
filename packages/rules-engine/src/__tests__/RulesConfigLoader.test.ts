import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { RulesConfigLoader } from "../RulesConfigLoader.js";
import type { RuleConfig } from "../types/RuleConfig.js";

test("RulesConfigLoader.loadFromFile - should load valid JSON and return RuleConfig", async () => {
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

test("RulesConfigLoader.loadFromFile - should throw on invalid JSON", async () => {
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

test("RulesConfigLoader.loadFromFile - should reject unknown risk levels", async () => {
  const rulesPath = path.join(path.sep, "virtual", "rules.json");

  const invalid = {
    rules: [
      {
        id: "npm-cache",
        risk: "foo",
        safeAfterDays: 14,
        description: "bad risk",
      },
    ],
    defaults: {
      risk: "caution",
      safeAfterDays: 30,
    },
  };

  const filesByPath = new Map<string, string>([[rulesPath, JSON.stringify(invalid)]]);
  const loader = new RulesConfigLoader({
    readFile: async (p, enc) => {
      assert.equal(enc, "utf8");
      const content = filesByPath.get(p);
      if (content === undefined) throw new Error("ENOENT");
      return content;
    },
  });

  await assert.rejects(async () => loader.loadFromFile(rulesPath));
});

test("RulesConfigLoader.loadFromFile - should reject invalid rule id format", async () => {
  const rulesPath = path.join(path.sep, "virtual", "rules.json");

  const invalid = {
    rules: [
      {
        id: "NPM_CACHE",
        risk: "safe",
        safeAfterDays: 14,
        description: "bad id",
      },
    ],
    defaults: {
      risk: "caution",
      safeAfterDays: 30,
    },
  };

  const filesByPath = new Map<string, string>([[rulesPath, JSON.stringify(invalid)]]);
  const loader = new RulesConfigLoader({
    readFile: async (p, enc) => {
      assert.equal(enc, "utf8");
      const content = filesByPath.get(p);
      if (content === undefined) throw new Error("ENOENT");
      return content;
    },
  });

  await assert.rejects(async () => loader.loadFromFile(rulesPath));
});

test("RulesConfigLoader.loadFromFile - should reject safeAfterDays out of range or non-integer", async () => {
  const rulesPath = path.join(path.sep, "virtual", "rules.json");

  const invalid = {
    rules: [
      {
        id: "npm-cache",
        risk: "safe",
        safeAfterDays: -1,
        description: "negative",
      },
      {
        id: "os-temp",
        risk: "caution",
        safeAfterDays: 1.5,
        description: "float",
      },
      {
        id: "sandbox-cache",
        risk: "safe",
        safeAfterDays: 10000,
        description: "too large",
      },
    ],
    defaults: {
      risk: "caution",
      safeAfterDays: 30,
    },
  };

  const filesByPath = new Map<string, string>([[rulesPath, JSON.stringify(invalid)]]);
  const loader = new RulesConfigLoader({
    readFile: async (p, enc) => {
      assert.equal(enc, "utf8");
      const content = filesByPath.get(p);
      if (content === undefined) throw new Error("ENOENT");
      return content;
    },
  });

  await assert.rejects(async () => loader.loadFromFile(rulesPath));
});
