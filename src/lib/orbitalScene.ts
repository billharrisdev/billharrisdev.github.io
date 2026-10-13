import * as THREE from 'three';
import letteringUrl from '../generated/orbital-lettering.bin?url';
import { decodeLettering, evaluate } from './orbitalLettering';
import { createArmSolver } from './orbitalKinematics';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

function glowTexture() {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
    const offset = (y * size + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
    pixels[offset + 3] = Math.round(255 * Math.exp(-radius * radius * 5) * Math.max(0, 1 - radius));
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makeArm(scene: THREE.Scene, x: number, color: number, glow: THREE.Texture) {
  const root = new THREE.Group();
  root.position.set(x, -2.5, 0.35);
  scene.add(root);
  const metal = new THREE.MeshStandardMaterial({ color: 0x172039, metalness: 0.8, roughness: 0.3 });
  const neon = new THREE.MeshBasicMaterial({ color });
  // Additive bloom disappears against white. These softly tinted halos use
  // normal alpha blending so the lights remain visible in a bright studio.
  const haloMaterial = new THREE.SpriteMaterial({ map: glow, color, transparent: true,
    opacity: 0.5, depthWrite: false, toneMapped: false, fog: false });
  const halos: THREE.Sprite[] = [];
  function addHalo(parent: THREE.Object3D, size: number) {
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(size, size, 1);
    halo.visible = false;
    parent.add(halo);
    halos.push(halo);
  }
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
    addHalo(joint, i < 3 ? 1.6 : 1.1);
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
  addHalo(parent, 1.4);
  const penLight = new THREE.PointLight(color, 0, 4);
  parent.add(penLight);
  const follow = createArmSolver(root, joints, axes, tip);
  return {
    tip,
    reset() {
      joints.forEach(joint => joint.quaternion.identity());
      joints[1].rotation.z = x < 0 ? 0.7 : 2.4;
      joints[2].rotation.z = x < 0 ? -1.2 : 1.2;
    },
    setTheme(dark: boolean, color: number) {
      metal.color.setHex(dark ? 0x172039 : 0xa6b4cc);
      neon.color.setHex(dark ? color : x < 0 ? 0x26e6ff : 0xcd82ff).multiplyScalar(dark ? 1 : 3.5);
      haloMaterial.color.setHex(color);
      halos.forEach(halo => halo.visible = !dark);
      penLight.color.setHex(color);
      penLight.intensity = dark ? 0 : 15;
      metal.metalness = dark ? 0.8 : 0.45;
    },
    follow,
  };
}

export async function createOrbitalScene(canvas: HTMLCanvasElement) {
  const response = await fetch(letteringUrl);
  if (!response.ok) throw new Error(`Orbital lettering unavailable: ${response.status}`);
  const strokes = decodeLettering(await response.arrayBuffer());
  // Yield before WebGL setup instead of combining data decoding and renderer
  // creation in one task. No animation duration or visual settings change.
  await new Promise<void>(resolve => setTimeout(resolve, 0));
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
  const palette = [0x63f5ff, 0xd78aff];
  const glow = glowTexture();
  const arms = [makeArm(scene, -5.5, palette[0], glow), makeArm(scene, 5.5, palette[1], glow)];
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
  let paused = false;
  let poseTime = NaN;
  const targets = arms.map(() => new THREE.Vector3());
  const centers = arms.map(() => new THREE.Vector3());
  const parking = arms.map((_, index) => new THREE.Vector3(index === 0 ? -4 : 4, -1.2, 0.4));
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
    bloom.strength = dark ? 0.85 : 0.55;
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
      // Keep saturated cores, but raise their HDR luminance above the light
      // studio's bloom threshold instead of turning bloom on for the backdrop.
      line.material.color.setHex(palette[index]).multiplyScalar(dark ? 2.5 : index === 0 ? 8 : 11)));
    epicycles.forEach((group, index) => group.forEach(circle => {
      circle.material.color.setHex(palette[index]);
      circle.material.opacity = dark ? 0.18 : 0.35;
    }));
    if (paused) start();
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
    composer.setSize(Math.max(width, 1), Math.max(height, 1));
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    if (paused) start();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function render(now: number) {
    if (disposed || !active || document.hidden) { frame = 0; return; }
    const dt = last && !paused ? Math.min((now - last) / 1000, 0.5) : 0;
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
    if (elapsed !== poseTime) groups.forEach((group, index) => {
      const position = progress * group.length;
      const current = Math.min(Math.floor(position), group.length - 1);
      const t = progress === 1 ? 1 : position - current;
      group.forEach((_, j) => {
        const geometry = lines[index][j].geometry;
        const count = j < current ? 193 : j === current ? Math.max(2, Math.floor(t * 192) + 1) : 0;
        if (geometry.drawRange.count !== count) geometry.setDrawRange(0, count);
      });
      const stroke = group[current];
      const target = evaluate(stroke.terms, t, targets[index]);
      if (progress === 1) target.lerp(parking[index], Math.min((elapsed - 24) / 1.5, 1));
      arms[index].follow(target, elapsed);
      const center = centers[index];
      // The DC term is a translation, not an orbit.
      const dc = stroke.dc;
      center.set(dc.re, dc.im, 0.025);
      const terms = stroke.orbits;
      epicycles[index].forEach((circle, j) => {
        const term = terms[j];
        circle.visible = progress < 1;
        if (!circle.visible) return;
        circle.position.copy(center);
        circle.scale.setScalar(term.radius);
        const angle = term.frequency * t * 2 * Math.PI;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        center.x += term.re * cos - term.im * sin;
        center.y += term.re * sin + term.im * cos;
      });
    });
    poseTime = elapsed;
    composer.render();
    frame = paused ? 0 : requestAnimationFrame(render);
  }
  function start() { if (active && !frame && !document.hidden) { last = 0; frame = requestAnimationFrame(render); } }
  function visibility() {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start();
  }
  document.addEventListener('visibilitychange', visibility);
  return {
    setTheme,
    async prepare() {
      await renderer.compileAsync(scene, camera);
      if (!disposed) composer.render();
    },
    setPaused(value: boolean) {
      paused = value;
      cancelAnimationFrame(frame); frame = 0; last = 0;
      start();
    },
    setReveal(value: number) { reveal = value; if (paused) start(); },
    setActive(value: boolean) {
      active = value;
      if (active) start(); else { cancelAnimationFrame(frame); frame = 0; last = 0; }
    },
    replay() {
      elapsed = 0; last = 0; poseTime = NaN;
      arms.forEach(arm => arm.reset());
      lines.forEach(group => group.forEach(line => line.geometry.setDrawRange(0, 0)));
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
          if (!(object instanceof THREE.Sprite)) object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      glow.dispose(); bloom.dispose(); composer.dispose(); renderer.dispose();
    }
  };
}
