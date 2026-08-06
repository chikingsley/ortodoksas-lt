import type { JSONContent } from "@tiptap/core";

const isHardBreak = (node: JSONContent): boolean => node.type === "hardBreak";

const trimHardBreaks = (content: JSONContent[]): JSONContent[] => {
  let start = 0;
  let end = content.length;
  while (start < end && isHardBreak(content[start])) {
    start += 1;
  }
  while (end > start && isHardBreak(content[end - 1])) {
    end -= 1;
  }
  return content.slice(start, end);
};

const splitParagraph = (node: JSONContent): JSONContent[] => {
  const content = node.content ?? [];
  const groups: JSONContent[][] = [[]];
  let consecutiveBreaks = 0;

  for (const child of content) {
    if (isHardBreak(child)) {
      consecutiveBreaks += 1;
      if (consecutiveBreaks === 1) {
        groups.at(-1)?.push(child);
      }
      if (consecutiveBreaks === 2) {
        groups.at(-1)?.pop();
        groups.push([]);
      }
      continue;
    }
    consecutiveBreaks = 0;
    groups.at(-1)?.push(child);
  }

  return groups
    .map(trimHardBreaks)
    .filter((group) => group.length > 0)
    .map((group) => ({ ...node, content: group }));
};

export const canonicalizeTiptapDocument = (
  document: JSONContent
): JSONContent => {
  const content = (document.content ?? []).flatMap((node) => {
    if (node.type !== "paragraph") {
      return [node];
    }
    return splitParagraph(node);
  });

  return { ...document, content };
};
