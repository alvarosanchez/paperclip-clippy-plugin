# paperclip-clippy-plugin

[![CI](https://img.shields.io/github/actions/workflow/status/alvarosanchez/paperclip-clippy-plugin/ci.yml?branch=main&label=CI)](https://github.com/alvarosanchez/paperclip-clippy-plugin/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/alvarosanchez/paperclip-clippy-plugin/blob/main/LICENSE)
[![Paperclip Plugin](https://img.shields.io/badge/Paperclip-plugin-111827)](https://github.com/paperclipai/paperclip)

Experimental Paperclip plugin that hijacks host toasts and re-renders them as a Clippy-style assistant bubble.

This repo is intentionally hacky. The first goal is to get the joke working from a real Paperclip plugin install, then tune the interception heuristics against the host DOM.

## Installation

From a local checkout:

```bash
pnpm install
pnpm build
npx paperclipai plugin install --local "$PWD"
```

This repository is prepared for npm publication as `paperclip-clippy-plugin`. Once published, the standard install flow will be:

```bash
npx paperclipai plugin install paperclip-clippy-plugin
```

## Development

```bash
pnpm install
pnpm verify
pnpm verify:manual
```

Useful scripts:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm pack:check`
- `pnpm verify`
- `pnpm verify:manual`

`pnpm verify:manual` builds the plugin, launches a disposable local Paperclip instance, installs this plugin into it, seeds a dummy company to skip onboarding, and opens Paperclip so you can trigger normal host toasts against a disposable instance.

## Manual Verification

1. Run `pnpm verify:manual`.
2. Follow the live checklist printed by the command.
3. Confirm there is no custom Clippy settings page content or test-trigger UI, and no visible global toolbar button.
4. Trigger a few normal Paperclip actions that show host toasts.
5. Confirm the native toast is hidden or flashes only briefly.
6. Confirm the Clippy bubble appears automatically with the intercepted toast text.
7. Confirm multiple messages are queued in order.

Optional environment variables:

- `PAPERCLIP_E2E_STATE_DIR`: keep the Paperclip state under a repo-relative directory instead of a disposable temp dir.
- `PAPERCLIP_E2E_PORT`: preferred HTTP port for the disposable instance.
- `PAPERCLIP_E2E_DB_PORT`: preferred embedded Postgres port for the disposable instance.
- `PAPERCLIP_E2E_OPEN_BROWSER=false`: skip auto-opening the browser during scripted runs.

## Release process

- CI runs from `.github/workflows/ci.yml` on pushes to `main` and on pull requests.
- npm publishing runs from `.github/workflows/release.yml` when a GitHub Release is published with a semver tag such as `v0.1.0`.
- The release workflow stamps `package.json` from the release tag, verifies the package, publishes with provenance, and syncs the checked-in version back to the target branch.
