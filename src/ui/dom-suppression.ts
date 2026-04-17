import { HANDLED_TOAST_ATTR } from "./toast-detection.ts";

export const SUPPRESSED_TOAST_ATTR = "data-clippy-toast-suppressed";
export const SUPPRESSED_TOAST_TOKEN_ATTR = "data-clippy-toast-suppressed-token";
export const SUPPRESSED_TOAST_AT_ATTR = "data-clippy-toast-suppressed-at";
const PREV_DISPLAY_ATTR = "data-clippy-toast-prev-display";
const PREV_DISPLAY_PRIORITY_ATTR = "data-clippy-toast-prev-display-priority";
const PREV_VISIBILITY_ATTR = "data-clippy-toast-prev-visibility";
const PREV_VISIBILITY_PRIORITY_ATTR = "data-clippy-toast-prev-visibility-priority";
const PREV_POINTER_EVENTS_ATTR = "data-clippy-toast-prev-pointer-events";
const PREV_POINTER_EVENTS_PRIORITY_ATTR = "data-clippy-toast-prev-pointer-events-priority";
const PREV_ARIA_HIDDEN_ATTR = "data-clippy-toast-prev-aria-hidden";
const PREV_HANDLED_ATTR = "data-clippy-toast-prev-handled";
const UNSET_VALUE = "__clippy_unset__";

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
  const existingToken =
    element.getAttribute(SUPPRESSED_TOAST_TOKEN_ATTR) ??
    element.getAttribute(HANDLED_TOAST_ATTR);
  const alreadySuppressed = element.getAttribute(SUPPRESSED_TOAST_ATTR) === "true";
  let token = options?.token ?? existingToken ?? createSuppressionToken(now);
  if (alreadySuppressed && existingToken) {
    token = existingToken;
  }
  const alreadyHandled = element.hasAttribute(HANDLED_TOAST_ATTR);

  if (!(alreadySuppressed && existingToken && existingToken === token)) {
    persistOriginalState(element);
    element.setAttribute(HANDLED_TOAST_ATTR, token);
    element.setAttribute(SUPPRESSED_TOAST_ATTR, "true");
    element.setAttribute(SUPPRESSED_TOAST_TOKEN_ATTR, token);
    element.setAttribute(SUPPRESSED_TOAST_AT_ATTR, String(now()));
    hideElement(element);
  }

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
  restoreOriginalState(element);
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

function persistOriginalState(element: Element): void {
  storeAttrIfMissing(
    element,
    PREV_HANDLED_ATTR,
    element.getAttribute(HANDLED_TOAST_ATTR) ?? UNSET_VALUE
  );
  if ("style" in element) {
    const style = (element as HTMLElement).style;
    storeAttrIfMissing(
      element,
      PREV_DISPLAY_ATTR,
      normalizeStyleValue(style.getPropertyValue("display"))
    );
    storeAttrIfMissing(
      element,
      PREV_DISPLAY_PRIORITY_ATTR,
      normalizeStylePriority(style.getPropertyPriority("display"))
    );
    storeAttrIfMissing(
      element,
      PREV_VISIBILITY_ATTR,
      normalizeStyleValue(style.getPropertyValue("visibility"))
    );
    storeAttrIfMissing(
      element,
      PREV_VISIBILITY_PRIORITY_ATTR,
      normalizeStylePriority(style.getPropertyPriority("visibility"))
    );
    storeAttrIfMissing(
      element,
      PREV_POINTER_EVENTS_ATTR,
      normalizeStyleValue(style.getPropertyValue("pointer-events"))
    );
    storeAttrIfMissing(
      element,
      PREV_POINTER_EVENTS_PRIORITY_ATTR,
      normalizeStylePriority(style.getPropertyPriority("pointer-events"))
    );
  }

  const ariaHidden = element.getAttribute("aria-hidden");
  storeAttrIfMissing(element, PREV_ARIA_HIDDEN_ATTR, ariaHidden ?? UNSET_VALUE);
}

function restoreOriginalState(element: Element): void {
  if ("style" in element) {
    const style = (element as HTMLElement).style;
    restoreStyleProperty(
      style,
      "display",
      element.getAttribute(PREV_DISPLAY_ATTR),
      element.getAttribute(PREV_DISPLAY_PRIORITY_ATTR)
    );
    restoreStyleProperty(
      style,
      "visibility",
      element.getAttribute(PREV_VISIBILITY_ATTR),
      element.getAttribute(PREV_VISIBILITY_PRIORITY_ATTR)
    );
    restoreStyleProperty(
      style,
      "pointer-events",
      element.getAttribute(PREV_POINTER_EVENTS_ATTR),
      element.getAttribute(PREV_POINTER_EVENTS_PRIORITY_ATTR)
    );
  }

  const prevAriaHidden = element.getAttribute(PREV_ARIA_HIDDEN_ATTR);
  if (prevAriaHidden !== null) {
    if (prevAriaHidden === UNSET_VALUE) {
      element.removeAttribute("aria-hidden");
    } else {
      element.setAttribute("aria-hidden", prevAriaHidden);
    }
  }

  const prevHandled = element.getAttribute(PREV_HANDLED_ATTR);
  if (prevHandled !== null) {
    if (prevHandled === UNSET_VALUE) {
      element.removeAttribute(HANDLED_TOAST_ATTR);
    } else {
      element.setAttribute(HANDLED_TOAST_ATTR, prevHandled);
    }
  }

  element.removeAttribute(PREV_DISPLAY_ATTR);
  element.removeAttribute(PREV_DISPLAY_PRIORITY_ATTR);
  element.removeAttribute(PREV_VISIBILITY_ATTR);
  element.removeAttribute(PREV_VISIBILITY_PRIORITY_ATTR);
  element.removeAttribute(PREV_POINTER_EVENTS_ATTR);
  element.removeAttribute(PREV_POINTER_EVENTS_PRIORITY_ATTR);
  element.removeAttribute(PREV_ARIA_HIDDEN_ATTR);
  element.removeAttribute(PREV_HANDLED_ATTR);
}

function restoreStyleProperty(
  style: CSSStyleDeclaration,
  name: string,
  value: string | null,
  priority: string | null
): void {
  if (value === null) {
    return;
  }
  if (value === UNSET_VALUE) {
    style.removeProperty(name);
  } else {
    style.setProperty(name, value, priority === UNSET_VALUE || !priority ? "" : priority);
  }
}

function normalizeStyleValue(value: string): string {
  return value === "" ? UNSET_VALUE : value;
}

function normalizeStylePriority(value: string): string {
  return value === "" ? UNSET_VALUE : value;
}

function storeAttrIfMissing(element: Element, name: string, value: string): void {
  if (!element.hasAttribute(name)) {
    element.setAttribute(name, value);
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
