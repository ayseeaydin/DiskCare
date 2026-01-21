import type { Output } from "../output/Output.js";

export type CommandContext = {
  output: Output;
  verbose?: boolean;
  /**
   * Absolute path to rules config file (usually <cwd>/config/rules.json).
   * Can be overridden via global --config.
   */
  configPath: string;
};
