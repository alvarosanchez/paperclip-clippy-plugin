export const CLIPPY_STYLE_ID = "paperclip-clippy-overlay-styles";
export const CLIPPY_OVERLAY_ROOT_ID = "paperclip-clippy-overlay-root";

const CLIPPY_STYLE_TEXT = `
.clippy-overlay-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2147483646;
  font-family: "Comic Sans MS", "Segoe UI", system-ui, sans-serif;
  color: #1b1b1b;
}

.clippy-overlay-shell {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: end;
  pointer-events: none;
}

.clippy-overlay-shell[data-active="false"] .clippy-overlay-bubble {
  opacity: 0.7;
}

.clippy-overlay-bubble {
  position: relative;
  min-width: 220px;
  max-width: 360px;
  background: #fff7d6;
  border: 2px solid #1b1b1b;
  border-radius: 18px;
  padding: 14px 16px 12px;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18);
  pointer-events: auto;
  animation: clippy-pop 220ms ease-out;
}

.clippy-overlay-bubble::after {
  content: "";
  position: absolute;
  left: -10px;
  bottom: 18px;
  width: 18px;
  height: 18px;
  background: #fff7d6;
  border-left: 2px solid #1b1b1b;
  border-bottom: 2px solid #1b1b1b;
  transform: rotate(45deg);
}

.clippy-overlay-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
}

.clippy-overlay-body {
  font-size: 13px;
  line-height: 1.35;
}

.clippy-overlay-meta {
  margin-top: 10px;
  font-size: 11px;
  color: #5b5b5b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.clippy-overlay-dismiss {
  border: 1px solid #1b1b1b;
  border-radius: 999px;
  background: #fff;
  color: #1b1b1b;
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
}

.clippy-overlay-dismiss:hover {
  background: #f4f4f4;
}

.clippy-overlay-character {
  width: 64px;
  height: 78px;
  border-radius: 14px;
  background: linear-gradient(180deg, #e6f1ff 0%, #c7dfff 100%);
  border: 2px solid #1b1b1b;
  position: relative;
  box-shadow: inset 0 0 0 2px #ffffff;
}

.clippy-overlay-character::before {
  content: "";
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #1b1b1b;
  top: 10px;
  left: 18px;
}

.clippy-overlay-character::after {
  content: "";
  position: absolute;
  width: 30px;
  height: 12px;
  border-radius: 999px;
  background: #1b1b1b;
  bottom: 12px;
  left: 16px;
}

.clippy-overlay-debug {
  margin-top: 12px;
  border-top: 1px dashed #1b1b1b;
  padding-top: 10px;
  font-size: 11px;
  color: #2f2f2f;
  display: grid;
  gap: 6px;
}

.clippy-overlay-debug-entry {
  background: rgba(27, 27, 27, 0.06);
  padding: 6px 8px;
  border-radius: 8px;
}

.clippy-overlay-debug-entry strong {
  display: block;
  font-weight: 700;
}

.clippy-toolbar-root {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.clippy-toolbar-button {
  border-radius: 999px;
  border: 1px solid #1b1b1b;
  background: #fff7d6;
  color: #1b1b1b;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
}

@keyframes clippy-pop {
  from {
    transform: translateY(6px) scale(0.98);
    opacity: 0.5;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
`;

export function ensureClippyOverlayStyles(doc: Document = document): HTMLStyleElement | null {
  if (!doc) {
    return null;
  }
  const existing = doc.getElementById(CLIPPY_STYLE_ID);
  if (existing && existing instanceof HTMLStyleElement) {
    return existing;
  }
  const style = doc.createElement("style");
  style.id = CLIPPY_STYLE_ID;
  style.textContent = CLIPPY_STYLE_TEXT;
  (doc.head || doc.documentElement).appendChild(style);
  return style;
}
