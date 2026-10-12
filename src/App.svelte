<script lang="ts">
  import { theme, toggleTheme } from './stores/theme';
  import OrbitalReveal from './OrbitalReveal.svelte';

  let orbitProgress = 0;
  let orbital: OrbitalReveal;

  type Link = { label: string; href: string };
  const links: Link[] = [
    { label: 'Frequency Frontier - Drumming / Beat game', href: 'https://billharrisdev.github.io/browsergame' },
    { label: 'Visualizers', href: 'https://billharrisdev.github.io/visualizers' },
    { label: 'Audio', href: 'https://billharrisdev.github.io/audio' }
  ];
</script>

<svelte:head>
  <title>billharrisdev</title>
  <meta name="description" content="Explore Frequency Frontier, a drumming / beat game, plus Visualizers and Audio." />
  <meta name="theme-color" content="#0e1426" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
</svelte:head>

  <header class="header" class:over-scene={orbitProgress < 0.9}>
    <h1><a class="brand" href="#top" on:click={(event) => {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) orbital?.reset();
    }}>billharris.dev</a></h1>
    <nav aria-label="Main navigation">
    <a class="projects-link" href="#home">Projects</a>
    <button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
      <span aria-hidden="true">{ $theme === 'dark' ? '🌙' : '☀️' }</span>
      <span class="label">{ $theme === 'dark' ? 'Dark' : 'Light' }</span>
    </button>
    </nav>
  </header>

  <OrbitalReveal bind:this={orbital} onProgress={(value) => orbitProgress = value}>
  <main class="page" aria-labelledby="links-title">
    <h2 class="intro" id="links-title">Quick links</h2>
    <ul class="links">
      {#each links as link}
        <li>
          <a class="card" href={link.href} rel="noopener noreferrer">
            <span class="label">{link.label}</span>
            <span class="arrow" aria-hidden>→</span>
          </a>
        </li>
      {/each}
    </ul>
  </main>
  </OrbitalReveal>

<style>
  .page {
    min-height: 100svh;
    display: grid;
    place-content: center;
    color: var(--text);
    background: var(--bg);
  }
  .header { 
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    padding: 1rem 1.25rem; 
    border-bottom: 1px solid var(--border);
    color: var(--text);
    background: var(--bg);
    backdrop-filter: saturate(1.2) blur(6px);
  }
  .header.over-scene { background: color-mix(in oklab, var(--bg) 65%, transparent); }
  h1 { font-size: 1.1rem; margin: 0; letter-spacing: 0.2px; }
  .brand { color: inherit; text-decoration: none; }
  nav { display: flex; align-items: center; gap: 1.25rem; }
  .projects-link { color: inherit; text-decoration: none; font-size: 0.85rem; }
  .projects-link:hover { text-decoration: underline; text-underline-offset: 4px; }
  .projects-link:focus-visible, .brand:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; border-radius: 2px; }
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--button-bg);
    color: var(--button-fg);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
  }
  .theme-toggle:hover { filter: brightness(1.05); }
  .theme-toggle .label { font-size: 0.85rem; }

  main { padding: 6rem 1.25rem 3rem; }
  .intro { margin: 0 0 1.5rem; font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 500; letter-spacing: -0.04em; }
  .links { width: min(560px, calc(100vw - 2.5rem)); list-style: none; padding: 0; margin: 0; display: grid; gap: 0.75rem; }
  .card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border: 1px solid var(--border); border-radius: 12px;
    text-decoration: none; color: var(--text); background: var(--surface);
    transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
  }
  .card:hover { transform: translateY(-1px); border-color: var(--accent); }
  .card .label { font-weight: 600; }
  .card .arrow { opacity: 0.6; }

</style>
