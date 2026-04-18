export type ToastContent = {
  title: string;
  body: string | null;
  source: "structured" | "flattened";
};

type TextCandidate = {
  element: Element;
  text: string;
};

const TITLE_SELECTORS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "[data-title]",
  "[data-toast-title]"
];
const BODY_SELECTORS = ["[data-body]", "[data-toast-body]"];
const PARAGRAPH_SELECTOR = "p";
const EXCLUDE_SELECTORS = [
  "[aria-hidden=\"true\"]",
  "[hidden]",
  "[data-hidden=\"true\"]",
  "[data-dismiss]",
  "[data-close]",
  "[data-toast-close]",
  "[data-toast-dismiss]",
  "[data-action=\"close\"]",
  "button",
  "[role=\"button\"]",
  "svg",
  "path"
].join(",");

export function extractToastContent(element: Element): ToastContent {
  const structured = extractStructuredContent(element);
  if (structured) {
    return structured;
  }

  const flattened = flattenText(element);
  return {
    title: flattened || "Paperclip has something to say",
    body: flattened ? null : "I noticed a notification and decided to help.",
    source: "flattened"
  };
}

function extractStructuredContent(element: Element): ToastContent | null {
  const title = findFirstText(element, TITLE_SELECTORS);
  const body = findFirstText(element, BODY_SELECTORS);
  const paragraphs = findAllText(element, [PARAGRAPH_SELECTOR]);

  if (!title && !body && paragraphs.length === 0) {
    return null;
  }

  if (title && body) {
    return { title: title.text, body: body.text, source: "structured" };
  }

  if (title) {
    const paragraphBody = paragraphs.find((paragraph) => paragraph.element !== title.element);
    return {
      title: title.text,
      body: body?.element === title.element ? paragraphBody?.text ?? null : body?.text ?? paragraphBody?.text ?? null,
      source: "structured"
    };
  }

  if (paragraphs.length >= 2) {
    return {
      title: paragraphs[0].text,
      body: paragraphs[1].text,
      source: "structured"
    };
  }

  if (body) {
    return { title: body.text, body: null, source: "structured" };
  }

  return { title: paragraphs[0]?.text ?? "", body: null, source: "structured" };
}

function findFirstText(element: Element, selectors: string[]): TextCandidate | null {
  for (const selector of selectors) {
    const candidate = element.querySelector(selector);
    if (!candidate) {
      continue;
    }
    const text = flattenText(candidate);
    if (text) {
      return { element: candidate, text };
    }
  }
  return null;
}

function findAllText(element: Element, selectors: string[]): TextCandidate[] {
  const matches: TextCandidate[] = [];
  for (const selector of selectors) {
    for (const candidate of Array.from(element.querySelectorAll(selector))) {
      const text = flattenText(candidate);
      if (text) {
        matches.push({ element: candidate, text });
      }
    }
  }
  return matches;
}

function flattenText(element: Element): string {
  const sanitized = element.cloneNode(true) as Element;
  for (const excluded of Array.from(sanitized.querySelectorAll(EXCLUDE_SELECTORS))) {
    excluded.remove();
  }
  if (sanitized.matches(EXCLUDE_SELECTORS)) {
    return "";
  }
  const doc = element.ownerDocument;
  const defaultView = doc?.defaultView;
  const nodeFilter = defaultView?.NodeFilter;
  if (!doc || !nodeFilter) {
    return normalizeWhitespace(sanitized.textContent ?? "");
  }

  const walker = doc.createTreeWalker(sanitized, nodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  let node = walker.nextNode();
  while (node) {
    const value = normalizeWhitespace(node.nodeValue ?? "");
    if (value) {
      parts.push(value);
    }
    node = walker.nextNode();
  }

  return normalizeWhitespace(parts.join(" "));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
