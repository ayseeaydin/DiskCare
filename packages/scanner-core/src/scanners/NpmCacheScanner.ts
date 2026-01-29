import os from "node:os";
import { PathResolver } from "@diskcare/shared-utils";

import type { CommandRunner } from "../utils/CommandRunner.js";
import { NodeCommandRunner } from "../utils/CommandRunner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";
import { toErrorMessageOneLine } from "../utils/errorMessage.js";
import { isNonEmptyString } from "../utils/typeGuards.js";
import { err, ok, type Result, fromPromise } from "../utils/result.js";
import type { Scanner } from "./BaseScanner.js";

export class NpmCacheScanner implements Scanner {
  private readonly runner: CommandRunner;
  private readonly platform: NodeJS.Platform;
  private readonly env: NodeJS.ProcessEnv;
  private readonly homedir: string;
  private readonly resolver: PathResolver;

  constructor(deps?: {
    runner?: CommandRunner;
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    homedir?: string;
  }) {
    this.runner = deps?.runner ?? new NodeCommandRunner();
    this.platform = deps?.platform ?? process.platform;
    this.env = deps?.env ?? process.env;
    this.homedir = deps?.homedir ?? os.homedir();
    this.resolver = new PathResolver(this.platform);
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
    if (fromNpm.ok) return { path: fromNpm.value, diagnostics };
    diagnostics.push(
      `npm config lookup failed (${toErrorMessageOneLine(fromNpm.error)}); falling back.`,
    );

    // 2) Windows common defaults
    if (this.platform === "win32") {
      const roaming = this.env.APPDATA;
      if (roaming) {
        diagnostics.push("npm cache path resolved via APPDATA fallback.");
        return { path: this.resolver.join(roaming, "npm-cache"), diagnostics };
      }

      const local = this.env.LOCALAPPDATA;
      if (local) {
        diagnostics.push("npm cache path resolved via LOCALAPPDATA fallback.");
        return { path: this.resolver.join(local, "npm-cache"), diagnostics };
      }
    }

    // 3) POSIX-ish fallback
    diagnostics.push("npm cache path resolved via homedir fallback.");
    return { path: this.resolver.join(this.homedir, ".npm"), diagnostics };
  }

  private async tryGetNpmConfigCache(): Promise<Result<string, unknown>> {
    const runResult = await fromPromise(this.runner.run("npm", ["config", "get", "cache"]));
    if (!runResult.ok) return err(runResult.error);

    const raw = runResult.value.stdout.trim();

    // npm can return "undefined" or empty
    if (!isNonEmptyString(raw) || raw === "undefined" || raw === "null") {
      return err(new Error("npm returned empty/undefined cache path"));
    }

    const normalized = normalizeNpmCachePath(raw, {
      platform: this.platform,
      homedir: this.homedir,
    });
    if (!normalized) {
      return err(new Error("npm returned an unparseable cache path"));
    }

    return ok(normalized);
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
  const resolver = new PathResolver(platform);

  if (unquoted === "~") return homedir;
  if (unquoted.startsWith("~/") || unquoted.startsWith("~\\")) {
    const rest = unquoted.slice(2);
    return stripTrailingSeparators(resolver.normalize(resolver.join(homedir, rest)), resolver);
  }

  return stripTrailingSeparators(resolver.normalize(unquoted), resolver);
}

function stripTrailingSeparators(normalized: string, resolver: PathResolver): string {
  const root = resolver.parse(normalized).root;
  let end = normalized.length;

  while (end > root.length) {
    const ch = normalized[end - 1];
    if (ch !== "/" && ch !== "\\") break;
    end -= 1;
  }

  return end === normalized.length ? normalized : normalized.slice(0, end);
}
