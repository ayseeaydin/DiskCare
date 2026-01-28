# @diskcare/scanner-core

Filesystem scanners and analysis services used by DiskCare.

## What it provides

- `ScannerService` to orchestrate scans
- Built-in scanners:
  - `OsTempScanner`
  - `NpmCacheScanner`
- Types for scan targets and metrics

## Usage

```ts
import { ScannerService, OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";

const scanners = [new OsTempScanner(), new NpmCacheScanner()];
const service = new ScannerService(scanners);

const targets = await service.scanAll();
```

## Notes

- This package is designed for dependency injection and testability.
- Test-only scanners live under `src/__tests__/fixtures` and are not exported.
