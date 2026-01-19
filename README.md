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
- 🧠 Rule-based decisions with risk levels | Risk seviyeleriyle kural tabanlı kararlar
- 📊 Detailed file system metrics | Detaylı dosya sistemi metrikleri
- 📝 JSON audit logs | JSON denetim kayıtları
- 🗑️ Safe deletion via OS trash | İşletim sistemi çöp kutusu ile güvenli silme

---

## Architecture | Mimari

**Monorepo structure with 3 packages:**

```
cli/                        # Main CLI application | Ana CLI uygulaması
  commands/                 # scan, clean, report, schedule
  cleaning/                 # CleanPlanner
  reporting/                # ReportService

packages/
  scanner-core/             # File system scanning & analysis
    scanners/               # NpmCache, OsTemp, SandboxCache
    analyzers/              # FileSystemAnalyzer

  rules-engine/             # Decision engine for cleanup safety
                            # Risk assessment: safe/caution
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

# Scan disk targets | Disk hedeflerini tara
node cli/dist/index.js scan

# Plan cleanup (dry-run) | Temizleme planla (dry-run)
node cli/dist/index.js clean

# Execute cleanup | Temizlemeyi uygula
node cli/dist/index.js clean --apply

# Generate report | Rapor oluştur
node cli/dist/index.js report
```

---

## Configuration | Yapılandırma

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

**🚧 In Progress | Devam Eden:**

- Additional scanner types (pip, cargo, Docker)
- Enhanced reporting
- Schedule command

---

## License

MIT
