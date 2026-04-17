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
  root: Document | Element,
  options?: { minScore?: number }
): ToastCandidate[] {
  const document = getDocument(root);
  const candidates = new Map<Element, ToastCandidate>();
  const minScore = options?.minScore ?? 1;

  for (const element of document.querySelectorAll(CANDIDATE_SELECTORS)) {
    if (isHandledToast(element)) {
      continue;
    }
    const { score, reasons } = collectToastCandidateScore(element);
    if (score < minScore) {
      continue;
    }
    candidates.set(element, { element, score, reasons });
  }

  return Array.from(candidates.values()).sort((a, b) => b.score - a.score);
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

function getDocument(root: Document | Element): Document {
  if ("nodeType" in root && root.nodeType === 9) {
    return root as Document;
  }
  return root.ownerDocument ?? (root as Element).ownerDocument;
}
