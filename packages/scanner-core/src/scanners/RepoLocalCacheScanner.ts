/**
 * Repo-local build cache scanner
 *
 * v2 SCAN-ONLY: Discovers project-local build caches but NEVER deletes them.
 * Action: scan-only
 * Requires: --cwd flag (only scans inside specified project directory)
 *
 * Supported caches:
 * - .next/cache (Next.js)
 * - node_modules/.cache (common cache location)
 * - .turbo (Turborepo)
 * - node_modules/.vite (Vite)
 * - .parcel-cache (Parcel)
 */

import path from "node:path";
import { PathResolver } from "@diskcare/shared-utils";
import type { Scanner } from "./BaseScanner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";

/**
 * Known repo-local cache patterns.
 */
const REPO_LOCAL_CACHE_PATTERNS = [
  { path: ".next/cache", id: "nextjs-cache", displayName: "Next.js Build Cache" },
  { path: "node_modules/.cache", id: "node-modules-cache", displayName: "node_modules/.cache" },
  { path: ".turbo", id: "turbo-cache", displayName: "Turborepo Cache" },
  { path: "node_modules/.vite", id: "vite-cache", displayName: "Vite Cache" },
  { path: ".parcel-cache", id: "parcel-cache", displayName: "Parcel Cache" },
];

/**
 * Repo-local build cache scanner.
 *
 * IMPORTANT: This scanner REQUIRES --cwd to be set.
 * It will NOT scan globally or traverse directories.
 */
export class RepoLocalCacheScanner implements Scanner {
  constructor(
    private readonly deps?: {
      cwd?: string;
      platform?: NodeJS.Platform;
    },
  ) {}

  async scan(): Promise<DiscoveredTarget[]> {
    const { cwd, platform = process.platform } = this.deps ?? {};

    // CRITICAL: If no cwd is provided, return empty array.
    // v2 philosophy: repo-local scans are NEVER global.
    if (!cwd) {
      return [];
    }

    const resolver = new PathResolver(platform);
    const targets: DiscoveredTarget[] = [];

    for (const pattern of REPO_LOCAL_CACHE_PATTERNS) {
      const fullPath = resolver.resolve(cwd, pattern.path);

      targets.push({
        id: pattern.id,
        kind: "custom-path",
        path: fullPath,
        displayName: pattern.displayName,
        diagnostics: [
          "v2 scan-only: discovered but never auto-deleted",
          "repo-local: requires --cwd flag",
          `relative path: ${pattern.path}`,
        ],
      });
    }

    return targets;
  }
}

/**
 * Convenience factory for repo-local cache scanner with specific patterns.
 */
export function createRepoLocalCacheScanner(
  patterns?: Array<{ path: string; id: string; displayName: string }>,
  deps?: {
    cwd?: string;
    platform?: NodeJS.Platform;
  },
): Scanner {
  if (!patterns) {
    return new RepoLocalCacheScanner(deps);
  }

  // Custom implementation for specific patterns
  return {
    async scan(): Promise<DiscoveredTarget[]> {
      const { cwd, platform = process.platform } = deps ?? {};

      if (!cwd) return [];

      const resolver = new PathResolver(platform);
      const targets: DiscoveredTarget[] = [];

      for (const pattern of patterns) {
        const fullPath = resolver.resolve(cwd, pattern.path);

        targets.push({
          id: pattern.id,
          kind: "custom-path",
          path: fullPath,
          displayName: pattern.displayName,
          diagnostics: [
            "v2 scan-only: discovered but never auto-deleted",
            "repo-local: requires --cwd flag",
            `relative path: ${pattern.path}`,
          ],
        });
      }

      return targets;
    },
  };
}
