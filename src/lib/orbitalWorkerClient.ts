import type { OrbitalController, OrbitalMessage, OrbitalReply } from './orbitalProtocol';

export function supportsOrbitalWorker() {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';
}

export async function createOrbitalWorker(canvas: HTMLCanvasElement,
  onFailure: (error: Error) => void, signal: AbortSignal): Promise<OrbitalController> {
  const worker = new Worker(new URL('./orbital.worker.ts', import.meta.url), { type: 'module' });
  let disposed = false;
  let initialized = false;
  let observer: ResizeObserver | undefined;
  let rejectStartup: (error: Error) => void = () => {};
  const post = (message: OrbitalMessage, transfer: Transferable[] = []) => {
    if (!disposed) worker.postMessage(message, transfer);
  };
  const visibility = () => post({ type: 'visibility', hidden: document.hidden });
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    signal.removeEventListener('abort', abort);
    worker.terminate();
  };
  const abort = () => {
    if (!initialized) rejectStartup(new Error('Worker startup cancelled'));
    dispose();
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    if (signal.aborted) throw new Error('Worker startup cancelled');
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => fail(new Error('Worker startup timed out')), 15000);
      const fail = (error: Error) => {
        clearTimeout(timeout);
        if (initialized) { dispose(); onFailure(error); }
        else reject(error);
      };
      rejectStartup = fail;
      worker.onerror = event => { event.preventDefault(); fail(new Error(event.message || 'Worker rendering failed')); };
      worker.onmessage = ({ data }: MessageEvent<OrbitalReply>) => {
        if (disposed) return;
        if (data.type === 'error') fail(new Error(data.message));
        else if (data.type === 'supported') {
          if (!data.value) { fail(new Error('Worker WebGL or animation frames unavailable')); return; }
          try {
            const size = canvas.getBoundingClientRect();
            const offscreen = canvas.transferControlToOffscreen();
            post({ type: 'init', canvas: offscreen, width: size.width, height: size.height,
              pixelRatio: window.devicePixelRatio, viewportWidth: window.innerWidth, hidden: document.hidden }, [offscreen]);
          } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
        } else if (data.type === 'ready') {
          clearTimeout(timeout);
          initialized = true;
          resolve();
        }
      };
    });
    observer = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      post({ type: 'resize', width, height });
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', visibility);
    return {
      setTheme: value => post({ type: 'theme', value }),
      setPaused: value => post({ type: 'paused', value }),
      setReveal: value => post({ type: 'reveal', value }),
      setActive: value => post({ type: 'active', value }),
      replay: () => post({ type: 'replay' }),
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
