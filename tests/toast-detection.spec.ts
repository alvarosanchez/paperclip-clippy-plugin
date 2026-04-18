import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

import {
  HANDLED_TOAST_ATTR,
  collectToastCandidates,
  scoreToastCandidate
} from "../src/ui/toast-detection.ts";

describe("toast detection", () => {
  it("scores aria-live/role/class hints as toast candidates", () => {
    const dom = new JSDOM(
      `
        <div id="role-alert" role="alert">Alert</div>
        <div id="aria-live" aria-live="polite">Live</div>
        <div id="class-toast" class="app-toast">Toast</div>
        <div id="class-notification" class="notification-banner">Notice</div>
      `
    );
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);
    const ids = new Set(candidates.map((candidate) => candidate.element.id));

    assert.ok(ids.has("role-alert"), "role alert should be included");
    assert.ok(ids.has("class-toast"), "toast class should be included");
    assert.ok(ids.has("class-notification"), "notification class should be included");
    assert.ok(!ids.has("aria-live"), "generic aria-live should be excluded");

    for (const candidate of candidates) {
      assert.ok(
        scoreToastCandidate(candidate.element) > 0,
        `expected positive score for ${candidate.element.id || candidate.element.tagName}`
      );
    }
  });

  it("ignores already handled nodes", () => {
    const dom = new JSDOM(`<div id="toast" role="status">Hello</div>`);
    const document = dom.window.document;
    const element = document.getElementById("toast");

    assert.ok(element);
    element.setAttribute(HANDLED_TOAST_ATTR, "true");

    const candidates = collectToastCandidates(document);
    assert.equal(candidates.length, 0);
  });

  it("respects subtree scoping", () => {
    const dom = new JSDOM(
      `
        <section id="scope">
          <div id="inside" class="toast">Inside</div>
        </section>
        <div id="outside" class="toast">Outside</div>
      `
    );
    const document = dom.window.document;
    const scope = document.getElementById("scope");

    assert.ok(scope);
    const candidates = collectToastCandidates(scope);
    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["inside"]
    );
  });

  it("avoids duplicate nested toast candidates", () => {
    const dom = new JSDOM(
      `
        <div id="outer" class="toast">
          <div id="title" class="toast-title">Title</div>
          <button id="close" class="toast-close">Close</button>
        </div>
      `
    );
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["outer"]
    );
  });

  it("ignores data-testid on nested toast fragments", () => {
    const dom = new JSDOM(
      `
        <div id="outer" class="toast">
          <div id="title" class="toast-title" data-testid="toast-title">Title</div>
        </div>
      `
    );
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["outer"]
    );
  });

  it("supports ShadowRoot scoped querying", () => {
    const dom = new JSDOM(`<div id="host"></div>`);
    const document = dom.window.document;
    const host = document.getElementById("host");

    assert.ok(host);
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `<div id="shadow-toast" class="toast">Shadow</div>`;

    const candidates = collectToastCandidates(shadowRoot);
    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["shadow-toast"]
    );
  });

  it("finds shadow-root toasts from document scans", () => {
    const dom = new JSDOM(`<div id="host"></div>`);
    const document = dom.window.document;
    const host = document.getElementById("host");

    assert.ok(host);
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `<div id="shadow-toast" class="toast">Shadow</div>`;

    const candidates = collectToastCandidates(document);
    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["shadow-toast"]
    );
  });

  it("keeps real toast roots that include child-hint words", () => {
    const dom = new JSDOM(
      `
        <div id="message-toast" class="toast-message">Hello</div>
      `
    );
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["message-toast"]
    );
  });

  it("dedupes when shadow-root candidates have a matching host container", () => {
    const dom = new JSDOM(`<div id="host" class="toast"></div>`);
    const document = dom.window.document;
    const host = document.getElementById("host");

    assert.ok(host);
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `<div id="shadow-title" class="toast-title">Title</div>`;

    const candidates = collectToastCandidates(shadowRoot);
    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["host"]
    );
  });

  it("matches snackbar class hints when scoring expects them", () => {
    const dom = new JSDOM(`<div id="snackbar" class="snackbar">Snack</div>`);
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["snackbar"]
    );
  });

  it("accepts real toast roots on non-div tags", () => {
    const dom = new JSDOM(`<li id="toast-item" class="toast">Item</li>`);
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["toast-item"]
    );
  });

  it("does not return child fragments without strong toast signals", () => {
    const dom = new JSDOM(`<div id="fragment" class="toast-title">Title</div>`);
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(candidates.map((candidate) => candidate.element.id), []);
  });

  it("does not return generic aria-live regions without toast signals", () => {
    const dom = new JSDOM(`<div id="live" aria-live="polite">Status</div>`);
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(candidates.map((candidate) => candidate.element.id), []);
  });

  it("ignores clipped accessibility live regions that are not visible toasts", () => {
    const dom = new JSDOM(
      `
        <div
          id="sr-only-status"
          role="status"
          aria-live="assertive"
          style="position: fixed; top: 0px; left: 0px; width: 1px; height: 1px; margin: -1px; border: 0px; padding: 0px; overflow: hidden; clip: rect(0px, 0px, 0px, 0px); clip-path: inset(100%); white-space: nowrap;"
        >
          Drag started
        </div>
      `
    );
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(candidates.map((candidate) => candidate.element.id), []);
  });

  it("detects host toasts rendered as live-region list items", () => {
    const dom = new JSDOM(
      `
        <aside aria-live="polite" aria-atomic="false" class="pointer-events-none fixed bottom-3 left-3 z-[120] w-full max-w-sm px-1">
          <ol class="flex w-full flex-col-reverse gap-2">
            <li id="host-toast" class="pointer-events-auto rounded-sm border shadow-lg backdrop-blur-xl transition-[transform,opacity] duration-200 ease-out translate-y-0 opacity-100 border-sky-300 bg-sky-50 text-sky-900">
              <div class="flex items-start gap-3 px-3 py-2.5">
                <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500"></span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold leading-5">Clippy test toast</p>
                  <p class="mt-1 text-xs leading-4 opacity-70">If interception is enabled, Clippy should hijack this notification.</p>
                </div>
                <button type="button" aria-label="Dismiss notification">Dismiss</button>
              </div>
            </li>
          </ol>
        </aside>
      `
    );
    const document = dom.window.document;
    const candidates = collectToastCandidates(document);

    assert.deepEqual(
      candidates.map((candidate) => candidate.element.id),
      ["host-toast"]
    );
    assert.ok(candidates[0].score >= 3, "host toast should score as a strong candidate");
  });
});
