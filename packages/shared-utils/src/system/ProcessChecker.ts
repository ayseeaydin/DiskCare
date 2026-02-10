/**
 * @file ProcessChecker.ts
 * @description Detect running processes to avoid scanning locked files
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Known process patterns that indicate files are in use
 */
export const KNOWN_PROCESSES = {
	browsers: [
		'chrome.exe',
		'msedge.exe',
		'brave.exe',
		'firefox.exe',
		'opera.exe',
		'vivaldi.exe',
	],
	ides: [
		'code.exe', // VS Code
		'idea64.exe', // IntelliJ IDEA
		'pycharm64.exe',
		'webstorm64.exe',
		'phpstorm64.exe',
		'rider64.exe',
		'clion64.exe',
		'goland64.exe',
		'rubymine64.exe',
		'datagrip64.exe',
	],
	buildTools: [
		'node.exe',
		'npm.exe',
		'yarn.exe',
		'pnpm.exe',
		'webpack.exe',
		'vite.exe',
		'turbo.exe',
	],
} as const;

/**
 * Check if specific processes are running on Windows
 */
async function checkProcessesWindows(processNames: string[]): Promise<string[]> {
	try {
		// Use tasklist to get running processes
		const { stdout } = await execAsync('tasklist /NH /FO CSV', {
			timeout: 5000,
			windowsHide: true,
		});

		const running: string[] = [];
		const lines = stdout.split('\n');

		for (const line of lines) {
			// Parse CSV format: "name","pid","session","session#","mem"
			const match = line.match(/^"([^"]+)"/);
			if (!match || !match[1]) continue;

			const processName = match[1].toLowerCase();

			for (const targetProcess of processNames) {
				if (processName === targetProcess.toLowerCase()) {
					running.push(targetProcess);
				}
			}
		}

		return [...new Set(running)]; // Remove duplicates
	} catch {
		// If tasklist fails, return empty (better than crashing)
		return [];
	}
}

/**
 * Check if specific processes are running on Unix-like systems
 */
async function checkProcessesUnix(processNames: string[]): Promise<string[]> {
	try {
		const { stdout } = await execAsync('ps -A -o comm=', {
			timeout: 5000,
		});

		const running: string[] = [];
		const lines = stdout.split('\n');

		for (const line of lines) {
			const processName = line.trim().toLowerCase();

			for (const targetProcess of processNames) {
				// Remove .exe extension for Unix comparison
				const unixProcess = targetProcess.replace('.exe', '').toLowerCase();
				if (processName.includes(unixProcess)) {
					running.push(targetProcess);
				}
			}
		}

		return [...new Set(running)];
	} catch {
		return [];
	}
}

/**
 * Check if any of the specified processes are currently running
 */
export async function checkRunningProcesses(
	processNames: string[],
	platform: NodeJS.Platform = process.platform,
): Promise<string[]> {
	if (platform === 'win32') {
		return checkProcessesWindows(processNames);
	}

	return checkProcessesUnix(processNames);
}

/**
 * Check if any browser processes are running
 */
export async function areBrowsersRunning(): Promise<{
	running: boolean;
	processes: string[];
}> {
	const processes = await checkRunningProcesses([...KNOWN_PROCESSES.browsers]);
	return {
		running: processes.length > 0,
		processes,
	};
}

/**
 * Check if any IDE processes are running
 */
export async function areIDEsRunning(): Promise<{
	running: boolean;
	processes: string[];
}> {
	const processes = await checkRunningProcesses([...KNOWN_PROCESSES.ides]);
	return {
		running: processes.length > 0,
		processes,
	};
}

/**
 * Check if any build tool processes are running
 */
export async function areBuildToolsRunning(): Promise<{
	running: boolean;
	processes: string[];
}> {
	const processes = await checkRunningProcesses([...KNOWN_PROCESSES.buildTools]);
	return {
		running: processes.length > 0,
		processes,
	};
}
