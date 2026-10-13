import * as THREE from 'three';

export type Harmonic = { frequency: number; re: number; im: number; radius: number };
export type Stroke = {
  terms: Harmonic[];
  points: THREE.Vector3[];
  dc: Harmonic;
  orbits: Harmonic[];
};

export function decodeLettering(buffer: ArrayBuffer): Stroke[] {
  const data = new DataView(buffer);
  let offset = 0;
  const read = () => { const value = data.getFloat64(offset, true); offset += 8; return value; };
  const count = read();
  const strokes = Array.from({ length: count }, () => {
    const termCount = read(), pointCount = read();
    const terms = Array.from({ length: termCount }, () => {
      const frequency = read(), re = read(), im = read();
      return { frequency, re, im, radius: Math.hypot(re, im) };
    });
    const points = Array.from({ length: pointCount }, () => new THREE.Vector3(read(), read(), read()));
    const dc = terms.find(term => term.frequency === 0)!;
    return { terms, points, dc, orbits: terms.filter(term => term.frequency !== 0).slice(0, 10) };
  });
  if (offset !== buffer.byteLength) throw new Error('Invalid orbital lettering data');
  return strokes;
}

export function evaluate(terms: Harmonic[], t: number, target: THREE.Vector3) {
  target.set(0, 0, 0);
  for (const term of terms) {
    const a = term.frequency * t * Math.PI * 2;
    const cos = Math.cos(a), sin = Math.sin(a);
    target.x += term.re * cos - term.im * sin;
    target.y += term.re * sin + term.im * cos;
  }
  return target;
}
