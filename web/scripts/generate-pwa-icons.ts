import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..");
const SVG_PATH = path.join(ROOT, "public", "icon.svg");
const OUT_DIR = path.join(ROOT, "public", "icons");

const SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-512-maskable.png", size: 512, padding: 0.1 },
  { name: "apple-touch-icon.png", size: 180 },
] as const;

async function renderIcon(size: number, padding = 0) {
  const svg = await readFile(SVG_PATH);
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);
  const resized = await sharp(svg).resize(inner, inner).png().toBuffer();
  if (padding === 0) {
    return sharp(resized).resize(size, size).png().toBuffer();
  }
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 },
    },
  })
    .composite([{ input: resized, left: offset, top: offset }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const spec of SIZES) {
    const padding = "padding" in spec ? spec.padding : 0;
    const buf = await renderIcon(spec.size, padding);
    const outPath = path.join(OUT_DIR, spec.name);
    await sharp(buf).toFile(outPath);
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
