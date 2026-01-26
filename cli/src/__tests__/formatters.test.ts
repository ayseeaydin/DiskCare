import test from "node:test";
import assert from "node:assert/strict";

import { formatBytes } from "../formatters/formatBytes.js";
import { formatDate } from "../formatters/formatDate.js";
import { truncate } from "../formatters/truncate.js";
import { TRUNCATE_SUFFIX } from "../utils/constants.js";
import { TRUNCATE_SUFFIX_LENGTH } from "../utils/constants.js";

test("formatBytes - formats common sizes", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(-1), "0 B");
  assert.equal(formatBytes(Number.NaN), "0 B");

  assert.equal(formatBytes(1), "1 B");
  assert.equal(formatBytes(1023), "1023 B");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1024 * 1024), "1 MB");
});

test("formatDate - handles null/invalid and formats ISO-like UTC", () => {
  assert.equal(formatDate(null), "-");
  assert.equal(formatDate(undefined), "-");
  assert.equal(formatDate(Number.NaN), "-");

  const ms = Date.UTC(2026, 0, 21, 12, 34, 56);
  assert.equal(formatDate(ms), "2026-01-21 12:34:56.000 UTC");
});

test("truncate - returns original when within maxLen", () => {
  assert.equal(truncate("abc", 5), "abc");
  assert.equal(truncate("abc", 3), "abc");
});

test("truncate - truncates and adds suffix", () => {
  assert.equal(truncate("abcdef", 5), `abcd${TRUNCATE_SUFFIX}`);
});

test("truncate - when maxLen too small, returns suffix only", () => {
  assert.equal(truncate("abcdef", 0), TRUNCATE_SUFFIX);
  assert.equal(truncate("abcdef", 1), TRUNCATE_SUFFIX);
});

test("truncate - returns only suffix when maxLen equals suffix length", () => {
  assert.equal(truncate("abcdef", TRUNCATE_SUFFIX_LENGTH), TRUNCATE_SUFFIX);
});

test("truncate - property: for all maxLen <= suffix length, returns only suffix", () => {
  for (let n = 0; n <= TRUNCATE_SUFFIX_LENGTH; ++n) {
    assert.equal(truncate("abcdef", n), TRUNCATE_SUFFIX, `maxLen=${n}`);
  }
});
