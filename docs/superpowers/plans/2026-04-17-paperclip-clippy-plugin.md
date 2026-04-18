# Paperclip Clippy Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new local Paperclip plugin that mounts from a supported host surface, aggressively suppresses host toasts via DOM heuristics, and renders a Clippy-style replacement bubble with queued notification text.

**Architecture:** The plugin stays honest at the installation boundary but mischievous at runtime. A minimal worker owns persisted settings, while host-mounted UI code installs a `MutationObserver`, scores toast-like nodes, hides matches, extracts text, and pushes intercepted notifications through a small queue into a fixed-position Clippy overlay.

**Tech Stack:** TypeScript, React 19, `@paperclipai/plugin-sdk`, esbuild, Node test runner via `tsx`, `jsdom` for DOM-focused unit tests.

---

## File Structure

- `package.json`
  Package metadata, Paperclip plugin entrypoints, scripts, and dependencies.
- `tsconfig.json`
  TypeScript settings for `src/` and `tests/`.
- `.gitignore`
  Ignore `dist/`, `node_modules/`, and local plugin-dev artifacts.
- `README.md`
  Explain what the plugin does, how to build it, and how to install it into Paperclip.
- `AGENTS.md`
  Short repo guidance mirroring the local Paperclip plugin repos.
- `scripts/build.mjs`
  Build `src/manifest.ts`, `src/worker.ts`, and `src/ui/index.tsx` into `dist/`.
- `src/manifest.ts`
  Plugin id, slots, capabilities, and version wiring.
- `src/worker.ts`
  Minimal plugin worker that reads/writes persisted Clippy settings.
- `src/ui/index.tsx`
  Public UI exports for the toolbar surface and settings page.
- `src/ui/clippy-controller.tsx`
  Runtime mount that installs the observer and renders the overlay.
- `src/ui/clippy-overlay.tsx`
  Presentation-only Clippy bubble and figure.
- `src/ui/toast-detection.ts`
  Candidate scoring and toast collection heuristics.
- `src/ui/toast-extractor.ts`
  Extract title/body text from a matched toast node.
- `src/ui/toast-queue.ts`
  Small queue abstraction for message sequencing and TTL handling.
- `src/ui/dom-suppression.ts`
  Hide or tag matched nodes without duplicating suppression logic in React code.
- `src/ui/settings.ts`
  Normalization helpers for persisted settings.
- `src/ui/styles.ts`
  Inject plugin-owned overlay styles and a small set of aggressive suppression helpers.
- `tests/build-script.spec.mjs`
  Guard package/build wiring.
- `tests/plugin.spec.ts`
  Manifest and worker contract tests.
- `tests/toast-detection.spec.ts`
  DOM heuristics tests.
- `tests/toast-extractor.spec.ts`
  Extraction tests.
- `tests/toast-queue.spec.ts`
  Queue behavior tests.

### Task 1: Bootstrap The Package Skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `AGENTS.md`
- Create: `scripts/build.mjs`
- Test: `tests/build-script.spec.mjs`

- [ ] **Step 1: Write the failing build/package wiring test**

```js
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package metadata exposes Paperclip plugin entrypoints and build script', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.name, 'paperclip-clippy-plugin');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.paperclipPlugin.manifest, './dist/manifest.js');
  assert.equal(packageJson.paperclipPlugin.worker, './dist/worker.js');
  assert.equal(packageJson.paperclipPlugin.ui, './dist/ui/');
  assert.match(packageJson.scripts.build, /scripts\/build\.mjs/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && node --test tests/build-script.spec.mjs`
Expected: FAIL because `tests/build-script.spec.mjs` exists but `package.json` does not.

- [ ] **Step 3: Write the minimal package/tooling files**

