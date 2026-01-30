
# @diskcare/scanner-core

## English

Filesystem scanners and analysis services used by DiskCare.

### What it provides
- `ScannerService` to orchestrate scans
- Built-in scanners:
  - `OsTempScanner`
  - `NpmCacheScanner`
- Types for scan targets and metrics

### Usage
```ts
import { ScannerService, OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";
const scanners = [new OsTempScanner(), new NpmCacheScanner()];
const service = new ScannerService(scanners);
const targets = await service.scanAll();
```

### Notes
- This package is designed for dependency injection and testability.
- Test-only scanners live under `src/__tests__/fixtures` and are not exported.

### Implementing a custom scanner
Custom scanners implement the `Scanner` interface and return `DiscoveredTarget[]`.
```ts
import type { Scanner, DiscoveredTarget } from "@diskcare/scanner-core";
export class MyScanner implements Scanner {
  async scan(): Promise<DiscoveredTarget[]> {
    return [
      {
        id: "my-target",
        kind: "custom-path",
        path: "/path/to/target",
        displayName: "My Target",
      },
    ];
  }
}
```
Then compose it with `ScannerService`:
```ts
const service = new ScannerService([new MyScanner()]);
const targets = await service.scanAll();
```

---

## Türkçe

DiskCare tarafından kullanılan dosya sistemi tarayıcıları ve analiz servisleri.

### Sağladıkları
- Taramaları yöneten `ScannerService`
- Dahili tarayıcılar:
  - `OsTempScanner`
  - `NpmCacheScanner`
- Tarama hedefleri ve metrikler için tipler

### Kullanım
```ts
import { ScannerService, OsTempScanner, NpmCacheScanner } from "@diskcare/scanner-core";
const scanners = [new OsTempScanner(), new NpmCacheScanner()];
const service = new ScannerService(scanners);
const targets = await service.scanAll();
```

### Notlar
- Bu paket bağımlılık enjeksiyonu ve test edilebilirlik için tasarlanmıştır.
- Sadece test amaçlı tarayıcılar `src/__tests__/fixtures` altında bulunur ve dışa aktarılmaz.

### Özel bir tarayıcı (scanner) eklemek
Özel tarayıcılar `Scanner` arayüzünü uygular ve `DiscoveredTarget[]` döner.
```ts
import type { Scanner, DiscoveredTarget } from "@diskcare/scanner-core";
export class MyScanner implements Scanner {
  async scan(): Promise<DiscoveredTarget[]> {
    return [
      {
        id: "my-target",
        kind: "custom-path",
        path: "/path/to/target",
        displayName: "My Target",
      },
    ];
  }
}
```
Sonra bunu `ScannerService` ile birleştirin:
```ts
const service = new ScannerService([new MyScanner()]);
const targets = await service.scanAll();
```
