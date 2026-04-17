import { HANDLED_TOAST_ATTR } from "./toast-detection.ts";

export const SUPPRESSED_TOAST_ATTR = "data-clippy-toast-suppressed";
export const SUPPRESSED_TOAST_TOKEN_ATTR = "data-clippy-toast-suppressed-token";
export const SUPPRESSED_TOAST_AT_ATTR = "data-clippy-toast-suppressed-at";

const DEFAULT_RELEASE_AFTER_MS = 15000;
const releaseTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

export type SuppressionOptions = {
  token?: string;
  now?: () => number;
  releaseAfterMs?: number;
};

export type SuppressionResult = {
  element: Element;
  token: string;
  alreadyHandled: boolean;
};

export function suppressToastNode(
  element: Element,
  options?: SuppressionOptions
): SuppressionResult {
  const now = options?.now ?? Date.now;
  const token = options?.token ?? createSuppressionToken(now);
  const alreadyHandled = element.hasAttribute(HANDLED_TOAST_ATTR);

  element.setAttribute(HANDLED_TOAST_ATTR, token);
  element.setAttribute(SUPPRESSED_TOAST_ATTR, "true");
  element.setAttribute(SUPPRESSED_TOAST_TOKEN_ATTR, token);
  element.setAttribute(SUPPRESSED_TOAST_AT_ATTR, String(now()));
  hideElement(element);

  const releaseAfterMs = options?.releaseAfterMs ?? DEFAULT_RELEASE_AFTER_MS;
  scheduleReleaseOnDisconnect(element, releaseAfterMs);

  return { element, token, alreadyHandled };
}

export function suppressToastNodes(
  elements: Iterable<Element>,
  options?: SuppressionOptions
): SuppressionResult[] {
  const results: SuppressionResult[] = [];
  for (const element of elements) {
    results.push(suppressToastNode(element, options));
  }
  return results;
}

export function clearToastSuppression(element: Element): void {
  element.removeAttribute(HANDLED_TOAST_ATTR);
  element.removeAttribute(SUPPRESSED_TOAST_ATTR);
  element.removeAttribute(SUPPRESSED_TOAST_TOKEN_ATTR);
  element.removeAttribute(SUPPRESSED_TOAST_AT_ATTR);
  if ("style" in element) {
    const style = (element as HTMLElement).style;
    style.removeProperty("display");
    style.removeProperty("visibility");
    style.removeProperty("pointer-events");
  }
}

export function createSuppressionToken(now: () => number = Date.now): string {
  return `clippy-${now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function hideElement(element: Element): void {
  if ("style" in element) {
    const style = (element as HTMLElement).style;
    style.setProperty("display", "none", "important");
    style.setProperty("visibility", "hidden", "important");
    style.setProperty("pointer-events", "none", "important");
  } else {
    element.setAttribute("aria-hidden", "true");
  }
}

function scheduleReleaseOnDisconnect(element: Element, releaseAfterMs: number): void {
  if (releaseAfterMs <= 0) {
    return;
  }
  const existing = releaseTimers.get(element);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    if (!element.isConnected) {
      clearToastSuppression(element);
    }
  }, releaseAfterMs);
  releaseTimers.set(element, timer);
}
