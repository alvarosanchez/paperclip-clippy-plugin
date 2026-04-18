import { strict as assert } from 'node:assert';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

test('package metadata exposes Paperclip plugin entrypoints and build script', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );

  assert.equal(packageJson.name, 'paperclip-clippy-plugin');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.publishConfig.access, 'public');
  assert.equal(packageJson.repository.url, 'git+https://github.com/alvarosanchez/paperclip-clippy-plugin.git');
  assert.equal(packageJson.bugs.url, 'https://github.com/alvarosanchez/paperclip-clippy-plugin/issues');
  assert.equal(packageJson.homepage, 'https://github.com/alvarosanchez/paperclip-clippy-plugin#readme');
  assert.equal(packageJson.paperclipPlugin.manifest, './dist/manifest.js');
  assert.equal(packageJson.paperclipPlugin.worker, './dist/worker.js');
  assert.equal(packageJson.paperclipPlugin.ui, './dist/ui/');
  assert.deepEqual(packageJson.files, ['dist', 'README.md', 'LICENSE']);
  assert.match(packageJson.scripts.build, /scripts\/build\.mjs/);
  assert.equal(packageJson.scripts.prepack, 'pnpm build');
  assert.equal(packageJson.scripts.prepublishOnly, 'pnpm verify');
  assert.match(packageJson.scripts['pack:check'], /npm pack --dry-run --ignore-scripts/);
  assert.match(packageJson.scripts.verify, /pnpm typecheck/);
  assert.match(packageJson.scripts.verify, /pnpm test/);
  assert.match(packageJson.scripts.verify, /pnpm build/);
  assert.match(packageJson.scripts.verify, /pnpm pack:check/);
  assert.match(packageJson.scripts['verify:manual'], /pnpm build/);
  assert.match(packageJson.scripts['verify:manual'], /scripts\/e2e\/manual-paperclip-verify\.mjs/);
  await access(new URL('../scripts/e2e/manual-paperclip-verify.mjs', import.meta.url));
  await access(new URL('../LICENSE', import.meta.url));
  await access(new URL('../.github/workflows/ci.yml', import.meta.url));
  await access(new URL('../.github/workflows/release.yml', import.meta.url));
});
