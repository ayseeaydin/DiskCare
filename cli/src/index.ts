import { CliApp } from "./app/CliApp.js";
import { ScanCommand } from "./commands/ScanCommand.js";
import { CleanCommand } from "./commands/CleanCommand.js";
import { ReportCommand } from "./commands/ReportCommand.js";
import { ScheduleCommand } from "./commands/ScheduleCommand.js";
import { InitCommand } from "./commands/InitCommand.js";

const app = new CliApp([
  new InitCommand(),
  new ScanCommand(),
  new CleanCommand(),
  new ReportCommand(),
  new ScheduleCommand(),
]);

await app.run(process.argv);
