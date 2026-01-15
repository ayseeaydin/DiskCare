import os from "node:os";
import path from "node:path";

import { CommandRunner } from "../utils/CommandRunner.js";
import type { ScanTarget } from "../types/ScanTarget.js";
import { BaseScanner } from "./BaseScanner.js";

export class NpmCacheScanner extends BaseScanner {
  constructor(private readonly runner: CommandRunner = new CommandRunner()) {
    super();
  }

  async scan(): Promise<ScanTarget[]> {
    const npmCachePath = await this.resolveNpmCachePath();

    return [
      {
        id: "npm-cache",
        kind: "npm-cache",
        path: npmCachePath,
        displayName: "npm Cache Directory",
      },
    ];
  }

  private async resolveNpmCachePath(): Promise<string> {
    // 1) Source of truth: npm config get cache
    const fromNpm = await this.tryGetNpmConfigCache();
    if (fromNpm) return fromNpm;

    // 2) Windows common defaults
    if (process.platform === "win32") {
      const roaming = process.env.APPDATA;
      if (roaming) return path.join(roaming, "npm-cache");

      const local = process.env.LOCALAPPDATA;
      if (local) return path.join(local, "npm-cache");
    }

    // 3) POSIX-ish fallback
    return path.join(os.homedir(), ".npm");
  }

  private async tryGetNpmConfigCache(): Promise<string | null> {
    try {
      const { stdout } = await this.runner.run("npm", ["config", "get", "cache"]);
      const raw = stdout.trim();

      // npm can return "undefined" or empty
      if (!raw || raw === "undefined" || raw === "null") return null;

      const normalized = normalizePath(raw);
      if (!normalized) return null;

      return normalized;
    } catch {
      return null;
    }
  }
}

/**
 * Normalize cache path returned by npm:
 * - remove wrapping quotes
 * - expand "~" to home directory
 * - normalize path separators
 */
function normalizePath(value: string): string | null {
  const unquoted = value.replace(/^"(.*)"$/, "$1").trim();
  if (!unquoted) return null;

  if (unquoted === "~") return os.homedir();
  if (unquoted.startsWith("~/") || unquoted.startsWith("~\\")) {
    return path.join(os.homedir(), unquoted.slice(2));
  }

  // normalize separators and remove trailing separators
  return path.normalize(unquoted);
}
