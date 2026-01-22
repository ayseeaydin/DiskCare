/**
 * Base error class for all Diskcare errors.
 */
export class DiskcareError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: unknown,
  ) {
    // Store `cause` as an own property for downstream formatting/reporting.
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Configuration loading errors (rules.json, etc.)
 */
export class ConfigLoadError extends DiskcareError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFIG_LOAD_ERROR", context);
  }
}

/**
 * Configuration writing errors (init, etc.)
 */
export class ConfigWriteError extends DiskcareError {
  constructor(message: string, context?: Record<string, unknown>, cause?: unknown) {
    super(message, "CONFIG_WRITE_ERROR", context, cause);
  }
}

/**
 * File system scanning errors
 */
export class ScanError extends DiskcareError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "SCAN_ERROR", context);
  }
}

/**
 * Apply/cleanup operation errors
 */
export class ApplyError extends DiskcareError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "APPLY_ERROR", context);
  }
}

/**
 * Validation errors (schema, input validation)
 */
export class ValidationError extends DiskcareError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", context);
  }
}

/**
 * Log writing / IO errors.
 */
export class LogWriteError extends DiskcareError {
  constructor(message: string, context?: Record<string, unknown>, cause?: unknown) {
    super(message, "LOG_WRITE_ERROR", context, cause);
  }
}
