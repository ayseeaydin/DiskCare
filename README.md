# DiskCare

**DiskCare** geliştiricilere yönelik, disk üzerindeki önbellek ve geçici dosyaları analiz edip güvenli şekilde temizlemeyi amaçlayan bir komut satırı uygulamasıdır. Kural tabanlı karar motoru ile hangi dosyaların ne zaman ve ne kadar güvenli şekilde silinebileceğini planlar, işlemleri ve kararları JSON log olarak kaydeder.

## Mevcut Durum

- Temel CLI komutları (scan, clean, report, config, init) çalışır durumda.
- Dosya sistemi üzerinde yaygın önbellek ve temp dizinlerini tarayabiliyor.
- Kural tabanlı temizlik planı oluşturulabiliyor (config/rules.json ile).
- Temizlik işlemleri varsayılan olarak dry-run modunda, gerçek silme için açık onay gerektiriyor.
- Her çalıştırma JSON log olarak kaydediliyor (`logs/` dizini).
- Hatalar kod ve kısa açıklama ile tutarlı şekilde raporlanıyor, `--verbose` ile detay alınabiliyor.
- Testler ve kodun büyük kısmı tamamlanmış durumda, bazı ek modüller ve gelişmiş raporlama henüz eksik.

## Kısa Mimari Özeti

- **cli/**: Ana uygulama ve komutlar (scan, clean, report, config, init, schedule).
- **packages/scanner-core/**: Dosya sistemi tarama ve analiz modülleri.
- **packages/rules-engine/**: Temizlik kurallarını ve risk değerlendirmesini yöneten motor.
- **config/**: Temizlik kuralları (rules.json).
- **logs/**: Her çalıştırmanın JSON logları.

## Kullanım

```bash
# Bağımlılıkları yükle
npm install

# CLI'yi çalıştır (yardım için)
node cli/dist/index.js --help

# Temizlik planı oluştur (dry-run)
node cli/dist/index.js clean

# Gerçek temizlik (açık onay gerektirir)
node cli/dist/index.js clean --apply --no-dry-run --yes

# Rapor oluştur
node cli/dist/index.js report
```

## Güvenlik Modeli

- Varsayılan olarak dry-run: dosya silinmez, sadece planlama yapılır.
- Gerçek silme için `--apply --no-dry-run --yes` bayraklarının hepsi gereklidir.

## Loglar

- Her komut çalıştırıldığında ilgili JSON logu `logs/` dizinine kaydedilir.

## Hatalar ve Debug

- Hatalar kod ve kısa açıklama ile raporlanır.
- `--verbose` ile detaylı hata ve stack trace alınabilir.

## Yapılandırma

- Temizlik kuralları `config/rules.json` dosyasından okunur.
- Başlangıç config oluşturmak için: `diskcare init`
- Farklı politika şablonları için: `diskcare init --list-policies`
- Config yolunu değiştirmek için: `--config <path>`

## Eksikler ve Geliştirme Alanları

- Ek scanner tipleri (pip, cargo, Docker) henüz tamamlanmadı.
- Gelişmiş raporlama ve zamanlama (schedule) komutu üzerinde çalışmalar devam ediyor.
- Dokümantasyon ve örnek kullanım senaryoları geliştirilmeli.

## Test ve Geliştirme

```bash
# Tüm testleri çalıştır
npm test

# Kodun stilini kontrol et
npm run lint
```

## Lisans

MIT

**Tech Stack:**

- TypeScript 5.5+, Node.js 18+
- Commander.js for CLI
- npm workspaces
- Native Node.js test runner

---

## Usage | Kullanım

```bash
# Install dependencies | Bağımlılıkları yükle
npm install

# Build all packages | Tüm paketleri derle
npm run build

# Run the CLI (built) | CLI'yi çalıştır (build sonrası)
node cli/dist/index.js --help

# Create a starter rules config (default: ./config/rules.json)
# Başlangıç rules config oluştur (varsayılan: ./config/rules.json)
node cli/dist/index.js init

# List available init policies
# Mevcut init policy seçeneklerini listele
node cli/dist/index.js init --list-policies

# Use a custom config path (applies to all commands)
# Özel config yolu kullan (tüm komutlara uygulanır)
node cli/dist/index.js --config ./config/rules.dev.json init --policy aggressive

# Scan disk targets | Disk hedeflerini tara
node cli/dist/index.js scan

# Plan cleanup (dry-run) | Temizleme planla (dry-run)
node cli/dist/index.js clean

# Execute cleanup (requires explicit confirmation flags)
# Temizlemeyi uygula (açık onay flag'leri zorunlu)
node cli/dist/index.js clean --apply --no-dry-run --yes

# Generate report | Rapor oluştur
node cli/dist/index.js report
```

### Safety Model | Güvenlik Modeli

- Default is dry-run: no deletion happens unless you explicitly opt in.
- Varsayılan davranış dry-run: açıkça izin vermeden silme yapılmaz.
- To actually delete, you must pass **all**: `--apply --no-dry-run --yes`.
- Gerçek silme için **hepsi** gerekir: `--apply --no-dry-run --yes`.

### Logs | Loglar

- Runs write JSON logs under `./logs` (relative to your current working directory).
- Çalıştırmalar `./logs` altına JSON log yazar (çalıştığın dizine göre).

### Errors & Debugging | Hatalar ve Debug

- Errors are reported consistently with a code and a short hint.
- Hatalar kod + kısa ipucu ile tutarlı şekilde raporlanır.
- Use `--verbose` to include stack trace and cause chain.
- Stack trace ve cause zinciri için `--verbose` kullan.

---

## Configuration | Yapılandırma

DiskCare reads rules from `./config/rules.json` when it exists.

If that file is missing, it falls back to a per-user default config location.

Varsayılan olarak `./config/rules.json` varsa onu okur.

Bu dosya yoksa kullanıcı bazlı (per-user) varsayılan config konumuna düşer.

- Create a starter config: `diskcare init` (won't overwrite unless `--force`)
- See available templates: `diskcare init --list-policies`
- Başlangıç config oluştur: `diskcare init` (`--force` olmadan overwrite etmez)
- Mevcut template'leri gör: `diskcare init --list-policies`
- Override config path globally: `--config <path>`
- Config yolunu global değiştir: `--config <path>`

Edit `config/rules.json` to customize cleanup behavior:

```json
{
  "rules": [
    {
      "id": "npm-cache",
      "risk": "safe",
      "safeAfterDays": 14,
      "description": "npm cache is reproducible"
    }
  ],
  "defaults": {
    "risk": "caution",
    "safeAfterDays": 30
  }
}
```

---

## Current Status | Mevcut Durum

**✅ Implemented | Tamamlandı:**

- Core scanning engine with multiple scanners
- Rule-based decision engine
- CLI commands: scan, clean, report
- File system analysis (size, count, age)
- JSON audit logging
- Comprehensive test coverage
- CLI lint with complexity / size budgets
- Centralized CLI error handling (`--verbose`, error codes + hints)

**🚧 In Progress | Devam Eden:**

- Additional scanner types (pip, cargo, Docker)
- Enhanced reporting
- Schedule command

---

## Contributing Notes | Katkı Notları

- Engineering standards, DI approach, and testing guidelines: `docs/quality.md`

---

## Development | Geliştirme

```bash
# Run all tests (all workspaces) | Tüm testler
npm test

# Lint CLI | CLI lint
npm run lint
```

---

## License

MIT
