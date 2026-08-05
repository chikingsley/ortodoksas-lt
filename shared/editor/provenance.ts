import type { JSONContent } from "@tiptap/core";

import type { TiptapDocument } from "../content/article";

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

  return {
    body: { ...body, ...(content ? { content } : {}) },
    changes,
  };
};
