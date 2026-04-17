export type ToastContent = {
  title: string;
  body: string | null;
  source: "structured" | "flattened";
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
const BODY_SELECTORS = ["p", "[data-body]", "[data-toast-body]"];
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

  if (!title && !body) {
    return null;
  }

  if (title && body) {
    return { title, body, source: "structured" };
  }

  if (title) {
    return { title, body: null, source: "structured" };
  }

  return { title: body ?? "", body: null, source: "structured" };
}

function findFirstText(element: Element, selectors: string[]): string | null {
  for (const selector of selectors) {
    const candidate = element.querySelector(selector);
    if (!candidate) {
      continue;
    }
    const text = flattenText(candidate);
    if (text) {
      return text;
    }
  }
  return null;
}

function flattenText(element: Element): string {
  const sanitized = element.cloneNode(true) as Element;
  for (const excluded of Array.from(sanitized.querySelectorAll(EXCLUDE_SELECTORS))) {
    excluded.remove();
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
