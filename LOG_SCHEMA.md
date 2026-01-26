# DiskCare Log Schema & Versioning

## Versioning Policy

- Her log dosyası bir `version` alanı içerir (ör: "0.0.1").
- Log formatında geriye dönük uyumluluğu bozan bir değişiklik yapıldığında, version artırılır (ör: "0.0.2", "0.1.0", "1.0.0").
- Her yeni format için bir migration fonksiyonu eklenir (ör: `migrateV1toV2`, `migrateV2toV3`).
- Log okuyan servisler (ör: ReportService), logu okurken version’a bakar ve gerekirse migration pipeline’dan geçirir.

## Migration Pipeline

- Migration fonksiyonları zincir halinde çalışır, eski loglar adım adım en güncel formata dönüştürülür.
- Migration fonksiyonları `src/reporting/ReportService.ts` içinde veya ayrı bir dosyada tutulur.
- Her migration fonksiyonu, bir önceki versiyondan bir sonrakine geçişi garanti eder.

## Örnek

```js
{
  "version": "0.0.1",
  "command": "scan",
  ...
}
```

Bir sonraki formatta yeni alanlar eklenirse:

```js
{
  "version": "0.0.2",
  "command": "scan",
  "newField": "...",
  ...
}
```

## Sürüm Değişikliği ve Migration Adımları

1. Log formatında değişiklik yapıldığında, yeni bir migration fonksiyonu ekleyin.
2. `version` alanını yeni sürüme yükseltin.
3. Migration pipeline’a yeni fonksiyonu ekleyin.
4. Gerekirse eski logları topluca migrate eden bir script yazın.

## Notlar

- Migration fonksiyonları ve versioning, teknik borç birikmesini ve backward compatibility için karmaşık fallback zincirlerini önler.
- Her schema değişikliği PR’ında bu dosya güncellenmelidir.
