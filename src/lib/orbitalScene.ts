import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import fontData from './helvetiker_regular.typeface.json';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

type Harmonic = { frequency: number; re: number; im: number };
type Stroke = { terms: Harmonic[]; points: THREE.Vector3[] };

// A DFT of each closed letter contour. Signed frequencies preserve both
// clockwise and counterclockwise details; magnitude order exposes epicycles.
function transform(points: THREE.Vector2[]): Harmonic[] {
  const n = points.length;
  return Array.from({ length: n }, (_, k) => {
    let re = 0, im = 0;
    for (let j = 0; j < n; j++) {
      const a = -2 * Math.PI * k * j / n;
      re += points[j].x * Math.cos(a) - points[j].y * Math.sin(a);
      im += points[j].x * Math.sin(a) + points[j].y * Math.cos(a);
    }
    return { frequency: k <= n / 2 ? k : k - n, re: re / n, im: im / n };
  }).sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im));
}

function evaluate(terms: Harmonic[], t: number): THREE.Vector3 {
  const p = new THREE.Vector3();
  for (const term of terms) {
    const a = term.frequency * t * Math.PI * 2;
    p.x += term.re * Math.cos(a) - term.im * Math.sin(a);
    p.y += term.re * Math.sin(a) + term.im * Math.cos(a);
  }
  return p;
}

function lettering(): Stroke[] {
  const font = new FontLoader().parse(fontData);
  const shapes = font.generateShapes('billharris.dev', 1);
  const bounds = new THREE.Box2();
  for (const shape of shapes) for (const p of shape.getPoints(12)) bounds.expandByPoint(p);
  const scale = 10 / (bounds.max.x - bounds.min.x);
  const center = bounds.getCenter(new THREE.Vector2());
  return shapes.flatMap(shape => [shape, ...shape.holes]).map(path => {
    const samples = path.getSpacedPoints(96).slice(0, -1).map(p =>
      new THREE.Vector2((p.x - center.x) * scale, (p.y - center.y) * scale + 0.75));
    const terms = transform(samples);
    return { terms, points: Array.from({ length: 193 }, (_, i) => evaluate(terms, i / 192)) };
  });
}

function makeArm(scene: THREE.Scene, x: number, color: number) {
  const root = new THREE.Group();
  root.position.set(x, -2.5, 0.35);
  scene.add(root);
  const metal = new THREE.MeshStandardMaterial({ color: 0x172039, metalness: 0.8, roughness: 0.3 });
  const neon = new THREE.MeshBasicMaterial({ color });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.65, 0.3, 24), metal);
  root.add(base);
  const joints: THREE.Group[] = [];
  // Industrial-style six-axis chain: base, shoulder, elbow, three wrist axes.
  const axes = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)];
  const lengths = [0.55, 2.65, 2.45, 0.55, 0.4, 0.35];
  let parent = root;
  lengths.forEach((length, i) => {
    const joint = new THREE.Group();
    parent.add(joint);
    joints.push(joint);
    joint.add(new THREE.Mesh(new THREE.SphereGeometry(i < 3 ? 0.19 : 0.12, 16, 12), neon));
    const link = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, length, 12), metal);
    link.rotation.z = i === 0 ? 0 : -Math.PI / 2;
    if (i === 0) link.position.y = length / 2;
    else link.position.x = length / 2;
    joint.add(link);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(length * 0.85, 0.025, 0.025), neon);
    strip.position.set(length / 2, 0.11, 0.06);
    if (i === 0) { strip.rotation.z = Math.PI / 2; strip.position.set(0.11, length / 2, 0.06); }
    joint.add(strip);
    const next = new THREE.Group();
    if (i === 0) next.position.y = length;
    else next.position.x = length;
    joint.add(next);
    parent = next;
  });
  joints[1].rotation.z = x < 0 ? 0.7 : 2.4;
  joints[2].rotation.z = x < 0 ? -1.2 : 1.2;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), neon);
  parent.add(tip);
  const origin = new THREE.Vector3(), end = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), axis = new THREE.Vector3(), cross = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  return {
    tip,
    reset() {
      joints.forEach(joint => joint.quaternion.identity());
      joints[1].rotation.z = x < 0 ? 0.7 : 2.4;
      joints[2].rotation.z = x < 0 ? -1.2 : 1.2;
    },
    setTheme(dark: boolean, color: number) {
      metal.color.setHex(dark ? 0x172039 : 0xa6b4cc);
      neon.color.setHex(color);
      metal.metalness = dark ? 0.8 : 0.45;
    },
    follow(target: THREE.Vector3, time: number) {
      // CCD positional IK; wrist roll is animated separately because it doesn't
      // affect the centerline pen position. This is visual, not a robot controller.
      joints[5].quaternion.setFromAxisAngle(axes[5], Math.sin(time * 0.7) * 0.6);
      for (let iteration = 0; iteration < 8; iteration++) {
        for (let i = joints.length - 1; i >= 0; i--) {
          root.updateWorldMatrix(true, true);
          joints[i].getWorldPosition(origin);
          tip.getWorldPosition(end);
          axis.copy(axes[i]).transformDirection(joints[i].matrixWorld);
          a.copy(end).sub(origin); b.copy(target).sub(origin);
          a.addScaledVector(axis, -a.dot(axis)); b.addScaledVector(axis, -b.dot(axis));
          if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) continue;
          a.normalize(); b.normalize();
          const angle = Math.atan2(axis.dot(cross.crossVectors(a, b)), a.dot(b));
          rotation.setFromAxisAngle(axes[i], THREE.MathUtils.clamp(angle, -0.22, 0.22));
          joints[i].quaternion.multiply(rotation);
        }
      }
    }
  };
}

