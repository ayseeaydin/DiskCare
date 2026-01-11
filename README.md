# DiskCare 🧹

> **Güvenli, konfigüre edilebilir, CLI tabanlı disk tarama ve bakım aracı**
> *Varsayılan olarak ASLA dosya silmez.*

DiskCare, işletim sistemlerinde zamanla şişen geçici (temp/cache/log) alanları **okuyarak**, **raporlayarak** ve **kontrollü şekilde** yönetmenizi sağlayan bir CLI uygulamasıdır. Özellikle yazılım geliştiriciler, power-user’lar ve sistemine zarar vermeden temizlik yapmak isteyen kullanıcılar için tasarlanmıştır.

---

## 🚀 Neden DiskCare?

Birçok "disk temizleyici" araç:

* Ne sildiğini tam söylemez
* Otomatik silme yapar
* Sistem dosyalarına dokunur
* Geri dönüşü olmayan işlemler uygular

**DiskCare bilinçli olarak bunları YAPMAZ.**

Tasarım felsefesi:

* 🔒 Güvenli varsayılanlar
* 🧠 Kullanıcı kontrolü
* 🪜 Adım adım ilerleme (scan → dry-run → clean)
* 💥 Asla sürpriz davranış yok

---

## ✨ Özellikler

* ✅ Disk tarama (okuma-only)
* ✅ Temizlenebilir alan raporu
* ✅ Büyük alanlar için uyarı sistemi
* ✅ `dry-run` (simülasyon) modu
* ✅ JSON config desteği
* ✅ Cross-platform mimari
* ✅ TypeScript + modern Node.js

> ❗ Varsayılan olarak **hiçbir dosya silinmez**

---

## 📦 Kurulum

```bash
npm install
```

Geliştirme modunda çalıştırmak için:

```bash
npm run dev -- scan
```

---

## 🧪 Kullanım

### 🔍 Disk tarama

```bash
npm run dev -- scan
```

Örnek çıktı:

```
🔍 DiskCare tarama başlatıldı

OS Temp
  Path : C:\Users\...\Temp
  Size : 5.88 GB ⚠️

Toplam temizlenebilir alan:
5.88 GB
```

---

### 🧹 Dry-run (temizleme simülasyonu)

```bash
npm run dev -- clean --dry-run
```

Bu komut:

* Hangi dosyaların silinebileceğini **listeler**
* Hiçbir dosyaya dokunmaz

---

## ⚙️ Konfigürasyon

Projeye `.diskcarerc.json` dosyası ekleyerek davranışı özelleştirebilirsiniz:

```json
{
  "warnAboveGB": 0.5,
  "excludeDirs": [
    "node_modules",
    ".git",
    "npm-cache"
  ]
}
```

### Ayarlar

| Alan        | Açıklama                                         |
| ----------- | ------------------------------------------------ |
| warnAboveGB | Bu değerin üzerindeki alanlar ⚠️ ile işaretlenir |
| excludeDirs | Tarama sırasında atlanacak klasörler             |

> ℹ️ Exclude edilen klasörler **sessizce atlanır**, bu bilinçli bir tasarım kararıdır

---

## 🧠 Design Decisions (Neden Böyle?)

### ❌ Otomatik silme yok

Çünkü:

* Yanlış silme geri alınamaz
* Kullanıcı her zaman son kararı vermelidir

### ✅ Dry-run zorunlu

Gerçek temizlik yapılmadan önce kullanıcı:

* Ne silineceğini görür
* Riskleri değerlendirir

### 🔐 Sistem dosyalarına dokunmaz

* Sadece temp/cache/log odaklı
* OS güvenliği önceliklidir

---

## 🛣️ Yol Haritası

* [ ] Gerçek `clean --force` modu (çok kontrollü)
* [ ] Dosya türü bazlı filtreleme
* [ ] Test altyapısı (fs mock)
* [ ] Global CLI install (`npm i -g`)

---

## 👩‍💻 Geliştirici Notu

Bu proje bir **ürün düşüncesiyle** geliştirilmiştir. Amaç sadece "çalışan kod" değil, **güvenli ve sürdürülebilir yazılım** üretmektir.

---

## 📄 Lisans

MIT
