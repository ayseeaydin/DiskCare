import test from "node:test";
import assert from "node:assert/strict";

import { RulesConfigError } from "@diskcare/rules-engine";

import { RulesProvider } from "../rules/RulesProvider.js";

class FakeOutput {
  readonly progresses: string[] = [];
  progress(message: string): void {
    this.progresses.push(message);
  }
  readonly warns: string[] = [];
  readonly infos: string[] = [];
  readonly errors: string[] = [];

  info(message: string): void {
    this.infos.push(message);
  }
  warn(message: string): void {
    this.warns.push(message);
  }
  error(message: string): void {
    this.errors.push(message);
  }
}

test("RulesProvider.tryLoad - warns and returns null when rules config fails", async () => {
  const output = new FakeOutput();
  const rulesPath = "/virtual/rules.json";

  const provider = new RulesProvider(rulesPath, {
    loadFromFile: async (filePath: string) => {
      throw new RulesConfigError("Invalid JSON in rules config", filePath, new SyntaxError("bad"));
    },
  });

  const engine = await provider.tryLoad({
    output,
    cwd: "/virtual",
    platform: "linux",
    env: {},
    homedir: "/home/test",
    pid: 123,
    nowFn: () => new Date("2026-01-21T00:00:00.000Z"),
    configPath: rulesPath,
    setExitCode: () => {},
  });

  assert.equal(engine, null);
  assert.equal(output.warns.length, 1);
  assert.match(output.warns[0] ?? "", /rules: config not loaded; using safe defaults/);
  assert.match(output.warns[0] ?? "", /\/virtual\/rules\.json/);
});
