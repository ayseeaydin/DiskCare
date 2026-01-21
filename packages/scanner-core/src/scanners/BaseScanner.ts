import type { DiscoveredTarget } from "../types/ScanTarget.js";

/**
 * Scanner interface for discovering cleanup targets.
 * Prefer composition: each scanner is a standalone service.
 */
export interface Scanner {
  scan(): Promise<DiscoveredTarget[]>;
}
