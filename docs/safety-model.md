# DiskCare Safety Model: Triple-Gate

## English

DiskCare never deletes files without passing three safety gates:

1. **Risk Policy Gate**: Each target is classified by risk (safe, caution, do-not-touch) via rules-engine.
2. **User Consent Gate**: Destructive actions require --apply and --yes flags. No accidental deletes.
3. **Platform/Analysis Gate**: If analysis is partial, missing, or ambiguous, status is downgraded to caution or blocked.

### How It Works
- All targets are analyzed and classified before any action.
- The clean plan reports exactly what will happen, with reasons and risk levels.
- User must explicitly confirm before any destructive action.
- Edge cases (missing metrics, partial analysis, config errors) always default to caution or blocked.
- Apply is per-target and not atomic; interruptions can leave partial results.

### Example
- A file is only deleted if: risk="safe" AND user passes --apply AND --yes AND analysis is complete.
- Otherwise, the file is reported but not deleted.

---

See docs/architecture.md for design rationale.

---

## Türkçe

DiskCare, üç güvenlik geçidinden geçmeden hiçbir dosyayı silmez:

1. **Risk Politikası Geçidi**: Her hedef, rules-engine ile riskine göre (safe, caution, do-not-touch) sınıflandırılır.
2. **Kullanıcı Onayı Geçidi**: Yıkıcı işlemler için --apply ve --yes bayrakları gerekir. Yanlışlıkla silme olmaz.
3. **Platform/Analiz Geçidi**: Analiz eksik, kısmi veya belirsizse durum caution veya blocked'a düşürülür.

### Nasıl Çalışır?
- Tüm hedefler, herhangi bir işlemden önce analiz ve sınıflandırma yapılır.
- Temizlik planı, ne olacağını, nedenleri ve risk seviyelerini tam olarak raporlar.
- Yıkıcı işlemden önce kullanıcıdan açık onay istenir.
- Edge-case'ler (eksik metrik, kısmi analiz, config hatası) her zaman caution veya blocked'a düşer.
- Uygulama hedef bazında ve atomik değildir; kesintiler kısmi sonuçlara yol açabilir.

### Örnek
- Bir dosya yalnızca şu koşullarda silinir: risk="safe" VE kullanıcı --apply VE --yes bayraklarını geçer VE analiz tamdır.
- Aksi halde dosya sadece raporlanır, silinmez.

---

Tasarım gerekçesi için docs/architecture.md dosyasına bakınız.
