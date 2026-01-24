import test from "node:test";
import assert from "node:assert/strict";

import {
  getDefaultConfigPath,
  getLocalProjectConfigPath,
  getUserConfigPath,
} from "../utils/configPaths.js";

function toPosix(p: string): string {
  return p.replaceAll("\\", "/");
}

test("getDefaultConfigPath - prefers local project config when it exists", () => {
  const cwd = "C:/repo";
  const local = getLocalProjectConfigPath(cwd);

  const chosen = getDefaultConfigPath({
    cwd,
    platform: "win32",
    env: {} as NodeJS.ProcessEnv,
    homedir: "C:/Users/alice",
    pathExists: (p) => p === local,
  });

  assert.equal(chosen, local);
});

test("getUserConfigPath - windows prefers APPDATA", () => {
  const p = getUserConfigPath({
    platform: "win32",
    env: { APPDATA: "C:/Users/alice/AppData/Roaming" } as NodeJS.ProcessEnv,
    homedir: "C:/Users/alice",
  });

  const posix = toPosix(p);
  assert.ok(posix.endsWith("/DiskCare/rules.json"));
  assert.ok(posix.includes("AppData"));
});

test("getUserConfigPath - linux uses XDG_CONFIG_HOME when present", () => {
  const p = getUserConfigPath({
    platform: "linux",
    env: { XDG_CONFIG_HOME: "/home/alice/.xdg" } as NodeJS.ProcessEnv,
    homedir: "/home/alice",
  });

  assert.equal(p, "/home/alice/.xdg/diskcare/rules.json");
});

test("getDefaultConfigPath - falls back to user config when local missing", () => {
  const cwd = "C:/repo";
  getLocalProjectConfigPath(cwd);

  const chosen = getDefaultConfigPath({
    cwd,
    platform: "win32",
    env: { APPDATA: "C:/Users/alice/AppData/Roaming" } as NodeJS.ProcessEnv,
    homedir: "C:/Users/alice",
    pathExists: () => false,
  });

  assert.ok(toPosix(chosen).endsWith("/DiskCare/rules.json"));
});
