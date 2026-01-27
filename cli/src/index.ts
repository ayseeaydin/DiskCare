#!/usr/bin/env node
import { CliApp } from "./app/CliApp.js";
import { ConfigCommand } from "./commands/ConfigCommand.js";
import { ScanCommand } from "./commands/ScanCommand.js";
import { CleanCommand } from "./commands/CleanCommand.js";
import { ReportCommand } from "./commands/ReportCommand.js";
import { ScheduleCommand } from "./commands/ScheduleCommand.js";
import { InitCommand } from "./commands/InitCommand.js";
import type { BaseCommand } from "./commands/BaseCommand.js";
// Feature flags for incomplete/experimental features
const FEATURES = {
  SCHEDULE: false, // v2
  DOCKER_CACHE: false, // v3
};

const commands: BaseCommand[] = [
  new ConfigCommand(),
  new InitCommand(),
  new ScanCommand(),
  new CleanCommand(),
  new ReportCommand(),
];

if (FEATURES.SCHEDULE) {
  commands.push(new ScheduleCommand());
}

const app = new CliApp(commands);

await app.run(process.argv);
