import type { TiptapDocument } from "./article";

const translatableAttributeNames = new Set([
  "alt",
  "caption",
  "credit",
  "sourceAlt",
  "sourceCaption",
  "title",
]);

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
  const segments = [source.title];
  if (source.summary.length > 0) {
    segments.push(source.summary);
  }
  collectNodeText(source.body, segments);
  return segments;
};

export const applyArticleTranslations = (
  source: ArticleTranslationSource,
  translations: readonly string[]
): ArticleTranslationResult => {
  const expected = getArticleTranslationSegments(source);
  if (expected.length !== translations.length) {
    throw new Error(
      `Translation segment count mismatch: expected ${expected.length}, received ${translations.length}`
    );
  }

  const cursor = { index: 0 };
  const title = translations[cursor.index] ?? source.title;
  cursor.index += 1;
  const summary = source.summary.length
    ? (translations[cursor.index] ?? source.summary)
    : "";
  if (source.summary.length) {
    cursor.index += 1;
  }
  const body = replaceNodeText(
    source.body,
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
