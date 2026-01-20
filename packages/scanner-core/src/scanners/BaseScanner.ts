import type { DiscoveredTarget } from "../types/ScanTarget.js";

export abstract class BaseScanner {
  abstract scan(): Promise<DiscoveredTarget[]>;
}
