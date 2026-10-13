import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import { buildLettering, encodeLettering } from '../scripts/generate-orbital-lettering.mjs';

async function loadTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  const code = outputText.replaceAll("from 'three'", `from '${import.meta.resolve('three')}'`);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const { decodeLettering, evaluate } = await loadTypeScript('../src/lib/orbitalLettering.ts');
const { createArmSolver } = await loadTypeScript('../src/lib/orbitalKinematics.ts');

test('precomputed lettering preserves every original harmonic and contour point exactly', async () => {
  const reference = await buildLettering();
  const generated = await readFile(new URL('../src/generated/orbital-lettering.bin', import.meta.url));
  assert.ok(generated.equals(encodeLettering(reference)));
  const strokes = decodeLettering(generated.buffer.slice(generated.byteOffset, generated.byteOffset + generated.byteLength));
  assert.equal(strokes.length, reference.length);
  const target = new THREE.Vector3();
  for (let i = 0; i < strokes.length; i++) {
    assert.deepEqual(strokes[i].terms.map(({ frequency, re, im }) => ({ frequency, re, im })), reference[i].terms);
    assert.deepEqual(strokes[i].points, reference[i].points);
    for (const index of [0, 48, 96, 192]) {
      assert.deepEqual(evaluate(strokes[i].terms, index / 192, target), reference[i].points[index]);
    }
  }
});

function arm(x) {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  root.position.set(x, -2.5, 0.35);
  scene.add(root);
  const joints = [];
  const axes = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)];
  let parent = root;
  [0.55, 2.65, 2.45, 0.55, 0.4, 0.35].forEach((length, i) => {
    const joint = new THREE.Group();
    parent.add(joint);
    joints.push(joint);
    // Decorative siblings should never be visited by the optimized solver.
    for (let j = 0; j < 4; j++) joint.add(new THREE.Object3D());
    const next = new THREE.Group();
    if (i === 0) next.position.y = length;
    else next.position.x = length;
    joint.add(next);
    parent = next;
  });
  joints[1].rotation.z = x < 0 ? 0.7 : 2.4;
  joints[2].rotation.z = x < 0 ? -1.2 : 1.2;
  const tip = new THREE.Object3D();
  parent.add(tip);
  let updates = 0;
  scene.traverse(node => {
    const update = node.updateMatrix;
    node.updateMatrix = function () { updates++; return update.call(this); };
  });
  return { root, joints, axes, tip, updates: () => updates };
}

function originalSolver({ root, joints, axes, tip }) {
  const origin = new THREE.Vector3(), end = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), axis = new THREE.Vector3(), cross = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  return (target, time) => {
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
  };
}

test('optimized IK matches the original poses with substantially fewer matrix updates', () => {
  for (const x of [-5.5, 5.5]) {
    const reference = arm(x), optimized = arm(x);
    const original = originalSolver(reference);
    const solve = createArmSolver(optimized.root, optimized.joints, optimized.axes, optimized.tip);
    for (let frame = 0; frame < 120; frame++) {
      const time = frame / 60;
      const target = new THREE.Vector3(Math.sin(time) * 4, Math.cos(time * 2) + 0.75, 0);
      original(target, time);
      solve(target, time);
      for (let i = 0; i < 6; i++) {
        const expected = reference.joints[i].quaternion.toArray();
        const actual = optimized.joints[i].quaternion.toArray();
        expected.forEach((value, index) => assert.ok(Math.abs(value - actual[index]) < 1e-12));
      }
    }
    assert.ok(optimized.updates() < reference.updates() / 3);
  }
});
