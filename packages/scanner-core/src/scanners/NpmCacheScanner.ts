import os from "node:os";
import path from "node:path";

import type { CommandRunner } from "../utils/CommandRunner.js";
import { NodeCommandRunner } from "../utils/CommandRunner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";
import { toErrorMessage } from "../utils/errorMessage.js";
import { BaseScanner } from "./BaseScanner.js";

export class NpmCacheScanner extends BaseScanner {
  constructor(private readonly runner: CommandRunner = new NodeCommandRunner()) {
    super();
  }

  async scan(): Promise<DiscoveredTarget[]> {
    const resolution = await this.resolveNpmCachePath();

    return [
      {
        id: "npm-cache",
        kind: "npm-cache",
        path: resolution.path,
        displayName: "npm Cache Directory",
        diagnostics: resolution.diagnostics.length > 0 ? resolution.diagnostics : undefined,
      },
    ];
  }

  private async resolveNpmCachePath(): Promise<{ path: string; diagnostics: string[] }> {
    const diagnostics: string[] = [];

    // 1) Source of truth: npm config get cache
    const fromNpm = await this.tryGetNpmConfigCache();
    if (fromNpm.value) return { path: fromNpm.value, diagnostics };
    diagnostics.push(...fromNpm.diagnostics);

    // 2) Windows common defaults
    if (process.platform === "win32") {
      const roaming = process.env.APPDATA;
      if (roaming) {
        diagnostics.push("npm cache path resolved via APPDATA fallback.");
        return { path: path.join(roaming, "npm-cache"), diagnostics };
      }

      const local = process.env.LOCALAPPDATA;
      if (local) {
        diagnostics.push("npm cache path resolved via LOCALAPPDATA fallback.");
        return { path: path.join(local, "npm-cache"), diagnostics };
      }
    }

    // 3) POSIX-ish fallback
    diagnostics.push("npm cache path resolved via homedir fallback.");
    return { path: path.join(os.homedir(), ".npm"), diagnostics };
  }

  private async tryGetNpmConfigCache(): Promise<{ value: string | null; diagnostics: string[] }> {
    try {
      const { stdout } = await this.runner.run("npm", ["config", "get", "cache"]);
      const raw = stdout.trim();

      // npm can return "undefined" or empty
      if (!raw || raw === "undefined" || raw === "null") {
        return { value: null, diagnostics: ["npm returned empty/undefined cache path; falling back."] };
      }

      const normalized = normalizePath(raw);
      if (!normalized) {
        return { value: null, diagnostics: ["npm returned an unparseable cache path; falling back."] };
      }

      return { value: normalized, diagnostics: [] };
    } catch (err) {
      return {
        value: null,
        diagnostics: [`npm config lookup failed (${toErrorMessage(err)}); falling back.`],
      };
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
