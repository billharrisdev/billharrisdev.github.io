import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { assetTtl, phases, purgeUrls, siteOrigin } from '../config/cloudflare-cache.mjs';
import { configureCache, createClient, purgeCache } from '../scripts/cloudflare-cache.mjs';

test('public icon URLs are content-versioned in built HTML and JavaScript', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  for (const filename of ['favicon.svg', 'apple-touch-icon.png']) {
    const original = await readFile(new URL(`../public/${filename}`, import.meta.url));
    const hash = createHash('sha256').update(original).digest('hex').slice(0, 16);
    assert.ok(html.includes(`/${filename}?v=${hash}`));
  }
  const scripts = (await readdir(new URL('../dist/assets/', import.meta.url))).filter(name => /^index-.*\.js$/.test(name));
  const javascript = (await Promise.all(scripts.map(name => readFile(new URL(`../dist/assets/${name}`, import.meta.url), 'utf8')))).join('\n');
  const frames = await readFile(new URL('../public/favicon-frames.png', import.meta.url));
  const hash = createHash('sha256').update(frames).digest('hex').slice(0, 16);
  assert.ok(javascript.includes(`favicon-frames.png?v=${hash}`));
});

test('cache policy distinguishes static resources, HTML, and excluded requests', () => {
  assert.equal(assetTtl, 30 * 24 * 60 * 60);
  const cacheRules = phases.http_request_cache_settings;
  assert.equal(cacheRules[0].action_parameters.edge_ttl.default, assetTtl);
  assert.equal(cacheRules[0].action_parameters.browser_ttl.default, assetTtl);
  assert.equal(cacheRules[1].action_parameters.edge_ttl.mode, 'respect_origin');
  assert.equal(cacheRules.at(-1).action_parameters.cache, false);
  const headers = phases.http_response_headers_transform;
  assert.equal(headers[1].action_parameters.headers['cache-control'].value, 'public, max-age=2592000, immutable');
  assert.equal(headers[2].action_parameters.headers['cache-control'].value, 'no-cache');
  assert.equal(headers.at(-1).action_parameters.headers['cache-control'].value, 'no-store');
  assert.ok(headers[2].expression.includes('http.response.code eq 304'));
  for (const rule of Object.values(phases).flat()) {
    assert.ok(rule.expression.includes('http.host eq "portfolio.lowkeymg.com"'));
    assert.ok(rule.ref.startsWith('portfolio_'));
  }
});

test('configuration updates only managed rules and retains unrelated rules', async () => {
  const calls = [];
  const unrelated = { id: 'other-rule', ref: 'other_site', action: 'set_cache_settings', expression: 'http.host eq "other.lowkeymg.com"' };
  const stored = new Map(Object.entries(phases).map(([phase, rules]) => [phase, {
    id: phase, rules: [structuredClone(unrelated), { ...structuredClone(rules[0]), id: `${phase}-managed`, description: 'old description' }],
  }]));
  const client = async (path, options = {}) => {
    calls.push({ path, ...options });
    if (path.includes('/phases/')) return structuredClone(stored.get(path.split('/')[2]));
    const [, phase, , id] = path.split('/');
    const ruleset = stored.get(phase);
    if (id) ruleset.rules = ruleset.rules.filter(rule => rule.id !== id);
    const { position, ...rule } = options.body;
    ruleset.rules.push({ ...rule, id: id ?? `new-${rule.ref}` });
    return structuredClone(ruleset);
  };
  await configureCache(client);
  await configureCache(client);
  assert.ok(!calls.some(call => call.method === 'PUT' || call.method === 'DELETE'));
  for (const [phase, rules] of Object.entries(phases)) {
    const configured = stored.get(phase).rules;
    assert.deepEqual(configured[0], unrelated);
    assert.deepEqual(configured.slice(1).map(rule => rule.ref), rules.map(rule => rule.ref));
  }
});

test('configuration creates absent phase rulesets', async () => {
  const created = [];
  await configureCache(async (path, options) => {
    if (options.allowMissing) return undefined;
    assert.equal(path, 'rulesets');
    assert.equal(options.method, 'POST');
    created.push(options.body);
  });
  assert.deepEqual(created.map(item => item.phase), Object.keys(phases));
  assert.ok(created.every(item => item.kind === 'zone'));
});

test('release purge targets only portfolio HTML, not the entire zone', async () => {
  await purgeCache(async (path, options) => {
    assert.equal(path, 'purge_cache');
    assert.equal(options.method, 'POST');
    assert.deepEqual(options.body, { files: [`${siteOrigin}/`, `${siteOrigin}/index.html`] });
    assert.deepEqual(options.body.files, purgeUrls);
  });
});

test('Cloudflare client requires credentials and rejects failed API responses', async () => {
  assert.throws(() => createClient({}), /Set CLOUDFLARE_API_TOKEN/);
  const client = createClient({ token: 'test-token', zoneId: 'a'.repeat(32), fetchImpl: async () =>
    new Response(JSON.stringify({ success: false, errors: [{ message: 'Permission denied' }] }), { status: 403 }) });
  await assert.rejects(client('purge_cache', { method: 'POST', body: { files: purgeUrls } }), /Permission denied/);
});
