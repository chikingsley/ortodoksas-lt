import { describe, expect, it } from "vitest";
import { cleanHtml, hasLeadFigure } from "./publication";

describe("cleanHtml", () => {
  it("promotes a standalone bold subheading to a semantic heading", () => {
    expect(
      cleanHtml("<p><strong>Article section</strong></p><p>Body</p>")
    ).toBe("<h2>Article section</h2><p>Body</p>");
  });

  it("preserves canonical privacy-enhanced YouTube frames", () => {
    const frame =
      '<div data-youtube-video=""><iframe class="article-youtube" loading="lazy" src="https://www.youtube-nocookie.com/embed/urfnIUXAddM?rel=1"></iframe></div>';

    expect(cleanHtml(frame)).toBe(frame);
  });

  it("removes untrusted frames and event handlers", () => {
    expect(
      cleanHtml(
        '<iframe src="https://example.com/embed"></iframe><p onclick="alert(1)">Body</p>'
      )
    ).toBe("<p>Body</p>");
  });

  it("suppresses a body figure already presented as the article hero", () => {
    expect(
      cleanHtml(
        '<figure data-media-id="media_lead"><img alt="Lead" src="/api/media/media_lead"></figure><p>Body</p>',
        { hero: "/media/files/lead.jpg", heroMediaId: "media_lead" }
      )
    ).toBe("<p>Body</p>");
  });
});

describe("hasLeadFigure", () => {
  it("recognizes a canonical lead figure", () => {
    expect(
      hasLeadFigure(
        '<figure class="article-figure" data-figure-role="lead"><img src="/poster.png"></figure>'
      )
    ).toBe(true);
    expect(
      hasLeadFigure(
        '<figure class="article-figure" data-figure-role="content"><img src="/photo.png"></figure>'
      )
    ).toBe(true);
    expect(
      hasLeadFigure(
        '<p>Introduction</p><figure class="article-figure" data-figure-role="content"><img src="/photo.png"></figure>'
      )
    ).toBe(false);
  });
});
