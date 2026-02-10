/**
 * @file SafetyGate.ts
 * @description Safety validation system for artifact operations
 *
 * v2 Safety Philosophy:
 * - Check preconditions before scanning
 * - Warn about running processes
 * - Validate permissions
 * - Respect scope constraints (global vs repo-local)
 */

import type { ArtifactDefinition, ArtifactPrecondition } from "../catalog/ArtifactCatalog.js";
import type { DiscoveredTarget } from "../types/ScanTarget.js";

export type SafetyCheckResult = {
  safe: boolean;
  warnings: string[];
  errors: string[];
  shouldSkip: boolean;
};

/**
 * Process running check
 */
export type ProcessChecker = {
  checkRunning: (processNames: string[]) => Promise<string[]>;
};

/**
 * Permission check
 */
export type PermissionChecker = {
  canAccess: (path: string) => Promise<boolean>;
  isElevated: () => Promise<boolean>;
};

/**
 * Safety gate for validating artifact operations
 */
export class SafetyGate {
  constructor(
    private readonly deps?: {
      processChecker?: ProcessChecker;
      permissionChecker?: PermissionChecker;
      cwd?: string;
    },
  ) {}

  /**
   * Check if preconditions are met for an artifact
   */
  checkPreconditions(
    artifact: ArtifactDefinition,
    preconditions?: ArtifactPrecondition,
  ): SafetyCheckResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let safe = true;
    let shouldSkip = false;

    const conditions = preconditions ?? artifact.preconditions;
    if (!conditions) {
      return { safe: true, warnings: [], errors: [], shouldSkip: false };
    }

    // Check CWD requirement
    if (conditions.requiresCwd && !this.deps?.cwd) {
      warnings.push(`${artifact.displayName} requires --cwd flag (repo-local scope)`);
      shouldSkip = true;
    }

    // Check process requirements
    if (conditions.requiresProcessStopped) {
      warnings.push(
        `${artifact.displayName} may be locked if ${conditions.requiresProcessStopped.join(", ")} are running`,
      );
      // Don't skip, just warn (user can still scan read-only)
    }

    // Check permission requirements
    if (conditions.requiresElevated) {
      warnings.push(`${artifact.displayName} may require elevated permissions`);
    }

    return { safe, warnings, errors, shouldSkip };
  }

  /**
   * Validate a discovered target before operations
   */
  async validateTarget(
    target: DiscoveredTarget & { exists?: boolean },
    artifact?: ArtifactDefinition,
  ): Promise<SafetyCheckResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let safe = true;
    let shouldSkip = false;

    // Check if path exists and is accessible
    if (target.exists === false) {
      shouldSkip = true;
      return { safe, warnings, errors, shouldSkip };
    }

    // Check artifact preconditions if available
    if (artifact) {
      const preconditionResult = this.checkPreconditions(artifact);
      warnings.push(...preconditionResult.warnings);
      errors.push(...preconditionResult.errors);
      shouldSkip = shouldSkip || preconditionResult.shouldSkip;
    }

    // Check process locks (if checker available)
    if (this.deps?.processChecker && artifact?.preconditions?.requiresProcessStopped) {
      const runningProcesses = await this.deps.processChecker.checkRunning(
        artifact.preconditions.requiresProcessStopped,
      );

      if (runningProcesses.length > 0) {
        warnings.push(`Process(es) running: ${runningProcesses.join(", ")} - files may be locked`);
      }
    }

    // Check permissions (if checker available)
    if (this.deps?.permissionChecker) {
      const canAccess = await this.deps.permissionChecker.canAccess(target.path);
      if (!canAccess) {
        errors.push(`Cannot access ${target.path} - permission denied`);
        safe = false;
        shouldSkip = true;
      }
    }

    return { safe, warnings, errors, shouldSkip };
  }

  /**
   * Batch validate multiple targets
   */
  async validateTargets(
    targets: Array<DiscoveredTarget & { exists?: boolean }>,
    artifactMap?: Map<string, ArtifactDefinition>,
  ): Promise<Map<string, SafetyCheckResult>> {
    const results = new Map<string, SafetyCheckResult>();

    for (const target of targets) {
      const artifact = artifactMap?.get(target.id);
      const result = await this.validateTarget(target, artifact);
      results.set(target.id, result);
    }

    return results;
  }

  /**
   * Filter targets based on safety checks
   */
  filterSafeTargets(
    targets: Array<DiscoveredTarget & { exists?: boolean }>,
    validationResults: Map<string, SafetyCheckResult>,
  ): Array<DiscoveredTarget & { exists?: boolean }> {
    return targets.filter((target) => {
      const result = validationResults.get(target.id);
      return result && result.safe && !result.shouldSkip;
    });
  }
}
