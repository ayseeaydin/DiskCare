export class ConsoleOutput {
  info(message: string): void {
    // Centralize output so we can later add JSON, verbosity, colors, etc.
    // eslint-disable-next-line no-console
    console.log(message);
  }

  warn(message: string): void {
    // eslint-disable-next-line no-console
    console.warn(message);
  }

  error(message: string): void {
    // eslint-disable-next-line no-console
    console.error(message);
  }
}
