
# DiskCare Changelog

## English

## [1.0.0] - 2026-01-27

### Added
- Initial public release: scan, clean, report, config, init commands
- Triple-gate safety model
- Custom rules via rules.json
- Log schema versioning (version: "0.0.1")
- Local-only analytics (privacy-first)

#### Highlights
- **@diskcare/shared-utils** package introduced
- Custom paths support in rules
- Improved error context and logging
- New edge-case and manual tests (symlink, permission, UNC, trash)

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- All known edge cases covered by tests

## Backward Compatibility
- All breaking changes will be documented here
- Migration guides will be provided for future log format changes

---

## Türkçe

## [1.0.0] - 27.01.2026

### Eklendi
- İlk herkese açık sürüm: scan, clean, report, config, init komutları
- Üçlü güvenlik modeli
- rules.json ile özel kural desteği
- Log şeması versiyonlama (sürüm: "0.0.1")
- Sadece yerel analiz (gizlilik öncelikli)

#### Öne Çıkanlar
- **@diskcare/shared-utils** paketi eklendi
- Kurallarda özel yol (custom path) desteği
- Hata bağlamı ve loglamada iyileştirmeler
- Yeni edge-case ve manuel testler (symlink, izin, UNC, çöp kutusu)

### Değişti
- Yok

### Kaldırıldı
- Yok

### Düzeltildi
- Bilinen tüm edge-case'ler testlerle kapsandı

## Geriye Dönük Uyumluluk
- Tüm kırıcı değişiklikler burada belgelenecek
- Gelecekteki log formatı değişiklikleri için geçiş rehberleri sağlanacak
