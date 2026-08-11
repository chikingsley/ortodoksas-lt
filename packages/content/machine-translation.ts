import type { TiptapDocument } from "./article";

const translatableAttributeNames = new Set([
  "alt",
  "caption",
  "credit",
  "sourceAlt",
  "sourceCaption",
  "title",
]);

const sourceEditionCuePattern =
  /^(?:english translation|lietuviškas vertimas|russian translation|русский перевод|ukrainian translation|український переклад|belarusian translation|беларускі пераклад)$/iu;
const trailingCuePunctuationPattern = /[:.]+$/u;
const leadingCueSeparatorPattern = /^\s*[:—–-]?\s*/u;

type JsonRecord = Record<string, unknown>;

export interface ArticleTranslationSource {
  body: TiptapDocument;
  summary: string;
  title: string;
}

export interface ArticleTranslationResult extends ArticleTranslationSource {
  characterCount: number;
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getLinkedSourceEditionCue = (value: unknown): string | undefined => {
  if (!isRecord(value) || value.type !== "paragraph") {
    return;
  }

  const content = Array.isArray(value.content) ? value.content : [];
  let hasLink = false;
  let text = "";

  for (const child of content) {
    if (!isRecord(child)) {
      return;
    }
    if (child.type === "hardBreak") {
      continue;
    }
    if (child.type !== "text" || typeof child.text !== "string") {
      return;
    }
    text += child.text;
    if (
      Array.isArray(child.marks) &&
      child.marks.some((mark) => isRecord(mark) && mark.type === "link")
    ) {
      hasLink = true;
    }
  }

  const cue = text.trim().replace(trailingCuePunctuationPattern, "").trim();
  return hasLink && sourceEditionCuePattern.test(cue) ? cue : undefined;
};

const stripLeadingCue = (value: string, cue: string): string => {
  const prefix = value.slice(0, cue.length);
  if (prefix.localeCompare(cue, undefined, { sensitivity: "accent" }) !== 0) {
    return value;
  }
  return value.slice(cue.length).replace(leadingCueSeparatorPattern, "");
};

export const normalizeArticleTranslationSource = (
  source: ArticleTranslationSource
): ArticleTranslationSource => {
  const content = source.body.content ?? [];
  const removedCues: string[] = [];
  const normalizedContent = content.filter((node) => {
    const cue = getLinkedSourceEditionCue(node);
    if (cue) {
      removedCues.push(cue);
      return false;
    }
    return true;
  });
  const summary = removedCues.reduce(stripLeadingCue, source.summary).trim();

  return {
    body: {
      ...source.body,
      content: normalizedContent,
    },
    summary,
    title: source.title,
  };
};

const collectNodeText = (value: unknown, output: string[]): void => {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNodeText(item, output);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (typeof value.text === "string" && value.text.length > 0) {
    output.push(value.text);
  }
  if (isRecord(value.attrs)) {
    for (const [name, attribute] of Object.entries(value.attrs)) {
      if (
        translatableAttributeNames.has(name) &&
        typeof attribute === "string" &&
        attribute.length > 0
      ) {
        output.push(attribute);
      }
    }
  }
  if (Array.isArray(value.content)) {
    collectNodeText(value.content, output);
  }
};

const replaceNodeText = (
  value: unknown,
  translations: readonly string[],
  cursor: { index: number }
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => replaceNodeText(item, translations, cursor));
  }
  if (!isRecord(value)) {
    return value;
  }

  const result: JsonRecord = { ...value };
  if (typeof value.text === "string" && value.text.length > 0) {
    result.text = translations[cursor.index] ?? value.text;
    cursor.index += 1;
  }
  if (isRecord(value.attrs)) {
    const attrs = { ...value.attrs };
    for (const [name, attribute] of Object.entries(value.attrs)) {
      if (
        translatableAttributeNames.has(name) &&
        typeof attribute === "string" &&
        attribute.length > 0
      ) {
        attrs[name] = translations[cursor.index] ?? attribute;
        cursor.index += 1;
      }
    }
    result.attrs = attrs;
  }
  if (Array.isArray(value.content)) {
    result.content = replaceNodeText(value.content, translations, cursor);
  }
  return result;
};

export const getArticleTranslationSegments = (
  source: ArticleTranslationSource
): string[] => {
  const normalized = normalizeArticleTranslationSource(source);
  const segments = [normalized.title];
  if (normalized.summary.length > 0) {
    segments.push(normalized.summary);
  }
  collectNodeText(normalized.body, segments);
  return segments;
};

export const applyArticleTranslations = (
  source: ArticleTranslationSource,
  translations: readonly string[]
): ArticleTranslationResult => {
  const normalized = normalizeArticleTranslationSource(source);
  const expected = getArticleTranslationSegments(normalized);
  if (expected.length !== translations.length) {
    throw new Error(
      `Translation segment count mismatch: expected ${expected.length}, received ${translations.length}`
    );
  }

  const cursor = { index: 0 };
  const title = translations[cursor.index] ?? normalized.title;
  cursor.index += 1;
  const summary = normalized.summary.length
    ? (translations[cursor.index] ?? normalized.summary)
    : "";
  if (normalized.summary.length) {
    cursor.index += 1;
  }
  const body = replaceNodeText(
    normalized.body,
    translations,
    cursor
  ) as TiptapDocument;

  return {
    body,
    characterCount: expected.reduce((total, value) => total + value.length, 0),
    summary,
    title,
  };
};
