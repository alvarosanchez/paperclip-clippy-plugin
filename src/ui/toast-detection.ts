export type ToastCandidate = {
  element: Element;
  score: number;
  reasons: string[];
};

export const HANDLED_TOAST_ATTR = "data-clippy-toast-handled";

const ROLE_SCORES = new Map<string, number>([
  ["status", 3],
  ["alert", 3]
]);

const HINT_SCORES: Array<{ hint: string; score: number }> = [
  { hint: "toast", score: 2 },
  { hint: "notification", score: 2 },
  { hint: "sonner", score: 2 },
  { hint: "snackbar", score: 1 }
];

const CANDIDATE_SELECTORS = [
  '[role="status"]',
  '[role="alert"]',
  '[class*="toast" i]',
  '[class*="notification" i]',
  '[class*="sonner" i]',
  '[class*="snackbar" i]',
  "[aria-live] ol > li",
  "[aria-live] ul > li",
  "[data-toast]",
  "[data-notification]",
  "[data-sonner]",
  "[data-snackbar]"
].join(",");
const TOAST_CONTAINER_HINTS = ["toast", "notification", "sonner", "snackbar"];
const FRAGMENT_HINTS = ["title", "body", "content", "close", "dismiss", "action", "button", "icon"];

export function scoreToastCandidate(element: Element): number {
  return collectToastCandidateScore(element).score;
}

export function collectToastCandidateScore(element: Element): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  const role = element.getAttribute("role")?.toLowerCase();
  if (role && ROLE_SCORES.has(role)) {
    score += ROLE_SCORES.get(role) ?? 0;
    reasons.push(`role:${role}`);
  }

  const liveRegion = element.closest("[aria-live]");
  const ariaLive = liveRegion?.getAttribute("aria-live")?.toLowerCase();
  const hintSources = collectHintSources(element);
  if (liveRegion && ariaLive !== "off") {
    if (hintSources.some((source) => TOAST_CONTAINER_HINTS.some((hint) => source.includes(hint)))) {
      score += 1;
      reasons.push("aria-live");
    }
  }
  for (const { hint, score: hintScore } of HINT_SCORES) {
    if (hintSources.some((source) => source.includes(hint))) {
      score += hintScore;
      reasons.push(`hint:${hint}`);
    }
  }

  if (isLiveRegionToastListItem(element)) {
    score += 3;
    reasons.push("structure:live-region-list-item");
  }

  return { score, reasons };
}

export function collectToastCandidates(
  root: ParentNode,
  options?: { minScore?: number }
): ToastCandidate[] {
  const candidates = new Map<Element, ToastCandidate>();
  const minScore = options?.minScore ?? 1;
  const searchRoots = collectSearchRoots(root);

  for (const searchRoot of searchRoots) {
    for (const element of searchRoot.querySelectorAll(CANDIDATE_SELECTORS)) {
      const canonical = canonicalizeToastContainer(element, minScore);
      if (!canonical || isWeakFragment(canonical, minScore)) {
        continue;
      }
      considerCandidate(canonical, candidates, minScore);
    }
  }

  const filtered = Array.from(candidates.values()).filter((candidate) => {
    return !hasCandidateAncestor(candidate.element, candidates);
  });

  return filtered.sort((a, b) => b.score - a.score);
}

export function isHandledToast(element: Element): boolean {
  return element.hasAttribute(HANDLED_TOAST_ATTR);
}

function collectHintSources(element: Element): string[] {
  const sources: string[] = [];
  const className = typeof element.className === "string" ? element.className : "";
  if (className) {
    sources.push(className.toLowerCase());
  }
  if (element.id) {
    sources.push(element.id.toLowerCase());
  }
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.startsWith("data-") || attr.name === "aria-label") {
      sources.push(`${attr.name.toLowerCase()}=${attr.value.toLowerCase()}`);
    }
  }
  return sources;
}

