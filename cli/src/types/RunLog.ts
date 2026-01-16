export type ApplyResult = {
  id: string;
  path: string;
  status: "trashed" | "skipped" | "failed";
  message?: string;
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
    exists: boolean;
    metrics?: {
      totalBytes?: number;
      skipped?: boolean;
    };
  }>;

  // Clean payload
  plan?: {
    summary?: {
      estimatedBytesTotal?: number;
      eligibleCount?: number;
      cautionCount?: number;
      blockedCount?: number;
    };
  };

  applyResults?: ApplyResult[];
};
