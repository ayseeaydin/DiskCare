import type { Output } from "./Output.js";

export class ConsoleOutput implements Output {
  progress(message: string): void {
    // Progress output is sent to stderr to avoid mixing with JSON/stdout
    process.stderr.write(`[progress] ${message}\n`);
  }
  info(message: string): void {
    // Centralize output so we can later add JSON, verbosity, colors, etc.
    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string): void {
    console.error(message);
  }
}
