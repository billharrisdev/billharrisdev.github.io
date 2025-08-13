<script lang="ts">
  import { theme, toggleTheme } from './stores/theme';

  type Link = { label: string; href: string };
  const links: Link[] = [
    { label: 'Visualizers', href: 'https://billharrisdev.github.io/visualizers' },
    { label: 'Audio', href: 'https://billharrisdev.github.io/audio' },
    { label: 'BrowserGame', href: 'https://billharrisdev.github.io/browsergame' }
  ];
</script>

<svelte:head>
  <title>billharrisdev</title>
  <meta name="description" content="Links to Visualizers, Audio, and BrowserGame." />
  <meta name="theme-color" content="#0e1426" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
</svelte:head>

<div class="page">
  <header class="header">
    <h1>billharris.dev</h1>
    <button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
      <span aria-hidden="true">{ $theme === 'dark' ? '🌙' : '☀️' }</span>
      <span class="label">{ $theme === 'dark' ? 'Dark' : 'Light' }</span>
    </button>
  </header>

  <main>
    <p class="intro">Quick links</p>
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

  
</div>

<style>
  .page {
    min-height: 100dvh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    color: var(--text);
    background: var(--bg);
  }
  .header { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    padding: 1rem 1.25rem; 
    border-bottom: 1px solid var(--border);
    backdrop-filter: saturate(1.2) blur(6px);
  }
  h1 { font-size: 1.1rem; margin: 0; letter-spacing: 0.2px; }
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

  main { padding: 2rem 1.25rem; }
  .intro { opacity: 0.8; margin: 0 0 1rem; }
  .links { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.75rem; }
  .card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border: 1px solid var(--border); border-radius: 12px;
    text-decoration: none; color: var(--text); background: var(--surface);
    transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
  }
  .card:hover { transform: translateY(-1px); border-color: var(--accent); }
  .card .label { font-weight: 600; }
  .card .arrow { opacity: 0.6; }

  

  @media (min-width: 600px) {
    main { display: grid; place-content: start center; }
    .links { width: 560px; }
  }
</style>
