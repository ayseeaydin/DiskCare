import { Command } from "commander";

const program = new Command();

program
  .name("diskcare")
  .description("Developer-focused disk hygiene CLI (safe-by-default)")
  .version("0.0.1");

program.parse();
