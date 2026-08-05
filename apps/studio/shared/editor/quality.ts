import type { JSONContent } from "@tiptap/core";

interface ArticleQualityInput {
  body: JSONContent;
  summary: string;
  title: string;
}

const ATTACHED_BYLINE_PATTERN = /^—\S/u;
const COMPLETE_SENTENCE_PATTERN = /[.!?…][”’"']?$/u;
const PLACEHOLDER_PATTERN =
  /\b(?:lorem ipsum|placeholder|tbd|todo)\b|\[(?:insert|image|caption)[^\]]*\]/iu;
const TRUNCATED_TEXT_PATTERN = /(?:\.\.\.|…)$/u;

const getNodeText = (node: JSONContent): string =>
  node.text ?? (node.content ?? []).map(getNodeText).join("");

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
  if (!getNodeText(node).trim()) {
    issues.push(`Add a caption to figure ${index + 1}.`);
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
  if (node.type === "image") {
    issues.push(
      `Convert legacy image ${index + 1} into a figure with a caption.`
    );
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
  if (text.length >= 20 && text === previousText) {
    issues.push(`Remove duplicated block ${index + 1}.`);
  }
  return issues;
};

export const getArticleQualityIssues = ({
  body,
  summary,
  title,
}: ArticleQualityInput): string[] => {
  const issues = getSummaryIssues(summary);
  const nodes = body.content ?? [];

  if (!title.trim()) {
    issues.push("Add an article title.");
  }
  if (nodes.length === 0 || nodes.every((node) => !getNodeText(node).trim())) {
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

  return [...new Set(issues)];
};
