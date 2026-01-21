import type { Output } from "../output/Output.js";

export type CommandContext = {
  output: Output;
  verbose?: boolean;
  /**
   * Optional hook for setting an exit code (primarily for tests).
   * If not provided, error handling falls back to mutating process.exitCode.
   */
  setExitCode?: (code: number) => void;
  /**
   * Absolute path to rules config file (usually <cwd>/config/rules.json).
   * Can be overridden via global --config.
   */
  configPath: string;
};
