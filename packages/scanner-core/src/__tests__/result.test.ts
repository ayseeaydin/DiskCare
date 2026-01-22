import test from "node:test";
import assert from "node:assert/strict";

import { fromPromise } from "../utils/result.js";

test("Result.fromPromise - wraps resolve/reject", async () => {
  const okRes = await fromPromise(Promise.resolve(123));
  assert.equal(okRes.ok, true);
  if (okRes.ok) assert.equal(okRes.value, 123);

  const err = new Error("boom");
  const errRes = await fromPromise(Promise.reject(err));
  assert.equal(errRes.ok, false);
  if (!errRes.ok) assert.equal(errRes.error, err);
});
