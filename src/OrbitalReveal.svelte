<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { theme } from './stores/theme';
  import type { createOrbitalScene } from './lib/orbitalScene';

  export let onProgress: (value: number) => void = () => {};

  let section: HTMLElement;
  let canvas: HTMLCanvasElement;
  let home: HTMLDivElement;
  let collapsed = false;
  let settling = false;
  let settleFrame = 0;
  let revision = 0;
  let progress = 0;
  let ready = false;
  let fallback = false;
  let reducedMotion = false;
  let scene: ReturnType<typeof createOrbitalScene> | undefined;
  let paused = false;
  let loadScene = () => {};

  $: scene?.setTheme($theme);
  $: scene?.setPaused(paused);

  export async function reset() {
    const current = ++revision;
    cancelAnimationFrame(settleFrame);
    settling = false;
    collapsed = false;
    scene?.replay();
    progress = 0;
    onProgress(0);
    scene?.setReveal(0);
    await tick();
    if (current !== revision) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    scene?.setActive(!reducedMotion && !fallback);
    if (!scene) loadScene();
  }

  export async function completeReveal() {
    if (collapsed) return;
    const current = ++revision;
    cancelAnimationFrame(settleFrame);
    settling = false;
    // Preserve the visible portfolio position as the intro leaves document flow.
    const offset = Math.max(0, -home.getBoundingClientRect().top);
    const focusWasInIntro = section.contains(document.activeElement);
    collapsed = true;
    progress = 1;
    onProgress(1);
    scene?.setReveal(1);
    scene?.setActive(false);
    await tick();
    if (current !== revision) return;
    window.scrollTo({ top: offset, behavior: 'instant' });
    if (focusWasInIntro) home.focus({ preventScroll: true });
  }

  function settleReveal() {
    if (settling || collapsed) return;
    const distance = home.getBoundingClientRect().top;
    if (reducedMotion || distance <= 0) {
      void completeReveal();
      return;
    }
    settling = true;
    const start = window.scrollY;
    const started = performance.now();
    const animate = (now: number) => {
      const fraction = Math.min(1, (now - started) / 180);
      const eased = 1 - Math.pow(1 - fraction, 3);
      window.scrollTo({ top: start + distance * eased, behavior: 'instant' });
      if (fraction < 1) settleFrame = requestAnimationFrame(animate);
      else void completeReveal();
    };
    settleFrame = requestAnimationFrame(animate);
  }

  onMount(() => {
    let destroyed = false;
    let loading = false;
    let scrollFrame = 0;
    let loadTimer: ReturnType<typeof setTimeout>;
    let idleLoad: number | undefined;
    let loadScheduled = false;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      scrollFrame = 0;
      if (collapsed) {
        scene?.setReveal(1);
        scene?.setActive(false);
        return;
      }
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - canvas.clientHeight);
      progress = Math.max(0, Math.min(1, -rect.top / travel));
      onProgress(progress);
      scene?.setReveal(progress);
      scene?.setActive(!reducedMotion && !fallback && progress < 0.98 && rect.bottom > 0);
      if (loadScheduled && !scene && rect.top < window.innerHeight && rect.bottom > 0) scheduleLoad();
      if (reducedMotion || fallback) {
        if (home.getBoundingClientRect().top <= 0) void completeReveal();
      } else if (progress >= 0.98) settleReveal();
    };
    const queueUpdate = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(update); };
    const load = async () => {
      if (destroyed || media.matches || scene || loading || collapsed || fallback) return;
      const rect = section.getBoundingClientRect();
      if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
      loading = true;
      try {
        // The chunk contains the font too: no third-party runtime asset requests.
        const { createOrbitalScene } = await import('./lib/orbitalScene');
        if (destroyed || media.matches || collapsed) return;
        const currentRect = section.getBoundingClientRect();
        if (currentRect.top >= window.innerHeight || currentRect.bottom <= 0) return;
        scene = createOrbitalScene(canvas);
        scene.setTheme($theme);
        scene.setPaused(paused);
        ready = true;
        update();
      } catch (error) {
        if (destroyed) return;
        scene?.dispose(); scene = undefined;
        fallback = true;
        console.warn('Orbital scene unavailable; using the static signature.', error);
      } finally {
        loading = false;
      }
    };
    const scheduleLoad = () => {
      if (destroyed || media.matches || scene || loading || collapsed || fallback || idleLoad !== undefined) return;
      if ('requestIdleCallback' in window) {
        idleLoad = window.requestIdleCallback(() => {
          idleLoad = undefined;
          void load();
        }, { timeout: 2000 });
      } else {
        void load();
      }
    };
    loadScene = () => { if (loadScheduled) scheduleLoad(); };
    const motionChange = () => {
      reducedMotion = media.matches;
      if (reducedMotion) scene?.setActive(false);
      else if (!scene && loadScheduled) scheduleLoad();
      update();
    };
    reducedMotion = media.matches;
    // Keep the static hero's initial render clear of the animation download/work.
    // Idle scheduling postpones startup; it does not split synchronous scene work.
    loadTimer = setTimeout(() => {
      loadScheduled = true;
      scheduleLoad();
    }, 2000);
    media.addEventListener('change', motionChange);
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    const contextLost = (event: Event) => {
      event.preventDefault(); fallback = true; scene?.setActive(false);
      update();
    };
    // Do not fight a user's next gesture while gently settling the reveal.
    const interruptSettle = () => { if (settling) void completeReveal(); };
    window.addEventListener('wheel', interruptSettle, { passive: true });
    window.addEventListener('touchstart', interruptSettle, { passive: true });
    window.addEventListener('keydown', interruptSettle);
    canvas.addEventListener('webglcontextlost', contextLost);
    update();
    return () => {
      destroyed = true;
      loadScene = () => {};
      revision++;
      cancelAnimationFrame(settleFrame);
      clearTimeout(loadTimer); cancelAnimationFrame(scrollFrame);
      if (idleLoad !== undefined) window.cancelIdleCallback(idleLoad);
      media.removeEventListener('change', motionChange);
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
      window.removeEventListener('wheel', interruptSettle);
      window.removeEventListener('touchstart', interruptSettle);
      window.removeEventListener('keydown', interruptSettle);
      canvas.removeEventListener('webglcontextlost', contextLost);
      scene?.dispose();
    };
  });
