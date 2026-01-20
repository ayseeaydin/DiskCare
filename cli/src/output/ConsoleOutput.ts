export class ConsoleOutput {
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
