import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

import { HANDLED_TOAST_ATTR } from "../src/ui/toast-detection.ts";
import {
  SUPPRESSED_TOAST_ATTR,
  SUPPRESSED_TOAST_AT_ATTR,
  SUPPRESSED_TOAST_TOKEN_ATTR,
  suppressToastNode
} from "../src/ui/dom-suppression.ts";
import { ToastQueue } from "../src/ui/toast-queue.ts";

describe("toast queue", () => {
  it("serves messages in FIFO order", () => {
    const idFactory = (() => {
      let counter = 0;
      return () => `id-${++counter}`;
    })();
    const queue = new ToastQueue<string>({ now: () => 1000, idFactory });

    queue.enqueue("first");
    queue.enqueue("second");
    queue.enqueue("third");

    assert.equal(queue.peek()?.value, "first");
    assert.deepEqual(
      queue.pending.map((entry) => entry.value),
      ["second", "third"]
    );

    assert.equal(queue.dequeue()?.value, "first");
    assert.equal(queue.peek()?.value, "second");
    assert.equal(queue.dequeue()?.value, "second");
    assert.equal(queue.dequeue()?.value, "third");
    assert.equal(queue.dequeue(), null);
    assert.equal(queue.size, 0);
  });
});

describe("toast suppression", () => {
  it("tags and hides toast nodes", () => {
    const dom = new JSDOM(`<div id="toast">Hello</div>`);
    const document = dom.window.document;
    const element = document.getElementById("toast");

    assert.ok(element);
    suppressToastNode(element, { token: "unit-test", now: () => 123, releaseAfterMs: 0 });

    assert.equal(element.getAttribute(HANDLED_TOAST_ATTR), "unit-test");
    assert.equal(element.getAttribute(SUPPRESSED_TOAST_ATTR), "true");
    assert.equal(element.getAttribute(SUPPRESSED_TOAST_TOKEN_ATTR), "unit-test");
    assert.equal(element.getAttribute(SUPPRESSED_TOAST_AT_ATTR), "123");
    assert.equal(element.style.display, "none");
    assert.equal(element.style.visibility, "hidden");
  });

  it("clears handled markers after disconnect", async () => {
    const dom = new JSDOM(`<div id="toast"></div>`);
    const document = dom.window.document;
    const element = document.getElementById("toast");

    assert.ok(element);
    suppressToastNode(element, { token: "release-test", now: () => 100, releaseAfterMs: 5 });

    element.remove();
    await new Promise((resolve) => setTimeout(resolve, 15));

    assert.equal(element.hasAttribute(HANDLED_TOAST_ATTR), false);
    assert.equal(element.hasAttribute(SUPPRESSED_TOAST_ATTR), false);
  });
});
