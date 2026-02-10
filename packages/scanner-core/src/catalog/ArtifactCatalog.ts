/**
 * DiskCare v2 Artifact Catalog
 *
 * Data-first approach: All known cache/temp/artifact types with their metadata.
 * This catalog is the single source of truth for what DiskCare can discover.
 */

/**
 * Category grouping for inventory display and reporting.
 */
export type ArtifactCategory =
  | "os-temp"
  | "browsers"
  | "ides"
  | "language-caches"
  | "build-tools"
  | "repo-local"
  | "diagnostics"
  | "custom";

/**
 * Scope determines where the artifact lives and how it should be discovered.
 */
export type ArtifactScope =
  | "global" // System-wide or user-wide (e.g., %TEMP%, ~/.cache)
  | "repo-local"; // Inside project directories (e.g., .next/cache, node_modules/.cache)

/**
 * Risk level from rules-engine (inherited from v1).
 */
export type ArtifactRisk = "safe" | "caution" | "do-not-touch";

/**
 * Action policy for v2: what can be done with this artifact.
 */
export type ArtifactAction =
  | "scan-only" // v2 new artifacts: only discovered, never deleted
  | "cleanable"; // v1 artifacts: can be cleaned with --apply

/**
 * Preconditions that must be met before scanning or acting on an artifact.
 */
export type ArtifactPrecondition = {
  /**
   * Requires --cwd flag to be set (for repo-local artifacts).
   */
  requiresCwd?: boolean;

  /**
   * Requires admin/elevated permissions to access safely.
   */
  requiresAdmin?: boolean;
  
  /**
   * Alias for requiresAdmin (backwards compatibility).
   */
  requiresElevated?: boolean;

  /**
   * List of process names that should be stopped before cleanup.
   * Used for warning - doesn't block scanning.
   */
  requiresProcessStopped?: string[];

  /**
   * Only available on specific platforms.
   */
  platforms?: NodeJS.Platform[];

  /**
   * Custom validation function (for complex preconditions).
   */
  customCheck?: () => Promise<boolean>;
};

/**
 * Metadata for a single artifact type.
 */
export type ArtifactDefinition = {
  /**
   * Unique identifier (e.g., "chromium-cache", "vscode-gpu-cache").
   */
  id: string;

  /**
   * Category for grouping and inventory display.
   */
  category: ArtifactCategory;

  /**
   * Display name for CLI output.
   */
  displayName: string;

  /**
   * Human-readable description.
   */
  description: string;

  /**
   * Scope of the artifact (global or repo-local).
   */
  scope: ArtifactScope;

  /**
   * Risk level (inherited from rules-engine).
   */
  risk: ArtifactRisk;

  /**
   * Action policy: can it be cleaned or scan-only?
   */
  action: ArtifactAction;

  /**
   * Default safeAfterDays for rules-engine (if action=cleanable).
   */
  safeAfterDays?: number;

  /**
   * Preconditions for scanning/acting.
   */
  preconditions?: ArtifactPrecondition;

  /**
   * Path patterns or locations (used by scanners).
   * Can be absolute, relative (for repo-local), or pattern-based.
   */
  paths?: string[];

  /**
   * Optional: scanner class name or identifier for plugin registry.
   */
  scannerClass?: string;
};

/**
 * The Artifact Catalog itself: a collection of all known artifact definitions.
 */
export type ArtifactCatalog = {
  /**
   * Schema version for future migrations.
   */
  version: string;

  /**
   * All artifact definitions.
   */
  artifacts: ArtifactDefinition[];
};

/**
 * v2 default catalog with all known artifacts.
 */
