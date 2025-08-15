Links

- [Visualizers](https://billharrisdev.github.io/visualizers)
- [Audio](https://billharrisdev.github.io/audio)
- [BrowserGame](https://billharrisdev.github.io/browsergame)

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
