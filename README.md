# DiskCare

> **⚠️ Development Phase** | **Geliştirme Aşamasında**

A developer-focused disk hygiene CLI that safely analyzes and cleans reproducible cache files using rule-based decision engine.

Geliştiricilere odaklı, kural tabanlı karar motoruyla önbellek ve geçici dosyaları güvenle analiz edip temizleyen bir disk hijyen aracı.

---

## What It Does | Ne Yapar

DiskCare scans common developer cache directories (npm cache, OS temp, etc.), calculates space usage, and plans safe cleanup operations based on configurable rules. Every decision is explainable and logged.

DiskCare yaygın geliştirici önbellek dizinlerini (npm cache, OS temp, vb.) tarar, alan kullanımını hesaplar ve yapılandırılabilir kurallara göre güvenli temizleme işlemleri planlar. Her karar açıklanabilir ve loglanır.

**Key Features | Temel Özellikler:**

- 🛡️ Safe by default (dry-run mode) | Varsayılan olarak güvenli (dry-run modu)
- ✅ Explicit apply gate: `--apply --no-dry-run --yes` required | Açık onay kapısı: `--apply --no-dry-run --yes` zorunlu
- 🧠 Rule-based decisions with risk levels | Risk seviyeleriyle kural tabanlı kararlar
- 📊 Detailed file system metrics | Detaylı dosya sistemi metrikleri
- 📝 JSON audit logs | JSON denetim kayıtları
- 🗑️ Safe deletion via OS trash | İşletim sistemi çöp kutusu ile güvenli silme
- 🧯 Consistent errors with codes + `--verbose` for stack/cause | Kodlu tutarlı hatalar + detay için `--verbose`

---

## Architecture | Mimari

**Monorepo structure with 3 packages:**

```
cli/                        # Main CLI application | Ana CLI uygulaması
  src/
    commands/               # scan, clean, report, schedule
    cleaning/               # CleanPlanner
    reporting/              # ReportService
    logging/                # JSON run logs

packages/
  scanner-core/             # File system scanning & analysis
    src/
      scanners/             # NpmCache, OsTemp, SandboxCache
      analyzers/            # FileSystemAnalyzer

  rules-engine/             # Decision engine for cleanup safety
    src/                    # config loader + rules evaluation
```

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

DiskCare reads rules from `./config/rules.json` by default.

Varsayılan olarak kuralları `./config/rules.json` dosyasından okur.

- Create a starter config: `diskcare init` (won't overwrite unless `--force`)
- Başlangıç config oluştur: `diskcare init` (`--force` olmadan overwrite etmez)
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
