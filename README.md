Links

- [Frequency Frontier - Drumming / Beat game](https://billharrisdev.github.io/browsergame)
- [Visualizers](https://billharrisdev.github.io/visualizers)

Dev

1. Install Node 20+.
2. Install deps: npm install
3. Start dev server: npm run dev
4. Build: npm run build

Deploy

Push to `main` (or run the workflow manually) to build & deploy via GitHub Pages Actions using an artifact. Build output in `dist/` is uploaded; no built files are committed back to the repo.

If the site appears blank:
1. Check Actions logs for build errors.
2. Ensure Settings → Pages → Source = "GitHub Actions".
3. Confirm `dist/index.html` existed in the build step.

Local preview of production build:
`npm run build && npx serve dist` (or `npm run preview`).

Orbital signature

- The homepage opens with two stylized six-axis robot arms tracing `billharris.dev` with Fourier epicycles. The drawing takes about 24 seconds; clicking the menu logo returns to the opening scene and restarts it.
- Scroll to fly the camera through the lettering and reveal the portfolio behind the scene, or use “Explore projects” to skip directly to it. Scrolling back reverses the flight without restarting the drawing.
- Three.js and the bundled Helvetiker font load in the background after the initial page render. No external asset server is needed.
- The scene background, fog, grid, arm materials, and lettering follow the page's light/dark theme.
- Rendering pauses when the portfolio is fully revealed and in hidden tabs. Reduced-motion preferences or unavailable WebGL show a static neon signature followed by the portfolio in a normal stacked layout.
- `src/OrbitalReveal.svelte` handles the scroll reveal and fallback; `src/lib/orbitalScene.ts` handles the DFT, arm tracking, and rendering. The font's copyright and license are included in its JSON metadata.

Portfolio galleries

- `src/Portfolio.svelte` displays the Showcase and Corporate project lists. Hover, keyboard focus, or a click/tap selects a project; screenshots have thumbnail navigation and full-size links. On mobile, tapping a project scrolls to its gallery.
- Project descriptions, links, status badges, and screenshot prefix aliases live in `src/lib/projects.ts`. DAW-GNU is marked in development and has no public site link. Corporate contribution text is only included where supplied.
- Add screenshots to `docs/` as `[SITE]-[SCREEN]-[EXTRA].webp`. Matching is case-insensitive for site prefixes; multi-part screen names are preserved. WebP assets are automatically included by Vite on the next build. Source PNG/JPG/PSD files are not included in the gallery.
- Available prefixes include `DAW`, `GreatCall`, `visualizers`, `PersonalCreations` / `Personal-Creations`, `ProFlowers`, and `FrequencyFrontier` / `Frequency-Frontier` / `BrowserGame`. Add aliases and friendly captions in `src/lib/projects.ts` as needed. The unreleased Audio project is omitted from the portfolio.
- Projects without screenshots retain their entry with a pending-gallery message. The revealed portfolio uses normal document scrolling so galleries and expanded technical descriptions aren't clipped to the animation viewport.
