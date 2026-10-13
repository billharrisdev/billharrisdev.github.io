<script lang="ts">
  import type { Project } from './lib/projects';
  import biquadReference from '../docs/digital-biquad-filter.webp';

  export let project: Project;
  let screenshotIndex = 0;
  $: screenshot = project.screenshots[screenshotIndex];
  let gesture: { id: number; x: number; y: number } | undefined;

  function step(direction: number) {
    screenshotIndex = (screenshotIndex + direction + project.screenshots.length) % project.screenshots.length;
  }

  function startSwipe(event: PointerEvent) {
    if (event.pointerType === 'mouse' || !event.isPrimary || project.screenshots.length < 2 ||
      (event.target as Element).closest('button')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function endSwipe(event: PointerEvent) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = undefined;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }

  function cancelSwipe() {
    gesture = undefined;
  }
</script>

<article>
  <header class="project-heading">
    <div class="meta"><span>{project.category}</span>{#if project.status}<span class="badge">{project.status}</span>{/if}</div>
    <h2 id={`project-heading-${project.id}`}>{project.name}</h2>
    <p class="subtitle">{project.subtitle}</p>
  </header>

  {#if screenshot}
    <figure>
      <div class="image-frame" class:swipeable={project.screenshots.length > 1}
        on:pointerdown={startSwipe} on:pointerup={endSwipe} on:pointercancel={cancelSwipe} on:lostpointercapture={cancelSwipe}>
        <img class="hero-image" src={screenshot.src} alt={screenshot.alt} loading="lazy" decoding="async" draggable="false" />
        {#if project.screenshots.length > 1}
          <button class="step previous" on:click={() => step(-1)} aria-label="Previous screenshot">←</button>
          <button class="step next" on:click={() => step(1)} aria-label="Next screenshot">→</button>
        {/if}
        <span class="image-count" aria-live="polite">{screenshotIndex + 1} / {project.screenshots.length}</span>
      </div>
      <figcaption>
        <span>{screenshot.caption}</span>
        <a href={screenshot.src} target="_blank" rel="noopener noreferrer" aria-label={`Open full screenshot: ${screenshot.caption} (new tab)`}>Full image <span aria-hidden="true">↗</span></a>
      </figcaption>
    </figure>
    {#if project.screenshots.length > 1}
      <div class="gallery-controls">
        <div class="thumbnails" aria-label="Screenshot selection">
          {#each project.screenshots as image, index}
            <button class:current={index === screenshotIndex} aria-pressed={index === screenshotIndex}
              aria-label={`Show ${image.caption}`} on:click={() => screenshotIndex = index}>
              <img src={image.src} alt="" loading="lazy" decoding="async" />
              <span>{image.caption}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="empty-gallery">
      <span class="empty-mark" aria-hidden="true">{project.category === 'Corporate' ? 'ARCHIVE' : 'PLAY / EXPLORE'}</span>
      <p>Screenshots coming soon.</p>
      {#if project.href}<a class="visit" href={project.href}>Explore the live project <span aria-hidden="true">↗</span></a>{/if}
    </div>
  {/if}

  <div class="project-copy">
    <p>{project.description}</p>
    {#if project.features}
      <ul>{#each project.features as feature}<li>{feature}</li>{/each}</ul>
    {/if}
    {#if project.id === 'daw-gnu'}
      <details>
        <summary>Under the hood technical details (WASM and biquad filters oh my)<span aria-hidden="true">+</span></summary>
        <div class="technical">
          <p>Built in Rust targetting WebAssembly, we use hardware-accelerated encoding and decoding through WebCodecs.</p>
          <p>The audio chain implements WebGPU biquad filters as shaders for hardware-accelerated effects processing and highly chainable design for minimal latency.</p>
          <figure class="biquad-reference">
            <a class="reference-image" href="https://en.wikipedia.org/wiki/Digital_biquad_filter" target="_blank" rel="noopener noreferrer" aria-label="Read Digital biquad filter on Wikipedia (new tab)">
              <img src={biquadReference} alt="Wikipedia excerpt explaining digital biquad filters, their transfer-function equations, coefficient normalization, and stability." loading="lazy" decoding="async" />
            </a>
            <figcaption>
              <a href="https://en.wikipedia.org/wiki/Digital_biquad_filter" target="_blank" rel="noopener noreferrer">Digital biquad filter — Wikipedia contributors</a>
              · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
            </figcaption>
          </figure>
        </div>
      </details>
    {/if}
    {#if project.href && screenshot}<a class="visit" href={project.href}>Visit site <span aria-hidden="true">↗</span></a>{/if}
  </div>
</article>

<style>
  button, a, summary { -webkit-tap-highlight-color: transparent; }
  button { font: inherit; cursor: pointer; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent); }
  .badge { border: 1px solid var(--border); padding: 0.35rem 0.6rem; border-radius: 999px; color: var(--text); letter-spacing: 0.06em; }
  .project-heading h2 { margin: 1rem 0 0.5rem; font-size: clamp(1.8rem, 3.5vw, 3rem); letter-spacing: -0.045em; font-weight: 500; line-height: 1.15; }
  .subtitle { font-size: 0.9rem; opacity: 0.65; margin: 0 0 1.75rem; line-height: 1.6; }
  figure { margin: 0; }
  .image-frame { position: relative; display: grid; place-items: center; height: clamp(240px, 36vw, 440px); padding: 0.75rem; border: 1px solid var(--border); border-radius: 14px; background: color-mix(in oklab, var(--text) 4%, var(--bg)); overflow: hidden; }
  .image-frame.swipeable { touch-action: pan-y pinch-zoom; }
  .hero-image { display: block; width: 100%; height: 100%; min-height: 0; object-fit: contain; }
  .image-count { position: absolute; bottom: 1rem; right: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 999px; padding: 0.35rem 0.6rem; font-size: 0.65rem; }
  figcaption { display: flex; gap: 1rem; justify-content: space-between; align-items: center; padding: 0.75rem 0.1rem; font-size: 0.75rem; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; text-underline-offset: 4px; }
  .gallery-controls { display: flex; gap: 0.65rem; align-items: center; margin: 0.4rem 0 1.75rem; }
  .step { position: absolute; top: 50%; transform: translateY(-50%); display: grid; place-items: center; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 50%; width: 2.75rem; height: 2.75rem; box-shadow: 0 2px 8px rgb(0 0 0 / 15%); }
  .step.previous { left: 0.75rem; }
  .step.next { right: 0.75rem; }
  .step:hover { color: var(--accent); border-color: var(--accent); }
  .thumbnails { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.25rem; min-width: 0; flex: 1; }
  .thumbnails button { flex: 0 0 92px; min-width: 0; border: 1px solid var(--border); padding: 0.3rem; border-radius: 7px; color: var(--text); background: var(--surface); }
  .thumbnails button.current { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 8%, var(--bg)); }
  .thumbnails img { display: block; height: 48px; width: 100%; object-fit: contain; }
  .thumbnails span { display: block; font-size: 0.55rem; margin-top: 0.35rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .project-copy { font-size: 0.9rem; line-height: 1.8; }
  .project-copy > p { margin: 1.5rem 0 1rem; }
  .project-copy ul { margin: 1rem 0 1.5rem; padding-left: 1.2rem; }
  .project-copy li { padding-left: 0.25rem; margin-bottom: 0.35rem; }
  .project-copy li::marker { color: var(--accent); }
  details { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  summary { padding: 1rem 0; cursor: pointer; color: var(--accent); }
  summary span { float: right; }
  details[open] summary span { transform: rotate(45deg); }
  .technical p { margin: 0 0 1rem; }
  .biquad-reference { margin: 1.25rem 0; }
  .reference-image { display: block; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #fff; }
  .reference-image img { display: block; width: 100%; height: auto; }
  .biquad-reference figcaption { display: block; line-height: 1.7; }
  .visit { display: inline-flex; gap: 1.5rem; align-items: center; margin-top: 0.75rem; padding: 0.6rem 0; font-size: 0.8rem; }
  .empty-gallery { min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center; border: 1px solid var(--border); border-radius: 14px; background: radial-gradient(ellipse at top right, color-mix(in oklab, var(--accent) 12%, var(--bg)), var(--bg)); }
  .empty-mark { font-size: clamp(1.2rem, 3vw, 2.3rem); letter-spacing: 0.15em; color: var(--accent); opacity: 0.5; }
  .empty-gallery p { font-size: 0.8rem; opacity: 0.6; }
  button:focus-visible, a:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  @media (max-width: 760px) {
    .image-frame { height: 300px; }
  }
</style>
