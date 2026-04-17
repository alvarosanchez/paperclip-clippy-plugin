import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

import { HANDLED_TOAST_ATTR } from "../src/ui/toast-detection.ts";
import {
  SUPPRESSED_TOAST_ATTR,
  SUPPRESSED_TOAST_AT_ATTR,
  SUPPRESSED_TOAST_TOKEN_ATTR,
  clearToastSuppression,
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
    const dom = new JSDOM(`<div id="toast" aria-hidden="false"></div>`);
    const document = dom.window.document;
    const element = document.getElementById("toast");

    assert.ok(element);
    element.style.setProperty("display", "block", "important");
    element.style.setProperty("visibility", "visible");
    element.style.setProperty("pointer-events", "auto", "important");
    suppressToastNode(element, { token: "release-test", now: () => 100, releaseAfterMs: 5 });

    element.remove();
    await waitForCondition(() => !element.hasAttribute(HANDLED_TOAST_ATTR));

    assert.equal(element.hasAttribute(HANDLED_TOAST_ATTR), false);
    assert.equal(element.hasAttribute(SUPPRESSED_TOAST_ATTR), false);
    assert.equal(element.style.display, "block");
    assert.equal(element.style.getPropertyPriority("display"), "important");
    assert.equal(element.style.visibility, "visible");
    assert.equal(element.style.pointerEvents, "auto");
    assert.equal(element.style.getPropertyPriority("pointer-events"), "important");
    assert.equal(element.getAttribute("aria-hidden"), "false");
  });

  it("releases suppression after a delayed disconnect", async () => {
    const dom = new JSDOM(`<div id="toast"></div>`);
    const document = dom.window.document;
    const element = document.getElementById("toast");

    assert.ok(element);
    suppressToastNode(element, { token: "delayed-release", now: () => 100, releaseAfterMs: 5 });

    await sleep(10);
    assert.equal(element.hasAttribute(HANDLED_TOAST_ATTR), true);

    element.remove();
    await waitForCondition(() => !element.hasAttribute(HANDLED_TOAST_ATTR));

    assert.equal(element.hasAttribute(SUPPRESSED_TOAST_ATTR), false);
  });

  it("preserves pre-existing handled markers", () => {
    const dom = new JSDOM(`<div id="toast"></div>`);
    const document = dom.window.document;
    const element = document.getElementById("toast");

    assert.ok(element);
    element.setAttribute(HANDLED_TOAST_ATTR, "true");

    const originalRandom = Math.random;
    Math.random = () => 0.5;
    try {
      suppressToastNode(element, { now: () => 500, releaseAfterMs: 0 });
    } finally {
      Math.random = originalRandom;
    }

    assert.equal(element.getAttribute(SUPPRESSED_TOAST_TOKEN_ATTR), "clippy-500-8");
    assert.equal(element.getAttribute(HANDLED_TOAST_ATTR), "clippy-500-8");
    clearToastSuppression(element);
    assert.equal(element.getAttribute(HANDLED_TOAST_ATTR), "true");
  });

  it("does not clear handled markers when suppression state is unowned", () => {
    const dom = new JSDOM(`<div id="toast"></div>`);
    const document = dom.window.document;
    const element = document.getElementById("toast");

    assert.ok(element);
    element.setAttribute(HANDLED_TOAST_ATTR, "external");

    element.removeAttribute(SUPPRESSED_TOAST_ATTR);
    element.removeAttribute(SUPPRESSED_TOAST_TOKEN_ATTR);
    element.removeAttribute(SUPPRESSED_TOAST_AT_ATTR);

    assert.equal(element.getAttribute(HANDLED_TOAST_ATTR), "external");
  });

  it("cancels pending release timers when releaseAfterMs is non-positive", async () => {
    const dom = new JSDOM(`<div id="toast"></div>`);
    const document = dom.window.document;
    const element = document.getElementById("toast");

    assert.ok(element);
    suppressToastNode(element, { token: "release-test", now: () => 100, releaseAfterMs: 25 });
    suppressToastNode(element, { token: "release-test", now: () => 110, releaseAfterMs: 0 });

    element.remove();
    await sleep(40);

    assert.equal(element.hasAttribute(HANDLED_TOAST_ATTR), true);
    assert.equal(element.hasAttribute(SUPPRESSED_TOAST_ATTR), true);
  });
});

async function waitForCondition(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 200;
  while (!condition()) {
    if (Date.now() > deadline) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(condition(), "condition did not resolve before timeout");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
