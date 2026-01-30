# Edge Case Tests

## English

Happy-path tests are not enough. DiskCare must cover worst-case scenarios and fallback chains with first-class tests.

## Principles

- Ask: "What is the worst-case scenario?" Then test it.
- Every new feature should include edge case coverage.

## Examples

- Partial analysis when subpaths are unreadable
- Permission denied during scanning or apply
- Paths that disappear between scan and apply
- Signals or interrupts during apply

## Trash safety audit (manual checklist)

- Symlink target cleanup (ensure the link is trashed, not the target)
- Permission denied cases (read-only folders, protected system paths)
- UNC paths on Windows (if supported by the platform and environment)
- Full Trash / Recycle Bin behavior (verify error handling and messaging)

---

See related test files and docs/safety-model.md for more examples.

---

## Türkçe

Happy-path testleri yeterli değildir. DiskCare worst-case senaryolarını ve fallback zincirlerini birinci sınıf testlerle kapsamalıdır.

## İlkeler

- Şunu sor: "En kötü senaryo nedir?" Sonra test et.
- Her yeni özellik edge-case kapsamı içermelidir.

## Örnekler

- Alt yollar okunamazken kısmi analiz
- Tarama veya apply sırasında izin reddi
- Scan ve apply arasında kaybolan yollar
- Apply sırasında sinyaller veya kesintiler

## Trash güvenlik denetimi (manuel kontrol listesi)

- Symlink hedef temizliği (link çöpe gitsin, hedef değil)
- İzin reddi durumları (salt okunur klasörler, korumalı sistem yolları)
- Windows'ta UNC yolları (platform ve ortam destekliyorsa)
- Dolu Trash / Recycle Bin davranışı (hata yönetimi ve mesajları doğrula)

---

Daha fazla örnek için ilgili test dosyalarına ve docs/safety-model.md dokümanına bakın.
