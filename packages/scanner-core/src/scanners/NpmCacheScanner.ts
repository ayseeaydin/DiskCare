import os from "node:os";
import path from "node:path";

import type { CommandRunner } from "../utils/CommandRunner.js";
import { NodeCommandRunner } from "../utils/CommandRunner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";
import { toErrorMessageOneLine } from "../utils/errorMessage.js";
import { isNonEmptyString } from "../utils/typeGuards.js";
import { err, ok, type Result } from "../utils/result.js";
import type { Scanner } from "./BaseScanner.js";

export class NpmCacheScanner implements Scanner {
  constructor(private readonly runner: CommandRunner = new NodeCommandRunner()) {}

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
    if (fromNpm.ok) return { path: fromNpm.value, diagnostics };
    diagnostics.push(
      `npm config lookup failed (${toErrorMessageOneLine(fromNpm.error)}); falling back.`,
    );

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

  private async tryGetNpmConfigCache(): Promise<Result<string, unknown>> {
    try {
      const { stdout } = await this.runner.run("npm", ["config", "get", "cache"]);
      const raw = stdout.trim();

      // npm can return "undefined" or empty
      if (!isNonEmptyString(raw) || raw === "undefined" || raw === "null") {
        return err(new Error("npm returned empty/undefined cache path"));
      }

      const normalized = normalizeNpmCachePath(raw);
      if (!normalized) {
        return err(new Error("npm returned an unparseable cache path"));
      }

      return ok(normalized);
    } catch (cause) {
      return err(cause);
    }
  }
}

/**
 * Normalize cache path returned by npm:
 * - remove wrapping quotes
 * - expand "~" to home directory
 * - normalize path separators
 */
export function normalizeNpmCachePath(
  value: string,
  deps?: { platform?: NodeJS.Platform; homedir?: string },
): string | null {
  const unquoted = value.replace(/^"(.*)"$/, "$1").trim();
  if (!unquoted) return null;

  const homedir = deps?.homedir ?? os.homedir();
  const platform = deps?.platform ?? process.platform;
  const p = platform === "win32" ? path.win32 : path.posix;

  if (unquoted === "~") return homedir;
  if (unquoted.startsWith("~/") || unquoted.startsWith("~\\")) {
    const rest = unquoted.slice(2);
    return stripTrailingSeparators(p.normalize(p.join(homedir, rest)), p);
  }

  return stripTrailingSeparators(p.normalize(unquoted), p);
}

function stripTrailingSeparators(normalized: string, p: typeof path.posix | typeof path.win32): string {
  const root = p.parse(normalized).root;
  let result = normalized;

  while (result.length > root.length && (result.endsWith(p.sep) || result.endsWith("/") || result.endsWith("\\"))) {
    result = result.slice(0, -1);
  }

  return result;
}