export const DEFAULT_ARTIFACT_CATALOG: ArtifactCatalog = {
  version: "2.0.0",
  artifacts: [
    // ============================================================
    // V1 ARTIFACTS (cleanable, existing behavior preserved)
    // ============================================================
    {
      id: "os-temp",
      category: "os-temp",
      displayName: "OS Temp Directory",
      description: "Windows %TEMP% or POSIX /tmp - system temporary files",
      scope: "global",
      risk: "caution",
      action: "cleanable",
      safeAfterDays: 7,
      scannerClass: "OsTempScanner",
    },
    {
      id: "npm-cache",
      category: "language-caches",
      displayName: "npm Cache Directory",
      description: "Node.js npm cache (~/.npm or %APPDATA%/npm-cache)",
      scope: "global",
      risk: "safe",
      action: "cleanable",
      safeAfterDays: 14,
      scannerClass: "NpmCacheScanner",
    },

    // ============================================================
    // V2 NEW ARTIFACTS (scan-only, never cleaned automatically)
    // ============================================================

    // --- BROWSERS ---
    {
      id: "chromium-cache",
      category: "browsers",
      displayName: "Chromium Cache (Chrome/Edge/Brave)",
      description: "Browser disk cache for Chromium-based browsers",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "ChromiumCacheScanner",
      preconditions: {
        platforms: ["win32", "darwin", "linux"],
      },
    },
    {
      id: "chromium-code-cache",
      category: "browsers",
      displayName: "Chromium Code Cache",
      description: "JavaScript V8 bytecode cache for faster page loads",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "ChromiumCodeCacheScanner",
    },
    {
      id: "chromium-gpu-cache",
      category: "browsers",
      displayName: "Chromium GPU Cache",
      description: "GPU shader cache for hardware acceleration",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "ChromiumGPUCacheScanner",
    },
    {
      id: "firefox-cache",
      category: "browsers",
      displayName: "Firefox Cache2",
      description: "Firefox disk cache storage",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "FirefoxCacheScanner",
    },

    // --- IDEs ---
    {
      id: "vscode-cache",
      category: "ides",
      displayName: "VS Code Cache",
      description: "VS Code runtime cache directory",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "VSCodeCacheScanner",
    },
    {
      id: "vscode-cached-data",
      category: "ides",
      displayName: "VS Code CachedData",
      description: "VS Code V8 bytecode cache",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "VSCodeCachedDataScanner",
    },
    {
      id: "vscode-gpu-cache",
      category: "ides",
      displayName: "VS Code GPU Cache",
      description: "VS Code GPU shader cache",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "VSCodeGPUCacheScanner",
    },
    {
      id: "jetbrains-caches",
      category: "ides",
      displayName: "JetBrains IDE Caches",
      description: "IntelliJ IDEA, PyCharm, WebStorm system caches",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "JetBrainsCacheScanner",
    },

    // --- LANGUAGE CACHES ---
    {
      id: "pip-cache",
      category: "language-caches",
      displayName: "Python pip Cache",
      description: "Python package manager cache",
      scope: "global",
      risk: "caution",
      action: "scan-only",
      scannerClass: "PipCacheScanner",
    },

    // --- REPO-LOCAL BUILD CACHES (require --cwd) ---
    {
      id: "nextjs-cache",
      category: "repo-local",
      displayName: "Next.js Build Cache",
      description: ".next/cache directory for Next.js builds",
      scope: "repo-local",
      risk: "safe",
      action: "scan-only",
      paths: [".next/cache"],
      preconditions: {
        requiresCwd: true,
      },
      scannerClass: "RepoLocalCacheScanner",
    },
    {
      id: "node-modules-cache",
      category: "repo-local",
      displayName: "node_modules/.cache",
      description: "Common cache location inside node_modules",
      scope: "repo-local",
      risk: "safe",
      action: "scan-only",
      paths: ["node_modules/.cache"],
      preconditions: {
        requiresCwd: true,
      },
      scannerClass: "RepoLocalCacheScanner",
    },
    {
      id: "turbo-cache",
      category: "repo-local",
      displayName: "Turborepo Cache",
      description: ".turbo directory for Turborepo builds",
      scope: "repo-local",
      risk: "safe",
      action: "scan-only",
      paths: [".turbo"],
      preconditions: {
        requiresCwd: true,
      },
      scannerClass: "RepoLocalCacheScanner",
    },
    {
      id: "vite-cache",
      category: "repo-local",
      displayName: "Vite Cache",
      description: "node_modules/.vite directory for Vite builds",
      scope: "repo-local",
      risk: "safe",
      action: "scan-only",
      paths: ["node_modules/.vite"],
      preconditions: {
        requiresCwd: true,
      },
      scannerClass: "RepoLocalCacheScanner",
    },
    {
      id: "parcel-cache",
      category: "repo-local",
      displayName: "Parcel Cache",
      description: ".parcel-cache directory for Parcel builds",
      scope: "repo-local",
      risk: "safe",
      action: "scan-only",
      paths: [".parcel-cache"],
      preconditions: {
        requiresCwd: true,
      },
      scannerClass: "RepoLocalCacheScanner",
    },
  ],
};

/**
 * Helper function to get artifact definition by id.
 */
export function getArtifactById(id: string): ArtifactDefinition | undefined {
  return DEFAULT_ARTIFACT_CATALOG.artifacts.find((a) => a.id === id);
}

/**
 * Helper function to get all artifacts by category.
 */
export function getArtifactsByCategory(category: ArtifactCategory): ArtifactDefinition[] {
  return DEFAULT_ARTIFACT_CATALOG.artifacts.filter((a) => a.category === category);
}

/**
 * Helper function to get all cleanable (v1) artifacts.
 */
export function getCleanableArtifacts(): ArtifactDefinition[] {
  return DEFAULT_ARTIFACT_CATALOG.artifacts.filter((a) => a.action === "cleanable");
}

/**
 * Helper function to get all scan-only (v2) artifacts.
 */
export function getScanOnlyArtifacts(): ArtifactDefinition[] {
  return DEFAULT_ARTIFACT_CATALOG.artifacts.filter((a) => a.action === "scan-only");
}

/**
 * Helper function to check if preconditions are met.
 */
export async function checkPreconditions(
  artifact: ArtifactDefinition,
  context: { cwd?: string; platform: NodeJS.Platform; isAdmin?: boolean },
): Promise<{ met: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  if (!artifact.preconditions) {
    return { met: true, reasons };
  }

  const { requiresCwd, requiresAdmin, platforms, customCheck } = artifact.preconditions;

  // Check CWD requirement
  if (requiresCwd && !context.cwd) {
    reasons.push("Requires --cwd flag to scan repo-local artifacts");
    return { met: false, reasons };
  }

  // Check platform compatibility
  if (platforms && !platforms.includes(context.platform)) {
    reasons.push(`Not available on platform: ${context.platform}`);
    return { met: false, reasons };
  }

  // Check admin requirement
  if (requiresAdmin && !context.isAdmin) {
    reasons.push("Requires elevated/admin permissions");
    return { met: false, reasons };
  }

  // Custom check
  if (customCheck) {
    const passed = await customCheck();
    if (!passed) {
      reasons.push("Custom precondition check failed");
      return { met: false, reasons };
    }
  }

  return { met: true, reasons };
}
