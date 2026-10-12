Links

- [Frequency Frontier - Drumming / Beat game](https://billharrisdev.github.io/browsergame)
- [Visualizers](https://billharrisdev.github.io/visualizers)
- [Audio](https://billharrisdev.github.io/audio)

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
- Scroll to fly the camera through the lettering and reveal the project links behind the scene, or use “Explore projects” to skip directly to them. Scrolling back reverses the flight without restarting the drawing.
- Three.js and the bundled Helvetiker font load in the background after the initial page render. No external asset server is needed.
- The scene background, fog, grid, arm materials, and lettering follow the page's light/dark theme.
- Rendering pauses when the links are fully revealed and in hidden tabs. Reduced-motion preferences or unavailable WebGL show a static neon signature followed by the links in a normal stacked layout.
- `src/OrbitalReveal.svelte` handles the scroll reveal and fallback; `src/lib/orbitalScene.ts` handles the DFT, arm tracking, and rendering. The font's copyright and license are included in its JSON metadata.
