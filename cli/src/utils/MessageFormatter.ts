// MessageFormatter: Standardizes diagnostic and user-facing messages
// Usage: MessageFormatter.diagnostic('npm', 'lookup failed', { error, fallback: true })

export class MessageFormatter {
  static diagnostic(context: string, message: string, opts?: Record<string, unknown>): string {
    // Example: "[npm] lookup failed (Error: ...), falling back."
    let msg = `[${context}] ${message}`;
    if (opts?.error) {
      msg += ` (${opts.error instanceof Error ? opts.error.message : String(opts.error)})`;
    }
    if (opts?.fallback) {
      msg += ", falling back.";
    }
    return msg;
  }

  static userFriendly(context: string, message: string, opts?: Record<string, unknown>): string {
    // Example: "Could not determine npm cache path. Using default."
    return message;
  }

  static tooRecent(days: number, safeAfter: number): string {
    return `Too recent: last modified ${days} day(s) ago (must be >= ${safeAfter}).`;
  }

  static rulesConfigNotLoaded(): string {
    return "Rules config not loaded; using defaults.";
  }

  static targetMissing(): string {
    return "Target path does not exist.";
  }

  static analysisSkipped(message: string): string {
    return `Target analysis skipped: ${message}`;
  }

  static partialAnalysis(skippedEntries: number): string {
    return `Partial analysis: ${skippedEntries} subpath(s) could not be read; not eligible for apply.`;
  }

  static partialEstimatedBytes(): string {
    return "Estimated size may be inaccurate due to partial analysis.";
  }

  static doNotTouch(): string {
    return "Rule risk is do-not-touch.";
  }

  static missingMtime(): string {
    return "Cannot determine lastModifiedAt; not eligible for apply.";
  }

  static applyDryRun(): string {
    return "Dry-run is enabled; no changes were made.";
  }

  static applyConfirmationRequired(): string {
    return "Confirmation required: pass --yes to apply.";
  }
}
