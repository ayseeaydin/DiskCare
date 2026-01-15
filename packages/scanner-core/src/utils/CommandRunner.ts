import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class CommandRunner {
  async run(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    const { stdout, stderr } = await execFileAsync(command, args, {
      windowsHide: true,
    });

    return {
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
    };
  }
}
