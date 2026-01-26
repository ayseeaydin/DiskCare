export type Output = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  progress(message: string): void;
};
