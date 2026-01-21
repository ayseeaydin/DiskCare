import test from "node:test";
import assert from "node:assert/strict";

import type { Output } from "../output/Output.js";
import type { CommandContext } from "../types/CommandContext.js";
import { handleCommandError } from "../utils/commandErrors.js";
import { DiskcareError } from "../errors/DiskcareError.js";

class FakeOutput implements Output {
  infos: string[] = [];
  warns: string[] = [];
  errors: string[] = [];

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

test("handleCommandError - prints code + hint and sets exitCode", () => {
  let exitCode: number | undefined;

  const output = new FakeOutput();
  const context: CommandContext = {
    output,
    verbose: false,
    cwd: "/virtual",
    pid: 123,
    configPath: "config/rules.json",
    setExitCode: (code) => {
      exitCode = code;
    },
  };

  handleCommandError(
    context,
    new DiskcareError("rules: config not loaded", "CONFIG_LOAD_ERROR", { rulesPath: "x" }),
  );

  assert.equal(exitCode, 1);
  assert.ok(output.errors.some((l) => l.startsWith("error:")));
  assert.ok(output.errors.some((l) => l === "code: CONFIG_LOAD_ERROR"));
  assert.ok(output.warns.some((l) => l.includes("Check config/rules.json")));
});
