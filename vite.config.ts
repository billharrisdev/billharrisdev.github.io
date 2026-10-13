import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createProjects } from './src/lib/projectData';
import { createStructuredData, serializeStructuredData, siteUrl } from './src/lib/structuredData';

function assetVersion(filename: string) {
  return createHash('sha256').update(readFileSync(new URL(`./public/${filename}`, import.meta.url))).digest('hex').slice(0, 16);
}

function versionPublicAssets(): Plugin {
  return {
    name: 'version-public-assets',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        for (const filename of ['favicon.svg', 'apple-touch-icon.png']) {
          html = html.replace(`href="/${filename}"`, `href="/${filename}?v=${assetVersion(filename)}"`);
        }
        return html;
      },
    },
  };
}

function structuredData(): Plugin {
  return {
    name: 'portfolio-structured-data',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const images: Record<string, string> = {};
        const originals = readdirSync(fileURLToPath(new URL('./docs', import.meta.url)))
          .filter(filename => /\.webp$/i.test(filename));
        if (context.bundle) {
          // Use final, hashed asset URLs rather than development /docs paths.
          for (const asset of Object.values(context.bundle)) {
            if (asset.type === 'asset' && asset.name && originals.includes(asset.name)) {
              images[`/docs/${asset.name}`] = `/${asset.fileName}`;
            }
          }
        } else {
          for (const filename of originals) {
            images[`/docs/${filename}`] = `/docs/${filename}`;
          }
        }
        return [
          { tag: 'link', attrs: { rel: 'canonical', href: siteUrl }, injectTo: 'head' },
          {
            tag: 'script',
            attrs: { type: 'application/ld+json', id: 'portfolio-structured-data' },
            children: serializeStructuredData(createStructuredData(createProjects(images))),
            injectTo: 'head',
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [svelte(), versionPublicAssets(), structuredData()],
  define: {
    'import.meta.env.VITE_FAVICON_FRAMES_VERSION': JSON.stringify(assetVersion('favicon-frames.png')),
  },
  base: '/',
  build: {
    // Baseline Widely Available snapshot: 2026-01-01 (Vite 8 equivalent).
    // Vite 5 needs explicit versions rather than the Baseline shorthand.
    target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
    assetsInlineLimit: 0,
  },
});
