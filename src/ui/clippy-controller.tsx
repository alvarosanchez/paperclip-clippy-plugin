import { useEffect, useMemo, useRef, useState } from "react";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";

import { SETTINGS_DATA_KEY } from "../plugin.ts";
import {
  DEFAULT_CLIPPY_SETTINGS,
  normalizeClippySettings,
  type ClippySettings
} from "../settings.ts";
import { suppressToastNode } from "./dom-suppression.ts";
import {
  collectToastCandidates,
  type ToastCandidate
} from "./toast-detection.ts";
import {
  extractToastContent,
  type ToastContent
} from "./toast-extractor.ts";
import { ToastQueue, type ToastQueueEntry } from "./toast-queue.ts";
import { ClippyOverlay, type ClippyDebugMatch } from "./clippy-overlay.tsx";
import { ensureClippyOverlayStyles } from "./styles.ts";

type ClippyToastPayload = {
  content: ToastContent;
  candidate: ToastCandidate;
  suppressedAt: number;
};

const DISPLAY_DURATION_MS = 5000;
const MAX_DEBUG_MATCHES = 5;

export function ClippyController() {
  const { data } = usePluginData<ClippySettings>(SETTINGS_DATA_KEY);
  const settings = useMemo(
    () => normalizeClippySettings(data ?? DEFAULT_CLIPPY_SETTINGS),
    [data]
  );

  const queueRef = useRef(new ToastQueue<ClippyToastPayload>());
  const [activeEntry, setActiveEntry] = useState<ToastQueueEntry<ClippyToastPayload> | null>(
    null
  );
  const [pendingEntries, setPendingEntries] = useState<ToastQueueEntry<ClippyToastPayload>[]>(
    []
  );
  const [debugMatches, setDebugMatches] = useState<ClippyDebugMatch[]>([]);
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    ensureClippyOverlayStyles(document);
  }, []);

  useEffect(() => {
    if (settings.enabled) {
      return;
    }
    queueRef.current.clear();
    setActiveEntry(null);
    setPendingEntries([]);
    setDebugMatches([]);
  }, [settings.enabled]);

  useEffect(() => {
    if (!settings.enabled || typeof document === "undefined") {
      return;
    }

    const minScore = settings.interceptionMode === "invasive" ? 0 : 1;

    const updateQueueState = () => {
      setActiveEntry(queueRef.current.active);
      setPendingEntries(queueRef.current.pending);
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
      updateQueueState();
      setDebugMatches((prev) => {
        const next = [
          {
            id: entry.id,
            title: content.title,
            score: candidate.score,
            reasons: candidate.reasons,
            source: content.source
          },
          ...prev
        ];
        return next.slice(0, MAX_DEBUG_MATCHES);
      });
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

    if (document.body) {
      scanRoot(document.body);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [settings.enabled, settings.interceptionMode]);

  useEffect(() => {
    if (!activeEntry) {
      return;
    }
    const timer = setTimeout(() => {
      queueRef.current.dequeue();
      setActiveEntry(queueRef.current.active);
      setPendingEntries(queueRef.current.pending);
    }, DISPLAY_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [activeEntry?.id]);

  const handleDismiss = () => {
    queueRef.current.dequeue();
    setActiveEntry(queueRef.current.active);
    setPendingEntries(queueRef.current.pending);
  };

  return (
    <ClippyOverlay
      enabled={settings.enabled}
      message={activeEntry?.value.content ?? null}
      pendingCount={pendingEntries.length}
      onDismiss={handleDismiss}
      debug={settings.showDebugPanel}
      debugMatches={debugMatches}
    />
  );
}
