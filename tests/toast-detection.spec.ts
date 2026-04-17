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
});
