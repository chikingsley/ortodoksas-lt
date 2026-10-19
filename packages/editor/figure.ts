import { figureAttributesSchema } from "@ortodoksas-lt/content/media";
import { hasText } from "@ortodoksas-lt/content/value";
import { Node } from "@tiptap/core";

export interface FigureAttributes {
  alt?: string;
  altProvenance?: "generated" | "manual" | "missing" | "source";
  caption?: string;
  captionProvenance?: "generated" | "manual" | "missing" | "source";
  credit?: string;
  height?: number | null;
  mediaId?: string | null;
  role?: "content" | "lead";
  sourceAlt?: string;
  sourceCaption?: string;
  src: string;
  title?: string | null;
  width?: number | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figure: {
      setFigure: (attributes: FigureAttributes) => ReturnType;
    };
  }
}

function imageDimension(image: Element | null, name: "height" | "width") {
  const value = image?.getAttribute(name);

  return hasText(value) ? Math.trunc(Number(value)) : null;
}

function readFigureMetadata(element: HTMLElement) {
  return {
    altProvenance: element.dataset.altProvenance ?? "missing",
    captionProvenance: element.dataset.captionProvenance ?? "missing",
    credit:
      element.dataset.credit ??
      element.querySelector("[data-figure-credit]")?.textContent?.trim() ??
      "",
    mediaId: element.dataset.mediaId,
    role: element.dataset.figureRole === "lead" ? "lead" : "content",
    sourceAlt: element.dataset.sourceAlt ?? "",
    sourceCaption: element.dataset.sourceCaption ?? "",
  };
}

const readImageAttributes = (element: HTMLElement) => {
  const image =
    element.tagName === "IMG" ? element : element.querySelector("img");

  return {
    ...readFigureMetadata(element),
    alt: image?.getAttribute("alt") ?? "",
    height: imageDimension(image, "height"),
    src: image?.getAttribute("src") ?? "",
    title: image?.getAttribute("title"),
    width: imageDimension(image, "width"),
  };
};

export const Figure = Node.create({
  addAttributes() {
    return {
      alt: { default: "" },
      altProvenance: { default: "missing" },
      captionProvenance: { default: "missing" },
      credit: { default: "" },
      height: { default: null },
      mediaId: { default: null },
      role: { default: "content" },
      sourceAlt: { default: "" },
      sourceCaption: { default: "" },
      src: { default: "" },
      title: { default: null },
      width: { default: null },
    };
  },

  addCommands() {
    return {
      setFigure:
        ({ caption = "", ...attributes }) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: attributes,
            content: caption ? [{ text: caption, type: "text" }] : [],
            type: this.name,
          }),
    };
  },
  content: "inline*",
  defining: true,
  draggable: true,
  group: "block",
  isolating: true,
  name: "figure",

  parseHTML() {
    return [
      {
        contentElement: "figcaption",
        getAttrs: readImageAttributes,
        tag: "figure",
      },
      {
        getAttrs: readImageAttributes,
        tag: "img[src]",
      },
    ];
  },
  priority: 110,

  renderHTML({ node }) {
    const {
      alt,
      altProvenance,
      captionProvenance,
      credit,
      height,
      mediaId,
      role,
      sourceAlt,
      sourceCaption,
      src,
      title,
      width,
    } = figureAttributesSchema.parse(node.attrs);

    const imageAttributes = {
      alt,
      height: height ?? undefined,
      sizes: hasText(mediaId) ? "(max-width: 720px) 100vw, 720px" : undefined,
      src,
      srcset: hasText(mediaId)
        ? [320, 640, 960, 1280, 1600]
            .map(
              (responsiveWidth) =>
                `/api/media/${mediaId}?width=${responsiveWidth} ${responsiveWidth}w`
            )
            .join(", ")
        : undefined,
      title: hasText(title) ? title : undefined,
      width: width ?? undefined,
    };

    return [
      "figure",
      {
        class: "article-figure",
        "data-alt-provenance": altProvenance,
        "data-caption-provenance": captionProvenance,
        "data-credit": hasText(credit) ? credit : undefined,
        "data-figure-role": role,
        "data-media-id": hasText(mediaId) ? mediaId : undefined,
        "data-source-alt": hasText(sourceAlt) ? sourceAlt : undefined,
        "data-source-caption": hasText(sourceCaption)
          ? sourceCaption
          : undefined,
      },
      ["img", imageAttributes],
      ["figcaption", 0],
      ...(credit
        ? [
            [
              "p",
              { class: "article-figure-credit", "data-figure-credit": "" },
              credit,
            ],
          ]
        : []),
    ];
  },
});
