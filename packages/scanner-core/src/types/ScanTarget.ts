import type { ScanMetrics } from "./ScanMetrics.js";

export type ScanTargetKind = "os-temp" | "npm-cache" | "sandbox-cache" | "custom-path";

/**
 * Target discovered by scanners (no filesystem info yet).
 */
export type DiscoveredTarget = {
  /**
   * Stable identifier used in logs/rules (e.g. "os-temp", "npm-cache").
   */
  id: string;

  /**
   * The absolute path on disk for this target.
   */
  path: string;

  /**
   * A normalized kind to group targets.
   */
  kind: ScanTargetKind;

  /**
   * Optional rule id to use for policy decisions.
   * Useful when a target id must be unique per path.
   */
  ruleId?: string;

  /**
   * Human-friendly label for CLI output.
   */
  displayName: string;

  /**
   * Optional diagnostics about how this target was discovered/resolved.
   * (Example: npm config lookup failed, fell back to OS defaults.)
   */
  diagnostics?: string[];
};

/**
 * Fully scanned/enriched target (filesystem info attached).
 */
export type ScanTarget = DiscoveredTarget & {
  /**
   * Whether the target path exists at scan time.
   */
  exists: boolean;

  /**
   * Disk analysis metrics (computed later).
   */
  metrics: ScanMetrics;
};
