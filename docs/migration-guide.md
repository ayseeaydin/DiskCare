# DiskCare Migration Guide

## English

## Migrating Log Formats (v1 to v2)

DiskCare uses semantic versioning for log schemas. If a breaking change occurs (for example a log format update), follow these steps:

1. Check log version: each log file includes a `version` field (for example "0.0.1").
2. Read CHANGELOG.md: breaking changes and migration steps are documented there.
3. Use migration tool: if provided, run `diskcare migrate-logs` to update old logs to the new format.
4. Manual migration: for custom setups, see migration scripts in `scripts/` or contact maintainers.

## Example: v1 to v2 log format

- v1: `{ version: "0.0.1", ... }`
- v2: `{ version: "0.1.0", ... }` (new fields, changed structure)

## Best practices

- Always back up logs before migration
- Test migration on a copy before production

---

## Türkçe

## Log Formatlarını Taşıma (v1'den v2'ye)

DiskCare log şemaları için semantik versiyonlama kullanır. Kırıcı bir değişiklik olursa (ör. log formatı güncellemesi), şu adımları izleyin:

1. Log sürümünü kontrol edin: her log dosyasında `version` alanı vardır (ör. "0.0.1").
2. CHANGELOG.md dosyasını okuyun: kırıcı değişiklikler ve geçiş adımları orada belgelenir.
3. Geçiş aracını kullanın: sağlanmışsa, eski logları yeni formata güncellemek için `diskcare migrate-logs` çalıştırın.
4. Manuel geçiş: özel kurulumlar için `scripts/` altındaki geçiş scriptlerine bakın veya maintainers ile iletişime geçin.

## Örnek: v1'den v2'ye log formatı

- v1: `{ version: "0.0.1", ... }`
- v2: `{ version: "0.1.0", ... }` (yeni alanlar, değişen yapı)

## İyi uygulamalar

- Geçişten önce logları mutlaka yedekleyin
- Production'a almadan önce bir kopya üzerinde test edin
