import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = path.resolve("source-assets/products");
const outputRoot = path.resolve("public/products");
const force = process.argv.includes("--force");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : target;
    }),
  );
  return nested.flat();
}

const sources = (await walk(sourceRoot)).filter((file) => /\.(png|jpe?g)$/i.test(file));
let inputBytes = 0;
let outputBytes = 0;

for (const source of sources) {
  const relative = path.relative(sourceRoot, source).replace(/\.(png|jpe?g)$/i, ".webp");
  const output = path.join(outputRoot, relative);
  await mkdir(path.dirname(output), { recursive: true });
  inputBytes += (await stat(source)).size;

  try {
    if (!force) {
      outputBytes += (await stat(output)).size;
      process.stdout.write(`SKIP ${path.relative(sourceRoot, output)}\n`);
      continue;
    }
  } catch {
    // The optimized derivative does not exist yet.
  }

  await sharp(source)
    .rotate()
    .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toFile(output);

  const size = (await stat(output)).size;
  outputBytes += size;
  process.stdout.write(`WEBP ${path.relative(sourceRoot, output)} ${(size / 1024).toFixed(0)} KB\n`);
}

const saved = inputBytes ? (1 - outputBytes / inputBytes) * 100 : 0;
process.stdout.write(
  `\n${sources.length} imágenes · ${(inputBytes / 1024 / 1024).toFixed(1)} MB → ${(outputBytes / 1024 / 1024).toFixed(1)} MB · ${saved.toFixed(1)}% menos\n`,
);
