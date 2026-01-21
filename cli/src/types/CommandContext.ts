import type { Output } from "../output/Output.js";

export type CommandContext = {
  output: Output;
  verbose?: boolean;
  /** Current working directory for this CLI invocation. */
  cwd: string;
  /** Process id for this CLI invocation. */
  pid: number;
  /** Current time source for this CLI invocation. */
  nowFn: () => Date;
  /**
   * Optional hook for setting an exit code (primarily for tests).
   * CliApp wires this to process.exitCode.
   */
  setExitCode: (code: number) => void;
  /**
   * Absolute path to rules config file (usually <cwd>/config/rules.json).
   * Can be overridden via global --config.
   */
  configPath: string;
};
