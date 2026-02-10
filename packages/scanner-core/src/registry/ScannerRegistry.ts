/**
 * DiskCare v2 Scanner Registry
 *
 * Plugin-based scanner management system.
 * Allows dynamic registration and discovery of scanners.
 */

import type { Scanner } from "../scanners/BaseScanner.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";
import type { ArtifactDefinition } from "../catalog/ArtifactCatalog.js";

/**
 * Scanner factory function signature.
 * Takes dependencies and returns a Scanner instance.
 */
export type ScannerFactory = (deps?: ScannerDeps) => Scanner;

/**
 * Dependencies that can be injected into scanners.
 */
export type ScannerDeps = {
  /**
   * Current working directory (for repo-local scanners).
   */
  cwd?: string;

  /**
   * Platform override (for testing).
   */
  platform?: NodeJS.Platform;

  /**
   * Environment variables override (for testing).
   */
  env?: NodeJS.ProcessEnv;

  /**
   * Custom homedir (for testing).
   */
  homedir?: string;

  /**
   * Additional context for scanners.
   */
  context?: Record<string, unknown>;
};

/**
 * Registry entry for a scanner.
 */
export type ScannerRegistryEntry = {
  /**
   * Unique identifier matching ArtifactDefinition.scannerClass.
   */
  id: string;

  /**
   * Associated artifact definition(s).
   */
  artifacts: ArtifactDefinition[];

  /**
   * Factory function to create scanner instances.
   */
  factory: ScannerFactory;

  /**
   * Whether the scanner is enabled by default.
   */
  enabled: boolean;
};

/**
 * Scanner Registry for managing all available scanners.
 */
export class ScannerRegistry {
  private readonly entries = new Map<string, ScannerRegistryEntry>();

  /**
   * Register a scanner with its factory and metadata.
   */
  register(entry: ScannerRegistryEntry): void {
    if (this.entries.has(entry.id)) {
      throw new Error(`Scanner already registered: ${entry.id}`);
    }
    this.entries.set(entry.id, entry);
  }

  /**
   * Register multiple scanners at once.
   */
  registerMany(entries: ScannerRegistryEntry[]): void {
    for (const entry of entries) {
      this.register(entry);
    }
  }

  /**
   * Get a scanner entry by id.
   */
  get(id: string): ScannerRegistryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all registered scanners.
   */
  getAll(): ScannerRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get all enabled scanners.
   */
  getEnabled(): ScannerRegistryEntry[] {
    return this.getAll().filter((e) => e.enabled);
  }

  /**
   * Enable or disable a scanner by id.
   */
  setEnabled(id: string, enabled: boolean): void {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Scanner not found: ${id}`);
    }
    entry.enabled = enabled;
  }

  /**
   * Create a scanner instance by id.
   */
  createScanner(id: string, deps?: ScannerDeps): Scanner {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Scanner not found: ${id}`);
    }
    return entry.factory(deps);
  }

  /**
   * Run all enabled scanners and collect discovered targets.
   */
  async scanAll(deps?: ScannerDeps): Promise<DiscoveredTarget[]> {
    const enabled = this.getEnabled();
    const results = await Promise.allSettled(
      enabled.map(async (entry) => {
        const scanner = entry.factory(deps);
        return scanner.scan();
      }),
    );

    const targets: DiscoveredTarget[] = [];
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const entry = enabled[i];

      if (!result || !entry) continue;

      if (result.status === "fulfilled") {
        targets.push(...result.value);
      } else {
        errors.push(`Scanner ${entry.id} failed: ${String(result.reason)}`);
      }
    }

    // Log errors but don't throw - partial results are acceptable
    if (errors.length > 0) {
      console.warn("[ScannerRegistry] Some scanners failed:", errors);
    }

    return targets;
  }

  /**
   * Run specific scanners by id.
   */
  async scanWith(scannerIds: string[], deps?: ScannerDeps): Promise<DiscoveredTarget[]> {
    const results = await Promise.allSettled(
      scannerIds.map(async (id) => {
        const scanner = this.createScanner(id, deps);
        return scanner.scan();
      }),
    );

    const targets: DiscoveredTarget[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        targets.push(...result.value);
      }
    }

    return targets;
  }

  /**
   * Filter scanners by artifact category.
   */
  getByCategory(category: string): ScannerRegistryEntry[] {
    return this.getAll().filter((entry) =>
      entry.artifacts.some((artifact) => artifact.category === category),
    );
  }

  /**
   * Filter scanners by artifact scope (global or repo-local).
   */
  getByScope(scope: "global" | "repo-local"): ScannerRegistryEntry[] {
    return this.getAll().filter((entry) =>
      entry.artifacts.some((artifact) => artifact.scope === scope),
    );
  }

  /**
   * Get scanners that require CWD.
   */
  getRequiringCwd(): ScannerRegistryEntry[] {
    return this.getAll().filter((entry) =>
      entry.artifacts.some((artifact) => artifact.preconditions?.requiresCwd),
    );
  }

  /**
   * Clear all registered scanners (useful for testing).
   */
  clear(): void {
    this.entries.clear();
  }
}

/**
 * Global default registry instance.
 */
export const defaultRegistry = new ScannerRegistry();
