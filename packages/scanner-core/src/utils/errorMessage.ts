/**
 * Safely convert any error to a readable message.
 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return typeof err === "string" ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function toOneLine(value: string): string {
  return value.replace(/\r?\n/g, " ").trim();
}

export function toErrorMessageOneLine(err: unknown): string {
  return toOneLine(toErrorMessage(err));
}
