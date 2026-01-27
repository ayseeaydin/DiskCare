import { DiskcareError } from "../errors/DiskcareError.js";
import type { CommandContext } from "../types/CommandContext.js";
import { toErrorMessage, toOneLine } from "./errors.js";

function getCause(err: unknown): unknown {
  if (err && typeof err === "object" && "cause" in err) {
    return (err as { cause?: unknown }).cause;
  }
  return undefined;
}

function formatErrorHeader(err: unknown): string {
  const msg = toOneLine(toErrorMessage(err));
  return msg.length > 0 ? msg : "Unknown error";
}

function formatDiskcareMeta(err: DiskcareError): string[] {
  const lines: string[] = [];
  lines.push(`code: ${err.code}`);

  if (err.context && Object.keys(err.context).length > 0) {
    const compact = Object.entries(err.context)
      .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join(" ");
    lines.push(`context: ${toOneLine(compact)}`);
  }

  return lines;
}

function suggestionForCode(code: string): string | null {
  switch (code) {
    case "CONFIG_LOAD_ERROR":
      return "Config file is corrupted or missing. Fix it manually or run 'diskcare init --force' to recreate.";
    case "CONFIG_WRITE_ERROR":
      return "Could not write config file. Check the path, permissions, and disk space. Try running as administrator or choose a different location.";
    case "LOG_WRITE_ERROR":
      return "Could not write to logs directory. Check permissions, disk space, or try a different location.";
    case "SCAN_ERROR":
      return "Scan failed. Check that you have access to all target folders. Re-run with --verbose for details.";
    case "APPLY_ERROR":
      return "Cleanup could not be applied. Try running in dry-run mode first. To actually clean, use: --apply --no-dry-run --yes.";
    case "VALIDATION_ERROR":
      return "Invalid input. Check CLI arguments and configuration values. Run 'diskcare <command> --help' for usage examples.";
    default:
      return null;
  }
}

function formatCauseChain(err: unknown, maxDepth: number): string[] {
  const lines: string[] = [];
  const seen = new Set<unknown>();

  let current: unknown = err;
  for (let depth = 0; depth < maxDepth; depth++) {
    const cause = getCause(current);
    if (!cause) break;
    if (seen.has(cause)) break;
    seen.add(cause);

    lines.push(`cause[${depth + 1}]: ${formatErrorHeader(cause)}`);
    current = cause;
  }

  return lines;
}

function getStack(err: unknown): string | null {
  if (err instanceof Error && typeof err.stack === "string" && err.stack.trim().length > 0) {
    return err.stack;
  }
  return null;
}

export function handleCommandError(context: CommandContext, err: unknown): void {
  const header = formatErrorHeader(err);
  context.output.error(`error: ${header}`);

  if (err instanceof DiskcareError) {
    for (const line of formatDiskcareMeta(err)) {
      context.output.error(line);
    }

    const suggestion = suggestionForCode(err.code);
    if (suggestion) {
      context.output.warn(`hint: ${suggestion}`);
    }
  }

  if (context.verbose === true) {
    for (const line of formatCauseChain(err, 3)) {
      context.output.error(line);
    }

    const stack = getStack(err);
    if (stack) {
      context.output.error("");
      context.output.error(stack);
    }
  } else {
    context.output.warn("hint: re-run with --verbose for more detail");
  }

  context.setExitCode(1);
}
