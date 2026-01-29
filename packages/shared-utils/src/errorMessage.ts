export function toErrorMessage(err: unknown): string {
  if (err instanceof Error && typeof err.message === "string") return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function toOneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function toErrorMessageOneLine(err: unknown): string {
  return toOneLine(toErrorMessage(err));
}