```json
{
  "name": "paperclip-clippy-plugin",
  "version": "0.1.0",
  "description": "Paperclip plugin that replaces host toasts with a Clippy-style assistant overlay.",
  "license": "Apache-2.0",
  "type": "module",
  "packageManager": "pnpm@10.33.0",
  "engines": {
    "node": ">=20"
  },
  "paperclipPlugin": {
    "manifest": "./dist/manifest.js",
    "worker": "./dist/worker.js",
    "ui": "./dist/ui/"
  },
  "scripts": {
    "build": "node ./scripts/build.mjs",
    "dev": "node ./scripts/build.mjs --watch",
    "test": "node --test tests/build-script.spec.mjs && tsx --test tests/*.spec.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@paperclipai/plugin-sdk": "^2026.416.0",
    "react": "^19.2.5"
  },
  "devDependencies": {
    "@types/node": "24.12.2",
    "@types/react": "19.2.14",
    "esbuild": "0.28.0",
    "jsdom": "^26.1.0",
    "tsx": "4.21.0",
    "typescript": "6.0.2"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "jsx": "react-jsx",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts"]
}
```

```gitignore
node_modules/
dist/
.idea/
.paperclip/
output/
```

````md
# paperclip-clippy-plugin

Experimental Paperclip plugin that hijacks host toasts and re-renders them as a Clippy-style assistant bubble.

This repo is intentionally hacky. The first goal is to get the joke working from a real Paperclip plugin install, then tune the interception heuristics against the host DOM.
````

````md
# AGENTS.md

This repository contains a single Paperclip plugin package. Treat the repository root as the package root.

Read these first before changing behavior:

- `docs/superpowers/specs/2026-04-17-paperclip-clippy-plugin-design.md`
- `src/manifest.ts`
- `src/worker.ts`
- `src/ui/index.tsx`
- `tests/plugin.spec.ts`

Run the smallest relevant scope first:

```bash
pnpm typecheck
pnpm test
pnpm build
```
````

```js
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
```

- [ ] **Step 4: Install dependencies**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm install`
Expected: installs `@paperclipai/plugin-sdk`, `react`, `tsx`, `typescript`, `esbuild`, and `jsdom`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && node --test tests/build-script.spec.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin
git add package.json tsconfig.json .gitignore README.md AGENTS.md scripts/build.mjs tests/build-script.spec.mjs
git commit -m "chore: bootstrap clippy plugin package"
```

### Task 2: Add The Minimal Manifest And Worker Contract

**Files:**
- Create: `src/manifest.ts`
- Create: `src/worker.ts`
- Create: `src/ui/settings.ts`
- Test: `tests/plugin.spec.ts`

- [ ] **Step 1: Write the failing manifest/worker contract test**

```ts
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { createTestHarness } from '@paperclipai/plugin-sdk/testing';

import manifest from '../src/manifest.ts';
import plugin from '../src/worker.ts';

test('manifest registers toolbar and settings surfaces', () => {
  assert.equal(manifest.id, 'paperclip-clippy-plugin');
  assert.ok(manifest.capabilities.includes('ui.action.register'));
  assert.ok(manifest.capabilities.includes('ui.page.register'));

  const slotIds = manifest.ui?.slots?.map((slot) => slot.id) ?? [];
  assert.deepEqual(slotIds, [
    'paperclip-clippy-plugin-global-toolbar-button',
    'paperclip-clippy-plugin-settings-page'
  ]);
});

test('worker returns default settings and persists updates', async () => {
  const harness = createTestHarness({ manifest });
  await plugin.definition.setup(harness.ctx);

  const initial = await harness.getData<{ enabled: boolean; interceptionMode: string }>('clippy-settings', {});
  assert.equal(initial.enabled, true);
  assert.equal(initial.interceptionMode, 'aggressive');

  await harness.performAction('save-clippy-settings', {
    enabled: false,
    interceptionMode: 'aggressive'
  });

  const updated = await harness.getData<{ enabled: boolean }>('clippy-settings', {});
  assert.equal(updated.enabled, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm exec tsx --test tests/plugin.spec.ts`
Expected: FAIL because `src/manifest.ts` and `src/worker.ts` do not exist yet.

- [ ] **Step 3: Write the minimal settings helper, manifest, and worker**

