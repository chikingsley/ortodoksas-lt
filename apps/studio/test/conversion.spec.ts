import { generateJSON } from "@tiptap/html/server";
import { DOMParser as LinkedomDOMParser } from "linkedom";
import { describe, expect, it } from "vitest";
import { resolveRecoveredMediaUrl } from "../shared/content/media-url";
import { canonicalizeTiptapDocument } from "../shared/editor/canonicalize";
import { articleContentExtensions } from "../shared/editor/extensions";
import { getArticleQualityIssues } from "../shared/editor/quality";
import { renderArticleBody } from "../shared/editor/render";
import { convertLegacyArticle } from "../src/editorial/convert-legacy-article";
import { normalizeLegacyHtml } from "../src/editorial/normalize-legacy-html";

Object.defineProperty(globalThis, "DOMParser", {
  configurable: true,
  value: LinkedomDOMParser,
});

describe("convertLegacyHtml", () => {
  it("keeps editorial structure and removes Blogger chrome", () => {
    const result = normalizeLegacyHtml(`
      <div class="post-body"><h2>Heading</h2><p>First <strong>paragraph</strong>.</p></div>
      <div class="blogger-post-footer">Share this post</div>
      <script>alert('x')</script>
    `);

    expect(result.normalizedHtml).toContain("<h2>Heading</h2>");
    expect(result.normalizedHtml).toContain("<strong>paragraph</strong>");
    expect(result.normalizedHtml).not.toContain("Share this post");
    const body = generateJSON(result.normalizedHtml, articleContentExtensions);
    expect(body.type).toBe("doc");
  });

  it("turns image layout tables into inspectable content", () => {
    const result = normalizeLegacyHtml(`
      <table><tbody><tr><td><img data-src="https://example.com/church.jpg" alt="Church"></td></tr>
      <tr><td>Church caption</td></tr></tbody></table>
    `);

    expect(result.images).toEqual([
      {
        alt: "Church",
        sourceUrl: "https://example.com/church.jpg",
        state: "pending_import",
      },
    ]);
    expect(result.normalizedHtml).toContain("Church caption");
    expect(result.warnings).toContain(
      "A legacy table was flattened for visual inspection."
    );
  });

  it("removes tracking pixels and unsafe links", () => {
    const result = normalizeLegacyHtml(`
      <p><a href="javascript:alert(1)">Unsafe</a></p>
      <img src="https://example.com/pixel.gif" width="1" height="1">
    `);

    expect(result.images).toHaveLength(0);
    expect(result.normalizedHtml).toContain("Unsafe");
    expect(result.normalizedHtml).not.toContain("javascript:");
    expect(result.warnings[0]).toContain("Unsafe link removed");
  });

  it("removes spacer paragraphs and splits double breaks into real paragraphs", () => {
    const result = convertLegacyArticle(`
      <p><br><br></p>
      <p>First paragraph.<br><br><strong>Section heading</strong></p>
      <p><br>Second paragraph.<br></p>
    `);
    const paragraphs = result.body.content?.filter(
      (node) => node.type === "paragraph"
    );

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs?.[0]?.content?.[0]).toMatchObject({
      text: "First paragraph.",
    });
    expect(paragraphs?.[1]?.content?.[0]).toMatchObject({
      text: "Section heading",
    });
    expect(paragraphs?.[2]?.content?.[0]).toMatchObject({
      text: "Second paragraph.",
    });
  });

  it("keeps intentional single hard breaks inside a paragraph", () => {
    const body = canonicalizeTiptapDocument({
      content: [
        {
          content: [
            { text: "Line one", type: "text" },
            { type: "hardBreak" },
            { text: "Line two", type: "text" },
          ],
          type: "paragraph",
        },
      ],
      type: "doc",
    });

    expect(body.content?.[0]?.content).toHaveLength(3);
  });

  it("keeps the lead image once when the body repeats the catalog hero", () => {
    const result = convertLegacyArticle(
      '<img src="https://example.com/photo.jpg=w300-h400" alt=""><p>Body.</p>',
      "https://example.com/photo.jpg=w1200-h630"
    );

    expect(result.body.content?.[0]?.type).toBe("paragraph");
    expect(result.images).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("recovers full-size Blogger media from archived image URLs", () => {
    expect(
      resolveRecoveredMediaUrl(
        "https://web.archive.org/web/20260715123224im_/https://blogger.googleusercontent.com/img/b/example/s320/church.jpg"
      )
    ).toBe("https://blogger.googleusercontent.com/img/b/example/s0/church.jpg");
    expect(
      resolveRecoveredMediaUrl(
        "https://web.archive.org/web/20260715123224im_/https://blogger.googleusercontent.com/img/a/example=w300-h400"
      )
    ).toBe("https://blogger.googleusercontent.com/img/a/example");
  });

  it("converts imported images into semantic figures", () => {
    const result = convertLegacyArticle(
      '<p>Opening.</p><img src="https://example.com/church.jpg" alt="Church">'
    );
    const figure = result.body.content?.[1];

    expect(figure).toMatchObject({
      attrs: {
        alt: "Church",
        src: "https://example.com/church.jpg",
      },
      type: "figure",
    });
  });

  it("flags structural slop before publication", () => {
    const issues = getArticleQualityIssues({
      body: {
        content: [
          { type: "paragraph" },
          {
            attrs: { alt: "", src: "https://example.com/church.jpg" },
            type: "figure",
          },
        ],
        type: "doc",
      },
      summary: "Truncated...",
      title: "Article",
    });

    expect(issues).toContain("Replace the truncated summary.");
    expect(issues).toContain("Remove empty paragraph 1.");
    expect(issues).toContain("Add alternative text to figure 2.");
    expect(issues).toContain("Add a caption to figure 2.");
  });

  it("flags placeholder copy and duplicated blocks before publication", () => {
    const duplicatedParagraph = {
      content: [{ text: "This entire paragraph appears twice.", type: "text" }],
      type: "paragraph",
    };
    const issues = getArticleQualityIssues({
      body: {
        content: [
          duplicatedParagraph,
          duplicatedParagraph,
          {
            content: [{ text: "TODO: replace this copy.", type: "text" }],
            type: "paragraph",
          },
        ],
        type: "doc",
      },
      summary: "A complete summary.",
      title: "Article",
    });

    expect(issues).toContain("Remove duplicated block 2.");
    expect(issues).toContain("Replace placeholder text in block 3.");
  });

  it("renders a figure with its caption, credit, and alternative text", () => {
    const html = renderArticleBody({
      content: [
        {
          attrs: {
            alt: "Stone church beneath a blue sky",
            credit: "Archive photograph",
            role: "content",
            src: "https://example.com/church.jpg",
          },
          content: [{ text: "The parish church.", type: "text" }],
          type: "figure",
        },
      ],
      type: "doc",
    });

    expect(html).toContain("<figure");
    expect(html).toContain("<figcaption>The parish church.</figcaption>");
    expect(html).toContain('alt="Stone church beneath a blue sky"');
    expect(html).toContain("Archive photograph");
  });
});
