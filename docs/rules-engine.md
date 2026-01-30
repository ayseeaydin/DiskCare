
# DiskCare Rules Engine

## English

## Writing Custom Rules

DiskCare supports user-defined rules via rules.json. Each rule can specify risk level, safeAfterDays, and custom logic.

### Example rules.json
```json
{
  "rules": [
    {
      "id": "npm-cache",
      "risk": "safe",
      "safeAfterDays": 30,
      "description": "Node.js cache older than 30 days is safe to clean."
    },
    {
      "id": "os-temp",
      "risk": "caution",
      "safeAfterDays": 7,
      "description": "OS temp files are cleaned with caution."
    }
  ],
  "defaults": {
    "risk": "caution",
    "safeAfterDays": 30
  }
}
```

## How to Add a Custom Rule
1. Edit your rules.json and add a new rule object with a unique id.
2. Set risk to "safe", "caution", or "do-not-touch".
3. Set safeAfterDays to control eligibility.
4. Add a description for context.

## Advanced: Dynamic Rules
- For advanced use, rules-engine can be extended to support dynamic logic (e.g. based on file size, last access, etc.)
- See packages/rules-engine/README.md for API details.

---

For more, see docs/architecture.md and docs/safety-model.md.

---

## Türkçe

# DiskCare Kural Motoru

## Özel Kural Yazımı

DiskCare, kullanıcı tanımlı kuralları rules.json dosyası ile destekler. Her kural risk seviyesi, safeAfterDays ve özel mantık belirtebilir.

### Örnek rules.json
```json
{
  "rules": [
    {
      "id": "npm-cache",
      "risk": "safe",
      "safeAfterDays": 30,
      "description": "30 günden eski Node.js cache güvenle temizlenebilir."
    },
    {
      "id": "os-temp",
      "risk": "caution",
      "safeAfterDays": 7,
      "description": "OS geçici dosyaları dikkatle temizlenir."
    }
  ],
  "defaults": {
    "risk": "caution",
    "safeAfterDays": 30
  }
}
```

## Özel Kural Nasıl Eklenir?
1. rules.json dosyanızı düzenleyin ve benzersiz id ile yeni bir kural nesnesi ekleyin.
2. risk alanını "safe", "caution" veya "do-not-touch" olarak ayarlayın.
3. safeAfterDays ile uygunluk süresini belirleyin.
4. Açıklama ekleyin.

## İleri Düzey: Dinamik Kurallar
- İleri kullanım için rules-engine, dinamik mantık (ör. dosya boyutu, son erişim tarihi vb.) destekleyecek şekilde genişletilebilir.
- API detayları için packages/rules-engine/README.md dosyasına bakınız.

---

Daha fazlası için docs/architecture.md ve docs/safety-model.md dosyalarına bakınız.