```ts
export interface ClippySettings {
  enabled: boolean;
  interceptionMode: 'aggressive';
  showDebugPanel: boolean;
}

export const DEFAULT_CLIPPY_SETTINGS: ClippySettings = {
  enabled: true,
  interceptionMode: 'aggressive',
  showDebugPanel: false
};

export function normalizeClippySettings(input: unknown): ClippySettings {
  const record = input && typeof input === 'object' ? input as Record<string, unknown> : {};

  return {
    enabled: record.enabled === false ? false : true,
    interceptionMode: 'aggressive',
    showDebugPanel: record.showDebugPanel === true
  };
}
```

```ts
import { createRequire } from 'node:module';
import type { PaperclipPluginManifestV1 } from '@paperclipai/plugin-sdk';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version?: unknown };
const MANIFEST_VERSION =
  process.env.PLUGIN_VERSION?.trim()
  || (typeof packageJson.version === 'string' && packageJson.version.trim())
  || '0.0.0-dev';

export const manifest: PaperclipPluginManifestV1 = {
  id: 'paperclip-clippy-plugin',
  apiVersion: 1,
  version: MANIFEST_VERSION,
  displayName: 'Clippy Toast Hijacker',
  description: 'Aggressively hides host toasts and replaces them with a Clippy-style overlay.',
  author: 'Álvaro Sánchez-Mariscal',
  categories: ['ui', 'fun'],
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
```

```ts
import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import { DEFAULT_CLIPPY_SETTINGS, normalizeClippySettings } from './ui/settings.ts';

const SETTINGS_SCOPE = {
  scopeKind: 'instance' as const,
  stateKey: 'paperclip-clippy-plugin-settings'
};

const plugin = definePlugin({
  setup(ctx) {
    ctx.data.register('clippy-settings', async () => {
      const saved = await ctx.state.get(SETTINGS_SCOPE);
      return normalizeClippySettings(saved ?? DEFAULT_CLIPPY_SETTINGS);
    });

    ctx.actions.register('save-clippy-settings', async (input) => {
      const nextSettings = normalizeClippySettings(input);
      await ctx.state.set(SETTINGS_SCOPE, nextSettings);
      return nextSettings;
    });
  }
});

runWorker(plugin);

export default plugin;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm exec tsx --test tests/plugin.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin
git add src/manifest.ts src/worker.ts src/ui/settings.ts tests/plugin.spec.ts
git commit -m "feat: add manifest and worker settings contract"
```

### Task 3: Build Toast Detection And Extraction Heuristics

**Files:**
- Create: `src/ui/toast-detection.ts`
- Create: `src/ui/toast-extractor.ts`
- Test: `tests/toast-detection.spec.ts`
- Test: `tests/toast-extractor.spec.ts`

- [ ] **Step 1: Write the failing detection and extraction tests**

```ts
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { collectToastCandidates, scoreToastCandidate } from '../src/ui/toast-detection.ts';
import { extractToastMessage } from '../src/ui/toast-extractor.ts';

test('toast scoring prefers aria-live alert nodes', () => {
  const dom = new JSDOM(`<div role="alert" class="toast">Saved successfully</div>`);
  const candidate = dom.window.document.querySelector('div');

  assert.ok(candidate);
  assert.ok(scoreToastCandidate(candidate) >= 10);
});

test('candidate collection ignores already handled nodes', () => {
  const dom = new JSDOM(`
    <div role="alert" class="toast" data-clippy-handled="true">Old</div>
    <div role="status" class="notification">Fresh</div>
  `);

  const candidates = collectToastCandidates(dom.window.document);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].textContent ?? '', /Fresh/);
});

test('extracts title and body from a structured toast node', () => {
  const dom = new JSDOM(`
    <section role="alert" class="toast">
      <strong>Build complete</strong>
      <p>All checks passed.</p>
    </section>
  `);
  const candidate = dom.window.document.querySelector('section');

  assert.ok(candidate);
  assert.deepEqual(extractToastMessage(candidate), {
    title: 'Build complete',
    body: 'All checks passed.'
  });
});

test('falls back to flattened text when no structure exists', () => {
  const dom = new JSDOM(`<div role="status">Background sync finished</div>`);
  const candidate = dom.window.document.querySelector('div');

  assert.ok(candidate);
  assert.equal(extractToastMessage(candidate).title, 'Background sync finished');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm exec tsx --test tests/toast-detection.spec.ts tests/toast-extractor.spec.ts`
