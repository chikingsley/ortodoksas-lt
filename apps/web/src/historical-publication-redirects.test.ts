import { describe, expect, it } from "vitest";
import { getHistoricalPublicationRedirect } from "./historical-publication-redirects";

describe("historical publication redirects", () => {
  it("redirects former canonical article and page URLs to clean paths", () => {
    expect(
      getHistoricalPublicationRedirect("/2026/08/canonical-article.html")
    ).toBe("/2026/08/canonical-article");
    expect(
      getHistoricalPublicationRedirect("/en/p/institutional-page.html")
    ).toBe("/en/p/institutional-page");
  });

  it("maps the twelve noncanonical Blogger aliases to clean destinations", () => {
    const aliases = [
      [
        "/ru/2022/05/blog-post_10.html",
        "/ru/2022/05/pochemu-ya-ne-mogu-nazyvat-kirilla-ottsom",
      ],
      [
        "/ru/2022/05/blog-post_11.html",
        "/ru/2022/05/duhovenstvo-pokidaet-moskovskiy-patriarhat",
      ],
      [
        "/ru/2022/05/blog-post_19.html",
        "/ru/2022/05/pismo-pravoslavnyh-miryan-mitropolitu",
      ],
      [
        "/ru/2022/05/blog-post_50.html",
        "/ru/2022/05/konstantinopolskiy-patriarhat-v-litve",
      ],
      [
        "/ru/2022/07/blog-post.html",
        "/ru/2022/07/v-selyavko-obrashchenie-litovskoy-eparhii-k-prezidentu",
      ],
      [
        "/ru/2022/07/blog-post_27.html",
        "/ru/2022/07/v-selyavko-zachem-litve-yurisdiktsiya-konstantinopolya",
      ],
      ["/uk/2022/05/blog-post.html", "/uk/2022/05/vitayemo"],
      [
        "/uk/2022/05/blog-post_15.html",
        "/uk/2022/05/istoriya-konstantynopolskoho-patriarkhatu-u-lytvi",
      ],
      [
        "/uk/2022/05/blog-post_16.html",
        "/uk/2022/05/serbska-tserkva-vidnovlyuye-spilkuvannya-z-ohridom",
      ],
      [
        "/uk/2022/05/blog-post_18.html",
        "/uk/2022/05/lyst-pravoslavnykh-myrian-lytovskomu-mytropolytu",
      ],
      [
        "/uk/2022/05/blog-post_21.html",
        "/uk/2022/05/posol-lytvy-vidvidav-vselenskyi-patriarkhat",
      ],
      ["/uk/2022/06/22.html", "/uk/2022/06/psalom-22-lytovskoyu"],
    ];

    expect(
      aliases.map(([source]) => getHistoricalPublicationRedirect(source ?? ""))
    ).toEqual(aliases.map(([, destination]) => destination));
  });

  it("leaves canonical, API, media, and unrelated paths untouched", () => {
    expect(
      getHistoricalPublicationRedirect("/2026/08/canonical")
    ).toBeUndefined();
    expect(
      getHistoricalPublicationRedirect("/api/export.html")
    ).toBeUndefined();
    expect(
      getHistoricalPublicationRedirect("/media/files/image.html")
    ).toBeUndefined();
    expect(getHistoricalPublicationRedirect("/document.html")).toBeUndefined();
  });
});
