import manifest from '../generated/images.json';

type GeneratedImage = {
  width: number;
  height: number;
  variants: { path: string; width: number }[];
};

const originals = import.meta.glob<string>('/docs/*.{webp,WEBP}', {
  eager: true, query: '?url', import: 'default',
});
const variants = import.meta.glob<string>('/docs/responsive/*.webp', {
  eager: true, query: '?url', import: 'default',
});

const images = Object.fromEntries(Object.entries(manifest as Record<string, GeneratedImage>).map(([filename, image]) => {
  const sources = image.variants.map(variant => ({ src: variants[variant.path], width: variant.width }));
  const gallery = sources.filter(source => source.width >= 320);
  if (!gallery.length) gallery.push(sources[sources.length - 1]);
  const thumbnails = sources.filter(source => source.width <= 192);
  const srcset = (items: typeof sources) => items.map(source => `${source.src} ${source.width}w`).join(', ');
  return [originals[`/docs/${filename}`], {
    width: image.width,
    height: image.height,
    src: gallery.find(source => source.width >= 640)?.src ?? gallery[gallery.length - 1].src,
    srcset: srcset(gallery),
    thumbnailSrc: thumbnails[0].src,
    thumbnailSrcset: srcset(thumbnails),
  }];
}));

// Matches the single-column mobile layout and capped desktop gallery column.
export const galleryImageSizes = '(max-width: 760px) 90vw, (max-width: 1600px) 60vw, 850px';

export function getResponsiveImage(src: string | undefined) {
  return src ? images[src] : undefined;
}
