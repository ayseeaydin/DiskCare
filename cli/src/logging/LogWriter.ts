import fs from "node:fs/promises";
import path from "node:path";

export class LogWriter {
  constructor(private readonly logsDir: string) {}

  async writeRunLog(payload: unknown): Promise<string> {
    await fs.mkdir(this.logsDir, { recursive: true });

    const fileName = `run-${timestampForFileName(new Date())}.json`;
    const filePath = path.join(this.logsDir, fileName);

    const content = JSON.stringify(payload, null, 2);
    await fs.writeFile(filePath, content, "utf8");

    return filePath;
  }
}

function timestampForFileName(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}
