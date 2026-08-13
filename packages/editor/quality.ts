import type { JSONContent } from "@tiptap/core";

interface ArticleQualityInput {
  body: JSONContent;
  language?: string;
  summary: string;
  title: string;
  translationSource?: {
    body: JSONContent;
    language: string;
    summary: string;
    title: string;
  };
}

const ATTACHED_BYLINE_PATTERN = /^—\S/u;
const COMPLETE_SENTENCE_PATTERN = /[.!?…][”’"']?$/u;
const PLACEHOLDER_PATTERN =
  /\b(?:lorem ipsum|placeholder|tbd|todo)\b|\[(?:insert|image|caption)[^\]]*\]/iu;
const TRUNCATED_TEXT_PATTERN = /(?:\.\.\.|…)$/u;
const SENTENCE_DASH_PATTERN = /—|\s[–-]\s/gu;
const EM_DASH_PATTERN = /—/gu;
const getNodeText = (node: JSONContent): string =>
  node.text ?? (node.content ?? []).map(getNodeText).join("");

const countMatches = (value: string, pattern: RegExp): number =>
  [...value.matchAll(pattern)].length;

const getTranslationFidelityIssues = (
  translated: Pick<
    ArticleQualityInput,
    "body" | "language" | "summary" | "title"
  >,
  source: NonNullable<ArticleQualityInput["translationSource"]>
): string[] => {
  const translatedFields = [
    translated.title,
    translated.summary,
    ...(translated.body.content ?? []).map(getNodeText),
  ];
  const sourceFields = [
    source.title,
    source.summary,
    ...(source.body.content ?? []).map(getNodeText),
  ];
  const introducedDashCount = translatedFields.reduce(
    (total, field, index) =>
      total +
      Math.max(
        0,
        countMatches(field, SENTENCE_DASH_PATTERN) -
          countMatches(sourceFields[index] ?? "", SENTENCE_DASH_PATTERN)
      ),
    0
  );
  const issues: string[] = [];

  if (introducedDashCount > 0) {
    issues.push(
      `Review ${introducedDashCount} sentence dash${introducedDashCount === 1 ? "" : "es"} introduced beyond the aligned ${source.language.toUpperCase()} source fields.`
    );
  }
  if (translated.language === "uk") {
    const translatedText = translatedFields.join("\n");
    const emDashCount = countMatches(translatedText, EM_DASH_PATTERN);
    if (emDashCount > 0) {
      issues.push(
        `Replace ${emDashCount} Ukrainian em dash${emDashCount === 1 ? " with an en dash" : "es with en dashes"}.`
      );
    }
  }
  return issues;
};

const hasRepeatedHardBreaks = (node: JSONContent): boolean => {
  let previousWasBreak = false;
  for (const child of node.content ?? []) {
    if (child.type === "hardBreak") {
      if (previousWasBreak) {
        return true;
      }
      previousWasBreak = true;
    } else {
      previousWasBreak = false;
    }
  }
  return false;
};

const isCaptionLikeParagraph = (node: JSONContent): boolean => {
  if (node.type !== "paragraph" || node.attrs?.textAlign !== "center") {
    return false;
  }
  const textNodes = (node.content ?? []).filter(
    (child) => child.type === "text"
  );
  return (
    textNodes.length > 0 &&
    textNodes.every((child) =>
      child.marks?.some((mark) => mark.type === "italic")
    )
  );
};

const getSummaryIssues = (summary: string): string[] => {
  const normalizedSummary = summary.trim();
  if (!normalizedSummary) {
    return ["Add a complete editorial summary."];
  }
  if (TRUNCATED_TEXT_PATTERN.test(normalizedSummary)) {
    return ["Replace the truncated summary."];
  }
  if (!COMPLETE_SENTENCE_PATTERN.test(normalizedSummary)) {
    return ["Finish the summary with sentence punctuation."];
  }
  return [];
};

