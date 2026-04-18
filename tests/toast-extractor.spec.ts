import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

import { extractToastContent } from "../src/ui/toast-extractor.ts";

describe("toast extraction", () => {
  it("extracts structured title/body text", () => {
    const dom = new JSDOM(
      `
        <div class="toast">
          <h4>Update ready</h4>
          <p>Restart the app to apply changes.</p>
        </div>
      `
    );
    const document = dom.window.document;
    const element = document.querySelector(".toast");

    assert.ok(element);
    const content = extractToastContent(element);

    assert.equal(content.title, "Update ready");
    assert.equal(content.body, "Restart the app to apply changes.");
    assert.equal(content.source, "structured");
  });

  it("falls back to flattened text when structure is missing", () => {
    const dom = new JSDOM(
      `
        <div class="toast">
          <span>Hello</span>
          <span>world</span>
        </div>
      `
    );
    const document = dom.window.document;
    const element = document.querySelector(".toast");

    assert.ok(element);
    const content = extractToastContent(element);

    assert.equal(content.title, "Hello world");
    assert.equal(content.body, null);
    assert.equal(content.source, "flattened");
  });

  it("ignores close button and aria-hidden noise", () => {
    const dom = new JSDOM(
      `
        <div class="toast">
          <h4>Build failed</h4>
          <p>Check the logs for details.</p>
          <button aria-label="Close">×</button>
          <span aria-hidden="true">Decorative</span>
        </div>
      `
    );
    const document = dom.window.document;
    const element = document.querySelector(".toast");

    assert.ok(element);
    const content = extractToastContent(element);

    assert.equal(content.title, "Build failed");
    assert.equal(content.body, "Check the logs for details.");
  });

  it("extracts title and body from host toast paragraph pairs", () => {
    const dom = new JSDOM(
      `
        <li class="host-toast">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold leading-5">Clippy test toast</p>
            <p class="mt-1 text-xs leading-4 opacity-70">If interception is enabled, Clippy should hijack this notification.</p>
          </div>
          <button type="button" aria-label="Dismiss notification">Dismiss</button>
        </li>
      `
    );
    const document = dom.window.document;
    const element = document.querySelector(".host-toast");

    assert.ok(element);
    const content = extractToastContent(element);

    assert.equal(content.title, "Clippy test toast");
    assert.equal(
      content.body,
      "If interception is enabled, Clippy should hijack this notification."
    );
    assert.equal(content.source, "structured");
  });
});
