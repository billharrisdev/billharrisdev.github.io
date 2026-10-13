import { fileURLToPath } from 'node:url';
import { phases, purgeUrls } from '../config/cloudflare-cache.mjs';

export function createClient({ token, zoneId, fetchImpl = fetch }) {
  if (!token || !zoneId) throw new Error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID. Do not commit credentials.');
  if (!/^[a-f0-9]{32}$/i.test(zoneId)) throw new Error('CLOUDFLARE_ZONE_ID must be a 32-character zone ID.');
  return async (path, { method = 'GET', body, allowMissing = false } = {}) => {
    const response = await fetchImpl(`https://api.cloudflare.com/client/v4/zones/${zoneId}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    });
    if (allowMissing && response.status === 404) return undefined;
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(`Cloudflare ${method} ${path} failed (${response.status}): ${JSON.stringify(data.errors ?? [])}`);
    }
    return data.result;
  };
}

export async function configureCache(client) {
  for (const [phase, rules] of Object.entries(phases)) {
    const current = await client(`rulesets/phases/${phase}/entrypoint`, { allowMissing: true });
    if (!current) {
      await client('rulesets', { method: 'POST', body: { name: `Portfolio ${phase}`, kind: 'zone', phase, rules } });
      continue;
    }
    const existing = [...(current.rules ?? [])];
    for (const rule of rules) {
      const match = existing.find(item => item.ref === rule.ref);
      const last = existing.at(-1);
      // Patch/add only our rules. Never replace the zone's entire ruleset.
      // Move managed rules to the end in policy order; other rules are retained.
      const result = await client(`rulesets/${current.id}/rules${match ? `/${match.id}` : ''}`, {
        method: match ? 'PATCH' : 'POST',
        body: { ...rule, ...(last && last.id !== match?.id ? { position: { after: last.id } } : {}) },
      });
      const updated = result.rules?.find(item => item.ref === rule.ref);
      if (!updated) throw new Error(`Cloudflare did not return the configured rule ${rule.ref}`);
      if (match) existing.splice(existing.indexOf(match), 1);
      existing.push(updated);
    }
  }
}

export async function purgeCache(client) {
  // Only purge this portfolio's HTML. Do not purge the entire lowkeymg.com zone.
  await client('purge_cache', { method: 'POST', body: { files: purgeUrls } });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2] ?? 'plan';
    if (command === 'plan') {
      console.log(JSON.stringify({ phases, purgeUrls }, null, 2));
    } else {
      if (!['apply', 'purge'].includes(command)) throw new Error('Usage: cloudflare-cache.mjs [plan|apply|purge]');
      const client = createClient({ token: process.env.CLOUDFLARE_API_TOKEN, zoneId: process.env.CLOUDFLARE_ZONE_ID });
      if (command === 'apply') {
        await configureCache(client);
        await purgeCache(client);
        console.log('Portfolio cache rules configured and HTML cache purged. Run npm run cache:verify.');
      } else {
        await purgeCache(client);
        console.log('Portfolio HTML cache purged.');
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
