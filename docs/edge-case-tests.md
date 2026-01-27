# DiskCare Edge Case Test Strategy

## Why Edge Cases Matter

Happy path testleri yeterli değildir. DiskCare'de en kötü senaryolar ve fallback zincirleri birinci sınıf testlerle kapsanır.

## Example Edge Case Tests

```typescript
test("CleanCommand - when all eligible targets fail, exit code should be 1", ...)
test("CleanCommand - when config is missing AND npm command fails, fallback chain works", ...)
test("ScanCommand - when metrics are missing, status is caution", ...)
test("ReportService - when logs dir is missing, fallback to meta/latest-run.json", ...)
```

## Practice

- "En kötü senaryo nedir?" diye sor, onu test et.
- Fallback ve error path'leri property-based ve E2E testlerle kapsa.
- Her yeni feature için edge case testi ekle.

---

Daha fazla örnek için test dosyalarına ve docs/safety-model.md'ye bak.
