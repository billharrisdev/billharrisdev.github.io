import { createOrbitalScene } from './orbitalScene';
import type { OrbitalMessage, OrbitalReply } from './orbitalProtocol';

// Use a narrow worker interface without adding conflicting DOM/WebWorker libs.
const scope = self as unknown as {
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
  postMessage(message: OrbitalReply): void;
  onmessage: ((event: MessageEvent<OrbitalMessage>) => void) | null;
  close(): void;
};
let scene: ReturnType<typeof createOrbitalScene> | undefined;
let hidden = false;
let supported = false;
try {
  const probe = new OffscreenCanvas(1, 1);
  const context = probe.getContext('webgl2');
  supported = !!context && typeof scope.requestAnimationFrame === 'function';
  context?.getExtension('WEBGL_lose_context')?.loseContext();
} catch { /* The main-thread renderer remains the fallback. */ }
scope.postMessage({ type: 'supported', value: supported });

scope.onmessage = ({ data }) => {
  try {
    switch (data.type) {
      case 'init':
        if (!supported || scene) throw new Error('Worker rendering unavailable');
        hidden = data.hidden;
        data.canvas.addEventListener('webglcontextlost', () => {
          scene?.setActive(false);
          scope.postMessage({ type: 'error', message: 'Worker WebGL context lost' });
        });
        scene = createOrbitalScene(data.canvas, {
          ...data,
          isHidden: () => hidden,
          requestFrame: callback => scope.requestAnimationFrame!(callback),
          cancelFrame: id => scope.cancelAnimationFrame(id),
        });
        scope.postMessage({ type: 'ready' });
        break;
      case 'resize': scene?.resize(data.width, data.height); break;
      case 'visibility': hidden = data.hidden; scene?.visibility(); break;
      case 'theme': scene?.setTheme(data.value); break;
      case 'paused': scene?.setPaused(data.value); break;
      case 'active': scene?.setActive(data.value); break;
      case 'reveal': scene?.setReveal(data.value); break;
      case 'replay': scene?.replay(); break;
      case 'dispose': scene?.dispose(); scope.close(); break;
    }
  } catch (error) {
    scene?.setActive(false);
    scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
