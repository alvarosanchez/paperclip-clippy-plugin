import { strict as assert } from 'node:assert';
import test from 'node:test';
import { createTestHarness } from '@paperclipai/plugin-sdk/testing';

import manifest from '../src/manifest.ts';
import plugin, { SETTINGS_ACTION_KEY, SETTINGS_DATA_KEY } from '../src/plugin.ts';

test('manifest registers toolbar and settings surfaces', () => {
  assert.equal(manifest.id, 'paperclip-clippy-plugin');
  assert.ok(manifest.capabilities.includes('ui.action.register'));
  assert.ok(manifest.capabilities.includes('ui.page.register'));
  assert.ok(manifest.capabilities.includes('plugin.state.read'));
  assert.ok(manifest.capabilities.includes('plugin.state.write'));

  const slotIds = new Set(manifest.ui?.slots?.map((slot) => slot.id) ?? []);
  assert.ok(slotIds.has('paperclip-clippy-plugin-global-toolbar-button'));
  assert.ok(slotIds.has('paperclip-clippy-plugin-settings-page'));
  assert.equal(slotIds.size, 2);
});

test('worker returns default settings and persists updates', async () => {
  const harness = createTestHarness({ manifest });
  await plugin.definition.setup(harness.ctx);

  const initial = await harness.getData<{ enabled: boolean; interceptionMode: string; showDebugPanel: boolean }>(
    SETTINGS_DATA_KEY,
    {}
  );
  assert.equal(initial.enabled, false);
  assert.equal(initial.interceptionMode, 'aggressive');
  assert.equal(initial.showDebugPanel, false);

  await harness.performAction(SETTINGS_ACTION_KEY, {
    enabled: 'no',
    interceptionMode: 'invalid',
    showDebugPanel: true
  });

  const updated = await harness.getData<{ enabled: boolean; interceptionMode: string; showDebugPanel: boolean }>(
    SETTINGS_DATA_KEY,
    {}
  );
  assert.equal(updated.enabled, false);
  assert.equal(updated.interceptionMode, 'aggressive');
  assert.equal(updated.showDebugPanel, true);
});
