# DiskCare

## English

> **Windows-only beta:** DiskCare is currently tested only on Windows. Contributions and testing are needed for Linux/macOS support. Use with caution on other platforms.

> DiskCare is a safe, auditable CLI tool for disk cleanup with explainable rules, designed for developers.

---

## 📦 Published NPM Package

DiskCare is published on npm as [@diskcare/cli](https://www.npmjs.com/package/@diskcare/cli). It can be installed and used by anyone.

### Quick Start

1. **Node.js (>=18) must be installed.**
2. In your terminal, run:

  ```sh
  npm install -g @diskcare/cli
  ```

3. After installation, see all commands with:

  ```sh
  diskcare --help
  ```

4. Basic usage examples:

  ```sh
  diskcare scan
  diskcare clean
  diskcare clean --apply --no-dry-run --yes
  diskcare report
  ```

All dependencies are installed automatically. Installing only @diskcare/cli is sufficient.

---

## Why DiskCare Exists

Over time, a developer machine silently fills up.

Caches, temp folders, build artifacts, abandoned sandboxes.
Eventually you cannot install a new program without manually hunting folders and searching:

"Can I delete this? Will my system break?"

That uncertainty costs time, focus, and confidence.

DiskCare was built to take control back.

Not by blindly deleting files, but by:

- discovering known safe targets
- analyzing them
- deciding with explicit rules
- acting only when you consciously confirm

DiskCare is designed for people who care about safety, transparency, and reproducibility.

---

## What DiskCare Does

DiskCare scans known disk-hogging locations (OS temp, npm cache, project sandboxes, etc.), analyzes them, and builds a cleaning plan using a rule engine.

Every run is:

- explainable
- logged
- reversible (Trash, not hard-delete)
- safe by default

### Core Capabilities

- Target discovery - finds common cache and temp locations
- Filesystem analysis - size, file count, age, partial or permission errors
- Rule engine - risk levels and safeAfterDays policies
- Audit logging - every run saved as structured JSON
- Safety gates - dry-run first, triple confirmation to apply
- Reports - summarize historical cleanups

---

## Safety Model (Non-Negotiable)

DiskCare is intentionally hard to misuse.

Default behavior:

```
diskcare clean
```

- builds a plan
- deletes nothing

To actually move files to Trash, all three are required:

```
diskcare clean --apply --no-dry-run --yes
```

This design prevents:

- accidental deletes
- copy-paste disasters
- automation without intent

Files are moved to Trash / Recycle Bin, not permanently removed.

---

## Example Workflow

### 1. Scan your system

```bash
diskcare scan
```

You get a structured report:

- what exists
- what was skipped
- how big each target is
- which rules apply

A JSON log is saved automatically.

---

### 2. Build a cleaning plan

```bash
diskcare clean
```

DiskCare classifies every target:

- eligible
- caution
- blocked

Each one comes with reasons.

Nothing is deleted.

---

### 3. Apply consciously

```bash
diskcare clean --apply --no-dry-run --yes
```

Eligible targets are moved to Trash.

The run is logged with:

- per-target results
- failure reasons
- estimated freed space

---

### 4. Review history

```bash
diskcare report
```

Get a summary of:

- total runs
- latest scan snapshot
- total cleaned space
- failed vs successful applies

---

## Architecture Overview

```
cli/
  commands/        -> scan, clean, report, init, config (schedule is disabled)
  cleaning/        -> plan builder
  logging/         -> atomic audit logs
  reporting/       -> historical aggregation

packages/
  scanner-core/    -> filesystem analyzers and scanners
  rules-engine/    -> policy and risk decision engine
```

### Design Principles

- deterministic outputs
- dependency injection everywhere
- testable without touching real disk
- logs as a first-class product feature

---

## Configuration

Rules are defined in `rules.json`.

Generate a starter config:

```bash
diskcare init
```

Available templates:

```bash
diskcare init --list-policies
```

Override path globally:

```bash
diskcare --config ./my-rules.json scan
```

Manual test rules:

- The default `config/rules.json` is safe for normal use and does not include manual test targets.
- For edge-case/manual testing, use `config/rules.manual.json` (includes symlink, permission, UNC, trash targets).
- Example: `diskcare --config ./config/rules.manual.json scan`

Default behavior when config is missing:

- DiskCare continues with safe default rules (risk=caution, safeAfterDays=30)
- You will see a warning and onboarding tips in the CLI output

Custom path targets:

- You can optionally add `paths` to a rule to scan custom locations.
- Each path becomes a target under kind `custom-path` and uses the rule's id for decisions.
- Relative paths are resolved from the current working directory.

Example:

```json
{
  "id": "symlink-test",
  "risk": "safe",
  "safeAfterDays": 0,
  "description": "Custom test path",
  "paths": ["d:/diskcare/_manual/symlink-test/link.txt"]
}
```

---

## Example Rule

```json
{
  "id": "npm-cache",
  "risk": "safe",
  "safeAfterDays": 14,
  "description": "npm cache is reproducible"
}
```

Rules define:

- how risky a target is
- how old it must be before eligibility
- why it exists

---

## Logging Model

Each run produces a JSON log in `./logs/`.

They include:

- scan metrics
- clean plans
- apply results
- timestamps
- versioning

A meta pointer tracks the latest run.

This makes DiskCare usable for:

- audits
- dashboards
- automation
- long-term disk hygiene tracking

---

## Current Status

### Implemented

- Core scanning engine
- Rule-based decision system
- scan / clean / report / init / config commands
- safe-by-default apply gates
- atomic structured logging
- comprehensive automated tests

### In Progress

- additional scanners (pip, cargo, docker, browsers)
- richer report output
- scheduling implementation

---

## Non-Goals

DiskCare is not:

- a one-click "boost your PC" cleaner
- a registry optimizer
- a black-box deleter

It is a developer control tool.

---

## License

MIT

---

## Test Coverage and Safety Notes

- SandboxCacheScanner is test-only and not included in production builds.
- ScheduleCommand is a stub (coming soon); tests only verify it does not crash.
- NpmCacheScanner integration tests do not touch the real npm cache; all paths and outputs are mocked for safety and determinism.

See the related test files for details.

---

## Trash and Undo Notes

- DiskCare moves files to the OS Trash / Recycle Bin when applying.
- Restore is performed using your OS UI or tooling. There is no `diskcare restore` command yet.
- Apply is not atomic. If interrupted, some targets may be moved while others remain.

---

## Platform Support

Important: As of January 28, 2026, DiskCare has only been developed and tested on Windows 10/11.
Linux and macOS have not been tested. Treat them as unverified and expect platform-specific issues.

- Windows 10/11: supported and tested
- macOS: untested (theoretical support only)
- Linux: untested (theoretical support only)

If you test DiskCare on other platforms, please share your findings and help improve cross-platform support.

---

If DiskCare saved you from manual cleanup hell, it did its job.

# DiskCare

## Türkçe

> **Sadece Windows için beta:** DiskCare şu anda yalnızca Windows ortamında test edilmiştir. Linux/macOS desteği için katkı ve testlere ihtiyaç vardır. Diğer platformlarda çalıştırmadan önce dikkatli olun.

> DiskCare, geliştiriciler için açıklanabilir kurallarla disk temizliği yapmayı sağlayan, güvenli ve denetlenebilir bir CLI aracıdır.

---

## 📦 Yayınlanmış NPM Paketi

DiskCare, npm üzerinde [@diskcare/cli](https://www.npmjs.com/package/@diskcare/cli) adıyla yayınlanmıştır. Herkes tarafından indirilebilir ve kullanılabilir.

### Hızlı Başlangıç

1. **Node.js (>=18) kurulu olmalı.**
2. Terminalde şu komutu çalıştırın:

  ```sh
  npm install -g @diskcare/cli
  ```

3. Kurulumdan sonra tüm komutları görmek için:

  ```sh
  diskcare --help
  ```

4. Temel kullanım örnekleri:

  ```sh
  diskcare scan
  diskcare clean
  diskcare clean --apply --no-dry-run --yes
  diskcare report
  ```

Tüm bağımlılıklar otomatik olarak kurulur. Sadece @diskcare/cli paketini yüklemek yeterlidir.

---

## DiskCare Neden Var?

Zamanla bir geliştirici makinesi sessizce dolar.

Cache'ler, geçici klasörler, build çıktıları, terk edilmiş sandbox'lar.
Bir noktadan sonra yeni bir program kurmak için klasörleri manuel arayıp şunu sormaya başlarsınız:

"Bunu silebilir miyim? Sistem bozulur mu?"

Bu belirsizlik zaman, odak ve güven kaybına yol açar.

DiskCare bu kontrolü geri almak için üretildi.

Dosyaları körlemesine silerek değil, şu şekilde:

- bilinen güvenli hedefleri keşfederek
- onları analiz ederek
- açık kurallarla karar vererek
- yalnızca bilinçli onay verdiğinizde işlem yaparak

DiskCare, güvenliğe, şeffaflığa ve tekrarlanabilirliğe önem verenler için tasarlanmıştır.

---

## DiskCare Ne Yapar?

DiskCare bilinen disk şişiren konumları (OS temp, npm cache, proje sandbox'ları vb.) tarar, analiz eder ve bir kural motoru ile temizlik planı oluşturur.

Her çalıştırma:

- açıklanabilir
- loglanır
- geri alınabilir (Trash, kalıcı silme değil)
- varsayılan olarak güvenlidir

### Temel Yetenekler

- Hedef keşfi - yaygın cache ve temp konumlarını bulur
- Dosya sistemi analizi - boyut, dosya sayısı, yaş, kısmi veya izin hataları
- Kural motoru - risk seviyeleri ve safeAfterDays politikaları
- Denetim logları - her çalıştırma yapılandırılmış JSON olarak kaydedilir
- Güvenlik kapıları - önce dry-run, apply için üçlü onay
- Raporlar - geçmiş temizlikleri özetler

---

## Güvenlik Modeli (Pazarlık Yok)

DiskCare bilerek yanlış kullanımı zorlaştırır.

Varsayılan davranış:

```
diskcare clean
```

- plan oluşturur
- hiçbir şey silmez

Dosyaları Trash'e taşımak için üçünün de sağlanması gerekir:

```
diskcare clean --apply --no-dry-run --yes
```

Bu tasarım şunları engeller:

- yanlışlıkla silme
- kopyala-yapıştır faciaları
- niyet olmadan otomasyon

Dosyalar kalıcı olarak kaldırılmaz, Trash / Recycle Bin'e taşınır.

---

## Örnek İş Akışı

### 1. Sistemi tara

```bash
diskcare scan
```

Yapılandırılmış bir rapor alırsınız:

- nelerin var olduğu
- nelerin atlandığı
- her hedefin boyutu
- hangi kuralların uygulandığı

Bir JSON logu otomatik kaydedilir.

---

### 2. Temizlik planı oluştur

```bash
diskcare clean
```

DiskCare her hedefi şu şekilde sınıflandırır:

- uygun (eligible)
- dikkat (caution)
- engelli (blocked)

Her biri gerekçeleriyle gelir.

Hiçbir şey silinmez.

---

### 3. Bilinçli uygula

```bash
diskcare clean --apply --no-dry-run --yes
```

Uygun hedefler Trash'e taşınır.

Çalıştırma şunları içerir:

- hedef bazlı sonuçlar
- hata nedenleri
- tahmini boşalan alan

---

### 4. Geçmişi incele

```bash
diskcare report
```

Şunların özetini alırsınız:

- toplam çalıştırma sayısı
- en son tarama anlık görüntüsü
- toplam temizlenen alan
- başarılı ve başarısız apply sayıları

---

## Mimari Genel Bakış

```
cli/
  commands/        -> scan, clean, report, init, config (schedule is disabled)
  cleaning/        -> plan builder
  logging/         -> atomic audit logs
  reporting/       -> historical aggregation

packages/
  scanner-core/    -> filesystem analyzers and scanners
  rules-engine/    -> policy and risk decision engine
```

### Tasarım İlkeleri

- deterministik çıktılar
- her yerde dependency injection
- gerçek diske dokunmadan test edilebilirlik
- birinci sınıf ürün özelliği olarak loglar

---

## Konfigürasyon

Kurallar `rules.json` dosyasında tanımlanır.

Başlangıç konfigürasyonu oluştur:

```bash
diskcare init
```

Mevcut şablonlar:

```bash
diskcare init --list-policies
```

Yolunu global olarak override et:

```bash
diskcare --config ./my-rules.json scan
```

Manuel test kuralları:

- Varsayılan `config/rules.json` normal kullanım için güvenlidir ve manuel test hedeflerini içermez.
- Edge-case/manuel test için `config/rules.manual.json` kullanın (symlink, izin, UNC, trash hedeflerini içerir).
- Örnek: `diskcare --config ./config/rules.manual.json scan`

Konfigürasyon eksikse varsayılan davranış:

- DiskCare güvenli varsayılan kurallarla devam eder (risk=caution, safeAfterDays=30)
- CLI çıktısında bir uyarı ve onboarding ipuçları görürsünüz

Özel yol hedefleri:

- Bir kurala isteğe bağlı olarak `paths` ekleyerek özel konumları tarayabilirsiniz.
- Her path `custom-path` türünde bir hedef olur ve karar için kuralın id'sini kullanır.
- Göreli yollar mevcut çalışma dizininden çözülür.

Örnek:

```json
{
  "id": "symlink-test",
  "risk": "safe",
  "safeAfterDays": 0,
  "description": "Custom test path",
  "paths": ["d:/diskcare/_manual/symlink-test/link.txt"]
}
```

---

## Örnek Kural

```json
{
  "id": "npm-cache",
  "risk": "safe",
  "safeAfterDays": 14,
  "description": "npm cache is reproducible"
}
```

Kurallar şunları tanımlar:

- bir hedefin ne kadar riskli olduğu
- uygun olabilmesi için ne kadar eski olması gerektiği
- neden var olduğu

---

## Log Modeli

Her çalıştırma `./logs/` altında bir JSON logu üretir.

Loglar şunları içerir:

- tarama metrikleri
- temizlik planları
- apply sonuçları
- zaman damgaları
- sürüm bilgisi

Bir meta işaretçi en son çalıştırmayı takip eder.

Bu, DiskCare'i şunlar için kullanılabilir kılar:

- denetimler
- panolar
- otomasyon
- uzun vadeli disk hijyeni takibi

---

## Mevcut Durum

### Tamamlananlar

- Çekirdek tarama motoru
- Kural tabanlı karar sistemi
- scan / clean / report / init / config komutları
- varsayılan güvenli apply kapıları
- atomik yapılandırılmış loglama
- kapsamlı otomatik testler

### Devam Edenler

- ek tarayıcılar (pip, cargo, docker, tarayıcılar)
- daha zengin rapor çıktısı
- zamanlama uygulaması

---

## Hedef Dışı

DiskCare şunlar değildir:

- tek tıkla "bilgisayar hızlandıran" bir temizleyici
- registry optimizasyon aracı
- kara kutu silici

Bu bir geliştirici kontrol aracıdır.

---

## Lisans

MIT

---

## Test Kapsamı ve Güvenlik Notları

- SandboxCacheScanner sadece test amaçlıdır ve production build'lerde yer almaz.
- ScheduleCommand bir taslaktır (coming soon); testler sadece çökmediğini doğrular.
- NpmCacheScanner entegrasyon testleri gerçek npm cache'e dokunmaz; tüm yollar ve çıktılar güvenlik ve determinizm için mock'lanır.

Detaylar için ilgili test dosyalarına bakın.

---

## Trash ve Geri Alma Notları

- DiskCare uygulama sırasında dosyaları OS Trash / Recycle Bin'e taşır.
- Geri alma, işletim sisteminizin arayüzü veya araçları ile yapılır. Henüz `diskcare restore` komutu yoktur.
- Apply atomik değildir. Kesilirse bazı hedefler taşınırken bazıları kalabilir.

---

## Platform Desteği

Önemli: 28 Ocak 2026 itibarıyla DiskCare yalnızca Windows 10/11 üzerinde geliştirilmiş ve test edilmiştir.
Linux ve macOS test edilmemiştir. Doğrulanmamış kabul edin ve platforma özgü sorunlar bekleyin.

- Windows 10/11: desteklenir ve test edilmiştir
- macOS: test edilmemiş (yalnızca teorik destek)
- Linux: test edilmemiş (yalnızca teorik destek)

DiskCare'i diğer platformlarda test ederseniz, lütfen bulgularınızı paylaşın ve çapraz platform desteğini geliştirmeye yardımcı olun.

---

Eğer DiskCare sizi manuel temizlik cehenneminden kurtardıysa, görevini yaptı demektir.
