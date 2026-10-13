import { siteOrigin, assetTtl } from '../config/cloudflare-cache.mjs';

const document = await fetch(`${siteOrigin}/`);
const html = await document.text();
const paths = [...new Set([...html.matchAll(/(?:href|src)="(\/(?:assets\/[^"<>]+|favicon\.svg[^"<>]*|apple-touch-icon\.png[^"<>]*))"/g)].map(match => match[1]))];
let failures = 0;
function check(url, response, isHtml = false) {
  const cache = response.headers.get('cache-control') ?? '';
  const valid = response.ok && (isHtml ? /(?:^|,)\s*no-cache(?:\s|,|$)/i.test(cache) :
    Number(cache.match(/max-age=(\d+)/i)?.[1] ?? 0) >= assetTtl && /immutable/i.test(cache));
  console.log(`${valid ? 'PASS' : 'FAIL'} ${url}: ${cache || '(missing Cache-Control)'}; edge=${response.headers.get('cf-cache-status') ?? 'unknown'}`);
  if (!valid) failures++;
}
check(`${siteOrigin}/`, document, true);
if (!paths.length) { console.error('No asset URLs found in HTML'); failures++; }
for (const path of paths) {
  const url = new URL(path.replaceAll('&amp;', '&'), siteOrigin);
  check(url.href, await fetch(url, { method: 'HEAD' }));
}
const missing = await fetch(`${siteOrigin}/assets/cache-check-missing-resource.webp`, { method: 'HEAD' });
if (missing.status !== 404 || missing.headers.get('cache-control') !== 'no-store') {
  console.error('FAIL: missing resources must return 404 and Cache-Control: no-store'); failures++;
}
process.exitCode = failures ? 1 : 0;
