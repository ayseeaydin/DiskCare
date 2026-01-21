import test from "node:test";
import assert from "node:assert/strict";

import { installSignalHandlers } from "../utils/signals.js";

class FakeOutput {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
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

class FakeProcess {
  exitCode: number | undefined;
  private readonly listeners = new Map<"SIGINT" | "SIGTERM", Array<() => void>>();
  readonly exitCalls: number[] = [];

  on(event: "SIGINT" | "SIGTERM", listener: () => void): void {
    const arr = this.listeners.get(event) ?? [];
    arr.push(listener);
    this.listeners.set(event, arr);
  }

  emit(event: "SIGINT" | "SIGTERM"): void {
    for (const l of this.listeners.get(event) ?? []) l();
  }

  exit(code?: number): never {
    this.exitCalls.push(code ?? 0);
    throw new Error(`EXIT:${code ?? 0}`);
  }
}

test("installSignalHandlers - SIGINT sets exitCode=130 and calls exit", () => {
  const output = new FakeOutput();
  const proc = new FakeProcess();

  installSignalHandlers({ output, proc });

  assert.throws(() => proc.emit("SIGINT"), /EXIT:130/);
  assert.equal(proc.exitCode, 130);
  assert.ok(output.warns.some((l) => l.includes("SIGINT")));
});

test("installSignalHandlers - SIGTERM sets exitCode=143 and calls exit", () => {
  const output = new FakeOutput();
  const proc = new FakeProcess();

  installSignalHandlers({ output, proc });

  assert.throws(() => proc.emit("SIGTERM"), /EXIT:143/);
  assert.equal(proc.exitCode, 143);
  assert.ok(output.warns.some((l) => l.includes("SIGTERM")));
});
