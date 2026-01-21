import test from "node:test";
import assert from "node:assert/strict";

import { normalizeNpmCachePath } from "../scanners/NpmCacheScanner.js";

test("normalizeNpmCachePath - trims quotes and trailing separators (win32)", () => {
  const out = normalizeNpmCachePath('"C:\\tmp\\npm-cache\\"', {
    platform: "win32",
    homedir: "C:\\Users\\alice",
  });

  assert.equal(out, "C:\\tmp\\npm-cache");
});

test("normalizeNpmCachePath - handles UNC paths (win32)", () => {
  const out = normalizeNpmCachePath("\\\\server\\share\\npm-cache\\", {
    platform: "win32",
    homedir: "C:\\Users\\alice",
  });

  assert.equal(out, "\\\\server\\share\\npm-cache");
});

test("normalizeNpmCachePath - expands tilde (posix)", () => {
  const out = normalizeNpmCachePath("~/cache/", {
    platform: "linux",
    homedir: "/home/alice",
  });

  assert.equal(out, "/home/alice/cache");
});

test("normalizeNpmCachePath - expands tilde (win32)", () => {
  const out = normalizeNpmCachePath("~\\AppData\\npm-cache\\", {
    platform: "win32",
    homedir: "C:\\Users\\alice",
  });

  assert.equal(out, "C:\\Users\\alice\\AppData\\npm-cache");
});

test("normalizeNpmCachePath - does not expand ~other", () => {
  const out = normalizeNpmCachePath("~other/cache", {
    platform: "linux",
    homedir: "/home/alice",
  });

  assert.equal(out, "~other/cache");
});

test("normalizeNpmCachePath - returns null for empty/whitespace", () => {
  assert.equal(normalizeNpmCachePath(""), null);
  assert.equal(normalizeNpmCachePath("   "), null);
});
