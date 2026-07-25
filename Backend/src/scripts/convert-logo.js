/**
 * convert-logo.js
 * One-off script: converts logo-egg.svg → logo-egg-pwa-192.png & logo-egg-pwa-512.png
 * Run: node scripts/convert-logo.js
 * Safe: does NOT modify the original logo-egg.svg
 */
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const SVG_SRC  = path.resolve("/home/ibrahim/egg-source-dev-app/Frontend/assets/images/logo-egg.svg");
const OUT_DIR  = path.resolve("/home/ibrahim/egg-source-dev-app/Frontend/assets/images");

const targets = [
  { size: 192, filename: "logo-egg-pwa-192.png" },
  { size: 512, filename: "logo-egg-pwa-512.png" },
];

(async () => {
  const svgBuffer = fs.readFileSync(SVG_SRC);
  console.log(`Source SVG: ${SVG_SRC}`);

  for (const { size, filename } of targets) {
    const outPath = path.join(OUT_DIR, filename);
    await sharp(svgBuffer)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`✅  Generated: ${filename}  (${size}×${size})  ${Math.round(stat.size / 1024)} KB`);
  }
  console.log("Done — logo-egg.svg is unchanged.");
})();
