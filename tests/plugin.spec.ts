import { strict as assert } from 'node:assert';
import test from 'node:test';
import { createTestHarness } from '@paperclipai/plugin-sdk/testing';

import manifest from '../src/manifest.ts';
import plugin from '../src/worker.ts';

test('manifest registers toolbar and settings surfaces', () => {
  assert.equal(manifest.id, 'paperclip-clippy-plugin');
  assert.ok(manifest.capabilities.includes('ui.action.register'));
  assert.ok(manifest.capabilities.includes('ui.page.register'));
  assert.ok(manifest.capabilities.includes('plugin.state.read'));
  assert.ok(manifest.capabilities.includes('plugin.state.write'));

  const slotIds = manifest.ui?.slots?.map((slot) => slot.id) ?? [];
  assert.deepEqual(slotIds, [
    'paperclip-clippy-plugin-global-toolbar-button',
    'paperclip-clippy-plugin-settings-page'
  ]);
});

test('worker returns default settings and persists updates', async () => {
  const harness = createTestHarness({ manifest });
  await plugin.definition.setup(harness.ctx);

  const initial = await harness.getData<{ enabled: boolean; interceptionMode: string }>(
    'clippy-settings',
    {}
  );
  assert.equal(initial.enabled, true);
  assert.equal(initial.interceptionMode, 'aggressive');

  await harness.performAction('save-clippy-settings', {
    enabled: false,
    interceptionMode: 'aggressive'
  });

  const updated = await harness.getData<{ enabled: boolean }>('clippy-settings', {});
  assert.equal(updated.enabled, false);
});
