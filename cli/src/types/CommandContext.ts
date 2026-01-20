import type { ConsoleOutput } from "../output/ConsoleOutput.js";

export type CommandContext = {
  output: ConsoleOutput;
  verbose?: boolean;
};
