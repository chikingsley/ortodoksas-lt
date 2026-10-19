import { figureAttributesSchema } from "@ortodoksas-lt/content/media";
import { hasText } from "@ortodoksas-lt/content/value";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { ChangeEvent } from "react";

const readField = (event: ChangeEvent<HTMLInputElement>): string =>
  event.currentTarget.value;

export function FigureNodeView({
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const attributes = figureAttributesSchema.parse(node.attrs);

  const updateAlt = (event: ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ alt: readField(event), altProvenance: "manual" });
  };

  const updateCredit = (event: ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ credit: readField(event) });
  };

  return (
    <NodeViewWrapper
      as="figure"
      className="article-figure"
      data-figure-role={attributes.role}
      data-media-id={attributes.mediaId ?? undefined}
      data-selected={selected ? "true" : undefined}
    >
      <img
        alt={attributes.alt}
        contentEditable={false}
        height={attributes.height ?? undefined}
        src={attributes.src}
        srcSet={
          hasText(attributes.mediaId)
            ? [320, 640, 960, 1280, 1600]
                .map(
                  (width) =>
                    `/api/media/${attributes.mediaId}?width=${width} ${width}w`
                )
                .join(", ")
            : undefined
        }
        title={attributes.title ?? undefined}
        width={attributes.width ?? undefined}
      />
      <NodeViewContent
        className="article-figure-caption"
        data-placeholder="Add a caption…"
      />
      {hasText(attributes.credit) ? (
        <p className="article-figure-credit" contentEditable={false}>
          {attributes.credit}
        </p>
      ) : null}
      {selected ? (
        <div className="article-figure-fields" contentEditable={false}>
          <label>
            <span>Alternative text</span>
            <input
              onChange={updateAlt}
              placeholder="Describe what is visible"
              type="text"
              value={attributes.alt}
            />
          </label>
          <p className="text-muted-foreground text-xs">
            Alt text: {attributes.altProvenance}. Caption:{" "}
            {attributes.captionProvenance}.
          </p>
          <label>
            <span>Credit</span>
            <input
              onChange={updateCredit}
              placeholder="Photographer or source"
              type="text"
              value={attributes.credit}
            />
          </label>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}
