import { describe, expect, it } from "vitest";
import { structureClergyHtml } from "./clergy-html";

describe("clergy page HTML", () => {
  it("groups clergy copy with the portrait that precedes it", () => {
    const html = [
      "<p>Introduction</p>",
      '<figure data-media-id="one"><img src="one.jpg"></figure>',
      "<h2>Kancleris</h2><h2>Kun. One</h2><p>Biography</p><hr>",
      '<figure data-media-id="two"><img src="two.jpg"></figure>',
      "<h2>Kun. Two</h2><p>Biography</p>",
    ].join("");
    const result = structureClergyHtml(html);

    expect(result.introductionHtml).toBe("<p>Introduction</p>");
    expect(result.profiles).toHaveLength(2);
    expect(result.profiles[0]?.detailsHtml).toContain(
      '<h2 class="clergy-role">Kancleris</h2>'
    );
    expect(result.profiles[0]?.detailsHtml).toContain(
      '<h2 class="clergy-name">Kun. One</h2>'
    );
    expect(result.profiles[1]?.detailsHtml).toContain(
      '<h2 class="clergy-name">Kun. Two</h2>'
    );
  });

  it("promotes an inline bold profile name to the shared name heading", () => {
    const result = structureClergyHtml(
      '<p>Introduction</p><figure><img src="bishop.jpg"></figure><p><strong>Jo Ekselencija Panaretas</strong> – Tamiso vyskupas.</p>'
    );

    expect(result.profiles[0]?.detailsHtml).toBe(
      '<h2 class="clergy-name">Jo Ekselencija Panaretas</h2><p>Tamiso vyskupas.</p>'
    );
  });
});
