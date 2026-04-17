import type { ToastContent } from "./toast-extractor.ts";

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
  if (!enabled) {
    return null;
  }

  const title = message?.title ?? "Clippy is standing by";
  const body =
    message?.body
    ?? "I am watching for Paperclip notifications to hijack.";
  const source = message?.source ?? "flattened";
  const hasPending = pendingCount > 0;
  const summary = hasPending ? `${pendingCount} more queued` : "Queue empty";

  return (
    <div className="clippy-overlay-root" aria-live="polite">
      <div className="clippy-overlay-shell" data-active={message ? "true" : "false"}>
        <div className="clippy-overlay-character" aria-hidden="true" />
        <div className="clippy-overlay-bubble">
          <div className="clippy-overlay-title">{title}</div>
          <div className="clippy-overlay-body">{body}</div>
          <div className="clippy-overlay-meta">
            <span>{summary}</span>
            <span>Source: {source}</span>
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
