# Portfolio JSON-LD

The Vite plugin in `vite.config.ts` injects a canonical link and one
`application/ld+json` graph into both development HTML and built `dist/index.html`.
The graph is present before JavaScript runs; no JSON-LD runtime library is needed.

- `src/lib/projectData.ts` supplies the gallery and metadata with the same project
  descriptions, captions, ordering, and screenshot matching.
- `src/lib/structuredData.ts` defines the canonical site, public author contact,
  graph relationships, and safe JSON serialization.
- Bill Harris is the author of personal applications and a contributor to
  corporate work. The graph does not assert corporate ownership or sole authorship.
- Build-time screenshot URLs use emitted, hashed assets on the canonical origin.
  Inline data-URL images are omitted from metadata.
- A small portfolio footer displays the same author name and email publicly.

Run `npm test` to build and check graph references, attribution, asset URLs, and
script escaping. After deployment, validate the live page with
[Schema.org Validator](https://validator.schema.org/) and
[Google Rich Results Test](https://search.google.com/test/rich-results).
General Schema.org validity does not guarantee Google rich results; this graph
does not invent prices, ratings, dates, or licenses to meet rich-result requirements.

References: [JSON-LD](https://json-ld.org/),
[Google structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).
