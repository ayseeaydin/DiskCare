
# DiskCare Architecture

## English

## Why This Architecture?

DiskCare is designed for developer trust, safety, and extensibility. The CLI, rules engine, and scanner-core are separated for clear responsibilities:

- **CLI**: User interaction, error handling, onboarding, and progressive help.
- **Rules Engine**: Policy-driven risk and eligibility logic, custom rule support.
- **Scanner Core**: Platform-specific file analysis, metrics, and target discovery.

### Rationale
- **Safety-first**: All destructive actions are gated by explicit user consent and risk analysis.
- **Extensibility**: New rules, targets, and output formats can be added without breaking existing flows.
- **Testability**: Each layer is independently testable, with property-based and E2E tests.
- **Backward Compatibility**: Log schema versioning and migration pipeline ensure old logs remain usable.

## Key Design Decisions
- Triple-gate safety model (see safety-model.md)
- Feature flags for incomplete/experimental features
- Local-only analytics for privacy
- Semantic versioning for all breaking changes

---

For implementation details, see the source code and docs/safety-model.md.

---

## Türkçe

## Neden Bu Mimari?

DiskCare, geliştirici güveni, güvenlik ve genişletilebilirlik için tasarlanmıştır. CLI, kural motoru ve scanner-core, sorumlulukların net ayrılması için ayrılmıştır:

- **CLI**: Kullanıcı etkileşimi, hata yönetimi, onboarding ve kademeli yardım.
- **Kural Motoru**: Politika tabanlı risk ve uygunluk mantığı, özel kural desteği.
- **Scanner Core**: Platforma özel dosya analizi, metrikler ve hedef keşfi.

### Gerekçeler
- **Önce güvenlik**: Tüm yıkıcı işlemler, açık kullanıcı onayı ve risk analizi ile sınırlandırılır.
- **Genişletilebilirlik**: Yeni kurallar, hedefler ve çıktı formatları mevcut akışları bozmadan eklenebilir.
- **Test edilebilirlik**: Her katman bağımsız olarak test edilebilir, property-based ve E2E testlerle desteklenir.
- **Geriye dönük uyumluluk**: Log şeması versiyonlama ve geçiş pipeline'ı eski logların kullanılabilirliğini sağlar.

## Temel Tasarım Kararları
- Üçlü güvenlik modeli (bkz. safety-model.md)
- Tamamlanmamış/deneysel özellikler için feature flag'ler
- Gizlilik için sadece yerel analiz
- Tüm kırıcı değişikliklerde semantik versiyonlama

---

Detaylı uygulama için kaynak koduna ve docs/safety-model.md dosyasına bakınız.
