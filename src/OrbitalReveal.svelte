<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from './stores/theme';
  import type { createOrbitalScene } from './lib/orbitalScene';

  export let onProgress: (value: number) => void = () => {};

  let section: HTMLElement;
  let canvas: HTMLCanvasElement;
  let progress = 0;
  let ready = false;
  let fallback = false;
  let reducedMotion = false;
  let scene: ReturnType<typeof createOrbitalScene> | undefined;

  $: scene?.setTheme($theme);

  export function reset() {
    scene?.replay();
    progress = 0;
    onProgress(0);
    scene?.setReveal(0);
    window.scrollTo({ top: 0, behavior: 'instant' });
    scene?.setActive(!reducedMotion && !fallback);
  }

  onMount(() => {
    let destroyed = false;
    let scrollFrame = 0;
    let loadTimer: ReturnType<typeof setTimeout>;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      scrollFrame = 0;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - canvas.clientHeight);
      progress = Math.max(0, Math.min(1, -rect.top / travel));
      onProgress(progress);
      scene?.setReveal(progress);
      scene?.setActive(!reducedMotion && !fallback && progress < 0.98 && rect.bottom > 0);
    };
    const queueUpdate = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(update); };
    const load = async () => {
      if (destroyed || media.matches || scene) return;
      try {
        // The chunk contains the font too: no third-party runtime asset requests.
        const { createOrbitalScene } = await import('./lib/orbitalScene');
        if (destroyed || media.matches) return;
        scene = createOrbitalScene(canvas);
        ready = true;
        update();
      } catch (error) {
        fallback = true;
        console.warn('Orbital scene unavailable; using the static signature.', error);
      }
    };
    const motionChange = () => {
      reducedMotion = media.matches;
      if (reducedMotion) scene?.setActive(false);
      else if (!scene) void load();
      update();
    };
    reducedMotion = media.matches;
    // Yield the initial render, then download and initialize in the background.
    loadTimer = setTimeout(() => void load(), 350);
    media.addEventListener('change', motionChange);
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    const contextLost = (event: Event) => {
      event.preventDefault(); fallback = true; scene?.setActive(false);
    };
    canvas.addEventListener('webglcontextlost', contextLost);
    update();
    return () => {
      destroyed = true;
      clearTimeout(loadTimer); cancelAnimationFrame(scrollFrame);
      media.removeEventListener('change', motionChange);
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
      canvas.removeEventListener('webglcontextlost', contextLost);
      scene?.dispose();
    };
  });
</script>

<div class="experience" class:static-view={reducedMotion || fallback}
  style={`--flight: ${progress}; --scene-opacity: ${1 - Math.max(0, Math.min(1, (progress - 0.62) / 0.34))}; --ui-opacity: ${1 - Math.min(1, progress / 0.4)}; --home-opacity: ${Math.max(0, Math.min(1, (progress - 0.58) / 0.34))};`}>
<section id="top" class="orbital" bind:this={section}>
  <div class="stage">
    <div class="studio" aria-labelledby="orbital-title">
    <canvas bind:this={canvas} class:visible={ready && !fallback && !reducedMotion} aria-hidden="true"></canvas>
    <div class="vignette" aria-hidden="true"></div>
    <div class="caption" inert={progress > 0.4 && !reducedMotion && !fallback}>
      <span class="eyebrow">Beyond the ordinary</span>
       <h2 id="orbital-title"><a class="explore" href="#home">Explore projects <span aria-hidden="true">↓</span></a></h2>
    </div>
    <div class="signature" class:tracing={ready && !fallback && !reducedMotion} aria-hidden="true">billharris.dev</div>
    </div>
  </div>
</section>
<div id="home" class="home" tabindex="-1" aria-label="Projects"
  inert={progress < 0.92 && !reducedMotion && !fallback}>
  <slot />
</div>
</div>

<style>
  .experience { --stage-height: max(100svh, 28rem); color: var(--text); background: var(--bg); }
  .orbital { height: calc(140svh + var(--stage-height)); position: relative; z-index: 1; pointer-events: none; }
  .stage { height: var(--stage-height); position: sticky; top: 0; overflow: hidden; isolation: isolate; }
  .home { position: relative; z-index: 0; margin-top: calc(-1 * var(--stage-height)); opacity: var(--home-opacity); transform: scale(calc(0.94 + var(--home-opacity) * 0.06)); transform-origin: center top; }
  .home:focus { outline: none; }
  .studio { position: absolute; inset: 0; opacity: var(--scene-opacity); background: radial-gradient(ellipse at 50% 60%, var(--surface) 0%, var(--bg) 65%); pointer-events: none; }
  canvas { width: 100%; height: 100%; display: block; opacity: 0; transition: opacity 900ms ease; }
  canvas.visible { opacity: 1; }
  .vignette { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(color-mix(in oklab, var(--bg) 70%, transparent), transparent 30%, transparent 75%, var(--bg)); }
  .caption { position: absolute; left: 0; right: 0; top: max(6rem, 12%); text-align: center; padding: 0 1.25rem; opacity: var(--ui-opacity); }
  .eyebrow { color: var(--accent); font-size: 0.65rem; letter-spacing: 0.28em; text-transform: uppercase; }
  h2 { font-size: clamp(1.3rem, 3vw, 2.2rem); font-weight: 400; letter-spacing: -0.04em; margin: 0.8rem 0 0.5rem; }
  .signature { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) scale(calc(1 + var(--flight) * 3)); font-weight: 600; font-size: clamp(2rem, 8vw, 7rem); white-space: nowrap; color: var(--accent); text-shadow: 0 0 24px #63f5ff66, 0 0 70px #9a66ff66; transition: opacity 700ms ease; }
  .signature.tracing { opacity: 0; }
  .explore { color: var(--text); text-decoration: none; display: inline-flex; gap: 0.8rem; align-items: center; pointer-events: auto; padding: 0.65rem 0; }
  .explore:hover { color: var(--accent); }
  .explore:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  .static-view .orbital { height: auto; }
  .static-view .stage { height: auto; position: relative; }
  .static-view .studio { position: relative; height: 100svh; opacity: 1; }
  .static-view .home { margin-top: 0; opacity: 1; transform: none; }
  .static-view .caption { opacity: 1; }
  .static-view .signature { transform: translate(-50%, -50%); transition: none; }
  @media (prefers-reduced-motion: reduce) { canvas { transition: none; } }
</style>
