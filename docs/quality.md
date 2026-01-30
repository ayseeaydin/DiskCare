# DiskCare Quality & Testing Guide

## English

> Living document: keep this short, practical, and enforced by tests/lint.

## Goals
- Safety-first: cleanup is safe by default; destructive actions require explicit opt-in.
- Explainability: decisions and failures should be explainable (rules + diagnostics + error codes).
- Testability: core logic is testable without touching the real filesystem or shell.
- Consistency: consistent error formatting and predictable CLI output.

---

## Dependency Injection (DI) Principles
Rule of thumb: anything that touches the outside world is injectable.

### What we inject
- CLI output: commands write through an Output interface (easy to fake in tests).
- Filesystem access in services: prefer injecting a minimal fs interface into services that read/write files.
- Shell execution: wrap command execution behind a small interface for scanners.
- Existence checks / analyzers: allow injecting pathExists / analyzer implementations for scanner-core services.

### What we do not over-abstract
- Keep interfaces minimal (only the methods you use).
- Avoid wrapper classes without a clear testing or portability reason.

---

## Error Handling Strategy

### CLI
- Commands are wrapped by a centralized error boundary.
- Errors are formatted consistently as one-line messages.
- When we know the failure class, throw a typed DiskcareError with:
  - code (stable identifier)
  - context (safe-to-print metadata)
  - cause (original error)
- --verbose prints stack trace and cause chain.

### scanner-core
- Prefer Result for recoverable failures / fallbacks.
- Prefer explainable metrics for filesystem analysis:
  - skipped + error for non-readable targets
  - partial + skippedEntries when some subpaths were skipped
- Diagnostics are surfaced to the CLI when we fall back.

### rules-engine
- Loading/validation failures throw RulesConfigError (includes filePath + cause).
- Validation uses explicit type guards for narrowing.

---

## Testing Guidelines

### Avoid real FS when possible
- Unit tests should not rely on mkdtemp, real directories, or real files.
- Prefer in-memory fakes by injecting minimal fs interfaces.

### Keep tests deterministic
- Deterministic sorting where output order matters.
- Avoid time-based flakiness (use fixed timestamps).
- For CLI E2E error flows, use test-only env vars:
  - `DISKCARE_TEST_TRASH_ERROR` to inject trash failures
  - `DISKCARE_TEST_LOG_WRITE_ERROR` to inject log write failures

### Property-based tests (where valuable)
- Use fast-check for invariants like:
  - estimated bytes never negative
  - partial analysis never results in eligible

---

## Style / Complexity Budgets
Enforced in CLI package:
- complexity (cyclomatic complexity budget)
- max-lines-per-function

If a function breaks the budget:
- Extract helpers
- Keep pure logic separate from IO orchestration

---

## Post-v1 Technical Debt
- Consolidate Result<T, E> utilities across cli and packages/*.
- Deduplicate toErrorMessage helpers in scanner-core and cli.

---

## Türkçe

> Yaşayan doküman: kısa, pratik ve test/lint ile uygulanabilir tutun.

## Hedefler
- Önce güvenlik: temizlik varsayılan olarak güvenlidir; yıkıcı işlemler açıkça opt-in gerektirir.
- Açıklanabilirlik: kararlar ve hatalar açıklanabilir olmalıdır (kurallar + tanılar + hata kodları).
- Test edilebilirlik: çekirdek mantık gerçek dosya sistemi veya shell'e dokunmadan test edilebilir olmalıdır.
- Tutarlılık: tutarlı hata biçimlendirme ve öngörülebilir CLI çıktısı.

---

## Bağımlılık Enjeksiyonu (DI) İlkeleri
Kural: dış dünyaya dokunan her şey enjekte edilebilir olmalıdır.

### Neleri enjekte ediyoruz
- CLI çıktısı: komutlar bir Output arayüzü üzerinden yazar (testte kolayca taklit edilir).
- Servislerde dosya sistemi erişimi: okuma/yazma yapan servislere minimal fs arayüzü enjekte edin.
- Shell çalıştırma: tarayıcılar için komut çalıştırmayı küçük bir arayüz arkasına alın.
- Varlık kontrolü / analiz: scanner-core servislerine pathExists / analyzer implementasyonları enjekte edilebilir.

### Aşırı soyutlamadıklarımız
- Arayüzleri minimal tutun (yalnızca kullandığınız metotlar).
- Test veya taşınabilirlik için net bir sebep yoksa sarmalayıcı sınıflardan kaçının.

---

## Hata Yönetim Stratejisi

### CLI
- Komutlar merkezi bir hata sınırı ile sarılır.
- Hatalar tek satırlık mesajlar olarak tutarlı biçimlendirilir.
- Hata sınıfı biliniyorsa, tipli bir DiskcareError fırlatılır:
  - code (sabit tanımlayıcı)
  - context (güvenli meta veri)
  - cause (orijinal hata)
- --verbose ile stack trace ve sebep zinciri yazdırılır.

### scanner-core
- Kurtarılabilir hatalar / fallback'ler için Result tercih edilir.
- Dosya sistemi analizinde açıklanabilir metrikler tercih edilir:
  - okunamayan hedefler için skipped + error
  - bazı alt yollar atlandıysa partial + skippedEntries
- Fallback durumunda tanılar CLI'ya yansıtılır.

### rules-engine
- Yükleme/doğrulama hataları filePath ve sebep ile RulesConfigError fırlatır.
- Doğrulama için açık tip koruyucular kullanılır.

---

## Test Rehberi

### Mümkünse gerçek dosya sistemi kullanmaktan kaçının
- Unit testler mkdtemp, gerçek dizin veya dosyalara bağlı olmamalı.
- Minimal fs arayüzleri enjekte ederek bellek içi taklitler tercih edin.

### Testleri deterministik tutun
- Çıktı sırasının önemli olduğu yerde deterministik sıralama kullanın.
- Zamana bağlı kararsızlıktan kaçının (sabit timestamp kullanın).
- CLI E2E hata akışlarında test-only env değişkenleri kullanın:
  - `DISKCARE_TEST_TRASH_ERROR` ile trash hatası enjekte edin
  - `DISKCARE_TEST_LOG_WRITE_ERROR` ile log yazma hatası enjekte edin

### Özellik tabanlı testler (gerekli yerlerde)
- fast-check ile şu tür değişmezleri test edin:
  - estimated bytes asla negatif olmamalı
  - partial analysis asla eligible ile sonuçlanmamalı

---

## Stil / Karmaşıklık Bütçeleri
CLI paketinde enforced edilir:
- complexity (çevrimsel karmaşıklık bütçesi)
- max-lines-per-function

Bir fonksiyon bütçeyi aşarsa:
- Yardımcı fonksiyonlara ayırın
- Saf mantığı IO orkestrasyonundan ayırın

---

## v1 Sonrası Teknik Borç
- Result<T, E> yardımcılarını cli ve packages/* genelinde birleştir.
- scanner-core ve cli'daki toErrorMessage yardımcılarını tekilleştir.
