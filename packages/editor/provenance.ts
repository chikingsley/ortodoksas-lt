import type { JSONContent } from "@tiptap/core";

import type { TiptapDocument } from "@ortodoksas-lt/content/article";

export interface ContentChange {
  afterValue: string | null;
  beforeValue: string | null;
  changeKind: "added" | "changed" | "removed";
  fieldPath: string;
  provenance: "generated" | "manual" | "normalized";
}

type FieldProvenance = "generated" | "manual" | "missing" | "source";

const textContent = (node: JSONContent | undefined): string =>
  node?.content?.map((child) => child.text ?? textContent(child)).join("") ??
  "";

const comparableNode = (node: JSONContent | undefined): JSONContent | null => {
  if (!node) {
    return null;
  }
  const attrs = { ...node.attrs };
  delete attrs.altProvenance;
  delete attrs.captionProvenance;
  delete attrs.sourceAlt;
  delete attrs.sourceCaption;
  return {
    ...node,
    ...(Object.keys(attrs).length > 0 ? { attrs } : { attrs: undefined }),
    ...(node.content
      ? { content: node.content.map((child) => comparableNode(child) ?? child) }
      : {}),
  };
};

const nodeValue = (node: JSONContent | undefined): string => {
  if (!node) {
    return "";
  }
  const text = textContent(node).trim();
  return text || JSON.stringify(comparableNode(node));
};

export const getChangeKind = (
  beforeValue: string,
  afterValue: string
): ContentChange["changeKind"] => {
  if (!beforeValue) {
    return "added";
  }
  return afterValue ? "changed" : "removed";
};

const valueChange = (
  beforeValue: string,
  afterValue: string,
  fieldPath: string,
  provenance: ContentChange["provenance"]
): ContentChange | null => {
  if (beforeValue === afterValue) {
    return null;
  }
  return {
    afterValue: afterValue || null,
    beforeValue: beforeValue || null,
    changeKind: getChangeKind(beforeValue, afterValue),
    fieldPath,
    provenance,
  };
};

const getFieldProvenance = (
  explicit: unknown,
  change: ContentChange | null,
  value: string
): FieldProvenance => {
  if (explicit === "generated") {
    return "generated";
  }
  if (change) {
    return "manual";
  }
  return value ? "source" : "missing";
};

const annotateFigure = (
  node: JSONContent,
  sourceFigure: JSONContent | undefined,
  figureIndex: number,
  changes: ContentChange[]
): JSONContent => {
  const sourceCaption = textContent(sourceFigure);
  const caption = textContent(node);
  const sourceAlt = String(sourceFigure?.attrs?.alt ?? "");
  const alt = String(node.attrs?.alt ?? "");
  const captionChange = valueChange(
    sourceCaption,
    caption,
    `body.figure[${figureIndex}].caption`,
    "manual"
  );
  const altChange = valueChange(
    sourceAlt,
    alt,
    `body.figure[${figureIndex}].alt`,
    "manual"
  );
  if (captionChange) {
    changes.push(captionChange);
  }
  if (altChange) {
    changes.push(altChange);
  }
  const sourceSrc = String(sourceFigure?.attrs?.src ?? "");
  const src = String(node.attrs?.src ?? "");
  const sourceChange = valueChange(
    sourceSrc,
    src,
    `body.figure[${figureIndex}].source`,
    "manual"
  );
  if (sourceChange) {
    changes.push(sourceChange);
  }
  return {
    ...node,
    attrs: {
      ...node.attrs,
      altProvenance: getFieldProvenance(
        node.attrs?.altProvenance,
        altChange,
        alt
      ),
      captionProvenance: getFieldProvenance(
        node.attrs?.captionProvenance,
        captionChange,
        caption
      ),
      sourceAlt,
      sourceCaption,
    },
  };
};

export const annotateArticleBody = (
  body: TiptapDocument,
  baseline: TiptapDocument
): { body: TiptapDocument; changes: ContentChange[] } => {
  const baselineFigures =
    baseline.content?.filter((node) => node.type === "figure") ?? [];
  let figureIndex = 0;
  const changes: ContentChange[] = [];
  const content = body.content?.map((node) => {
    if (node.type !== "figure") {
      return node;
    }
    const annotated = annotateFigure(
      node,
      baselineFigures[figureIndex],
      figureIndex,
      changes
    );
    figureIndex += 1;
    return annotated;
  });

  const currentBlocks = content ?? [];
  const baselineBlocks = baseline.content ?? [];
  const blockCount = Math.max(currentBlocks.length, baselineBlocks.length);
  for (let index = 0; index < blockCount; index += 1) {
    const current = currentBlocks[index];
    const source = baselineBlocks[index];
    if (current?.type === "figure" && source?.type === "figure") {
      continue;
    }
    const beforeValue = nodeValue(source);
    const afterValue = nodeValue(current);
    const structurallyEqual =
      JSON.stringify(comparableNode(source)) ===
      JSON.stringify(comparableNode(current));
    if (!structurallyEqual) {
      changes.push({
        afterValue: afterValue || null,
        beforeValue: beforeValue || null,
        changeKind: getChangeKind(beforeValue, afterValue),
        fieldPath: `body.block[${index}]`,
        provenance: "manual",
      });
    }
  }

  return {
    body: { ...body, ...(content ? { content } : {}) },
    changes,
  };
};
