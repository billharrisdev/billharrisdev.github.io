# Responsive WebP images

Original images live in `docs/*.webp`. Keep the originals: full-image gallery
links and JSON-LD continue to reference them.

`npm run images` uses Sharp to create proportional WebP variants at 96, 192,
320, 640, 960, 1280, and 1920 pixels wide, limited to each original's width.
Smaller originals also get a variant at their native width. Images are never
upscaled. Encoding uses quality 85 to preserve screenshot text.

Generated files are ignored by Git:
- `docs/responsive/`: resized WebP files
- `src/generated/images.json`: dimensions and variant paths

Generation runs automatically before `npm run dev` and `npm run build`. It
caches unchanged inputs, encoding settings, and Sharp versions. After adding
or replacing an original while the dev server is running, run `npm run images`
again and reload the page.

`src/lib/responsiveImages.ts` resolves Vite's hashed asset URLs. The gallery and
biquad reference use width-based `srcset` and responsive `sizes`; thumbnails
use only 96/192px variants with an 80px display-size hint. Width/height metadata
preserves aspect ratios. Images remain lazy-loaded and asynchronously decoded.
The build emits separate files rather than embedding image data in JavaScript.

Run `npm test` to check variant dimensions, emitted assets, transfer savings,
and JSON-LD. To inspect browser selection, check an image's `currentSrc` in
DevTools at mobile/desktop viewport sizes and different device pixel ratios.
