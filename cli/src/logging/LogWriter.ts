import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export class LogWriter {
  constructor(private readonly logsDir: string) {}

  async writeRunLog(payload: unknown): Promise<string> {
    await fs.mkdir(this.logsDir, { recursive: true });

    const fileBase = `run-${timestampForFileName(new Date())}-${process.pid}-${randomSuffix()}`;
    const finalPath = path.join(this.logsDir, `${fileBase}.json`);
    const tmpPath = path.join(this.logsDir, `${fileBase}.tmp`);

    const content = safeStringify(payload);

    // Atomic write: write temp then rename
    await fs.writeFile(tmpPath, content, { encoding: "utf8", flag: "wx" });
    await fs.rename(tmpPath, finalPath);

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

function safeStringify(payload: unknown): string {
  try {
    return JSON.stringify(payload, jsonReplacer, 2);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // last-resort fallback: keep log file valid JSON
    return JSON.stringify(
      {
        version: "0.0.1",
        timestamp: new Date().toISOString(),
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
