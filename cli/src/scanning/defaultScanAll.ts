import type { ScanTarget } from "@diskcare/scanner-core";
import { ScannerService, OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";
import { ConfigPathsScanner } from "./ConfigPathsScanner.js";

import type { CommandContext } from "../types/CommandContext.js";

export async function defaultScanAll(context: CommandContext): Promise<ScanTarget[]> {
  const scanOnly = String(context.env.DISKCARE_SCAN_ONLY ?? "")
    .trim()
    .toLowerCase();

  const allScanners = [
    new ConfigPathsScanner({ configPath: context.configPath, cwd: context.cwd }),
    new OsTempScanner(),
    new NpmCacheScanner({
      platform: context.platform,
      env: context.env,
      homedir: context.homedir,
    }),
  ];

  let scanners = allScanners;
  if (scanOnly === "custom" || scanOnly === "custom-path") {
    scanners = allScanners.filter((s) => s instanceof ConfigPathsScanner);
  } else if (scanOnly === "os" || scanOnly === "os-temp" || scanOnly === "temp") {
    scanners = allScanners.filter((s) => s instanceof OsTempScanner);
  } else if (scanOnly === "npm" || scanOnly === "npm-cache") {
    scanners = allScanners.filter((s) => s instanceof NpmCacheScanner);
  }

  const scannerService = new ScannerService(scanners);

  return scannerService.scanAll();
}
