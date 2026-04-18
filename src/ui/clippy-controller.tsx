import { useEffect, useRef } from "react";
import { clearSuppressedToastNodes, suppressToastNode } from "./dom-suppression.ts";
import {
  collectToastCandidates,
  type ToastCandidate
} from "./toast-detection.ts";
import {
  extractToastContent,
  type ToastContent
} from "./toast-extractor.ts";
import { ToastQueue, type ToastQueueEntry } from "./toast-queue.ts";
import { renderClippyOverlayInto, type ClippyDebugMatch } from "./clippy-overlay.tsx";
import { ensureClippyOverlayStyles } from "./styles.ts";

type ClippyToastPayload = {
  content: ToastContent;
  candidate: ToastCandidate;
  suppressedAt: number;
};

const DISPLAY_DURATION_MS = 5000;
const MAX_DEBUG_MATCHES = 5;

export function ClippyController() {
  const settings = {
    enabled: true,
    interceptionMode: "aggressive" as const,
    showDebugPanel: false
  };

  const queueRef = useRef(new ToastQueue<ClippyToastPayload>());
  const debugMatchesRef = useRef<ClippyDebugMatch[]>([]);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!settings.enabled || typeof document === "undefined") {
      return;
    }
    ensureClippyOverlayStyles(document);
  }, [settings.enabled]);

  useEffect(() => {
    if (settings.enabled) {
      return;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (typeof document !== "undefined" && document.body) {
      clearSuppressedToastNodes(document.body);
    }
    queueRef.current.clear();
    debugMatchesRef.current = [];
  }, [settings.enabled]);

  useEffect(() => {
    if (!settings.enabled || typeof document === "undefined" || !document.body) {
      return;
    }

    const minScore = 1;
    const overlayContainer = document.createElement("div");
    overlayContainer.setAttribute("data-clippy-overlay-host", "true");
    document.body.appendChild(overlayContainer);

    const renderOverlay = (activeEntry: ToastQueueEntry<ClippyToastPayload> | null) => {
      overlayContainer.dataset.renderCount = String(
        Number(overlayContainer.dataset.renderCount ?? "0") + 1
      );
      overlayContainer.dataset.activeTitle = activeEntry?.value.content.title ?? "";
      overlayContainer.dataset.pendingCount = String(queueRef.current.pending.length);
      renderClippyOverlayInto(overlayContainer, {
        enabled: settings.enabled,
        message: activeEntry?.value.content ?? null,
        pendingCount: queueRef.current.pending.length,
        onDismiss: handleDismiss,
        debug: settings.showDebugPanel,
        debugMatches: debugMatchesRef.current
      });
      overlayContainer.dataset.childCount = String(overlayContainer.childElementCount);
    };

    const syncOverlay = () => {
      const activeEntry = queueRef.current.active;
      renderOverlay(activeEntry);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      if (!activeEntry) {
        return;
      }
      dismissTimerRef.current = setTimeout(() => {
        overlayContainer.dataset.lastDequeueReason = "timer";
        queueRef.current.dequeue();
        overlayContainer.dataset.activeAfterDequeue = queueRef.current.active?.value.content.title ?? "";
        syncOverlay();
      }, DISPLAY_DURATION_MS);
    };

    const handleDismiss = () => {
      overlayContainer.dataset.lastDequeueReason = "dismiss";
      queueRef.current.dequeue();
      overlayContainer.dataset.activeAfterDequeue = queueRef.current.active?.value.content.title ?? "";
      syncOverlay();
    };

    const registerToast = (candidate: ToastCandidate) => {
      if (!candidate.element.isConnected) {
        return;
      }
      const suppression = suppressToastNode(candidate.element);
      if (suppression.alreadyHandled) {
        return;
      }
      const content = extractToastContent(candidate.element);
      const entry = queueRef.current.enqueue({
        content,
        candidate,
        suppressedAt: Date.now()
      });
      overlayContainer.dataset.lastEnqueueTitle = content.title;
      overlayContainer.dataset.queueSize = String(queueRef.current.size);
      overlayContainer.dataset.activeAfterEnqueue = queueRef.current.active?.value.content.title ?? "";
      debugMatchesRef.current = [
        {
          id: entry.id,
          title: content.title,
          score: candidate.score,
          reasons: candidate.reasons,
          source: content.source
        },
        ...debugMatchesRef.current
      ].slice(0, MAX_DEBUG_MATCHES);
      syncOverlay();
    };

    const scanRoot = (root: ParentNode) => {
      const candidates = collectToastCandidates(root, { minScore });
      for (const candidate of candidates.slice(0, 6)) {
        registerToast(candidate);
      }
    };

    const observer = new MutationObserver((records) => {
      const roots = new Set<ParentNode>();
      for (const record of records) {
        if (record.type !== "childList") {
          continue;
        }
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (typeof element.querySelectorAll === "function") {
              roots.add(element);
            }
          }
        }
        if (record.target instanceof Element && record.target !== document.body) {
          roots.add(record.target);
        }
      }
      if (roots.size === 0) {
        return;
      }
      for (const root of roots) {
        scanRoot(root);
      }
    });

    scanRoot(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
    syncOverlay();

    return () => {
      observer.disconnect();
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      overlayContainer.replaceChildren();
      overlayContainer.remove();
    };
  }, [settings.enabled, settings.showDebugPanel]);

  return null;
}
