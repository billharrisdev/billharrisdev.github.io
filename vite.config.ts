import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createProjects } from './src/lib/projectData';
import { createStructuredData, serializeStructuredData, siteUrl } from './src/lib/structuredData';

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
  plugins: [svelte(), structuredData()],
  base: '/',
  build: { assetsInlineLimit: 0 },
});
