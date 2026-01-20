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
 */
export class NodeCommandRunner implements CommandRunner {
  async run(command: string, args: string[]): Promise<CommandResult> {
    const { stdout, stderr } = await execFileAsync(command, args, {
      windowsHide: true,
    });

    return {
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
    };
  }
}
