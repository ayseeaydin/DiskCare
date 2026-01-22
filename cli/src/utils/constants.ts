/**
 * Application version.
 * TODO: sync with package.json or use dynamic import
 */
export const APP_VERSION = "0.0.1";

/**
 * Milliseconds in a day (for date calculations)
 */
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Max number of reasons to show per plan item in human output.
 */
export const MAX_DISPLAYED_REASONS = 2;

/**
 * Truncation suffix used by truncate().
 */
export const TRUNCATE_SUFFIX = "…";

/**
 * Length of TRUNCATE_SUFFIX in JS string code units.
 * (Kept explicit so truncate logic stays self-documenting.)
 */
export const TRUNCATE_SUFFIX_LENGTH = TRUNCATE_SUFFIX.length;

/**
 * Default logs directory name under cwd.
 */
export const LOG_DIR_NAME = "logs";

/**
 * Logs metadata directory name under logsDir.
 */
export const LOG_META_DIR_NAME = "meta";
