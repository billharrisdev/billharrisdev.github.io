import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const directory = await mkdtemp(join(tmpdir(), 'orbital-worker-test-'));
const source = await readFile(new URL('../src/lib/orbitalWorkerClient.ts', import.meta.url), 'utf8');
const modulePath = join(directory, 'client.mjs');
await writeFile(modulePath, ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText);
const { createOrbitalWorker, supportsOrbitalWorker } = await import(pathToFileURL(modulePath).href);
await rm(directory, { recursive: true });

function setup(t, { supported = true, ready = true } = {}) {
  const originals = new Map();
  const listeners = new Map();
  const workers = [];
  const observers = [];
  class FakeWorker {
    messages = [];
    terminated = false;
    constructor() {
      workers.push(this);
      queueMicrotask(() => this.emit({ type: 'supported', value: supported }));
    }
    emit(data) { this.onmessage?.({ data }); }
    postMessage(message) {
      this.messages.push(message);
      if (message.type === 'init' && ready) queueMicrotask(() => this.emit({ type: 'ready' }));
    }
    terminate() { this.terminated = true; }
  }
  class FakeObserver {
    disconnected = false;
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const document = {
    hidden: false,
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: type => listeners.delete(type),
  };
  for (const [key, value] of Object.entries({ Worker: FakeWorker, OffscreenCanvas: class {},
    HTMLCanvasElement: class { transferControlToOffscreen() {} }, ResizeObserver: FakeObserver,
    document, window: { setTimeout, devicePixelRatio: 2, innerWidth: 412 } })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const canvas = { transfers: 0, getBoundingClientRect: () => ({ width: 412, height: 823 }),
    transferControlToOffscreen() { this.transfers++; return {}; } };
  return { workers, observers, listeners, document, canvas };
}

test('worker controller forwards controls, resize and visibility, then cleans up', async t => {
  const state = setup(t);
  assert.equal(supportsOrbitalWorker(), true);
  const controller = await createOrbitalWorker(state.canvas, assert.fail, new AbortController().signal);
  assert.equal(state.canvas.transfers, 1);
  controller.setTheme('light'); controller.setPaused(true); controller.setReveal(0.5);
  controller.setActive(false); controller.replay();
  state.observers[0].callback();
  state.document.hidden = true; state.listeners.get('visibilitychange')();
  assert.deepEqual(state.workers[0].messages.map(message => message.type),
    ['init', 'theme', 'paused', 'reveal', 'active', 'replay', 'resize', 'visibility']);
  controller.dispose(); controller.dispose(); controller.setActive(true);
  assert.equal(state.workers[0].terminated, true);
  assert.equal(state.observers[0].disconnected, true);
  assert.equal(state.listeners.size, 0);
  assert.equal(state.workers[0].messages.length, 8);
});

test('unsupported worker fails before transferring the visible canvas', async t => {
  const state = setup(t, { supported: false });
  await assert.rejects(createOrbitalWorker(state.canvas, assert.fail, new AbortController().signal), /unavailable/);
  assert.equal(state.canvas.transfers, 0);
  assert.equal(state.workers[0].terminated, true);
});

test('worker startup can be cancelled without leaving a live worker', async t => {
  const state = setup(t, { ready: false });
  const abort = new AbortController();
  const promise = createOrbitalWorker(state.canvas, assert.fail, abort.signal);
  abort.abort();
  await assert.rejects(promise, /cancelled/);
  assert.equal(state.workers[0].terminated, true);
});

test('runtime worker failure notifies the fallback and disconnects observers', async t => {
  const state = setup(t);
  const failures = [];
  await createOrbitalWorker(state.canvas, error => failures.push(error.message), new AbortController().signal);
  state.workers[0].emit({ type: 'error', message: 'WebGL context lost' });
  assert.deepEqual(failures, ['WebGL context lost']);
  assert.equal(state.workers[0].terminated, true);
  assert.equal(state.observers[0].disconnected, true);
});
