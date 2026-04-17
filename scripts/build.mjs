#!/usr/bin/env node
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const outdir = resolve(packageRoot, 'dist');
const watch = process.argv.includes('--watch');
const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
const pluginVersion =
  process.env.PLUGIN_VERSION?.trim()
  || (typeof packageJson.version === 'string' && packageJson.version.trim())
  || '0.0.0-dev';

const { build, context } = await import('esbuild');

await rm(outdir, { recursive: true, force: true });
await mkdir(resolve(outdir, 'ui'), { recursive: true });

const nodeOptions = {
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'external',
  logLevel: 'info'
};

const manifestBuildOptions = {
  ...nodeOptions,
  entryPoints: [resolve(packageRoot, 'src/manifest.ts')],
  outfile: resolve(outdir, 'manifest.js'),
  define: {
    'process.env.PLUGIN_VERSION': JSON.stringify(pluginVersion)
  }
};

const workerBuildOptions = {
  ...nodeOptions,
  entryPoints: [resolve(packageRoot, 'src/worker.ts')],
  outfile: resolve(outdir, 'worker.js')
};

const uiBuildOptions = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  external: ['react', 'react-dom', 'react/jsx-runtime', '@paperclipai/plugin-sdk/ui'],
  logLevel: 'info',
  entryPoints: [resolve(packageRoot, 'src/ui/index.tsx')],
  outfile: resolve(outdir, 'ui/index.js'),
  jsx: 'automatic',
  sourcemap: true
};

if (watch) {
  const buildContexts = await Promise.all([
    context(manifestBuildOptions),
    context(workerBuildOptions),
    context(uiBuildOptions)
  ]);

  await Promise.all(buildContexts.map(async (buildContext) => buildContext.watch()));
} else {
  await Promise.all([
    build(manifestBuildOptions),
    build(workerBuildOptions),
    build(uiBuildOptions)
  ]);
}
