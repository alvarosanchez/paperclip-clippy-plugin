export const CLIPPY_STYLE_ID = "paperclip-clippy-overlay-styles";
export const CLIPPY_OVERLAY_ROOT_ID = "paperclip-clippy-overlay-root";

const CLIPPY_STYLE_TEXT = `
.clippy-overlay-root {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 2147483646;
  font-family: "Tahoma", "Trebuchet MS", "Segoe UI", sans-serif;
  color: #1f1a14;
  pointer-events: none;
}

.clippy-overlay-shell {
  display: grid;
  grid-template-columns: 152px minmax(280px, 430px);
  gap: 0;
  align-items: start;
  transition: opacity 180ms ease, transform 180ms ease;
}

.clippy-overlay-shell[data-active="false"] {
  opacity: 0.9;
  transform: translateY(-4px) scale(0.985);
}

.clippy-overlay-figure {
  width: 168px;
  margin-right: -18px;
  padding-top: 8px;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.18));
  transform-origin: 50% 100%;
}

.clippy-overlay-character {
  display: block;
  width: 168px;
  height: auto;
  user-select: none;
}

.clippy-overlay-shell[data-active="true"] .clippy-overlay-figure {
  animation: clippy-float 1.8s ease-in-out infinite;
}

.clippy-overlay-bubble {
  position: relative;
  max-width: 430px;
  background: linear-gradient(180deg, #fff9da 0%, #f6eebd 100%);
  border: 2px solid #3f3325;
  border-radius: 18px;
  padding: 16px 18px 14px;
  margin-top: 12px;
  box-shadow:
    0 4px 0 rgba(80, 64, 35, 0.16),
    0 18px 32px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  animation: clippy-pop 220ms ease-out;
}

.clippy-overlay-bubble::before {
  content: "";
  position: absolute;
  left: -17px;
  top: 60px;
  border-style: solid;
  border-width: 13px 17px 13px 0;
  border-color: transparent #3f3325 transparent transparent;
}

.clippy-overlay-bubble::after {
  content: "";
  position: absolute;
  left: -13px;
  top: 62px;
  border-style: solid;
  border-width: 11px 15px 11px 0;
  border-color: transparent #fff4c8 transparent transparent;
}

.clippy-overlay-title {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin-bottom: 7px;
}

.clippy-overlay-body {
  font-size: 14px;
  line-height: 1.42;
  color: #2d2419;
}

.clippy-overlay-footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.clippy-overlay-footer[data-has-pending="true"] {
  justify-content: space-between;
}

.clippy-overlay-summary {
  font-size: 12px;
  color: #6b5840;
}

.clippy-overlay-dismiss {
  border: 1px solid #62513b;
  border-radius: 9px;
  background: linear-gradient(180deg, #fcfcfc 0%, #d9d3cb 100%);
  color: #1d1d1d;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  padding: 4px 12px;
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.92),
    inset -1px -1px 0 rgba(99, 88, 78, 0.22);
  cursor: pointer;
}

.clippy-overlay-dismiss:hover {
  background: linear-gradient(180deg, #ffffff 0%, #e4ddd5 100%);
}

.clippy-overlay-dismiss:active {
  box-shadow: inset 1px 1px 2px rgba(71, 60, 49, 0.28);
}

.clippy-overlay-shell[data-active="false"] .clippy-overlay-figure,
.clippy-overlay-shell[data-active="false"] .clippy-overlay-bubble {
  opacity: 0.82;
}

.clippy-overlay-debug {
  margin-top: 12px;
  border-top: 1px dashed rgba(63, 51, 37, 0.45);
  padding-top: 10px;
  font-size: 11px;
  color: #2f2416;
  display: grid;
  gap: 6px;
}

.clippy-overlay-debug-source {
  font-weight: 700;
}

.clippy-overlay-debug-entry {
  background: rgba(126, 101, 54, 0.08);
  padding: 6px 8px;
  border-radius: 8px;
}

.clippy-overlay-debug-entry strong {
  display: block;
  font-weight: 700;
}

.clippy-runtime-mount {
  position: relative;
  display: block;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  flex: 0 0 0;
}

.clippy-runtime-anchor {
  display: block;
  width: 0;
  height: 0;
  overflow: hidden;
  font-size: 0;
  line-height: 0;
}

@media (max-width: 720px) {
  .clippy-overlay-root {
    top: 12px;
    right: 12px;
    left: 12px;
  }

  .clippy-overlay-shell {
    grid-template-columns: 98px minmax(0, 1fr);
    gap: 0;
  }

  .clippy-overlay-figure {
    width: 112px;
    margin-right: -12px;
    padding-top: 28px;
  }

  .clippy-overlay-character {
    width: 112px;
  }

  .clippy-overlay-bubble {
    max-width: none;
    padding: 14px 14px 12px;
  }

  .clippy-overlay-bubble::before {
    top: 52px;
  }

  .clippy-overlay-bubble::after {
    top: 54px;
  }
}

@keyframes clippy-pop {
  from {
    transform: translateY(-8px) scale(0.97);
    opacity: 0.58;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes clippy-float {
  0%,
  100% {
    transform: translateY(0) rotate(-1.5deg);
  }
  50% {
    transform: translateY(3px) rotate(1.2deg);
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
