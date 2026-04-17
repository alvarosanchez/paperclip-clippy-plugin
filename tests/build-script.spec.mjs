import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package metadata exposes Paperclip plugin entrypoints and build script', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );

  assert.equal(packageJson.name, 'paperclip-clippy-plugin');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.paperclipPlugin.manifest, './dist/manifest.js');
  assert.equal(packageJson.paperclipPlugin.worker, './dist/worker.js');
  assert.equal(packageJson.paperclipPlugin.ui, './dist/ui/');
  assert.match(packageJson.scripts.build, /scripts\/build\.mjs/);
});
