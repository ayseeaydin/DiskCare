import fs from "node:fs/promises";

import { FileSystemAnalyzer } from "./analyzers/FileSystemAnalyzer.js";
import type { BaseScanner } from "./scanners/BaseScanner.js";
import type { ScanTarget } from "./types/ScanTarget.js";

export class ScannerService {
  private readonly analyzer = new FileSystemAnalyzer();

  constructor(private readonly scanners: BaseScanner[]) { }

  async scanAll(): Promise<ScanTarget[]> {
    const targets: ScanTarget[] = [];

    for (const scanner of this.scanners) {
      const found = await scanner.scan();
      targets.push(...found);
    }

    // Deterministic output order for CLI/logs
    targets.sort((a, b) => a.id.localeCompare(b.id));

    for (const target of targets) {
      target.exists = await pathExists(target.path);
      target.metrics = await this.analyzer.analyze(target.path);
    }

    return targets;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
