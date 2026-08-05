import {
  isBloggerMediaUrl,
  resolveRecoveredMediaUrl,
} from "../../shared/content/media-url";

const INVISIBLE_IMAGE_SIZE = 2;
const EMPTY_SPACE_PATTERN = /^[\s\u00a0]*$/;
const REPEATED_SPACE_PATTERN = /[\t\u00a0 ]+/g;
const REPEATED_BREAK_PATTERN = /(?:<br\s*\/?>\s*){3,}/gi;
const SAFE_LINK_PATTERN = /^(?:https?:|mailto:|tel:|\/|#)/i;

const DISCARDED_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "form",
  "input",
  "button",
  ".blogger-post-footer",
  ".post-share-buttons",
  ".post-icons",
  "[aria-hidden='true']",
];

export interface ConvertedImage {
  alt: string;
  sourceUrl: string;
  state: "pending_import";
}

export interface NormalizedLegacyArticle {
  images: ConvertedImage[];
  normalizedHtml: string;
  warnings: string[];
}

const createParagraph = (document: Document, text: string): HTMLElement => {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
};

const normalizeImage = (
  image: HTMLImageElement,
  images: ConvertedImage[],
  warnings: string[]
): void => {
  const imageUrl =
    image.getAttribute("src") ??
    image.getAttribute("data-src") ??
    image.getAttribute("data-original") ??
    "";
  const linkedUrl = image.closest("a")?.getAttribute("href")?.trim() ?? "";
  const sourceUrl = resolveRecoveredMediaUrl(
    isBloggerMediaUrl(linkedUrl) ? linkedUrl : imageUrl
  );
  const width = Number.parseInt(image.getAttribute("width") ?? "", 10);
  const height = Number.parseInt(image.getAttribute("height") ?? "", 10);
  const isTrackingPixel =
    (Number.isFinite(width) && width <= INVISIBLE_IMAGE_SIZE) ||
    (Number.isFinite(height) && height <= INVISIBLE_IMAGE_SIZE);

  if (!imageUrl || isTrackingPixel) {
    image.remove();
    return;
  }

  const alt = image.getAttribute("alt")?.trim() ?? "";
  image.replaceChildren();
  for (const attribute of [...image.attributes]) {
    image.removeAttribute(attribute.name);
  }
  image.setAttribute("src", sourceUrl);
  image.setAttribute("alt", alt);
  images.push({ alt, sourceUrl, state: "pending_import" });
  if (!alt) {
    warnings.push(`Image needs alternative text: ${sourceUrl}`);
  }
};

const flattenLayoutTable = (table: HTMLTableElement): void => {
  const { ownerDocument } = table;
  const replacement = ownerDocument.createElement("div");
  const images = [...table.querySelectorAll("img")];
  const text = table.textContent?.replace(REPEATED_SPACE_PATTERN, " ").trim();

  for (const image of images) {
    replacement.append(image.cloneNode(true));
  }
  if (text) {
    replacement.append(createParagraph(ownerDocument, text));
  }
  table.replaceWith(replacement);
};

const unwrapPresentationalContainers = (body: HTMLElement): void => {
  const containers = [...body.querySelectorAll("center, font")];
  for (const container of containers) {
    container.replaceWith(...container.childNodes);
  }
};

const removeEmptyElements = (body: HTMLElement): void => {
  const candidates = [...body.querySelectorAll("div, p, span")].reverse();
  for (const candidate of candidates) {
    const hasMedia = candidate.querySelector("img, video, audio") !== null;
    if (!hasMedia && EMPTY_SPACE_PATTERN.test(candidate.textContent ?? "")) {
      candidate.remove();
    }
  }
};

export const normalizeLegacyHtml = (
  sourceHtml: string
): NormalizedLegacyArticle => {
  const document = new DOMParser().parseFromString(
    `<!doctype html><html><body>${sourceHtml}</body></html>`,
    "text/html"
  );
  const { body } = document;
  const warnings: string[] = [];
  const images: ConvertedImage[] = [];

  for (const selector of DISCARDED_SELECTORS) {
    for (const element of [...body.querySelectorAll(selector)]) {
      element.remove();
    }
  }

  for (const anchor of [...body.querySelectorAll("a")]) {
    const href = anchor.getAttribute("href")?.trim() ?? "";
    if (href && !SAFE_LINK_PATTERN.test(href)) {
      anchor.removeAttribute("href");
      warnings.push(`Unsafe link removed: ${href}`);
    }
  }

  for (const image of [...body.querySelectorAll("img")]) {
    normalizeImage(image, images, warnings);
  }

  for (const table of [...body.querySelectorAll("table")]) {
    flattenLayoutTable(table);
    warnings.push("A legacy table was flattened for visual inspection.");
  }

  unwrapPresentationalContainers(body);
  removeEmptyElements(body);

  const normalizedHtml = body.innerHTML
    .replace(REPEATED_BREAK_PATTERN, "<br><br>")
    .trim();
  return {
    images,
    normalizedHtml,
    warnings: [...new Set(warnings)],
  };
};
