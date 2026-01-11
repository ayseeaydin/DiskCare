import { scanDisk } from "../scanner/index.js";

export async function runDryClean() {
  console.log("🧪 Dry-run başlatıldı (hiçbir dosya silinmeyecek)\n");

  const results = await scanDisk();
  let total = 0;

  for (const r of results) {
    console.log(r.name);
    console.log(`  Path : ${r.path}`);

    const sizeMB = r.size / 1024 / 1024;
    console.log(`  Size : ${sizeMB.toFixed(2)} MB\n`);

    total += r.size;
  }

  console.log("🧾 Dry-run sonucu:");
  console.log(`${(total / 1024 / 1024 / 1024).toFixed(2)} GB temizlenebilir`);
}