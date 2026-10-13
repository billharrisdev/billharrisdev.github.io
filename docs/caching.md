# Production caching and release cache busting

The canonical site is GitHub Pages behind Cloudflare. GitHub Pages cannot apply
repository-defined custom response headers; `_headers`, HTML meta tags, and
Vite dev-server header settings would not configure production caching.

## Policy

`config/cloudflare-cache.mjs` defines two Cloudflare rule phases, scoped **only**
to `portfolio.lowkeymg.com`:

| Response | Browser Cache-Control | Cloudflare edge |
| --- | --- | --- |
| Versioned static assets | `public, max-age=2592000, immutable` | 30 days |
| Other static resources | `public, max-age=2592000` | 30 days |
| HTML | `no-cache` (stored, revalidated) | Respect GitHub's origin TTL, normally 10 minutes |
| Errors, non-GET/HEAD, Authorization, Cookie, `/api/`, `/admin/`, `/auth/` requests | `no-store` | Bypass / do not store errors |

Conditional 304 responses retain their resource's browser cache policy.
HTML is the approved exception to the 30-day minimum. Do not give the entry page
a month-long browser freshness lifetime. All redirects are also excluded by
the response-status policy. Cookie-bearing requests are conservatively excluded;
if this becomes overly broad, review the actual cookies before narrowing it.

Response Header Transform Rules set the browser headers and remove conflicting
`Expires` values. **They do not control edge caching**, so Cache Rules are also
installed. No edge TTL override is needed for HTML, avoiding plan-specific minimums.

## One-time Cloudflare setup (required)

No live rules are changed by a normal build or deploy. Credentials must be set
and the setup command run once before the policy takes effect.

1. Find the **zone ID** for `lowkeymg.com` in Cloudflare. This is not the account ID.
2. Create a setup API token restricted to that zone with Cache Rules Edit,
   Transform Rules Edit, and Cache Purge permission. Check the linked Cloudflare
   permission documentation if your account uses different permission labels.
3. Review the proposed rules with `npm run cache:plan` (no credentials needed).
4. In a local PowerShell session, set credentials without committing them:

   ```powershell
   $env:CLOUDFLARE_ZONE_ID = '<32-character zone ID>'
   $env:CLOUDFLARE_API_TOKEN = '<setup token>'
   npm run cache:configure
   npm run cache:verify
   ```

The setup patches/adds only rules with `portfolio_` refs and preserves unrelated
rules. Managed rules are placed last in their phases in policy order. Re-running
is idempotent. Review overlapping rules before applying; the portfolio rules will
override earlier overlapping cache/header policies for this hostname. The two
API phases are not atomic: an API error may leave partially applied rules, so
correct the reported error and rerun setup and verification.

Keep Cloudflare's cache key at its standard behavior, including query strings.
Do not use “Ignore Query String”: public icon versioning relies on `?v=...`.
Rules must be configured on the proxied canonical domain; GitHub's backup URL
does not receive these Cloudflare headers.

## Release behavior

- Vite emits JS, CSS, original screenshots, and responsive WebP with content-hashed
  filenames. Changed content automatically gets a new URL on the next build.
- The static favicon, touch icon, and animated favicon sprite use SHA-256-derived
  query versions. Their URLs change when their contents change, including reverts.
- After successful Pages deployment, `.github/workflows/deploy.yml` purges only
  `https://portfolio.lowkeymg.com/` and `/index.html`. It never purges the full zone.
- Configure a **GitHub Actions secret** named `CLOUDFLARE_API_TOKEN` with a
  zone-restricted, **Cache Purge-only** token, plus a repository variable (or
  secret) named `CLOUDFLARE_ZONE_ID`. The deploy step explicitly warns and skips
  purging if credentials are absent, and fails if a configured API purge fails.
- `npm run cache:purge` performs the same purge manually using local credentials.

Cloudflare purges cannot clear browsers' caches; changed resource URLs do that.
Unchanged content keeps its URL and can continue using cached bytes. Additional
HTML URLs or query-string variants need to be added to the purge list if introduced.
Already-open tabs may reference old lazy chunks after a release; GitHub Pages
replaces the build, so retaining previous assets would require a separate strategy.

## Verification

Run `npm test` for asset versioning, cache policy, safe rule updates, and scoped
purging. `npm run cache:verify` checks **live** HTML/asset/error headers; it is
expected to fail until the Cloudflare rules are installed. Inspect repeated GETs
with `curl.exe -I` / browser DevTools for `Cache-Control`, `Age`, and
`CF-Cache-Status` (MISS/HIT). Test without cookies/Authorization when checking
public cache eligibility. Cache hits can help repeat visits and edge response
times, but do not guarantee a particular PageSpeed score.

References: [Cache Rules API](https://developers.cloudflare.com/cache/how-to/cache-rules/create-api/),
[Response header transforms](https://developers.cloudflare.com/rules/transform/response-header-modification/),
[Edge/browser TTLs](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/).