export function createOrbitalScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x030611);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 600 ? 1.25 : 1.5));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030611, 0.022);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.35);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const ambient = new THREE.HemisphereLight(0xa1c8ff, 0x191336, 3);
  scene.add(ambient);
  const light = new THREE.PointLight(0x69eaff, 45, 20);
  light.position.set(0, 4, 4); scene.add(light);
  const positions = new Float32Array(650 * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (Math.random() - 0.5) * 65;
    positions[i + 1] = (Math.random() - 0.5) * 40;
    positions[i + 2] = -Math.random() * 35 - 2;
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({ color: 0xaecbff, size: 0.045, transparent: true, opacity: 0.75 }));
  scene.add(stars);
  let grid = new THREE.GridHelper(32, 32, 0x273760, 0x111b35);
  grid.position.y = -2.7; scene.add(grid);
  const strokes = lettering();
  const palette = [0x63f5ff, 0xd78aff];
  const arms = [makeArm(scene, -5.5, palette[0]), makeArm(scene, 5.5, palette[1])];
  const groups = [strokes.filter(s => s.points[0].x < 0), strokes.filter(s => s.points[0].x >= 0)];
  const lines = groups.map((group, index) => group.map(stroke => {
    const geometry = new THREE.BufferGeometry().setFromPoints(stroke.points);
    geometry.setDrawRange(0, 0);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: new THREE.Color(palette[index]).multiplyScalar(2.5) }));
    scene.add(line); return line;
  }));
  const epicycles = arms.map((_, index) => {
    const circles = Array.from({ length: 10 }, () => {
      const points = Array.from({ length: 65 }, (_, j) => new THREE.Vector3(Math.cos(j / 64 * Math.PI * 2), Math.sin(j / 64 * Math.PI * 2), 0));
      const circle = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: palette[index], transparent: true, opacity: 0.18 }));
      scene.add(circle); return circle;
    });
    return circles;
  });
  let elapsed = 0, last = 0, frame = 0, active = false, reveal = 0, disposed = false;
  let currentTheme: 'light' | 'dark' | undefined;
  function setTheme(theme: 'light' | 'dark') {
    if (currentTheme === theme || disposed) return;
    currentTheme = theme;
    const dark = theme === 'dark';
    const background = dark ? 0x030611 : 0xf4f7fc;
    renderer.setClearColor(background);
    (scene.fog as THREE.FogExp2).color.setHex(background);
    ambient.color.setHex(dark ? 0xa1c8ff : 0xffffff);
    ambient.groundColor.setHex(dark ? 0x191336 : 0xb9c7d6);
    light.color.setHex(dark ? 0x69eaff : 0xc7e9ff);
    stars.material.color.setHex(dark ? 0xaecbff : 0x526c92);
    stars.material.size = dark ? 0.045 : 0.065;
    bloom.strength = dark ? 0.85 : 0.12;
    bloom.threshold = dark ? 0.35 : 1.1;
    scene.remove(grid);
    grid.geometry.dispose();
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach(material => material.dispose());
    grid = new THREE.GridHelper(32, 32, dark ? 0x273760 : 0x94a3b8, dark ? 0x111b35 : 0xcbd5e1);
    grid.position.y = -2.7;
    scene.add(grid);
    palette[0] = dark ? 0x63f5ff : 0x00788c;
    palette[1] = dark ? 0xd78aff : 0x7c3ac9;
    arms.forEach((arm, index) => arm.setTheme(dark, palette[index]));
    lines.forEach((group, index) => group.forEach(line =>
      line.material.color.setHex(palette[index]).multiplyScalar(dark ? 2.5 : 1)));
    epicycles.forEach((group, index) => group.forEach(circle => {
      circle.material.color.setHex(palette[index]);
      circle.material.opacity = dark ? 0.18 : 0.35;
    }));
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
    composer.setSize(Math.max(width, 1), Math.max(height, 1));
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function render(now: number) {
    if (disposed || !active || document.hidden) { frame = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.5) : 0;
    last = now; elapsed += dt;
    const progress = Math.min(elapsed / 24, 1);
    // Keep the view direction forward even after crossing the lettering plane.
    // Looking back at the origin here would flip the camera halfway through.
    const flight = THREE.MathUtils.smoothstep(reveal, 0, 1);
    const distance = Math.max(13.8, 23 / Math.max(camera.aspect, 0.3));
    camera.position.set(Math.sin(elapsed * 0.12) * 0.45 * (1 - flight),
      THREE.MathUtils.lerp(1.2, 0.75, flight), THREE.MathUtils.lerp(distance, -6, flight));
    camera.lookAt(0, THREE.MathUtils.lerp(-0.25, 0.75, flight), camera.position.z - distance);
    stars.rotation.z = elapsed * 0.003;
    groups.forEach((group, index) => {
      const position = progress * group.length;
      const current = Math.min(Math.floor(position), group.length - 1);
      const t = progress === 1 ? 1 : position - current;
      group.forEach((_, j) => lines[index][j].geometry.setDrawRange(0, j < current ? 193 : j === current ? Math.max(2, Math.floor(t * 192) + 1) : 0));
      const stroke = group[current];
      const target = evaluate(stroke.terms, t);
      if (progress === 1) target.lerp(new THREE.Vector3(index === 0 ? -4 : 4, -1.2, 0.4), Math.min((elapsed - 24) / 1.5, 1));
      arms[index].follow(target, elapsed);
      const center = new THREE.Vector3();
      // The DC term is a translation, not an orbit.
      const dc = stroke.terms.find(term => term.frequency === 0)!;
      center.set(dc.re, dc.im, 0.025);
      const terms = stroke.terms.filter(term => term.frequency !== 0);
      epicycles[index].forEach((circle, j) => {
        const term = terms[j];
        circle.visible = progress < 1;
        circle.position.copy(center);
        const radius = Math.hypot(term.re, term.im);
        circle.scale.setScalar(radius);
        const angle = term.frequency * t * 2 * Math.PI;
        center.x += term.re * Math.cos(angle) - term.im * Math.sin(angle);
        center.y += term.re * Math.sin(angle) + term.im * Math.cos(angle);
      });
    });
    composer.render();
    frame = requestAnimationFrame(render);
  }
  function start() { if (active && !frame && !document.hidden) { last = 0; frame = requestAnimationFrame(render); } }
  function visibility() {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start();
  }
  document.addEventListener('visibilitychange', visibility);
  return {
    setTheme,
    setReveal(value: number) { reveal = value; },
    setActive(value: boolean) {
      active = value;
      if (active) start(); else { cancelAnimationFrame(frame); frame = 0; last = 0; }
    },
    replay() {
      elapsed = 0; last = 0;
      arms.forEach(arm => arm.reset());
      lines.forEach(group => group.forEach(line => line.geometry.setDrawRange(0, 0)));
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      bloom.dispose(); composer.dispose(); renderer.dispose();
    }
  };
}
