import type { ScanTarget } from "@diskcare/scanner-core";
import {
  ScannerService,
  OsTempScanner,
  NpmCacheScanner,
  SandboxCacheScanner,
} from "@diskcare/scanner-core";

import type { CommandContext } from "../types/CommandContext.js";

export async function defaultScanAll(context: CommandContext): Promise<ScanTarget[]> {
  const scanOnly = String(context.env.DISKCARE_SCAN_ONLY ?? "")
    .trim()
    .toLowerCase();

  const scanners =
    scanOnly === "sandbox" || scanOnly === "sandbox-only"
      ? [new SandboxCacheScanner({ cwd: context.cwd })]
      : [
          new OsTempScanner(),
          new NpmCacheScanner({
            platform: context.platform,
            env: context.env,
            homedir: context.homedir,
          }),
        ];

  const scannerService = new ScannerService(scanners);

  return scannerService.scanAll();
}
