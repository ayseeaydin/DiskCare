/**
 * Base error class for all Diskcare errors.
 */
export class DiskcareError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
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
