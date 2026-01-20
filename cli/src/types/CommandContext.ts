import type { Output } from "../output/Output.js";

export type CommandContext = {
  output: Output;
  verbose?: boolean;
};
