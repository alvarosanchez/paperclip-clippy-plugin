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
    assert.ok(ids.has("aria-live"), "aria-live should be included");
    assert.ok(ids.has("class-toast"), "toast class should be included");
    assert.ok(ids.has("class-notification"), "notification class should be included");

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
});
