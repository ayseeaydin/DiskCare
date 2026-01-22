import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { APP_VERSION, LOG_META_DIR_NAME } from "../utils/constants.js";
import { toErrorMessage, toOneLine } from "../utils/errors.js";
import { LogWriteError } from "../errors/DiskcareError.js";
import { fromPromise } from "../utils/result.js";

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
    const mkdirResult = await fromPromise(fs.mkdir(this.logsDir, { recursive: true }));
    if (!mkdirResult.ok) {
      throw new LogWriteError(
        "Failed to create logs directory",
        { logsDir: this.logsDir },
        mkdirResult.error,
      );
    }

    const fileBase = `run-${timestampForFileName(this.nowFn())}-${this.pid}-${randomSuffix()}`;
    const finalPath = path.join(this.logsDir, `${fileBase}.json`);
    const tmpPath = path.join(this.logsDir, `${fileBase}.tmp`);

    const content = safeStringify(payload, this.nowFn);

    // Atomic write: write temp then rename
    const writeResult = await fromPromise(
      fs.writeFile(tmpPath, content, { encoding: "utf8", flag: "wx" }),
    );
    if (!writeResult.ok) {
      throw new LogWriteError(
        "Failed to write log temp file",
        { tmpPath, finalPath, logsDir: this.logsDir },
        writeResult.error,
      );
    }

    const renameResult = await fromPromise(fs.rename(tmpPath, finalPath));
    if (!renameResult.ok) {
      throw new LogWriteError(
        "Failed to finalize log file",
        { tmpPath, finalPath, logsDir: this.logsDir },
        renameResult.error,
      );
    }

    // Best-effort: persist a pointer to the latest run log.
    // This is intentionally stored outside the top-level logs directory so ReportService
    // (which lists *.json in logsDir) won't treat it as a run log.
    try {
      await this.writeLatestRunPointer(finalPath);
    } catch {
      // ignore
    }

    return finalPath;
  }

  private async writeLatestRunPointer(finalPath: string): Promise<void> {
    const metaDir = path.join(this.logsDir, LOG_META_DIR_NAME);
    await fs.mkdir(metaDir, { recursive: true });

    const metaPath = path.join(metaDir, "latest-run.json");
    const tmpMetaPath = path.join(metaDir, `latest-run-${randomSuffix()}.tmp`);

    const content = JSON.stringify(
      {
        updatedAt: this.nowFn().toISOString(),
        logFile: path.basename(finalPath),
      },
      null,
      2,
    );

    await fs.writeFile(tmpMetaPath, content, { encoding: "utf8" });

    const rename1 = await fromPromise(fs.rename(tmpMetaPath, metaPath));
    if (rename1.ok) return;

    // Windows can error when destination exists; replace in a safe-ish way.
    const code = getErrnoCode(rename1.error);
    if (code === "EEXIST" || code === "EPERM") {
      await fs.rm(metaPath, { force: true });
      const rename2 = await fromPromise(fs.rename(tmpMetaPath, metaPath));
      if (rename2.ok) return;
      throw rename2.error;
    }

    throw rename1.error;
  }
}

function getErrnoCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  if (!("code" in err)) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
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
