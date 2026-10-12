<script lang="ts">
  import { fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { projects } from './lib/projects';

  const categories = ['Showcase', 'Corporate'] as const;
  let selected = projects.find(project => project.id === 'daw-gnu')!;
  let screenshotIndex = 0;
  let reducedMotion = true;
  let gallery: HTMLElement;
  $: screenshot = selected.screenshots[screenshotIndex];

  function select(id: string) {
    if (selected.id === id) return;
    selected = projects.find(project => project.id === id)!;
    screenshotIndex = 0;
  }

  function step(direction: number) {
    screenshotIndex = (screenshotIndex + direction + selected.screenshots.length) % selected.screenshots.length;
  }

  function open(id: string) {
    select(id);
    if (window.matchMedia('(max-width: 760px)').matches) {
      gallery.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    }
  }

  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => reducedMotion = media.matches;
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
</script>

<main class="portfolio" aria-label="Project portfolio">
  <div class="workspace">
    <nav class="project-list" aria-label="Portfolio projects">
      <p class="index-label">Selected work <span aria-hidden="true">↗</span></p>
      {#each categories as category}
        <section aria-labelledby={`category-${category.toLowerCase()}`}>
          <h2 id={`category-${category.toLowerCase()}`}>{category}</h2>
          <ul>
            {#each projects.filter(project => project.category === category) as project}
              <li>
                <button class="project-button" class:selected={selected.id === project.id}
                  aria-pressed={selected.id === project.id} aria-controls="project-gallery"
                  on:mouseenter={() => select(project.id)} on:focus={() => select(project.id)}
                  on:click={() => open(project.id)}>
                  <span>{project.name}</span><span class="selection-arrow" aria-hidden="true">↗</span>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
      <p class="hint">Hover, focus, or select a project to explore.</p>
    </nav>

    <section class="gallery" id="project-gallery" bind:this={gallery} aria-label="Selected project gallery">
      {#key selected.id}
        <article in:fly={{ x: reducedMotion ? 0 : 24, duration: reducedMotion ? 0 : 320 }}>
          <header class="project-heading">
            <div class="meta"><span>{selected.category}</span>{#if selected.status}<span class="badge">{selected.status}</span>{/if}</div>
            <h2>{selected.name}</h2>
            <p class="subtitle">{selected.subtitle}</p>
          </header>

          {#if screenshot}
            <figure>
              <div class="image-frame">
                <img class="hero-image" src={screenshot.src} alt={screenshot.alt} loading="lazy" decoding="async" />
                <span class="image-count">{screenshotIndex + 1} / {selected.screenshots.length}</span>
              </div>
              <figcaption>
                <span>{screenshot.caption}</span>
                <a href={screenshot.src} target="_blank" rel="noopener noreferrer" aria-label={`Open full screenshot: ${screenshot.caption} (new tab)`}>Full image <span aria-hidden="true">↗</span></a>
              </figcaption>
            </figure>
            {#if selected.screenshots.length > 1}
              <div class="gallery-controls">
                <button class="step" on:click={() => step(-1)} aria-label="Previous screenshot">←</button>
                <div class="thumbnails" aria-label="Screenshot selection">
                  {#each selected.screenshots as image, index}
                    <button class:current={index === screenshotIndex} aria-pressed={index === screenshotIndex}
                      aria-label={`Show ${image.caption}`} on:click={() => screenshotIndex = index}>
                      <img src={image.src} alt="" loading="lazy" decoding="async" />
                      <span>{image.caption}</span>
                    </button>
                  {/each}
                </div>
                <button class="step" on:click={() => step(1)} aria-label="Next screenshot">→</button>
              </div>
            {/if}
          {:else}
            <div class="empty-gallery">
              <span class="empty-mark" aria-hidden="true">{selected.category === 'Corporate' ? 'ARCHIVE' : 'PLAY / EXPLORE'}</span>
              <p>Screenshots coming soon.</p>
              {#if selected.href}<a class="visit" href={selected.href}>Explore the live project <span aria-hidden="true">↗</span></a>{/if}
            </div>
          {/if}

          <div class="project-copy">
            <p>{selected.description}</p>
            {#if selected.features}
              <ul>{#each selected.features as feature}<li>{feature}</li>{/each}</ul>
            {/if}
            {#if selected.id === 'daw-gnu'}
              <details>
                <summary>Under the hood technical details (WASM and biquad filters oh my)<span aria-hidden="true">+</span></summary>
                <div class="technical">
                  <p>Built in Rust targetting WebAssembly, we use hardware-accelerated encoding and decoding through WebCodecs.</p>
                  <p>The audio chain implements WebGPU biquad filters as shaders for hardware-accelerated effects processing and highly chainable design for minimal latency.</p>
                  <p>A <a href="https://en.wikipedia.org/wiki/Digital_biquad_filter" target="_blank" rel="noopener noreferrer">biquad filter</a> is a second-order recursive linear filter with two poles and two zeros. Its Z-domain transfer function is a ratio of two quadratic polynomials—a fundamental building block in digital signal processing.</p>
                </div>
              </details>
            {/if}
            {#if selected.href && screenshot}<a class="visit" href={selected.href}>Visit site <span aria-hidden="true">↗</span></a>{/if}
          </div>
        </article>
      {/key}
    </section>
  </div>
  <p class="sr-only" aria-live="polite">Selected project: {selected.name}</p>
</main>

<style>
  .portfolio { min-height: 100svh; padding: 7rem clamp(1.25rem, 5vw, 5rem) 4rem; color: var(--text); background: var(--bg); }
  .workspace { max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: minmax(220px, 0.85fr) minmax(0, 2fr); gap: clamp(2rem, 5vw, 5rem); align-items: start; }
  .project-list { position: sticky; top: 6rem; }
  .index-label { display: flex; justify-content: space-between; align-items: center; margin: 0 0 2.5rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--accent); }
  .index-label span { font-size: 1.2rem; }
  .project-list section + section { margin-top: 2.5rem; }
  .project-list h2 { margin: 0 0 0.75rem; font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.65; font-weight: 500; }
  .project-list ul { padding: 0; margin: 0; list-style: none; }
  button, a, summary { -webkit-tap-highlight-color: transparent; }
  button { font: inherit; cursor: pointer; }
  .project-button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 0.7rem; text-align: left; padding: 1rem 0.9rem; border: 1px solid transparent; border-bottom-color: var(--border); background: transparent; color: var(--text); font-size: clamp(0.9rem, 1.4vw, 1.1rem); line-height: 1.45; transition: color 180ms, background 180ms, padding 180ms; }
  .project-button:hover, .project-button.selected { color: var(--accent); background: color-mix(in oklab, var(--accent) 7%, var(--bg)); border-radius: 8px; padding-left: 1.15rem; }
  .selection-arrow { opacity: 0; transform: translate(-4px, 4px); transition: opacity 180ms, transform 180ms; }
  .selected .selection-arrow, .project-button:hover .selection-arrow { opacity: 1; transform: none; }
  .hint { font-size: 0.7rem; line-height: 1.6; opacity: 0.55; margin-top: 2rem; }
  .gallery { min-width: 0; scroll-margin-top: 6rem; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent); }
  .badge { border: 1px solid var(--border); padding: 0.35rem 0.6rem; border-radius: 999px; color: var(--text); letter-spacing: 0.06em; }
  .project-heading h2 { margin: 1rem 0 0.5rem; font-size: clamp(1.8rem, 3.5vw, 3rem); letter-spacing: -0.045em; font-weight: 500; line-height: 1.15; }
  .subtitle { font-size: 0.9rem; opacity: 0.65; margin: 0 0 1.75rem; line-height: 1.6; }
  figure { margin: 0; }
  .image-frame { position: relative; display: grid; place-items: center; height: clamp(240px, 36vw, 440px); padding: 0.75rem; border: 1px solid var(--border); border-radius: 14px; background: color-mix(in oklab, var(--text) 4%, var(--bg)); overflow: hidden; }
  .hero-image { display: block; width: 100%; height: 100%; min-height: 0; object-fit: contain; }
  .image-count { position: absolute; bottom: 1rem; right: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 999px; padding: 0.35rem 0.6rem; font-size: 0.65rem; }
  figcaption { display: flex; gap: 1rem; justify-content: space-between; align-items: center; padding: 0.75rem 0.1rem; font-size: 0.75rem; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; text-underline-offset: 4px; }
  .gallery-controls { display: flex; gap: 0.65rem; align-items: center; margin: 0.4rem 0 1.75rem; }
  .step { background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 50%; width: 2rem; height: 2rem; flex-shrink: 0; }
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
  .visit { display: inline-flex; gap: 1.5rem; align-items: center; margin-top: 0.75rem; padding: 0.6rem 0; font-size: 0.8rem; }
  .empty-gallery { min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center; border: 1px solid var(--border); border-radius: 14px; background: radial-gradient(ellipse at top right, color-mix(in oklab, var(--accent) 12%, var(--bg)), var(--bg)); }
  .empty-mark { font-size: clamp(1.2rem, 3vw, 2.3rem); letter-spacing: 0.15em; color: var(--accent); opacity: 0.5; }
  .empty-gallery p { font-size: 0.8rem; opacity: 0.6; }
  button:focus-visible, a:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
  @media (max-width: 760px) {
    .workspace { grid-template-columns: minmax(0, 1fr); gap: 2.5rem; }
    .project-list { position: static; }
    .index-label { margin-bottom: 1.5rem; }
    .project-list section + section { margin-top: 1.5rem; }
    .project-button { padding: 0.75rem 0.9rem; }
    .hint { margin: 1rem 0 0; }
    .image-frame { height: 300px; }
  }
  @media (prefers-reduced-motion: reduce) { .project-button, .selection-arrow { transition: none; } }
</style>
