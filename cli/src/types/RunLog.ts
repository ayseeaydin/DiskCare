export type ApplyResult = {
  id: string;
  path: string;
  status: "trashed" | "skipped" | "failed";
  /**
   * Best-effort bytes for this item (usually the planned estimate).
   * Used to compute trashedEstimatedBytes accurately from apply results.
   */
  estimatedBytes?: number;
  message?: string;
};

export type ApplySummary = {
  trashed: number;
  failed: number;
  trashedEstimatedBytes: number;
};

/**
 * Common fields for all run logs.
 */
type BaseRunLog = {
  version: string;
  timestamp: string; // ISO
};

/**
 * Scan command log.
 */
export type ScanLog = BaseRunLog & {
  command: "scan";
  dryRun?: boolean;
  targets: Array<{
    id: string;
    kind?: string;
    path?: string;
    displayName?: string;
    ruleId?: string;
    exists?: boolean;
    metrics?: {
      totalBytes?: number;
      fileCount?: number;
      lastModifiedAt?: number | null;
      lastAccessedAt?: number | null;
      skipped?: boolean;
      error?: string;
      partial?: boolean;
      skippedEntries?: number;
    };
  }>;
};

/**
 * Clean command log.
 */
export type CleanLog = BaseRunLog & {
  command: "clean";
  dryRun?: boolean;
  apply?: boolean;
  plan?: {
    summary?: {
      estimatedBytesTotal?: number;
      eligibleCount?: number;
      cautionCount?: number;
      blockedCount?: number;
    };
    items?: Array<{
      id: string;
      status: "eligible" | "caution" | "blocked";
      estimatedBytes: number;
    }>;
  };
  applyResults?: ApplyResult[];
  applySummary?: ApplySummary;
};

/**
 * Report command log.
 */
export type ReportLog = BaseRunLog & {
  command: "report";
};

/**
 * Schedule command log.
 */
export type ScheduleLog = BaseRunLog & {
  command: "schedule";
  frequency?: string;
  apply?: boolean;
};

/**
 * Discriminated union of all run logs.
 */
export type RunLog = ScanLog | CleanLog | ReportLog | ScheduleLog;
