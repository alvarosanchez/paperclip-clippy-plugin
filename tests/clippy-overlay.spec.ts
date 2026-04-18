import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { createElement } from "react";

import { ClippyOverlay } from "../src/ui/clippy-overlay.tsx";

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (node: unknown) => string;
};

describe("clippy overlay", () => {
  it("does not render when no toast is active", () => {
    const markup = renderToStaticMarkup(
      createElement(ClippyOverlay, {
        enabled: true,
        message: null,
        pendingCount: 0
      })
    );

    assert.equal(markup, "");
  });

  it("renders the active message and queue summary", () => {
    const markup = renderToStaticMarkup(
      createElement(ClippyOverlay, {
        enabled: true,
        message: {
          title: "Test toast",
          body: "Clippy says hello.",
          source: "structured"
        },
        pendingCount: 2
      })
    );

    assert.match(markup, /Test toast/);
    assert.match(markup, /Clippy says hello\./);
    assert.match(markup, /2 more waiting/);
  });
});
