# @diskcare/shared-utils

## English

Shared utilities used across DiskCare packages.

### What it provides
- Result helpers (`ok`, `err`, `fromPromise`, etc.)
- Error message formatting (`toErrorMessage`, `toOneLine`)
- PathResolver for platform-aware path handling

### Usage
```ts
import { ok, err, fromPromise, toErrorMessageOneLine, PathResolver } from "@diskcare/shared-utils";
const resolver = new PathResolver(process.platform);
const path = resolver.join(process.cwd(), "config", "rules.json");
```

---

## Türkçe

DiskCare paketlerinde ortak kullanılan yardımcı araçlar.

### Sağladıkları
- Sonuç yardımcıları (`ok`, `err`, `fromPromise`, vb.)
- Hata mesajı biçimlendirme (`toErrorMessage`, `toOneLine`)
- Platforma duyarlı yol işlemleri için PathResolver

### Kullanım
```ts
import { ok, err, fromPromise, toErrorMessageOneLine, PathResolver } from "@diskcare/shared-utils";
const resolver = new PathResolver(process.platform);
const path = resolver.join(process.cwd(), "config", "rules.json");
```
