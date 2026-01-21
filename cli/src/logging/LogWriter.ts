import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { APP_VERSION } from "../utils/constants.js";
import { toErrorMessage, toOneLine } from "../utils/errors.js";
import { LogWriteError } from "../errors/DiskcareError.js";

type NowFn = () => Date;

export class LogWriter {
  private readonly nowFn: NowFn;
  private readonly pid: number;

  constructor(
    private readonly logsDir: string,
    deps?: {
      nowFn?: NowFn;
      pid?: number;
    },
  ) {
    this.nowFn = deps?.nowFn ?? (() => new Date());
    this.pid = deps?.pid ?? process.pid;
  }

  async writeRunLog(payload: unknown): Promise<string> {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (err) {
      throw new LogWriteError("Failed to create logs directory", { logsDir: this.logsDir }, err);
    }

    const fileBase = `run-${timestampForFileName(this.nowFn())}-${this.pid}-${randomSuffix()}`;
    const finalPath = path.join(this.logsDir, `${fileBase}.json`);
    const tmpPath = path.join(this.logsDir, `${fileBase}.tmp`);

    const content = safeStringify(payload, this.nowFn);

    // Atomic write: write temp then rename
    try {
      await fs.writeFile(tmpPath, content, { encoding: "utf8", flag: "wx" });
    } catch (err) {
      throw new LogWriteError(
        "Failed to write log temp file",
        { tmpPath, finalPath, logsDir: this.logsDir },
        err,
      );
    }

    try {
      await fs.rename(tmpPath, finalPath);
    } catch (err) {
      throw new LogWriteError(
        "Failed to finalize log file",
        { tmpPath, finalPath, logsDir: this.logsDir },
        err,
      );
    }

    return finalPath;
  }
}

function timestampForFileName(d: Date): string {
  // local time is fine for filenames; payload uses ISO timestamp anyway
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function randomSuffix(): string {
  // short, URL-safe-ish suffix
  return crypto.randomBytes(4).toString("hex");
}

function safeStringify(payload: unknown, nowFn: NowFn): string {
  try {
    return JSON.stringify(payload, jsonReplacer, 2);
  } catch (err) {
    const message = toOneLine(toErrorMessage(err));
    // last-resort fallback: keep log file valid JSON
    return JSON.stringify(
      {
        version: APP_VERSION,
        timestamp: nowFn().toISOString(),
        command: "unknown",
        error: `LogWriter JSON.stringify failed: ${message}`,
      },
      null,
      2,
    );
  }
}

function jsonReplacer(_key: string, value: unknown): unknown {
  // Avoid crashing on BigInt; keep it explainable
  if (typeof value === "bigint") return value.toString();
  return value;
}
