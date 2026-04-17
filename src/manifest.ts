import { createRequire } from 'node:module';
import type { PaperclipPluginManifestV1 } from '@paperclipai/plugin-sdk';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version?: unknown };
const MANIFEST_VERSION =
  process.env.PLUGIN_VERSION?.trim()
  || (typeof packageJson.version === 'string' && packageJson.version.trim())
  || '0.0.0-dev';

const manifest: PaperclipPluginManifestV1 = {
  id: 'paperclip-clippy-plugin',
  apiVersion: 1,
  version: MANIFEST_VERSION,
  displayName: 'Clippy Toast Hijacker',
  description: 'Aggressively hides host toasts and replaces them with a Clippy-style overlay.',
  author: 'Alvaro Sanchez-Mariscal',
  categories: ['ui'],
  capabilities: [
    'ui.action.register',
    'ui.page.register',
    'plugin.state.read',
    'plugin.state.write'
  ],
  entrypoints: {
    worker: './dist/worker.js',
    ui: './dist/ui/'
  },
  ui: {
    slots: [
      {
        type: 'globalToolbarButton',
        id: 'paperclip-clippy-plugin-global-toolbar-button',
        displayName: 'Clippy',
        exportName: 'ClippyGlobalToolbarButton'
      },
      {
        type: 'settingsPage',
        id: 'paperclip-clippy-plugin-settings-page',
        displayName: 'Clippy',
        exportName: 'ClippySettingsPage'
      }
    ]
  }
};

export default manifest;
