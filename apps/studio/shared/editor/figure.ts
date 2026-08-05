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

interface ParsedElement {
  getAttribute: (name: string) => string | null;
  querySelector: (selector: string) => ParsedElement | null;
  tagName: string;
  textContent?: string | null;
}

const readImageAttributes = (value: unknown) => {
  const element = value as ParsedElement;
  const image =
    element.tagName === "IMG" ? element : element.querySelector("img");

  return {
    alt: image?.getAttribute("alt") ?? "",
    altProvenance: element.getAttribute("data-alt-provenance") ?? "missing",
    captionProvenance:
      element.getAttribute("data-caption-provenance") ?? "missing",
    credit:
      element.getAttribute("data-credit") ??
      element.querySelector("[data-figure-credit]")?.textContent?.trim() ??
      "",
    height: image?.getAttribute("height")
      ? Number.parseInt(image.getAttribute("height") ?? "", 10)
      : null,
    mediaId: element.getAttribute("data-media-id"),
    role:
      element.getAttribute("data-figure-role") === "lead" ? "lead" : "content",
    sourceAlt: element.getAttribute("data-source-alt") ?? "",
    sourceCaption: element.getAttribute("data-source-caption") ?? "",
    src: image?.getAttribute("src") ?? "",
    title: image?.getAttribute("title"),
    width: image?.getAttribute("width")
      ? Number.parseInt(image.getAttribute("width") ?? "", 10)
      : null,
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
    } = node.attrs;
    const imageAttributes = {
      alt,
      ...(height ? { height } : {}),
      ...(mediaId
        ? {
            sizes: "(max-width: 720px) 100vw, 720px",
            srcset: [320, 640, 960, 1280, 1600]
              .map(
                (responsiveWidth) =>
                  `/api/media/${mediaId}?width=${responsiveWidth} ${responsiveWidth}w`
              )
              .join(", "),
          }
        : {}),
      src,
      ...(title ? { title } : {}),
      ...(width ? { width } : {}),
    };

    return [
      "figure",
      {
        class: "article-figure",
        "data-alt-provenance": altProvenance,
        "data-caption-provenance": captionProvenance,
        "data-credit": credit || undefined,
        "data-figure-role": role,
        "data-media-id": mediaId || undefined,
        "data-source-alt": sourceAlt || undefined,
        "data-source-caption": sourceCaption || undefined,
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
