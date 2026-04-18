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
pnpm verify:manual
```

`pnpm verify:manual` now follows the nearby Paperclip plugin convention: it builds the plugin, launches a disposable local Paperclip instance, installs this repo as a local plugin, seeds a dummy company to skip onboarding, and opens the Plugins settings index for manual inspection. Use `PAPERCLIP_E2E_OPEN_BROWSER=false` if you need to run it without auto-opening a browser.
