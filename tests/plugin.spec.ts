import { strict as assert } from 'node:assert';
import test from 'node:test';

import manifest from '../src/manifest.ts';
import plugin from '../src/worker.ts';
import ui from '../src/ui/index.tsx';

test('placeholder entrypoints export values for build wiring', () => {
  assert.ok(manifest);
  assert.ok(plugin);
  assert.ok(ui);
});
