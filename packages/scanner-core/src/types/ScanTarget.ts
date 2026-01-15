import type { ScanMetrics } from "./ScanMetrics.js";

export type ScanTargetKind = "os-temp" | "npm-cache";

export type ScanTarget = {
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
   * Human-friendly label for CLI output.
   */
  displayName: string;

  /**
   * Disk analysis metrics (computed later).
   */
  metrics?: ScanMetrics;
};
