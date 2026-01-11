import { findCleanCandidates } from "../src/utils/cleanCandidates.js";
import path from "path";

async function run() {
    const testDir = path.resolve("test/fixtures/sample");

    const results = await findCleanCandidates(testDir, []);

    console.log("Test Sonuçları: ");
    for (const r of results) {
        console.log("-", r.path);
    }

    if (results.length !== 2) {
        throw new Error("❌ Beklenen 2 temizlenebilir dosya bulunamadı.");
    }

    const paths = results.map(r => path.basename(r.path));

    if (!paths.includes("test.log") || !paths.includes("temp.tmp")) {
        throw new Error("❌ Yanlış dosyalar listelendi.");
    }

    console.log("✅ cleanCandidates testi başarılı");
}

run();