Expected: FAIL because the detection and extraction modules do not exist yet.

- [ ] **Step 3: Implement the minimal heuristics**

```ts
const TOAST_HINTS = ['toast', 'notification', 'sonner', 'hot-toast', 'snackbar'];

function containsHint(value: string | null | undefined): boolean {
  return typeof value === 'string' && TOAST_HINTS.some((hint) => value.toLowerCase().includes(hint));
}

export function scoreToastCandidate(element: Element): number {
  let score = 0;
  const windowRef = element.ownerDocument?.defaultView;
  const htmlElement = windowRef && element instanceof windowRef.HTMLElement ? element : null;

  if (element.getAttribute('role') === 'alert') score += 8;
  if (element.getAttribute('role') === 'status') score += 6;
  if (containsHint(element.className)) score += 5;
  if (containsHint(element.getAttribute('data-state'))) score += 3;
  if (element.closest('[aria-live]')) score += 4;

  const position = htmlElement && windowRef ? windowRef.getComputedStyle(htmlElement).position : '';
  if (position === 'fixed' || position === 'sticky') score += 2;

  return score;
}

export function collectToastCandidates(root: Document | Element): Element[] {
  const nodes = Array.from(root.querySelectorAll('*'));
  return nodes.filter((node) => {
    if (node.getAttribute('data-clippy-handled') === 'true') return false;
    return scoreToastCandidate(node) >= 8;
  });
}
```

```ts
export interface ExtractedToastMessage {
  title: string;
  body?: string;
}

function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function extractToastMessage(element: Element): ExtractedToastMessage {
  const heading = element.querySelector('strong, h1, h2, h3, [data-title]');
  const bodyNode = element.querySelector('p, [data-description], [data-body]');
  const headingText = clean(heading?.textContent);
  const bodyText = clean(bodyNode?.textContent);

  if (headingText) {
    return {
      title: headingText,
      body: bodyText || undefined
    };
  }

  const flattened = clean(element.textContent);
  return {
    title: flattened || 'Paperclip has something to say',
    body: flattened ? undefined : 'I noticed a notification and decided to help.'
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm exec tsx --test tests/toast-detection.spec.ts tests/toast-extractor.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin
git add src/ui/toast-detection.ts src/ui/toast-extractor.ts tests/toast-detection.spec.ts tests/toast-extractor.spec.ts
git commit -m "feat: add toast detection and extraction heuristics"
```

### Task 4: Add Queueing And DOM Suppression

**Files:**
- Create: `src/ui/toast-queue.ts`
- Create: `src/ui/dom-suppression.ts`
- Test: `tests/toast-queue.spec.ts`

- [ ] **Step 1: Write the failing queue and suppression tests**

```ts
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { createToastQueue } from '../src/ui/toast-queue.ts';
import { suppressToastNode } from '../src/ui/dom-suppression.ts';

test('queue preserves message order', () => {
  const queue = createToastQueue();
  queue.enqueue({ title: 'First' });
  queue.enqueue({ title: 'Second' });

  assert.equal(queue.peek()?.title, 'First');
  queue.shift();
  assert.equal(queue.peek()?.title, 'Second');
});

test('suppression tags and hides matched nodes', () => {
  const dom = new JSDOM(`<div role="alert" class="toast">Saved</div>`);
  const node = dom.window.document.querySelector('div');

  assert.ok(node);
  suppressToastNode(node);
  assert.equal(node.getAttribute('data-clippy-handled'), 'true');
  assert.match(node.getAttribute('style') ?? '', /display:\s*none/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm exec tsx --test tests/toast-queue.spec.ts`
Expected: FAIL because `toast-queue.ts` and `dom-suppression.ts` do not exist yet.

- [ ] **Step 3: Implement the minimal queue and suppression helpers**

