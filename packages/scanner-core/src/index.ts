export { ScannerService } from "./ScannerService.js";
export { FileSystemAnalyzer } from "./analyzers/FileSystemAnalyzer.js";

export type { Scanner } from "./scanners/BaseScanner.js";
export { OsTempScanner } from "./scanners/OsTempScanner.js";
export { NpmCacheScanner } from "./scanners/NpmCacheScanner.js";

export type { DiscoveredTarget, ScanTarget, ScanTargetKind } from "./types/ScanTarget.js";
export type { ScanMetrics } from "./types/ScanMetrics.js";
export type { FsLike } from "./analyzers/FsLike.js";

export { pathExists } from "./utils/pathExists.js";
export { toErrorMessage } from "./utils/errorMessage.js";
export { toOneLine, toErrorMessageOneLine } from "./utils/errorMessage.js";
