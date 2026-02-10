export { ScannerService } from "./ScannerService.js";
export { FileSystemAnalyzer } from "./analyzers/FileSystemAnalyzer.js";

export type { Scanner } from "./scanners/BaseScanner.js";
export { OsTempScanner } from "./scanners/OsTempScanner.js";
export { NpmCacheScanner } from "./scanners/NpmCacheScanner.js";

// v2: New scanners (scan-only)
export {
  ChromiumCacheScanner,
  createChromeCacheScanner,
  createChromeCodeCacheScanner,
  createChromeGPUCacheScanner,
  createEdgeCacheScanner,
  createEdgeCodeCacheScanner,
  createEdgeGPUCacheScanner,
  createBraveCacheScanner,
  createBraveCodeCacheScanner,
  createBraveGPUCacheScanner,
} from "./scanners/ChromiumCacheScanner.js";
export { FirefoxCacheScanner } from "./scanners/FirefoxCacheScanner.js";
export {
  VSCodeCacheScanner,
  createVSCodeCacheScanner,
  createVSCodeCachedDataScanner,
  createVSCodeGPUCacheScanner,
} from "./scanners/VSCodeCacheScanner.js";
export { JetBrainsCacheScanner } from "./scanners/JetBrainsCacheScanner.js";
export { PipCacheScanner } from "./scanners/PipCacheScanner.js";
export {
  RepoLocalCacheScanner,
  createRepoLocalCacheScanner,
} from "./scanners/RepoLocalCacheScanner.js";

export type { DiscoveredTarget, ScanTarget, ScanTargetKind } from "./types/ScanTarget.js";
export type { ScanMetrics } from "./types/ScanMetrics.js";
export type { FsLike } from "./analyzers/FsLike.js";

export { pathExists } from "./utils/pathExists.js";
export { toErrorMessage } from "./utils/errorMessage.js";
export { toOneLine, toErrorMessageOneLine } from "./utils/errorMessage.js";

// v2: Artifact Catalog (data-first approach for scan-first philosophy)
export type {
  ArtifactCategory,
  ArtifactScope,
  ArtifactRisk,
  ArtifactAction,
  ArtifactPrecondition,
  ArtifactDefinition,
  ArtifactCatalog,
} from "./catalog/ArtifactCatalog.js";
export {
  DEFAULT_ARTIFACT_CATALOG,
  getArtifactById,
  getArtifactsByCategory,
  getCleanableArtifacts,
  getScanOnlyArtifacts,
  checkPreconditions,
} from "./catalog/ArtifactCatalog.js";

// v2: Scanner Registry (plugin-based scanner management)
export type {
  ScannerFactory,
  ScannerDeps,
  ScannerRegistryEntry,
} from "./registry/ScannerRegistry.js";
export { ScannerRegistry, defaultRegistry } from "./registry/ScannerRegistry.js";

// v2: Safety Gates (precondition validation for safe operations)
export type { SafetyCheckResult, ProcessChecker, PermissionChecker } from "./safety/SafetyGate.js";
export { SafetyGate } from "./safety/SafetyGate.js";
