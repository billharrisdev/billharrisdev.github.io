import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfig } from 'vite';

test('production build pins the Baseline browser snapshot for JS and CSS', async () => {
  const config = await resolveConfig({}, 'build');
  const targets = ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'];
  assert.deepEqual(config.build.target, targets);
  assert.deepEqual(config.build.cssTarget, targets);
});
