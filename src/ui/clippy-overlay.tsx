import type { ToastContent } from "./toast-extractor.ts";
import { CLIPPY_IMAGE_DATA_URL } from "./clippy-image-data.ts";
import { CLIPPY_OVERLAY_ROOT_ID } from "./styles.ts";

export type ClippyDebugMatch = {
  id: string;
  title: string;
  score: number;
  reasons: string[];
  source: ToastContent["source"];
};

export type ClippyOverlayProps = {
  enabled: boolean;
  message: ToastContent | null;
  pendingCount: number;
  onDismiss?: () => void;
  debug?: boolean;
  debugMatches?: ClippyDebugMatch[];
};

export function ClippyOverlay({
  enabled,
  message,
  pendingCount,
  onDismiss,
  debug,
  debugMatches
}: ClippyOverlayProps) {
  if (!enabled || !message) {
    return null;
  }

  const title = message.title;
  const body = message.body;
  const source = message.source;
  const hasPending = pendingCount > 0;
  const summary = hasPending ? `${pendingCount} more waiting` : null;

  return (
    <div
      className="clippy-overlay-root"
      id={CLIPPY_OVERLAY_ROOT_ID}
      aria-live="polite"
    >
      <div className="clippy-overlay-shell" data-active={message ? "true" : "false"}>
        <div className="clippy-overlay-figure" aria-hidden="true">
          <img
            className="clippy-overlay-character"
            src={CLIPPY_IMAGE_DATA_URL}
            alt=""
          />
        </div>

        <div className="clippy-overlay-bubble">
          <div className="clippy-overlay-title">{title}</div>
          <div className="clippy-overlay-body">{body}</div>
          <div
            className="clippy-overlay-footer"
            data-has-pending={hasPending ? "true" : "false"}
          >
            {summary ? (
              <span className="clippy-overlay-summary">{summary}</span>
            ) : null}
            <button
              type="button"
              className="clippy-overlay-dismiss"
              onClick={onDismiss}
              disabled={!onDismiss}
            >
              Dismiss
            </button>
          </div>
          {debug && debugMatches && debugMatches.length > 0 ? (
            <div className="clippy-overlay-debug">
              <div className="clippy-overlay-debug-source">Source: {source}</div>
              {debugMatches.map((match) => (
                <div className="clippy-overlay-debug-entry" key={match.id}>
                  <strong>{match.title}</strong>
                  <div>Score: {match.score}</div>
                  <div>Reasons: {match.reasons.join(", ") || "none"}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function renderClippyOverlayInto(
  container: HTMLElement,
  props: ClippyOverlayProps
): void {
  container.replaceChildren();

  if (!props.enabled || !props.message) {
    return;
  }

  const doc = container.ownerDocument;
  const title = props.message.title;
  const body = props.message.body;
  const source = props.message.source;
  const hasPending = props.pendingCount > 0;

  const root = doc.createElement("div");
  root.className = "clippy-overlay-root";
  root.id = CLIPPY_OVERLAY_ROOT_ID;
  root.setAttribute("aria-live", "polite");

  const shell = doc.createElement("div");
  shell.className = "clippy-overlay-shell";
  shell.dataset.active = "true";

  const figure = doc.createElement("div");
  figure.className = "clippy-overlay-figure";
  figure.setAttribute("aria-hidden", "true");

  const image = doc.createElement("img");
  image.className = "clippy-overlay-character";
  image.src = CLIPPY_IMAGE_DATA_URL;
  image.alt = "";
  figure.appendChild(image);

  const bubble = doc.createElement("div");
  bubble.className = "clippy-overlay-bubble";

  const titleNode = doc.createElement("div");
  titleNode.className = "clippy-overlay-title";
  titleNode.textContent = title;
  bubble.appendChild(titleNode);

  if (body) {
    const bodyNode = doc.createElement("div");
    bodyNode.className = "clippy-overlay-body";
    bodyNode.textContent = body;
    bubble.appendChild(bodyNode);
  }

  const footer = doc.createElement("div");
  footer.className = "clippy-overlay-footer";
  footer.dataset.hasPending = hasPending ? "true" : "false";

  if (hasPending) {
    const summary = doc.createElement("span");
    summary.className = "clippy-overlay-summary";
    summary.textContent = `${props.pendingCount} more waiting`;
    footer.appendChild(summary);
  }

  const dismiss = doc.createElement("button");
  dismiss.type = "button";
  dismiss.className = "clippy-overlay-dismiss";
  dismiss.textContent = "Dismiss";
  dismiss.disabled = !props.onDismiss;
  if (props.onDismiss) {
    dismiss.addEventListener("click", props.onDismiss);
  }
  footer.appendChild(dismiss);
  bubble.appendChild(footer);

  if (props.debug && props.debugMatches && props.debugMatches.length > 0) {
    const debug = doc.createElement("div");
    debug.className = "clippy-overlay-debug";

    const sourceNode = doc.createElement("div");
    sourceNode.className = "clippy-overlay-debug-source";
    sourceNode.textContent = `Source: ${source}`;
    debug.appendChild(sourceNode);

    for (const match of props.debugMatches) {
      const entry = doc.createElement("div");
      entry.className = "clippy-overlay-debug-entry";

      const strong = doc.createElement("strong");
      strong.textContent = match.title;
      entry.appendChild(strong);

      const score = doc.createElement("div");
      score.textContent = `Score: ${match.score}`;
      entry.appendChild(score);

      const reasons = doc.createElement("div");
      reasons.textContent = `Reasons: ${match.reasons.join(", ") || "none"}`;
      entry.appendChild(reasons);

      debug.appendChild(entry);
    }

    bubble.appendChild(debug);
  }

  shell.append(figure, bubble);
  root.appendChild(shell);
  container.appendChild(root);
}
