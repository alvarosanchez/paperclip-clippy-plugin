# Paperclip Clippy Plugin Design

Date: 2026-04-17
Owner: Codex + Álvaro Sánchez-Mariscal

## Goal

Create a new Paperclip plugin repository at `/Users/alvaro/Dev/alvarosanchez/paperclip-clippy-plugin` that aggressively intercepts host toast notifications and replaces their visible presentation with a Clippy-style assistant bubble.

This is intentionally a playful experiment, not a production-safe extension. The primary objective is to make Paperclip feel like it has a mischievous MS Office assistant attached to its notification system.

## Success Criteria

The experiment is successful if:

- the plugin installs as a normal Paperclip plugin
- the plugin mounts from a supported host surface
- when Paperclip emits visible toasts, the plugin usually detects them
- detected toasts are hidden from view quickly enough that the Clippy replacement feels like the primary notification UI
- the replacement UI shows extracted toast content when available
- when content extraction fails, the plugin still shows a generic Clippy message instead of crashing

It is acceptable if:

- some host toasts still leak through
- matching relies on brittle DOM heuristics
- the plugin needs manual tuning against a specific Paperclip host build

## Chosen Approach

Start with the recommended approach:

1. register a legitimate Paperclip UI surface, using a `globalToolbarButton` so the plugin always has a host-mounted entry point
2. have that surface bootstrap a hidden DOM hijacker in plugin-owned UI code
3. observe the document for toast-like nodes
4. aggressively hide matched nodes
5. render a fixed-position Clippy overlay with the intercepted message

If this does not work well enough in a real host, escalate to the invasive approach:

- inject broader global CSS
- apply more forceful DOM suppression
- patch more of the host interaction surface if needed to keep native toasts from flashing

The invasive path is a fallback, not the default implementation target.

## Why This Approach

This design gets the best tradeoff for a hack:

- it still uses the Paperclip plugin system for installation and mounting
- it keeps the joke contained in one plugin repo
- it avoids modifying Paperclip core
- it leaves room to escalate if the host DOM is harder to hijack than expected

## Architecture

The repository will be a self-contained Paperclip plugin package with the same broad shape as the other local Paperclip plugin repositories:

- `src/manifest.ts`
- `src/worker.ts`
- `src/ui/index.tsx`
- `src/ui/` helpers for DOM matching, extraction, queueing, and rendering
- `tests/plugin.spec.ts`
- a build script that emits `dist/manifest.js`, `dist/worker.js`, and `dist/ui/`

### Worker

The worker will stay intentionally small.

Responsibilities:

- define the plugin
- expose any minimal health/config data the UI needs
- avoid unnecessary capabilities

Non-responsibilities:

- no toast interception logic
- no long-running jobs
- no backend orchestration

The interesting behavior is entirely in host-mounted UI code.

### UI Controller

The UI controller is the core of the experiment.

Responsibilities:

- mount from a supported host slot
- install a `MutationObserver` on the document
- scan for toast-like nodes on startup and on DOM changes
- suppress matching native notifications
- extract message text when possible
- feed a local notification queue
- render the Clippy bubble overlay

The controller should be written so the matching and suppression logic can be tuned without rewriting the entire UI.

### Clippy Overlay

The overlay is a plugin-owned fixed element rendered above host content.

Responsibilities:

- show a simple assistant figure plus speech bubble
- display the latest intercepted message
- animate in and out in a lightweight way
- handle multiple notifications as a queue rather than dropping all but the newest message

Visual fidelity matters less than clarity and humor. The overlay should feel recognizably Clippy-inspired without requiring complex asset work.

## Toast Detection Strategy

This plugin is allowed to be heuristic and mean.

Initial matching rules should include:

- nodes with `role="status"` or `role="alert"`
- nodes inside `aria-live` regions
- elements whose class names or data attributes include strings like `toast`, `notification`, or `sonner`
- recently added fixed-position or portal-style nodes near viewport edges

The matcher should score candidates rather than relying on one selector only. That makes it easier to widen or narrow interception later.

## Suppression Strategy

For matched native toasts, the plugin should:

- mark them as already handled to avoid duplicate processing
- hide them with inline style updates such as `display: none` or `visibility: hidden`
- optionally tag them with a plugin-owned data attribute for debugging

The initial implementation should favor obvious suppression over elegance. If hiding causes layout artifacts or race conditions, fallback logic can become more invasive later.

## Message Extraction Strategy

The UI should try to extract:

- a short title
- a secondary body

Sources may include:

- heading-like descendants
- text nodes inside the matched container
- action labels when they help the message read naturally

If extraction fails, the fallback message should be something like:

- title: `Paperclip has something to say`
- body: `I noticed a notification and decided to help.`

## User-Facing Behavior

When a toast is intercepted:

1. native toast is hidden
2. Clippy overlay animates in
3. speech bubble shows extracted or fallback text
4. message auto-dismisses after a short TTL
5. next queued message appears if present

The overlay can stay visible while idle if that makes the joke land better, but the speech bubble content should still behave like a normal notification queue.

## Plugin Surfaces

The first version should expose:

- `globalToolbarButton`: a visible or near-invisible host mount point for the controller
- `settingsPage`: an optional small debug surface for toggling interception on/off and showing recent matched nodes

The settings page is useful because this experiment will likely need manual tuning against real host DOM. A small diagnostics panel is worth the extra effort.

## Testing Strategy

This experiment does not need perfect end-to-end host fidelity, but it does need fast confidence checks.

Minimum automated coverage:

- manifest contract test for declared plugin slots/capabilities
- unit tests for toast-candidate scoring
- unit tests for message extraction from sample DOM snippets
- unit tests for queue behavior

Build verification:

- typecheck
- test
- build

Manual verification will still be required in a real Paperclip host because the entire premise depends on host DOM behavior.

## Out of Scope

The first version will not:

- replace Paperclip notifications through a supported official API
- guarantee interception of every host notification
- reproduce the exact original Microsoft Assistant visuals
- implement voice, sound effects, or branching dialog interactions
- modify Paperclip core code

## Risks

- host DOM structure may differ from expectations
- native toasts may flash before suppression
- some notifications may be mounted in surfaces the matcher misses
- aggressive hiding may suppress unrelated UI elements if heuristics are too broad

These risks are acceptable for the experiment. The repo should prioritize debuggability and fast iteration over long-term stability.

## Fallback Plan

If the recommended approach does not work well enough after real-host verification, the next iteration should:

- widen selectors
- inject stronger global CSS
- suppress more candidate nodes earlier
- accept a more invasive relationship with the host DOM

That escalation should happen in the same repository, keeping the recommended implementation as the baseline and layering the invasive tactics on top rather than rewriting everything from scratch.
