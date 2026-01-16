export type ApplyResult = {
  id: string;
  path: string;
  status: "trashed" | "skipped" | "failed";
  message?: string;
};

export type ApplySummary = {
  trashed: number;
  failed: number;
  trashedEstimatedBytes: number;
};

export type RunLog = {
  version: string;
  timestamp: string; // ISO
  command: "scan" | "clean" | "report" | "schedule";
  dryRun?: boolean;
  apply?: boolean;

  // Scan payload
  targets?: Array<{
    id: string;

    // Optional but currently logged by ScanCommand
    kind?: string;
    path?: string;
    displayName?: string;

    // FIX: ScanTarget.exists is optional, so log contract must allow it to be optional.
    exists?: boolean;

    metrics?: {
      totalBytes?: number;
      fileCount?: number;
      lastModifiedAt?: number | null;
      lastAccessedAt?: number | null;
      skipped?: boolean;
      error?: string;
    };
  }>;

  // Clean payload (minimal but expandable)
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

  // Apply payload
  applyResults?: ApplyResult[];
  applySummary?: ApplySummary;
};
