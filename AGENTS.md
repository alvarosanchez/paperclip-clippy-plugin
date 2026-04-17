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