</script>

<div class="experience" class:static-view={reducedMotion || fallback} class:collapsed
  style={`--flight: ${progress}; --scene-opacity: ${1 - Math.max(0, Math.min(1, (progress - 0.62) / 0.34))}; --ui-opacity: ${1 - Math.min(1, progress / 0.4)}; --home-opacity: ${Math.max(0, Math.min(1, (progress - 0.58) / 0.34))};`}>
<section id="top" class="orbital" bind:this={section} inert={collapsed}>
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
    {#if ready && !fallback && !reducedMotion}
      <div class="animation-controls" inert={progress > 0.4}>
        <button on:click={() => paused = !paused} aria-pressed={paused}>
          {paused ? 'Resume animation' : 'Pause animation'}
        </button>
      </div>
    {/if}
  </div>
</section>
<div id="home" class="home" bind:this={home} tabindex="-1" aria-label="Projects"
  inert={progress <= 0.58 && !reducedMotion && !fallback}>
  <slot />
</div>
</div>

<style>
  .experience { --stage-height: max(100svh, 28rem); color: var(--text); background: var(--bg); overflow-anchor: none; }
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
  .animation-controls { position: absolute; bottom: 2rem; right: 1.25rem; opacity: var(--ui-opacity); pointer-events: auto; }
  .animation-controls button { font: inherit; font-size: 0.75rem; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 0.65rem 1rem; cursor: pointer; }
  .animation-controls button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  .static-view .orbital { height: auto; }
  .static-view .stage { height: auto; position: relative; }
  .static-view .studio { position: relative; height: 100svh; opacity: 1; }
  .static-view .home { margin-top: 0; opacity: 1; transform: none; }
  .static-view .caption { opacity: 1; }
  .static-view .signature { transform: translate(-50%, -50%); transition: none; }
  .collapsed .orbital { display: none; }
  .collapsed .home { margin-top: 0; opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) { canvas { transition: none; } }
</style>
