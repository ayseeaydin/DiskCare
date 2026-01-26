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
}
