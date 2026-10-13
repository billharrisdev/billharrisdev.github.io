import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const docs = new URL('../docs/', import.meta.url);
const output = new URL('responsive/', docs);
const manifestUrl = new URL('../src/generated/images.json', import.meta.url);
const widths = [96, 192, 320, 640, 960, 1280, 1920];
const options = { quality: 85, effort: 5 };

await mkdir(output, { recursive: true });
await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true });
let previous = {};
try {
  previous = JSON.parse(await readFile(manifestUrl, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const manifest = {};
let generated = 0;
for (const filename of (await readdir(docs)).filter(name => /\.webp$/i.test(name)).sort()) {
  const source = await readFile(new URL(filename, docs));
  const hash = createHash('sha256')
    .update(source)
    .update(JSON.stringify({ widths, options, versions: sharp.versions }))
    .digest('hex');
  const { width, height } = await sharp(source).metadata();
  if (!width || !height) throw new Error(`Missing dimensions: ${filename}`);
  const targetWidths = [...new Set([...widths.filter(size => size < width), Math.min(width, 1920)])];
  const variants = [];
  for (const target of targetWidths) {
    const name = `${filename.replace(/\.webp$/i, '')}.responsive-${target}.webp`;
    const destination = new URL(name, output);
    let cached = false;
    if (previous[filename]?.hash === hash) {
      try { await access(destination); cached = true; } catch {}
    }
    if (!cached) {
      await sharp(source)
        .resize({ width: target, withoutEnlargement: true })
        .webp(options)
        .toFile(fileURLToPath(destination));
      generated++;
    }
    variants.push({ path: `/docs/responsive/${name}`, width: target });
  }
  manifest[filename] = { width, height, hash, variants };
}

const json = `${JSON.stringify(manifest, null, 2)}\n`;
// Avoid triggering the dev server when nothing changed.
let current;
try { current = await readFile(manifestUrl, 'utf8'); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (current !== json) await writeFile(manifestUrl, json);
console.log(`Responsive WebP: ${Object.keys(manifest).length} originals, ${generated} variants generated.`);
