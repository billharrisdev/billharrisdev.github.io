<script lang="ts">
  import { theme, toggleTheme } from './stores/theme';
  import OrbitalReveal from './OrbitalReveal.svelte';
  import Portfolio from './Portfolio.svelte';

  let orbitProgress = 0;
  let orbital: OrbitalReveal;

</script>

<svelte:head>
  <title>billharrisdev</title>
  <meta name="description" content="Explore showcase projects and corporate work, including DAW-GNU, Frequency Frontier, Visualizers, and GreatCall." />
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
    <Portfolio />
  </OrbitalReveal>

<style>
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


</style>
