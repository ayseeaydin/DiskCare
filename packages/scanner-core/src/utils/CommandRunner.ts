import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CommandResult = { stdout: string; stderr: string };

/**
 * Abstraction exists to support DI/mocking in scanners.
 */
export interface CommandRunner {
  run(command: string, args: string[]): Promise<CommandResult>;
}

/**
 * Default Node.js implementation.
 *
 * Note (Windows):
 * In Git Bash / MINGW environments, spawning `npm` directly can fail with ENOENT
 * because PATH resolution behaves differently. To make this deterministic, we
 * execute commands via `cmd.exe /d /s /c ...` on win32.
 */
export class NodeCommandRunner implements CommandRunner {
  async run(command: string, args: string[]): Promise<CommandResult> {
    const { stdout, stderr } = await execFileAsync(...this.buildExecArgs(command, args), {
      windowsHide: true,
    });

    return {
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
    };
  }

  private buildExecArgs(command: string, args: string[]): [string, string[]] {
    if (process.platform !== "win32") {
      return [command, args];
    }

    // Quote args that contain spaces or quotes so cmd.exe parses them correctly.
    const cmdLine = [command, ...args].map(quoteForCmd).join(" ");
    const comspec = process.env.ComSpec || "cmd.exe";

    // /d: disable AutoRun, /s: stricter parsing, /c: run and exit
    return [comspec, ["/d", "/s", "/c", cmdLine]];
  }
}

function quoteForCmd(value: string): string {
  // Minimal safe quoting for cmd.exe:
  // - wrap in double quotes if it contains spaces or quotes
  // - escape internal quotes by doubling them
  if (!/[ "\t]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
