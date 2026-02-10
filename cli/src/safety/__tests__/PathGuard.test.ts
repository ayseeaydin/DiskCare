import test from "node:test";
import assert from "node:assert/strict";
import { isForbiddenPath, getMatchedForbiddenPrefix, validatePaths } from "../PathGuard.js";

test("PathGuard - isForbiddenPath - Windows system directories are forbidden", () => {
  assert.ok(isForbiddenPath("C:\\Windows", "win32"));
  assert.ok(isForbiddenPath("C:\\Windows\\System32", "win32"));
  assert.ok(isForbiddenPath("C:\\Program Files\\MyApp", "win32"));
  assert.ok(isForbiddenPath("C:\\Program Files (x86)\\Tool", "win32"));
  assert.ok(isForbiddenPath("C:\\ProgramData\\Microsoft\\Windows", "win32"));
});

test("PathGuard - isForbiddenPath - Windows user directories are safe", () => {
  assert.ok(!isForbiddenPath("C:\\Users\\user\\AppData\\Local\\Temp", "win32"));
  assert.ok(!isForbiddenPath("C:\\Users\\user\\AppData\\Roaming\\npm-cache", "win32"));
  assert.ok(!isForbiddenPath("C:\\temp", "win32"));
});

test("PathGuard - isForbiddenPath - Unix system directories are forbidden", () => {
  assert.ok(isForbiddenPath("/bin", "linux"));
  assert.ok(isForbiddenPath("/sbin/init", "linux"));
  assert.ok(isForbiddenPath("/etc/passwd", "linux"));
  assert.ok(isForbiddenPath("/usr/bin/node", "linux"));
  assert.ok(isForbiddenPath("/System/Library", "darwin"));
  assert.ok(isForbiddenPath("/Library/LaunchDaemons", "darwin"));
});

test("PathGuard - isForbiddenPath - Unix user directories are safe", () => {
  assert.ok(!isForbiddenPath("/home/user/.cache", "linux"));
  assert.ok(!isForbiddenPath("/tmp/my-cache", "linux"));
  assert.ok(!isForbiddenPath("/home/user/.npm", "linux"));
  assert.ok(!isForbiddenPath("/Users/user/Library/Caches", "darwin"));
});

test("PathGuard - isForbiddenPath - case insensitive (Windows)", () => {
  assert.ok(isForbiddenPath("c:\\windows\\system32", "win32"));
  assert.ok(isForbiddenPath("C:\\WINDOWS\\TEMP", "win32"));
  assert.ok(isForbiddenPath("c:\\program files\\app", "win32"));
});

test("PathGuard - getMatchedForbiddenPrefix - returns matched prefix", () => {
  const matched = getMatchedForbiddenPrefix("C:\\Windows\\System32\\config", "win32");
  assert.equal(matched, "C:\\Windows");
});

test("PathGuard - getMatchedForbiddenPrefix - returns null for safe paths", () => {
  const matched = getMatchedForbiddenPrefix("C:\\Users\\user\\temp", "win32");
  assert.equal(matched, null);
});

test("PathGuard - validatePaths - separates safe and rejected paths", () => {
  const paths = [
    "C:\\Users\\user\\AppData\\Local\\Temp",
    "C:\\Windows\\Temp",
    "C:\\Users\\user\\cache",
    "C:\\Program Files\\MyApp",
  ];

  const result = validatePaths(paths, "win32");

  assert.equal(result.safe.length, 2);
  assert.ok(result.safe.includes("C:\\Users\\user\\AppData\\Local\\Temp"));
  assert.ok(result.safe.includes("C:\\Users\\user\\cache"));

  assert.equal(result.rejected.length, 2);
  assert.equal(result.rejected[0]!.path, "C:\\Windows\\Temp");
  assert.ok(result.rejected[0]!.reason.includes("C:\\Windows"));
  assert.equal(result.rejected[1]!.path, "C:\\Program Files\\MyApp");
  assert.ok(result.rejected[1]!.reason.includes("C:\\Program Files"));
});

test("PathGuard - validatePaths - handles empty array", () => {
  const result = validatePaths([], "win32");
  assert.equal(result.safe.length, 0);
  assert.equal(result.rejected.length, 0);
});

test("PathGuard - edge case: $Recycle.Bin is forbidden (Windows)", () => {
  assert.ok(isForbiddenPath("C:\\$Recycle.Bin\\S-1-5-21", "win32"));
});

test("PathGuard - edge case: /proc and /sys are forbidden (Linux)", () => {
  assert.ok(isForbiddenPath("/proc/cpuinfo", "linux"));
  assert.ok(isForbiddenPath("/sys/class/net", "linux"));
});