const getFigureIssues = (
  node: JSONContent,
  index: number,
  seenSources: Set<string>
): string[] => {
  const issues: string[] = [];
  const src = typeof node.attrs?.src === "string" ? node.attrs.src.trim() : "";
  const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.trim() : "";

  if (!src) {
    issues.push(`Add an image source to figure ${index + 1}.`);
  }
  if (!alt) {
    issues.push(`Add alternative text to figure ${index + 1}.`);
  }
  if (src && seenSources.has(src)) {
    issues.push(`Remove duplicated figure ${index + 1}.`);
  }
  if (src) {
    seenSources.add(src);
  }
  return issues;
};

const getNodeIssues = (
  node: JSONContent,
  index: number,
  nodes: JSONContent[],
  seenSources: Set<string>
): string[] => {
  const issues: string[] = [];
  const text = getNodeText(node).trim();

  if (node.type === "paragraph" && !text) {
    issues.push(`Remove empty paragraph ${index + 1}.`);
  }
  if (hasRepeatedHardBreaks(node)) {
    issues.push(`Replace repeated line breaks in block ${index + 1}.`);
  }
  if (node.type === "figure") {
    issues.push(...getFigureIssues(node, index, seenSources));
  }
  if (isCaptionLikeParagraph(node)) {
    issues.push(`Attach caption-like paragraph ${index + 1} to its image.`);
  }
  if (node.type === "heading" && !text) {
    issues.push(`Write text for heading ${index + 1}.`);
  }
  if (node.type === "heading" && node.attrs?.level === 1) {
    issues.push(`Use the article title instead of body heading ${index + 1}.`);
  }
  if (
    node.type === "horizontalRule" &&
    nodes[index - 1]?.type === "horizontalRule"
  ) {
    issues.push(`Remove repeated divider ${index + 1}.`);
  }
  if (node.type === "paragraph" && ATTACHED_BYLINE_PATTERN.test(text)) {
    issues.push(`Separate the byline in paragraph ${index + 1}.`);
  }
  if (text && PLACEHOLDER_PATTERN.test(text)) {
    issues.push(`Replace placeholder text in block ${index + 1}.`);
  }
  const previousText = nodes[index - 1]
    ? getNodeText(nodes[index - 1]).trim()
    : "";
  if (
    node.type !== "figure" &&
    node.type === nodes[index - 1]?.type &&
    text.length >= 20 &&
    text === previousText
  ) {
    issues.push(`Remove duplicated block ${index + 1}.`);
  }
  return issues;
};

export const getArticleQualityIssues = ({
  body,
  language,
  summary,
  title,
  translationSource,
}: ArticleQualityInput): string[] => {
  const issues = getSummaryIssues(summary);
  const nodes = body.content ?? [];
  const hasSubstantiveMedia = nodes.some((node) => {
    if (node.type === "youtube") {
      return typeof node.attrs?.src === "string" && node.attrs.src.length > 0;
    }
    if (node.type === "figure") {
      return typeof node.attrs?.src === "string" && node.attrs.src.length > 0;
    }
    return false;
  });

  if (!title.trim()) {
    issues.push("Add an article title.");
  }
  if (
    nodes.length === 0 ||
    (!hasSubstantiveMedia && nodes.every((node) => !getNodeText(node).trim()))
  ) {
    issues.push("Add article body text.");
  }
  if (
    nodes[0]?.type === "horizontalRule" ||
    nodes.at(-1)?.type === "horizontalRule"
  ) {
    issues.push(
      "Move the opening or closing divider inside the article structure."
    );
  }

  const seenFigureSources = new Set<string>();
  for (const [index, node] of nodes.entries()) {
    issues.push(...getNodeIssues(node, index, nodes, seenFigureSources));
  }

  if (translationSource) {
    issues.push(
      ...getTranslationFidelityIssues(
        { body, language, summary, title },
        translationSource
      )
    );
  }

  return [...new Set(issues)];
};
