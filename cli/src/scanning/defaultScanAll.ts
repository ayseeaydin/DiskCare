import type { ScanTarget } from "@diskcare/scanner-core";
import {
  ScannerService,
  OsTempScanner,
  NpmCacheScanner,
  SandboxCacheScanner,
} from "@diskcare/scanner-core";

import type { CommandContext } from "../types/CommandContext.js";

export async function defaultScanAll(context: CommandContext): Promise<ScanTarget[]> {
  const scannerService = new ScannerService([
    new OsTempScanner(),
    new NpmCacheScanner({
      platform: context.platform,
      env: context.env,
      homedir: context.homedir,
    }),
    new SandboxCacheScanner({ cwd: context.cwd }),
  ]);

  return scannerService.scanAll();
}
