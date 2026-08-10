import { canonicalizeTiptapDocument } from "@ortodoksas-lt/editor/canonicalize";
import { getArticleQualityIssues } from "@ortodoksas-lt/editor/quality";
import { renderArticleBody } from "@ortodoksas-lt/editor/render";
import { describe, expect, it } from "vitest";

describe("canonical article content", () => {
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

  it("flags structural issues before publication", () => {
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

  it("keeps distinct figures that share an editorial caption", () => {
    const issues = getArticleQualityIssues({
      body: {
        content: [
          {
            attrs: { alt: "First icon", src: "https://example.com/one.jpg" },
            content: [
              { text: "Photographs from the celebration.", type: "text" },
            ],
            type: "figure",
          },
          {
            attrs: { alt: "Second icon", src: "https://example.com/two.jpg" },
            content: [
              { text: "Photographs from the celebration.", type: "text" },
            ],
            type: "figure",
          },
        ],
        type: "doc",
      },
      summary: "Celebration photographs.",
      title: "Celebration",
    });

    expect(issues).not.toContain("Remove duplicated block 2.");
    expect(issues).not.toContain("Remove duplicated figure 2.");
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

  it("renders canonical YouTube posts through the privacy-enhanced player", () => {
    const body = {
      content: [
        {
          attrs: {
            height: 360,
            src: "https://www.youtube.com/watch?v=urfnIUXAddM",
            width: 640,
          },
          type: "youtube",
        },
      ],
      type: "doc",
    };
    const html = renderArticleBody(body);
    const issues = getArticleQualityIssues({
      body,
      summary: "Velyknakčio vaizdo įrašas.",
      title: "Velyknaktis",
    });

    expect(html).toContain("youtube-nocookie.com/embed/urfnIUXAddM");
    expect(html).toContain('class="article-youtube"');
    expect(issues).not.toContain("Add article body text.");
  });
});
