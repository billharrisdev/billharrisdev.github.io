import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

// Keep the original sampling and arithmetic unchanged; only move it off the
// browser's main thread and into the build.
export async function buildLettering() {
  const fontData = JSON.parse(await readFile(new URL('../src/lib/helvetiker_regular.typeface.json', import.meta.url), 'utf8'));
  const shapes = new FontLoader().parse(fontData).generateShapes('billharris.dev', 1);
  const bounds = new THREE.Box2();
  for (const shape of shapes) for (const p of shape.getPoints(12)) bounds.expandByPoint(p);
  const scale = 10 / (bounds.max.x - bounds.min.x);
  const center = bounds.getCenter(new THREE.Vector2());
  return shapes.flatMap(shape => [shape, ...shape.holes]).map(path => {
    const samples = path.getSpacedPoints(96).slice(0, -1).map(p =>
      new THREE.Vector2((p.x - center.x) * scale, (p.y - center.y) * scale + 0.75));
    const n = samples.length;
    const terms = Array.from({ length: n }, (_, k) => {
      let re = 0, im = 0;
      for (let j = 0; j < n; j++) {
        const a = -2 * Math.PI * k * j / n;
        re += samples[j].x * Math.cos(a) - samples[j].y * Math.sin(a);
        im += samples[j].x * Math.sin(a) + samples[j].y * Math.cos(a);
      }
      return { frequency: k <= n / 2 ? k : k - n, re: re / n, im: im / n };
    }).sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im));
    const points = Array.from({ length: 193 }, (_, i) => {
      const p = new THREE.Vector3();
      for (const term of terms) {
        const a = term.frequency * (i / 192) * Math.PI * 2;
        p.x += term.re * Math.cos(a) - term.im * Math.sin(a);
        p.y += term.re * Math.sin(a) + term.im * Math.cos(a);
      }
      return p;
    });
    return { terms, points };
  });
}

export function encodeLettering(strokes) {
  const values = [strokes.length];
  for (const stroke of strokes) {
    values.push(stroke.terms.length, stroke.points.length);
    for (const term of stroke.terms) values.push(term.frequency, term.re, term.im);
    for (const point of stroke.points) values.push(point.x, point.y, point.z);
  }
  const buffer = Buffer.alloc(values.length * 8);
  values.forEach((value, index) => buffer.writeDoubleLE(value, index * 8));
  return buffer;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const strokes = await buildLettering();
  const bytes = encodeLettering(strokes);
  const destination = new URL('../src/generated/orbital-lettering.bin', import.meta.url);
  await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true });
  let previous;
  try { previous = await readFile(destination); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!previous?.equals(bytes)) await writeFile(destination, bytes);
  console.log(`Orbital lettering: ${strokes.length} contours precomputed (${bytes.length} bytes).`);
}
