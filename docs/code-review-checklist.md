# DiskCare Code Review Checklist

## English

Use this checklist for every PR or major commit:

## User Experience

- [ ] Are all user-facing error messages actionable and empathetic?
- [ ] Is CLI help output clear and progressive?

## Documentation

- [ ] Are new magic numbers documented with rationale?
- [ ] Are breaking changes explained in CHANGELOG.md?
- [ ] Is README updated for new features or changes?
- [ ] Are platform-specific behaviors documented?

## Testing

- [ ] Are edge cases and worst-case scenarios covered by tests?
- [ ] Are new features covered by property-based and E2E tests?
- [ ] Is backward compatibility tested (old logs, config, etc.)?
- [ ] Is the CLI binary tested via `npm link` or `npx diskcare --help`?

## Safety & Privacy

- [ ] Are destructive actions gated by triple safety model?
- [ ] Is telemetry privacy-first and local-only?

## Versioning

- [ ] Is semantic versioning followed for all breaking changes?
- [ ] Is log schema version updated if format changes?

---

Ask: "Six months from now, what questions will someone have when reading this code?" Document the answers.

---

## Türkçe

Her PR veya büyük commit için bu kontrol listesini kullanın:

## Kullanıcı Deneyimi

- [ ] Kullanıcıya dönük tüm hata mesajları eyleme dönük ve empatik mi?
- [ ] CLI yardım çıktısı açık ve kademeli mi?

## Dokümantasyon

- [ ] Yeni magic number'lar gerekçesiyle belgelenmiş mi?
- [ ] Kırıcı değişiklikler CHANGELOG.md'de açıklanmış mı?
- [ ] README yeni özellikler veya değişiklikler için güncellenmiş mi?
- [ ] Platforma özel davranışlar belgelenmiş mi?

## Test

- [ ] Edge-case ve worst-case senaryoları testlerle kapsanmış mı?
- [ ] Yeni özellikler property-based ve E2E testlerle kapsanmış mı?
- [ ] Geriye dönük uyumluluk test edilmiş mi (eski loglar, config vb.)?
- [ ] CLI binary `npm link` veya `npx diskcare --help` ile test edilmiş mi?

## Güvenlik ve Gizlilik

- [ ] Yıkıcı işlemler üçlü güvenlik modeliyle sınırlanmış mı?
- [ ] Telemetri gizlilik öncelikli ve sadece yerel mi?

## Sürümlendirme

- [ ] Tüm kırıcı değişiklikler için semantik versiyonlama izlenmiş mi?
- [ ] Format değiştiğinde log şeması sürümü güncellenmiş mi?

---

Şunu sor: "Altı ay sonra biri bu kodu okurken hangi soruları soracak?" Cevapları belgele.
