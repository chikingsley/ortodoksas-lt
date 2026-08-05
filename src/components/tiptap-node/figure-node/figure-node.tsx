import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import type { ChangeEvent } from "react";

const readField = (event: ChangeEvent<HTMLInputElement>): string =>
  event.currentTarget.value;

export const FigureNodeView = ({
  node,
  selected,
  updateAttributes,
}: NodeViewProps) => {
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
      data-figure-role={node.attrs.role}
      data-media-id={node.attrs.mediaId ?? undefined}
      data-selected={selected ? "true" : undefined}
    >
      <img
        alt={node.attrs.alt}
        contentEditable={false}
        height={node.attrs.height ?? undefined}
        src={node.attrs.src}
        srcSet={
          node.attrs.mediaId
            ? [320, 640, 960, 1280, 1600]
                .map(
                  (width) =>
                    `/api/media/${node.attrs.mediaId}?width=${width} ${width}w`
                )
                .join(", ")
            : undefined
        }
        title={node.attrs.title ?? undefined}
        width={node.attrs.width ?? undefined}
      />
      <NodeViewContent
        className="article-figure-caption"
        data-placeholder="Add a caption…"
      />
      {node.attrs.credit ? (
        <p className="article-figure-credit" contentEditable={false}>
          {node.attrs.credit}
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
              value={node.attrs.alt}
            />
          </label>
          <p className="article-figure-provenance">
            Alt text: {node.attrs.altProvenance}. Caption:{" "}
            {node.attrs.captionProvenance}.
          </p>
          <label>
            <span>Credit</span>
            <input
              onChange={updateCredit}
              placeholder="Photographer or source"
              type="text"
              value={node.attrs.credit}
            />
          </label>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
};
