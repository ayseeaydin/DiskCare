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

  /**
   * True if some subpaths could not be read (e.g. permission denied),
   * but analysis still returned best-effort metrics.
   */
  partial?: boolean;

  /**
   * Number of subpaths skipped due to read/stat errors.
   */
  skippedEntries?: number;
};
