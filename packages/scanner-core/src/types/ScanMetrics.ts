export type ScanMetrics = {
  /**
   * Total size in bytes (recursive).
   */
  totalBytes: number;

  /**
   * Number of files encountered.
   */
  fileCount: number;

  /**
   * Latest modification timestamp (ms since epoch).
   */
  lastModifiedAt: number | null;

  /**
   * Latest access timestamp (ms since epoch).
   * May be null on some systems.
   */
  lastAccessedAt: number | null;

  /**
   * True if analysis could not be completed (e.g. permissions, missing path).
   */
  skipped: boolean;

  /**
   * Optional error message when skipped=true.
   */
  error?: string;
};
