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
  { hint: "snackbar", score: 1 },
  { hint: "message", score: 1 }
];

const CANDIDATE_SELECTORS = [
  '[role="status"]',
  '[role="alert"]',
  "[aria-live]",
  '[class*="toast" i]',
  '[class*="notification" i]',
  '[class*="sonner" i]',
  "[data-toast]",
  "[data-notification]",
  "[data-sonner]"
].join(",");
const TOAST_CONTAINER_HINTS = ["toast", "notification", "sonner", "snackbar"];
const CONTAINER_TAGS = new Set(["div", "section", "article", "aside"]);

const CHILD_HINTS = [
  "title",
  "body",
  "content",
  "message",
  "label",
  "close",
  "dismiss",
  "action",
  "button",
  "icon"
];

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
  if (liveRegion && ariaLive !== "off") {
    score += 2;
    reasons.push("aria-live");
  }

  const hintSources = collectHintSources(element);
  for (const { hint, score: hintScore } of HINT_SCORES) {
    if (hintSources.some((source) => source.includes(hint))) {
      score += hintScore;
      reasons.push(`hint:${hint}`);
    }
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
      if (isHandledToast(element) || isLikelyChildPiece(element)) {
        continue;
      }
      const { score, reasons } = collectToastCandidateScore(element);
      if (score < minScore) {
        continue;
      }
      const existing = candidates.get(element);
      if (!existing || score > existing.score) {
        candidates.set(element, { element, score, reasons });
      }
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
  for (const node of Array.from(root.querySelectorAll("*"))) {
    const shadowRoot = (node as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    if (shadowRoot && isParentNode(shadowRoot)) {
      roots.push(shadowRoot);
    }
  }

  return roots;
}

function hasCandidateAncestor(element: Element, candidates: Map<Element, ToastCandidate>): boolean {
  let current: Element | null = element.parentElement;
  while (current) {
    if (candidates.has(current)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function isLikelyChildPiece(element: Element): boolean {
  const sources = collectHintSources(element);
  const hasToastHint = sources.some((source) =>
    TOAST_CONTAINER_HINTS.some((hint) => source.includes(hint))
  );
  if (!hasToastHint) {
    return false;
  }

  const hasChildHint = sources.some((source) =>
    CHILD_HINTS.some((hint) => source.includes(hint))
  );
  if (!hasChildHint) {
    return false;
  }

  const isContainerTag = CONTAINER_TAGS.has(element.tagName.toLowerCase());
  if (isContainerTag) {
    return false;
  }

  return true;
}

function isParentNode(root: unknown): root is ParentNode {
  return Boolean(root) && typeof (root as ParentNode).querySelectorAll === "function";
}
