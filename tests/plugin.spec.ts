import { strict as assert } from 'node:assert';
import { access } from 'node:fs/promises';
import test from 'node:test';

import manifest from '../src/manifest.ts';
import plugin from '../src/worker.ts';
test('placeholder entrypoints export values for build wiring', async () => {
  assert.ok(manifest);
  assert.ok(plugin);
  await access(new URL('../src/ui/index.tsx', import.meta.url));
});
