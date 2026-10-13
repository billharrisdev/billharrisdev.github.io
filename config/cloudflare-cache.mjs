export const siteOrigin = 'https://portfolio.lowkeymg.com';
export const assetTtl = 2592000;
const host = '(http.host eq "portfolio.lowkeymg.com")';
const safeMethod = '(http.request.method in {"GET" "HEAD"})';
const excluded = '(http.request.uri.path in {"/api" "/admin" "/auth"} or starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/admin/") or starts_with(http.request.uri.path, "/auth/") or http.cookie ne "" or any(http.request.headers["authorization"][*] ne ""))';
const eligible = `${host} and ${safeMethod} and not ${excluded}`;
const htmlPath = '(http.request.uri.path.extension in {"" "html" "htm"})';
// Conditional requests must retain the same caching policy on 304 responses.
const success = '((http.response.code ge 200 and http.response.code lt 300) or http.response.code eq 304)';
const htmlContent = '(http.response.headers["content-type"][0] contains "text/html")';
// A 304 may omit Content-Type, so also recognize HTML by the request path.
const htmlResponse = `(${htmlContent} or ${htmlPath})`;
const versioned = '(starts_with(http.request.uri.path, "/assets/") or any(http.request.uri.args["v"][*] ne ""))';

function cacheRule(ref, description, expression, action_parameters) {
  return { ref: `portfolio_${ref}`, description, expression, action: 'set_cache_settings', action_parameters, enabled: true };
}

function headerRule(ref, description, expression, value) {
  return {
    ref: `portfolio_${ref}`, description, expression, action: 'rewrite', enabled: true,
    action_parameters: { headers: {
      'cache-control': { operation: 'set', value },
      expires: { operation: 'remove' },
    } },
  };
}

// Header transforms govern browser caching, not Cloudflare's cache. Configure
// both phases. Rules are scoped to this hostname; exclusions take precedence.
export const phases = {
  http_request_cache_settings: [
    cacheRule('assets', 'Portfolio: cache static resources for 30 days', `${eligible} and not ${htmlPath}`, {
      cache: true,
      browser_ttl: { mode: 'override_origin', default: assetTtl },
      edge_ttl: { mode: 'override_origin', default: assetTtl, status_code_ttl: [
        { status_code_range: { from: 300, to: 599 }, value: -1 },
      ] },
    }),
    cacheRule('html', 'Portfolio: cache HTML at edge, revalidate in browser', `${eligible} and ${htmlPath}`, {
      cache: true,
      browser_ttl: { mode: 'respect_origin' },
      // GitHub's origin TTL is 10 minutes. Respecting it avoids plan-specific
      // minimum override TTLs (e.g. two hours on Cloudflare Free).
      edge_ttl: { mode: 'respect_origin', status_code_ttl: [
        { status_code_range: { from: 300, to: 599 }, value: -1 },
      ] },
    }),
    cacheRule('excluded', 'Portfolio: bypass private and excluded requests', `${host} and (not ${safeMethod} or ${excluded})`, { cache: false }),
  ],
  http_response_headers_transform: [
    headerRule('static_headers', 'Portfolio: 30-day browser cache', `${eligible} and ${success} and not ${htmlResponse}`, `public, max-age=${assetTtl}`),
    headerRule('immutable_headers', 'Portfolio: immutable versioned assets', `${eligible} and ${success} and not ${htmlResponse} and ${versioned}`, `public, max-age=${assetTtl}, immutable`),
    headerRule('html_headers', 'Portfolio: always revalidate HTML', `${eligible} and ${success} and ${htmlResponse}`, 'no-cache'),
    headerRule('excluded_headers', 'Portfolio: do not store errors or private responses', `${host} and (not ${success} or not ${safeMethod} or ${excluded})`, 'no-store'),
  ],
};

export const purgeUrls = [`${siteOrigin}/`, `${siteOrigin}/index.html`];
