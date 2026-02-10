/**
 * @file PermissionChecker.ts
 * @description Check system permissions for safe operations
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Check if the current process is running with elevated privileges
 */
export async function isElevated(): Promise<boolean> {
  const platform = process.platform;

  if (platform === "win32") {
    // On Windows, try to access a system-protected path
    try {
      // Try to access Windows/System32/config (requires admin)
      const systemPath = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "config");
      await fs.promises.access(systemPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  // On Unix-like systems, check if running as root
  return process.getuid?.() === 0;
}

/**
 * Check if we have write permission to a specific path
 */
export async function canWriteTo(targetPath: string): Promise<boolean> {
  try {
    await fs.promises.access(targetPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if we have read permission to a specific path
 */
export async function canReadFrom(targetPath: string): Promise<boolean> {
  try {
    await fs.promises.access(targetPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is within user's home directory
 */
export function isInUserSpace(targetPath: string): boolean {
  const homedir = os.homedir();
  const normalized = path.normalize(targetPath);
  return normalized.startsWith(path.normalize(homedir));
}

/**
 * Check if a path is a system directory (requires elevated permissions)
 */
export function isSystemPath(targetPath: string): boolean {
  const normalized = path.normalize(targetPath).toLowerCase();

  if (process.platform === "win32") {
    const systemPaths = [
      path.normalize("C:\\Windows").toLowerCase(),
      path.normalize("C:\\Program Files").toLowerCase(),
      path.normalize("C:\\Program Files (x86)").toLowerCase(),
    ];

    return systemPaths.some((sysPath) => normalized.startsWith(sysPath));
  }

  // Unix-like systems
  const systemPaths = ["/bin", "/sbin", "/usr", "/lib", "/lib64", "/etc", "/var", "/boot", "/sys"];

  return systemPaths.some((sysPath) => normalized.startsWith(sysPath));
}

/**
 * Comprehensive permission check for a path
 */
export async function checkPathPermissions(targetPath: string): Promise<{
  canRead: boolean;
  canWrite: boolean;
  isUserSpace: boolean;
  isSystem: boolean;
  requiresElevation: boolean;
}> {
  const canRead = await canReadFrom(targetPath);
  const canWrite = await canWriteTo(targetPath);
  const isUserSpace = isInUserSpace(targetPath);
  const isSystem = isSystemPath(targetPath);
  const requiresElevation = isSystem && !isUserSpace;

  return {
    canRead,
    canWrite,
    isUserSpace,
    isSystem,
    requiresElevation,
  };
}
