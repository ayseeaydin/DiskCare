import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version?: string };

/**
 * Application version.
 * Single source of truth: cli/package.json
 */
export const APP_VERSION = typeof pkg.version === "string" ? pkg.version : "0.0.0";

/**
 * Milliseconds in a day (for date calculations)
 * Rationale: 1000 ms * 60 s * 60 m * 24 h = 1 day in ms.
 * Avoids magic numbers in date math.
 */
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Max number of reasons to show per plan item in human output.
 * Rationale: 2 keeps CLI output concise and readable for most users.
 * Increase if users need more context per item, but avoid overwhelming the terminal.
 */
export const MAX_DISPLAYED_REASONS = 2;

/**
 * Truncation suffix used by truncate().
 * Rationale: Simple ASCII ellipsis for CLI output.
 */
export const TRUNCATE_SUFFIX = "...";

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

/**
 * Max length for diagnostic lines in CLI output.
 */
export const DIAGNOSTIC_TRUNCATE_LIMIT = 160;

/**
 * Max length for analyzer error messages in CLI output.
 */
export const ANALYZER_ERROR_TRUNCATE_LIMIT = 140;

/**
 * Max length for trash error messages in apply results.
 */
export const TRASH_ERROR_TRUNCATE_LIMIT = 180;

/**
 * Number of diagnostics lines shown per target in CLI output.
 * Rationale: Keep output readable while showing key hints.
 */
export const MAX_DIAGNOSTIC_LINES = 3;

/**
 * Width for file count column in scan output.
 * Rationale: Aligns counts in terminal output.
 */
export const FILE_COUNT_PAD_WIDTH = 6;

/**
 * Default JSON indentation for CLI output.
 * Rationale: 2 spaces for readability.
 */
export const JSON_INDENT = 2;

/**
 * Padding width for report label column.
 * Rationale: Keeps report output aligned for readability.
 */
export const REPORT_LABEL_PAD = 22;

/**
 * Max depth for error cause chain printing.
 * Rationale: Keep verbose output useful without excessive noise.
 */
export const MAX_CAUSE_CHAIN_DEPTH = 3;
