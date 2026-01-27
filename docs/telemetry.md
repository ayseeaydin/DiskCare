# DiskCare Telemetry & Analytics

## Privacy-First Local Analytics

DiskCare topladığı verileri sadece yerel olarak saklar, hiçbir şekilde dışarıya göndermez.

### Example Local Analytics (stats)

```json
{
  "totalRuns": 50,
  "mostCleanedTarget": "npm-cache",
  "averageFreedSpace": "2.3 GB",
  "failureRate": 0.02
}
```

## How to View Stats

- Kullanıcı `diskcare stats` komutunu çalıştırarak özet verileri görebilir.
- Tüm veriler local, privacy-safe ve product kararları için kullanılabilir.

## Product Roadmap Feedback

- Aggregated stats, hangi hedeflerin en çok temizlendiği, ortalama freed space ve hata oranı gibi metriklerle ürün kararlarını destekler.
- Hiçbir kişisel veri toplanmaz veya paylaşılmaz.

---

Daha fazla bilgi için docs/architecture.md ve docs/safety-model.md'ye bak.
