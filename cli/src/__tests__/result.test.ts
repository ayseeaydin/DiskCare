import test from "node:test";
import assert from "node:assert/strict";

import {
  err,
  fromPromise,
  isErr,
  isOk,
  map,
  mapErr,
  ok,
  unwrapOr,
  type Result,
} from "../utils/result.js";

test("Result - ok/err discriminant", () => {
  const a = ok(123);
  const b = err("nope");

  assert.equal(isOk(a), true);
  assert.equal(isErr(a), false);

  assert.equal(isOk(b), false);
  assert.equal(isErr(b), true);
});

test("Result - map maps ok and leaves err", () => {
  const a = map(ok(2), (n) => n * 10);
  assert.deepEqual(a, ok(20));

  const b: Result<number, string> = err("bad");
  assert.deepEqual(
    map(b, (n: number) => n * 10),
    b,
  );
});

test("Result - mapErr maps err and leaves ok", () => {
  const a = mapErr(err("bad"), (e) => `wrapped:${e}`);
  assert.deepEqual(a, err("wrapped:bad"));

  const b: Result<number, string> = ok(1);
  assert.deepEqual(
    mapErr(b, (e) => `wrapped:${e}`),
    b,
  );
});

test("Result - unwrapOr returns ok value or fallback", () => {
  assert.equal(unwrapOr(ok(5), 0), 5);
  assert.equal(unwrapOr(err("x"), 0), 0);
});

test("Result - fromPromise wraps resolve/reject", async () => {
  const a = await fromPromise(Promise.resolve(1));
  assert.deepEqual(a, ok(1));

  const b = await fromPromise(Promise.reject(new Error("boom")));
  assert.equal(isErr(b), true);
});
