/**
 * @file ScannerConfig.ts
 * @description Configuration types and loader for scanner preferences
 */

import { z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Scanner-specific configuration
 */
export const ScannerSettingsSchema = z.object({
	enabled: z.boolean().default(true),
	excludePaths: z.array(z.string()).optional(),
});

export type ScannerSettings = z.infer<typeof ScannerSettingsSchema>;

/**
 * Full scanner configuration file schema
 */
export const ScannerConfigSchema = z.object({
	scanners: z.record(z.string(), ScannerSettingsSchema).default({}),
	globalExcludePaths: z.array(z.string()).default([]),
});

export type ScannerConfig = z.infer<typeof ScannerConfigSchema>;

/**
 * Default scanner configuration
 */
export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
	scanners: {
		// v1 cleanable targets (enabled by default)
		'os-temp': { enabled: true },
		'npm-cache': { enabled: true },

		// v2 scan-only targets (enabled for discovery)
		'chrome-cache': { enabled: true },
		'chrome-code-cache': { enabled: true },
		'chrome-gpu-cache': { enabled: true },
		'edge-cache': { enabled: true },
		'edge-code-cache': { enabled: true },
		'edge-gpu-cache': { enabled: true },
		'brave-cache': { enabled: true },
		'brave-code-cache': { enabled: true },
		'brave-gpu-cache': { enabled: true },
		'firefox-cache': { enabled: true },
		'vscode-cache': { enabled: true },
		'vscode-cached-data': { enabled: true },
		'vscode-gpu-cache': { enabled: true },
		'jetbrains-caches': { enabled: true },
		'pip-cache': { enabled: true },
		'repo-local-caches': { enabled: true },
	},
	globalExcludePaths: [
		// Common paths to always skip
		'**/node_modules/**',
		'**/.git/**',
		'**/.svn/**',
		'**/.hg/**',
	],
};

/**
 * Load scanner configuration from file
 */
export function loadScannerConfig(configPath?: string): ScannerConfig {
	if (!configPath) {
		// Try default locations
		const defaultPaths = [
			path.join(process.cwd(), 'config', 'scanners.json'),
			path.join(process.cwd(), '.diskcare', 'scanners.json'),
			path.join(process.env.HOME || process.env.USERPROFILE || '', '.diskcare', 'scanners.json'),
		];

		for (const p of defaultPaths) {
			if (fs.existsSync(p)) {
				configPath = p;
				break;
			}
		}

		// No config file found, use defaults
		if (!configPath) {
			return DEFAULT_SCANNER_CONFIG;
		}
	}

	try {
		const content = fs.readFileSync(configPath, 'utf-8');
		const parsed = JSON.parse(content);
		return ScannerConfigSchema.parse(parsed);
	} catch (error) {
		console.warn(`Failed to load scanner config from ${configPath}:`, error);
		return DEFAULT_SCANNER_CONFIG;
	}
}

/**
 * Check if a scanner is enabled by its artifact ID
 */
export function isScannerEnabled(config: ScannerConfig, artifactId: string): boolean {
	const settings = config.scanners[artifactId];
	return settings?.enabled ?? true; // Default to enabled if not specified
}

/**
 * Get exclude patterns for a specific scanner
 */
export function getScannerExcludePaths(config: ScannerConfig, artifactId: string): string[] {
	const settings = config.scanners[artifactId];
	const scannerPaths = settings?.excludePaths ?? [];
	return [...config.globalExcludePaths, ...scannerPaths];
}

/**
 * Merge user config with defaults
 */
export function mergeScannerConfig(userConfig: Partial<ScannerConfig>): ScannerConfig {
	return {
		scanners: {
			...DEFAULT_SCANNER_CONFIG.scanners,
			...userConfig.scanners,
		},
		globalExcludePaths: [
			...DEFAULT_SCANNER_CONFIG.globalExcludePaths,
			...(userConfig.globalExcludePaths ?? []),
		],
	};
}
