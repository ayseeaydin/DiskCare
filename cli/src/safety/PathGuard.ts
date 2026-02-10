/**
 * PathGuard - Prevents accidental deletion of critical system directories.
 *
 * Design:
 * - FORBIDDEN_PREFIXES: Hardcoded list of dangerous paths (Windows + Unix)
 * - isForbiddenPath(): Case-insensitive, normalized path check
 * - getMatchedForbiddenPrefix(): Returns reason for rejection
 *
 * Safety philosophy:
 * - Fail closed: Suspicious paths are rejected
 * - Explainable: Always returns reason
 * - Cross-platform: Handles both Windows and Unix paths
 */

import path from "node:path";

/**
 * Forbidden path prefixes that should NEVER be cleaned.
 * Covers Windows, macOS, and Linux system directories.
 */
const FORBIDDEN_PREFIXES_WIN32 = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\ProgramData\\Microsoft", // Critical system data
  "C:\\System Volume Information",
  "C:\\$Recycle.Bin", // Don't clean the trash itself
];

const FORBIDDEN_PREFIXES_POSIX = [
  "/bin",
  "/sbin",
  "/usr/bin",
  "/usr/sbin",
  "/etc",
  "/var/log",
  "/System", // macOS
  "/Library", // macOS system library
  "/boot",
  "/dev",
  "/proc",
  "/sys",
];

/**
 * Check if a path is forbidden (system-critical).
 *
 * @param targetPath - Absolute path to check
 * @param platform - OS platform (for testing override)
 * @returns true if path is forbidden
 */
export function isForbiddenPath(
  targetPath: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  return getMatchedForbiddenPrefix(targetPath, platform) !== null;
}

/**
 * Get the forbidden prefix that matches the target path, if any.
 *
 * @param targetPath - Absolute path to check
 * @param platform - OS platform (for testing override)
 * @returns Matched forbidden prefix, or null if path is safe
 */
export function getMatchedForbiddenPrefix(
  targetPath: string,
  platform: NodeJS.Platform = process.platform,
): string | null {
  // Use platform-specific path operations
  const separator = platform === "win32" ? "\\" : "/";
  const normalize = (p: string) => {
    if (platform === "win32") {
      return path.win32.normalize(p);
    }
    return path.posix.normalize(p);
  };

  const normalized = normalize(targetPath);
  const lower = normalized.toLowerCase();

  const prefixes = platform === "win32" ? FORBIDDEN_PREFIXES_WIN32 : FORBIDDEN_PREFIXES_POSIX;

  for (const prefix of prefixes) {
    const prefixLower = prefix.toLowerCase();

    // Exact match or starts with prefix + separator
    if (lower === prefixLower || lower.startsWith(prefixLower + separator)) {
      return prefix; // Return original casing for display
    }
  }

  return null;
}

/**
 * Validate a batch of paths and return filtered safe paths + rejected paths.
 *
 * @param paths - Array of absolute paths to validate
 * @param platform - OS platform (for testing override)
 * @returns Object with safe paths and rejected paths with reasons
 */
export function validatePaths(
  paths: string[],
  platform: NodeJS.Platform = process.platform,
): {
  safe: string[];
  rejected: Array<{ path: string; reason: string }>;
} {
  const safe: string[] = [];
  const rejected: Array<{ path: string; reason: string }> = [];

  for (const p of paths) {
    const matched = getMatchedForbiddenPrefix(p, platform);
    if (matched) {
      rejected.push({
        path: p,
        reason: `Path is inside forbidden system directory: ${matched}`,
      });
    } else {
      safe.push(p);
    }
  }

  return { safe, rejected };
}