```ts
import type { ExtractedToastMessage } from './toast-extractor.ts';

export interface QueuedToastMessage extends ExtractedToastMessage {
  id?: string;
  ttlMs?: number;
}

export function createToastQueue() {
  const items: QueuedToastMessage[] = [];

  return {
    enqueue(item: QueuedToastMessage) {
      items.push(item);
    },
    peek() {
      return items[0] ?? null;
    },
    shift() {
      return items.shift() ?? null;
    },
    size() {
      return items.length;
    }
  };
}
```

```ts
export function suppressToastNode(node: Element): void {
  node.setAttribute('data-clippy-handled', 'true');

  const previousStyle = node.getAttribute('style');
  const nextStyle = [previousStyle, 'display: none !important;', 'visibility: hidden !important;']
    .filter(Boolean)
    .join(' ');

  node.setAttribute('style', nextStyle);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm exec tsx --test tests/toast-queue.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin
git add src/ui/toast-queue.ts src/ui/dom-suppression.ts tests/toast-queue.spec.ts
git commit -m "feat: add queueing and suppression helpers"
```

### Task 5: Mount The Controller And Render Clippy

**Files:**
- Create: `src/ui/styles.ts`
- Create: `src/ui/clippy-overlay.tsx`
- Create: `src/ui/clippy-controller.tsx`
- Create: `src/ui/index.tsx`
- Modify: `tests/plugin.spec.ts`

- [ ] **Step 1: Extend the failing contract test to require the UI exports**

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';