function collectSearchRoots(root: ParentNode): ParentNode[] {
  const roots: ParentNode[] = [root];
  if (isDocument(root)) {
    for (const node of Array.from(root.querySelectorAll("*"))) {
      const shadowRoot = (node as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
      if (shadowRoot && isParentNode(shadowRoot)) {
        roots.push(shadowRoot);
      }
    }
    return roots;
  }
  if (isElement(root)) {
    const shadowRoot = root.shadowRoot;
    if (shadowRoot && isParentNode(shadowRoot)) {
      roots.push(shadowRoot);
    }
  }
  return roots;
}

function canonicalizeToastContainer(element: Element, minScore: number): Element | null {
  let current: Element | null = element;
  let best: Element | null = null;
  while (current) {
    if (looksLikeToastContainer(current, minScore)) {
      best = current;
    }
    current = getComposedParent(current);
  }
  return best;
}

function hasCandidateAncestor(
  element: Element,
  candidates: Map<Element, ToastCandidate>
): boolean {
  let current: Element | null = element.parentElement;
  while (current) {
    if (candidates.has(current)) {
      return true;
    }
    current = current.parentElement;
  }
  let rootNode: Node | null = element.getRootNode();
  while (rootNode && isShadowRoot(rootNode)) {
    const host: Element = rootNode.host;
    if (candidates.has(host)) {
      return true;
    }
    rootNode = host.getRootNode();
  }
  return false;
}

function isParentNode(root: unknown): root is ParentNode {
  return Boolean(root) && typeof (root as ParentNode).querySelectorAll === "function";
}

function isDocument(root: ParentNode): root is Document {
  return (root as Document).nodeType === 9;
}

function isElement(root: ParentNode): root is Element {
  return (root as Element).nodeType === 1;
}

function considerCandidate(
  element: Element,
  candidates: Map<Element, ToastCandidate>,
  minScore: number
): void {
  if (isClippedAccessibilityLiveRegion(element)) {
    return;
  }
  if (isHandledToast(element)) {
    return;
  }
  const { score, reasons } = collectToastCandidateScore(element);
  if (score < minScore) {
    return;
  }
  const existing = candidates.get(element);
  if (!existing || score > existing.score) {
    candidates.set(element, { element, score, reasons });
  }
}

function isShadowRoot(root: unknown): root is ShadowRoot {
  return Boolean(root && typeof (root as ShadowRoot).host !== "undefined");
}

function looksLikeToastContainer(element: Element, minScore: number): boolean {
  if (element.matches(CANDIDATE_SELECTORS)) {
    return true;
  }
  return collectToastCandidateScore(element).score >= minScore;
}

function isLiveRegionToastListItem(element: Element): boolean {
  if (element.tagName !== "LI") {
    return false;
  }

  const list = element.parentElement;
  if (!list || (list.tagName !== "OL" && list.tagName !== "UL")) {
    return false;
  }

  const liveRegion = list.closest("[aria-live]");
  const ariaLive = liveRegion?.getAttribute("aria-live")?.toLowerCase();
  if (!liveRegion || ariaLive === "off") {
    return false;
  }

  const paragraphCount = element.querySelectorAll("p").length;
  const hasDismissButton = Array.from(element.querySelectorAll("button,[role=\"button\"]")).some(
    (button) => {
      return collectHintSources(button).some((source) => {
        return source.includes("dismiss") || source.includes("close");
      });
    }
  );

  return paragraphCount >= 2 || hasDismissButton;
}

function isClippedAccessibilityLiveRegion(element: Element): boolean {
  const role = element.getAttribute("role")?.toLowerCase();
  const ariaLive = element.getAttribute("aria-live")?.toLowerCase();
  if (role !== "status" && role !== "alert" && !ariaLive) {
    return false;
  }

  if (!("style" in element)) {
    return false;
  }

  const style = (element as HTMLElement).style;
  const clip = normalizeStyleValue(style.getPropertyValue("clip"));
  const clipPath = normalizeStyleValue(style.getPropertyValue("clip-path"));
  const width = normalizeStyleValue(style.getPropertyValue("width"));
  const height = normalizeStyleValue(style.getPropertyValue("height"));
  const overflow = normalizeStyleValue(style.getPropertyValue("overflow"));
  const whiteSpace = normalizeStyleValue(style.getPropertyValue("white-space"));
  const position = normalizeStyleValue(style.getPropertyValue("position"));

  const isClipped = clip === "rect(0px, 0px, 0px, 0px)" || clipPath === "inset(100%)";
  const isScreenReaderSized = width === "1px" && height === "1px" && overflow === "hidden";
  const isScreenReaderPositioned = position === "fixed" || position === "absolute";

  return isClipped && isScreenReaderSized && (isScreenReaderPositioned || whiteSpace === "nowrap");
}

function getComposedParent(element: Element): Element | null {
  if (element.parentElement) {
    return element.parentElement;
  }
  const root = element.getRootNode();
  if (isShadowRoot(root)) {
    return root.host;
  }
  return null;
}

function isWeakFragment(element: Element, minScore: number): boolean {
  if (collectToastCandidateScore(element).score >= minScore + 2) {
    return false;
  }
  if (element.hasAttribute("role") || element.hasAttribute("aria-live")) {
    return false;
  }
  const sources = collectHintSources(element);
  const hasToastHint = sources.some((source) =>
    TOAST_CONTAINER_HINTS.some((hint) => source.includes(hint))
  );
  if (!hasToastHint) {
    return true;
  }
  return sources.some((source) => FRAGMENT_HINTS.some((hint) => source.includes(hint)));
}

function normalizeStyleValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
