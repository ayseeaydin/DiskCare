// Bu script, dist/index.js dosyasının başına shebang ekler
const fs = require("fs");
const path = require("path");

const distPath = path.join(__dirname, "..", "dist", "index.js");
const shebang = "#!/usr/bin/env node\n";

const orig = fs.readFileSync(distPath, "utf8");
if (!orig.startsWith(shebang)) {
  fs.writeFileSync(distPath, shebang + orig, "utf8");
  console.log("Shebang eklendi: " + distPath);
} else {
  console.log("Shebang zaten var: " + distPath);
}
