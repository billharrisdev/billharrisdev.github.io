# Browser compatibility

The production build targets Baseline Widely Available as of **2026-01-01**,
matching Vite 8's documented browser floor:

- Chrome and Edge 111
- Firefox 114
- Safari and iOS Safari 16.4

`vite.config.ts` specifies these versions explicitly because this project uses
Vite 5, which does not understand `baseline-widely-available`. The snapshot is
pinned so compatibility does not silently change between builds. Vite applies
the build target to JavaScript (including bundled workers) and, by default, CSS
minification. This is not an ES2015-only build or a guarantee of support for
every browser that implements ES6.

TypeScript's `ES2020` target remains unchanged: TypeScript is used for checking
with `noEmit`, while Vite produces the browser bundles. No legacy bundle or
runtime API polyfills are added.

Runtime capabilities still need checks. The animation checks worker,
OffscreenCanvas, worker WebGL2 and worker animation-frame support, and falls
back to main-thread rendering when unavailable. Idle scheduling uses a timeout
fallback when `requestIdleCallback` is absent. Baseline is not a guarantee that
WebGL is enabled on a particular device.
