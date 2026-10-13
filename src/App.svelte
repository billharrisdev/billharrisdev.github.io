<script lang="ts">
  import { onMount } from 'svelte';
  import { animateFavicon } from './lib/favicon';
  import { theme, toggleTheme } from './stores/theme';
  import OrbitalReveal from './OrbitalReveal.svelte';
  import Portfolio from './Portfolio.svelte';
  import { projects } from './lib/projects';
  import { siteDescription } from './lib/structuredData';

  let orbitProgress = 0;
  let orbital: OrbitalReveal;
  let portfolio: Portfolio;
  let selectedId = projects.find(project => project.category === 'Showcase')!.id;
  let projectsOpen = false;
  let projectsMenu: HTMLDivElement;
  let projectsToggle: HTMLButtonElement;
  const categories = ['Showcase', 'Corporate'] as const;
  onMount(animateFavicon);

  function dismissProjects(event: MouseEvent) {
    if (projectsOpen && !projectsMenu.contains(event.target as Node)) projectsOpen = false;
  }

  function handleMenuFocusout(event: FocusEvent) {
    if (!projectsMenu.contains(event.relatedTarget as Node)) projectsOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && projectsOpen) {
      projectsOpen = false;
      projectsToggle.focus();
    }
  }

  async function chooseProject(id: string) {
    projectsOpen = false;
    await orbital.completeReveal();
    await portfolio.openProject(id);
  }

</script>

<svelte:head>
  <title>billharrisdev</title>
  <meta name="description" content={siteDescription} />
  <meta name="theme-color" content="#0e1426" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
</svelte:head>

<svelte:window on:click={dismissProjects} on:keydown={handleKeydown} />

  <header class="header" class:over-scene={orbitProgress < 0.9}>
    <h1><a class="brand" href="#top" on:click={(event) => {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        history.replaceState(history.state, '', '#top');
        void orbital?.reset();
      }
    }}>billharris.dev</a></h1>
    <nav aria-label="Main navigation">
    <div class="projects-menu" bind:this={projectsMenu} on:focusout={handleMenuFocusout}>
      <button class="projects-link" bind:this={projectsToggle} aria-expanded={projectsOpen}
        aria-controls="projects-dropdown" on:click={() => projectsOpen = !projectsOpen}>
        <span>Projects</span>
        <span aria-hidden="true">{projectsOpen ? '▴' : '▾'}</span>
      </button>
      <div class="projects-dropdown" id="projects-dropdown" hidden={!projectsOpen}>
        {#each categories as category}
          <section aria-labelledby={`menu-${category.toLowerCase()}`}>
            <h2 id={`menu-${category.toLowerCase()}`}>{category}</h2>
            <ul>
              {#each projects.filter(project => project.category === category) as project}
                <li><button class:active={selectedId === project.id} aria-current={selectedId === project.id ? 'true' : undefined}
                  aria-controls={`project-${project.id}`} on:click={() => chooseProject(project.id)}>{project.name}</button></li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    </div>
    <button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
      <span aria-hidden="true">{ $theme === 'dark' ? '🌙' : '☀️' }</span>
      <span class="label">{ $theme === 'dark' ? 'Dark' : 'Light' }</span>
    </button>
    </nav>
  </header>

  <OrbitalReveal bind:this={orbital} onProgress={(value) => orbitProgress = value}>
    <Portfolio bind:this={portfolio} bind:selectedId />
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
  .projects-menu { position: relative; min-width: 0; }
  .projects-link { display: flex; align-items: center; gap: 0.5rem; max-width: 100%; color: inherit; background: transparent; border: 0; padding: 0.5rem 0; font: inherit; font-size: 0.85rem; cursor: pointer; }
  .projects-dropdown { position: absolute; top: calc(100% + 0.75rem); right: 0; width: min(340px, calc(100vw - 2.5rem)); max-height: calc(100svh - 6rem); overflow-y: auto; padding: 1rem; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 12px 32px rgb(0 0 0 / 20%); }
  .projects-dropdown section + section { margin-top: 1rem; }
  .projects-dropdown h2 { margin: 0 0 0.5rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.16em; opacity: 0.65; }
  .projects-dropdown ul { margin: 0; padding: 0; list-style: none; }
  .projects-dropdown button { width: 100%; min-height: 44px; padding: 0.65rem; border: 0; border-radius: 6px; font: inherit; font-size: 0.85rem; text-align: left; line-height: 1.4; color: inherit; background: transparent; cursor: pointer; }
  .projects-dropdown button:hover, .projects-dropdown button.active { color: var(--accent); background: color-mix(in oklab, var(--accent) 8%, var(--bg)); }
  .projects-dropdown button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
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

  @media (max-width: 760px) {
    .header { gap: 1rem; }
    h1 { flex-shrink: 0; }
    nav { min-width: 0; gap: 0.75rem; }
    .projects-dropdown { position: fixed; top: 4.5rem; right: 1.25rem; }
    .theme-toggle { flex-shrink: 0; }
    .theme-toggle .label { display: none; }
  }


</style>
