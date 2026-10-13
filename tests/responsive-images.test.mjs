import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(await readFile(new URL('../src/generated/images.json', import.meta.url), 'utf8'));
const docs = new URL('../docs/', import.meta.url);
const assets = new URL('../dist/assets/', import.meta.url);
const emitted = await readdir(assets);
const emittedHashes = new Set(await Promise.all(emitted.filter(name => /\.webp$/i.test(name)).map(async name =>
  createHash('sha256').update(await readFile(new URL(name, assets))).digest('hex'))));

test('every original WebP has correctly sized, non-upscaled responsive variants', async () => {
  const originals = (await readdir(docs)).filter(name => /\.webp$/i.test(name)).sort();
  assert.deepEqual(Object.keys(manifest).sort(), originals);
  for (const [filename, image] of Object.entries(manifest)) {
    const original = await sharp(await readFile(new URL(filename, docs))).metadata();
    assert.equal(image.width, original.width);
    assert.equal(image.height, original.height);
    const widths = image.variants.map(variant => variant.width);
    assert.deepEqual(widths, [...new Set(widths)].sort((a, b) => a - b));
    assert.ok(widths.includes(96));
    assert.ok(widths.includes(192));
    for (const variant of image.variants) {
      const buffer = await readFile(new URL(`..${variant.path}`, import.meta.url));
      const metadata = await sharp(buffer).metadata();
      assert.equal(metadata.format, 'webp');
      assert.equal(metadata.width, variant.width);
      assert.ok(metadata.width <= original.width);
      assert.ok(metadata.height <= original.height);
      assert.ok(Math.abs(metadata.height - original.height * metadata.width / original.width) <= 1);
      // Vite may deduplicate identical assets under another source filename.
      assert.ok(emittedHashes.has(createHash('sha256').update(buffer).digest('hex')),
        `Missing built asset: ${variant.path}`);
    }
  }
});

test('640px gallery variants and thumbnails reduce total image transfer size', async () => {
  let originals = 0;
  let gallery = 0;
  let thumbnails = 0;
  for (const [filename, image] of Object.entries(manifest)) {
    originals += (await stat(new URL(filename, docs))).size;
    const galleryVariant = image.variants.find(variant => variant.width >= 640) ?? image.variants.at(-1);
    gallery += (await stat(new URL(`..${galleryVariant.path}`, import.meta.url))).size;
    thumbnails += (await stat(new URL(`..${image.variants[0].path}`, import.meta.url))).size;
  }
  assert.ok(gallery < originals, 'Gallery variants should be smaller overall than original images');
  assert.ok(thumbnails < gallery, 'Thumbnails should be smaller than gallery variants');
});
