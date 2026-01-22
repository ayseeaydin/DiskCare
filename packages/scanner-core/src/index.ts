export { ScannerService } from "./ScannerService.js";

export type { Scanner } from "./scanners/BaseScanner.js";
export { OsTempScanner } from "./scanners/OsTempScanner.js";
export { NpmCacheScanner } from "./scanners/NpmCacheScanner.js";
export { SandboxCacheScanner } from "./scanners/SandboxCacheScanner.js";

export type { DiscoveredTarget, ScanTarget, ScanTargetKind } from "./types/ScanTarget.js";
export type { ScanMetrics } from "./types/ScanMetrics.js";

export { pathExists } from "./utils/pathExists.js";
export { toErrorMessage } from "./utils/errorMessage.js";
export { toOneLine, toErrorMessageOneLine } from "./utils/errorMessage.js";
