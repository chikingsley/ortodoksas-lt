import { hasText } from "@ortodoksas-lt/content/value";
import type { JSONContent } from "@tiptap/core";
import { z } from "zod";

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

export interface ArticleTranslationSource {
  body: TiptapDocument;
  summary: string;
  title: string;
}

export interface ArticleTranslationResult extends ArticleTranslationSource {
  characterCount: number;
}

const getLinkedSourceEditionCue = (value: JSONContent): string | undefined => {
  if (value.type !== "paragraph") {
    return;
  }

  const content = value.content ?? [];
  let hasLink = false;
  let text = "";

  for (const child of content) {
    if (child.type === "hardBreak") {
      continue;
    }

    if (child.type !== "text" || child.text === undefined) {
      return;
    }

    text += child.text;

    if (child.marks?.some((mark) => mark.type === "link") === true) {
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

    if (hasText(cue)) {
      removedCues.push(cue);

      return false;
    }

    return true;
  });

  let { summary } = source;

  for (const cue of removedCues) {
    summary = stripLeadingCue(summary, cue);
  }

  summary = summary.trim();

  return {
    body: {
      ...source.body,
      content: normalizedContent,
    },
    summary,
    title: source.title,
  };
};

const translatableText = z.string().min(1);

function collectNodeText(value: JSONContent, output: string[]): void {
  if (hasText(value.text)) {
    output.push(value.text);
  }

  for (const [name, attribute] of Object.entries(value.attrs ?? {})) {
    if (!translatableAttributeNames.has(name)) {
      continue;
    }

    const text = translatableText.safeParse(attribute);

    if (text.success) {
      output.push(text.data);
    }
  }

  for (const child of value.content ?? []) {
    collectNodeText(child, output);
  }
}

function replaceNodeText(
  value: JSONContent,
  translations: readonly string[],
  cursor: { index: number }
): JSONContent {
  const result = { ...value };

  if (hasText(value.text)) {
    result.text = translations[cursor.index] ?? value.text;
    cursor.index += 1;
  }

  if (value.attrs !== undefined) {
    result.attrs = { ...value.attrs };

    for (const [name, attribute] of Object.entries(value.attrs)) {
      if (!translatableAttributeNames.has(name)) {
        continue;
      }

      const text = translatableText.safeParse(attribute);

      if (text.success) {
        result.attrs[name] = translations[cursor.index] ?? text.data;
        cursor.index += 1;
      }
    }
  }

  if (value.content !== undefined) {
    result.content = value.content.map((child) =>
      replaceNodeText(child, translations, cursor)
    );
  }

  return result;
}

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

  const body: TiptapDocument = {
    ...replaceNodeText(normalized.body, translations, cursor),
    type: "doc",
  };

  return {
    body,
    characterCount: expected.reduce((total, value) => total + value.length, 0),
    summary,
    title,
  };
};