test('ui exports match manifest slot export names', async () => {
  const ui = await import('../src/ui/index.tsx');

  assert.equal(typeof ui.ClippyGlobalToolbarButton, 'function');
  assert.equal(typeof ui.ClippySettingsPage, 'function');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm exec tsx --test tests/plugin.spec.ts`
Expected: FAIL because the UI entrypoint does not exist yet.

- [ ] **Step 3: Implement the minimal style injector, overlay, controller, and exports**

```ts
const STYLE_ELEMENT_ID = 'paperclip-clippy-plugin-styles';

export function ensureClippyStyles(documentRef: Document): void {
  if (documentRef.getElementById(STYLE_ELEMENT_ID)) return;

  const style = documentRef.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = `
    .clippy-root { position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; pointer-events: none; }
    .clippy-bubble { max-width: 280px; padding: 14px 16px; border: 2px solid #1f1f1f; border-radius: 12px; background: #fff8c4; color: #1f1f1f; box-shadow: 0 12px 30px rgba(0,0,0,0.18); }
    .clippy-title { font-weight: 700; margin-bottom: 6px; }
    .clippy-body { font-size: 14px; line-height: 1.4; }
    .clippy-avatar { margin-top: 10px; font-size: 48px; line-height: 1; }
  `;
  documentRef.head.append(style);
}
```

```tsx
import React from 'react';
import type { ExtractedToastMessage } from './toast-extractor.ts';

export function ClippyOverlay(props: {
  message: ExtractedToastMessage | null;
  enabled: boolean;
}): React.JSX.Element | null {
  if (!props.enabled || !props.message) return null;

  return (
    <div className="clippy-root" aria-live="polite">
      <div className="clippy-bubble">
        <div className="clippy-title">{props.message.title}</div>
        {props.message.body ? <div className="clippy-body">{props.message.body}</div> : null}
      </div>
      <div className="clippy-avatar" aria-hidden="true">📎</div>
    </div>
  );
}
```

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collectToastCandidates } from './toast-detection.ts';
import { suppressToastNode } from './dom-suppression.ts';
import { extractToastMessage } from './toast-extractor.ts';
import { createToastQueue } from './toast-queue.ts';
import { ensureClippyStyles } from './styles.ts';
import { ClippyOverlay } from './clippy-overlay.tsx';
import type { ClippySettings } from './settings.ts';

export function ClippyController(props: {
  settings: ClippySettings;
}): React.JSX.Element {
  const queue = useMemo(() => createToastQueue(), []);
  const [currentMessage, setCurrentMessage] = useState<ReturnType<typeof extractToastMessage> | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!props.settings.enabled) return;

    ensureClippyStyles(document);

    const flushNext = () => {
      const next = queue.peek();
      setCurrentMessage(next);
      if (!next) return;

      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        queue.shift();
        flushNext();
      }, 3600);
    };

    const intercept = (root: Document | Element) => {
      for (const candidate of collectToastCandidates(root)) {
        suppressToastNode(candidate);
        queue.enqueue(extractToastMessage(candidate));
      }

      if (!currentMessage && queue.size() > 0) {
        flushNext();
      }
    };

    intercept(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            intercept(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [props.settings.enabled, currentMessage, props.settings.showDebugPanel, queue]);

  return <ClippyOverlay enabled={props.settings.enabled} message={currentMessage} />;
}
```

```tsx
import React from 'react';
import { usePluginAction, usePluginData } from '@paperclipai/plugin-sdk/ui';
import type { PluginSettingsPageProps } from '@paperclipai/plugin-sdk/ui';
import { ClippyController } from './clippy-controller.tsx';
import type { ClippySettings } from './settings.ts';

export function ClippyGlobalToolbarButton(): React.JSX.Element {
  const settings = usePluginData<ClippySettings>('clippy-settings', {});

  return (
    <>
      <button type="button" title="Clippy is active" aria-label="Clippy">📎</button>
      <ClippyController settings={settings.data ?? { enabled: true, interceptionMode: 'aggressive', showDebugPanel: false }} />
    </>
  );
}

export function ClippySettingsPage(_props: PluginSettingsPageProps): React.JSX.Element {
  const settings = usePluginData<ClippySettings>('clippy-settings', {});
  const saveSettings = usePluginAction<ClippySettings>('save-clippy-settings');
  const current = settings.data ?? { enabled: true, interceptionMode: 'aggressive', showDebugPanel: false };

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <h1>Clippy Toast Hijacker</h1>
      <p>Experimental Paperclip plugin that hides host toasts and shows a Clippy bubble instead.</p>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={current.enabled}
          onChange={(event) => void saveSettings.perform({ ...current, enabled: event.currentTarget.checked })}
        />
        Enable interception
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <input
          type="checkbox"
          checked={current.showDebugPanel}
          onChange={(event) => void saveSettings.perform({ ...current, showDebugPanel: event.currentTarget.checked })}
        />
        Show debug mode
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm exec tsx --test tests/plugin.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin
git add src/ui/styles.ts src/ui/clippy-overlay.tsx src/ui/clippy-controller.tsx src/ui/index.tsx tests/plugin.spec.ts
git commit -m "feat: mount clippy controller and overlay"
```

### Task 6: Finish Docs And Verify The Package

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Add the verification commands and manual install notes**

````md
## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Install into Paperclip from the absolute path to this repository. The plugin mounts from a global toolbar button and a settings page.

## Manual Verification

1. Install the plugin into Paperclip from `/Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin`.
2. Trigger a Paperclip action that normally shows a toast.
3. Confirm the native toast is hidden or flashes only briefly.
4. Confirm the Clippy bubble appears with the intercepted or fallback text.
5. If interception is weak, open the settings page and enable debug mode before widening selectors in code.
````

````md
## Verification

Run the smallest relevant scope first:

```bash
pnpm typecheck
pnpm test
pnpm build
```
````

- [ ] **Step 2: Run the full verification suite**

Run: `cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin && pnpm typecheck && pnpm test && pnpm build`
Expected: all commands pass

- [ ] **Step 3: Commit**

```bash
cd /Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin
git add README.md AGENTS.md
git commit -m "docs: document clippy plugin workflow"
```

- [ ] **Step 4: Perform a manual Paperclip host smoke test**

Run: install the local plugin in Paperclip, trigger at least two different host toasts, and note:

```text
- whether the native toast was fully hidden
- whether Clippy showed extracted title/body text
- whether multiple messages were queued in order
- whether any unrelated UI was accidentally suppressed
```

- [ ] **Step 5: If the smoke test is weak, open a follow-up issue for the invasive path**

```text
Follow-up scope:
- widen selectors in toast-detection.ts
- inject stronger suppression CSS in styles.ts
- add earlier interception hooks in clippy-controller.tsx
```
