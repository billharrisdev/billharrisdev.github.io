<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { projects } from './lib/projects';
  import ProjectGallery from './ProjectGallery.svelte';

  const categories = ['Showcase', 'Corporate'] as const;
  const orderedProjects = categories.flatMap(category => projects.filter(project => project.category === category));
  export let selectedId = orderedProjects[0].id;
  let reducedMotion = true;
  let gallery: HTMLElement;
  let sections: HTMLElement[] = [];
  let scrollFrame = 0;

  function updateActiveProject() {
    scrollFrame = 0;
    if (!gallery || gallery.closest('[inert]')) return;
    const readingLine = Math.min(window.innerHeight * 0.3, 200);
    let active = orderedProjects[0].id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top > readingLine) break;
      active = section.dataset.projectId!;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      active = orderedProjects[orderedProjects.length - 1].id;
    }
    selectedId = active;
  }

  function queueUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateActiveProject);
  }

  export async function openProject(id: string) {
    const section = sections.find(section => section.dataset.projectId === id);
    if (!section) return;
    selectedId = id;
    await tick();
    const revealing = !!gallery.closest('[inert]');
    section.scrollIntoView({ behavior: reducedMotion || revealing ? 'instant' : 'smooth', block: 'start' });
    if (revealing) {
      // Let the orbital reveal update and remove inert before moving focus.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
    section.focus({ preventScroll: true });
  }

  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => reducedMotion = media.matches;
    update();
    queueUpdate();
    media.addEventListener('change', update);
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    // Image loading and expanded technical details can move section boundaries.
    const observer = new ResizeObserver(queueUpdate);
    observer.observe(gallery);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', queueUpdate);
      observer.disconnect();
      cancelAnimationFrame(scrollFrame);
    };
  });
</script>

<main class="portfolio" aria-label="Project portfolio">
  <div class="workspace">
    <nav class="project-list" aria-label="Portfolio projects">
      {#each categories as category}
        <section aria-labelledby={`category-${category.toLowerCase()}`}>
          <h2 id={`category-${category.toLowerCase()}`}>{category}</h2>
          <ul>
            {#each projects.filter(project => project.category === category) as project}
              <li>
                <button class="project-button" class:selected={selectedId === project.id}
                  aria-current={selectedId === project.id ? 'true' : undefined} aria-controls={`project-${project.id}`}
                  on:click={() => openProject(project.id)}>
                  <span>{project.name}</span><span class="selection-arrow" aria-hidden="true">↗</span>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </nav>

    <div class="gallery" id="project-gallery" bind:this={gallery}>
      {#each orderedProjects as project, index (project.id)}
        <section class="project-section" id={`project-${project.id}`} data-project-id={project.id}
          bind:this={sections[index]} tabindex="-1" aria-labelledby={`project-heading-${project.id}`}>
          <ProjectGallery {project} />
        </section>
      {/each}
    </div>
  </div>
</main>

<style>
  .portfolio { min-height: 100svh; padding: 7rem clamp(1.25rem, 5vw, 5rem) 4rem; color: var(--text); background: var(--bg); }
  .workspace { max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: minmax(220px, 0.85fr) minmax(0, 2fr); gap: clamp(2rem, 5vw, 5rem); align-items: start; }
  .project-list { position: sticky; top: 6rem; max-height: calc(100svh - 7rem); overflow-y: auto; }
  .project-list section + section { margin-top: 2.5rem; }
  .project-list h2 { margin: 0 0 0.75rem; font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.65; font-weight: 500; }
  .project-list ul { padding: 0; margin: 0; list-style: none; }
  button { -webkit-tap-highlight-color: transparent; font: inherit; cursor: pointer; }
  .project-button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 0.7rem; text-align: left; padding: 1rem 0.9rem; border: 1px solid transparent; border-bottom-color: var(--border); background: transparent; color: var(--text); font-size: clamp(0.9rem, 1.4vw, 1.1rem); line-height: 1.45; transition: color 180ms, background 180ms, padding 180ms; }
  .project-button:hover, .project-button.selected { color: var(--accent); background: color-mix(in oklab, var(--accent) 7%, var(--bg)); border-radius: 8px; padding-left: 1.15rem; }
  .selection-arrow { opacity: 0; transform: translate(-4px, 4px); transition: opacity 180ms, transform 180ms; }
  .selected .selection-arrow, .project-button:hover .selection-arrow { opacity: 1; transform: none; }
  .gallery { min-width: 0; }
  .project-section { scroll-margin-top: 6rem; }
  .project-section + .project-section { margin-top: 4rem; padding-top: 4rem; border-top: 1px solid var(--border); }
  .project-section:focus { outline: none; }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  @media (max-width: 760px) {
    .workspace { grid-template-columns: minmax(0, 1fr); }
    .project-list { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .project-button, .selection-arrow { transition: none; } }
</style>
