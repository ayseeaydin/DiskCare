import type { ScanTarget } from "../types/ScanTarget.js";

export abstract class BaseScanner {
  abstract scan(): Promise<ScanTarget[]>;
}
