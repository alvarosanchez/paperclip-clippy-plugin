import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { createTestHarness } from '@paperclipai/plugin-sdk/testing';

import manifest from '../src/manifest.ts';
import plugin from '../src/plugin.ts';
import { SETTINGS_ACTION_KEY, SETTINGS_DATA_KEY } from '../src/plugin-keys.ts';
import * as uiExports from '../src/ui/index.tsx';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_FILE = (...segments: string[]) => resolve(TEST_DIR, '..', ...segments);

test('manifest registers only the hidden toolbar runtime surface', () => {
  assert.equal(manifest.id, 'paperclip-clippy-plugin');
  assert.ok(manifest.capabilities.includes('ui.action.register'));
  assert.ok(manifest.capabilities.includes('plugin.state.read'));
  assert.ok(manifest.capabilities.includes('plugin.state.write'));
  assert.equal(manifest.capabilities.includes('ui.page.register'), false);
  assert.equal(manifest.capabilities.includes('instance.settings.register'), false);

  const slotIds = new Set(manifest.ui?.slots?.map((slot) => slot.id) ?? []);
  assert.ok(slotIds.has('paperclip-clippy-plugin-global-toolbar-button'));
  assert.equal(slotIds.size, 1);
});

test('worker returns default settings and persists updates', async () => {
  const harness = createTestHarness({ manifest });
  await plugin.definition.setup(harness.ctx);

  const initial = await harness.getData<{ enabled: boolean; interceptionMode: string; showDebugPanel: boolean }>(
    SETTINGS_DATA_KEY,
    {}
  );
  assert.equal(initial.enabled, true);
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
  assert.equal(updated.enabled, true);
  assert.equal(updated.interceptionMode, 'aggressive');
  assert.equal(updated.showDebugPanel, true);
});

test('ui exports slot components', () => {
  const slotExports = manifest.ui?.slots?.map((slot) => slot.exportName) ?? [];
  assert.ok(slotExports.length > 0);
  for (const exportName of slotExports) {
    assert.equal(typeof (uiExports as Record<string, unknown>)[exportName], 'function');
  }
});

test('ui entrypoints stay isolated from the worker plugin module', async () => {
  const uiFiles = [
    REPO_FILE('src/ui/index.tsx'),
    REPO_FILE('src/ui/clippy-controller.tsx')
  ];

  for (const filePath of uiFiles) {
    const source = await readFile(filePath, 'utf8');
    assert.equal(
      source.includes('../plugin.ts'),
      false,
      `${filePath} must not import ../plugin.ts`
    );
  }
});

test('overlay waits for an active toast before rendering', () => {
  return readFile(
    REPO_FILE('src/ui/clippy-overlay.tsx'),
    'utf8'
  ).then((source) => {
    assert.match(source, /if \(!enabled \|\| !message\)/);
  });
});

test('controller renders the Clippy bubble through an independent body-mounted host', async () => {
  const source = await readFile(
    REPO_FILE('src/ui/clippy-controller.tsx'),
    'utf8'
  );

  assert.match(source, /document\.body\.appendChild\(overlayContainer\)/);
  assert.match(source, /renderClippyOverlayInto\(overlayContainer/);
});

test('overlay styles include an idle\/active transition hook', async () => {
  const source = await readFile(
    REPO_FILE('src/ui/styles.ts'),
    'utf8'
  );

  assert.match(source, /transition:\s*opacity 180ms ease, transform 180ms ease/);
  assert.match(source, /top:\s*18px/);
  assert.match(source, /right:\s*18px/);
  assert.match(source, /paperclip-clippy-overlay-root/);
});

test('ui entrypoint does not expose settings chrome or a manual test trigger', async () => {
  const source = await readFile(
    REPO_FILE('src/ui/index.tsx'),
    'utf8'
  );

  assert.doesNotMatch(source, /usePluginToast/);
  assert.doesNotMatch(source, /ClippySettingsPage/);
  assert.doesNotMatch(source, /Trigger test toast/);
  assert.doesNotMatch(source, /Clippy test toast/);
  assert.doesNotMatch(source, /clippy-toolbar-button/);
});
