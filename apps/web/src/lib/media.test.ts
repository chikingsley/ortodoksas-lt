import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { localizeMediaHtml, localizeMediaUrl } from "./media";

const originalVideo = "http://lrt-podcasts.data.lt/video2014/LAI15528.mp4";
const recoveredVideo =
  "/media/files/0ce819c3c94edde5ff30361c023aa177e08a6e700ebc8643e8c161acd8d9480b.mp4";

describe("localizeMediaHtml", () => {
  it("preserves stable D1 media routes in article figures and heroes", () => {
    const source = "/api/media/media_example";
    const localized = localizeMediaHtml(
      `<img alt="Example" src="${source}" srcset="${source}?width=320 320w, ${source}?width=640 640w">`
    );

    expect(localized).toContain(`src="${source}"`);
    expect(localized).toContain(`${source}?width=640 640w`);
    expect(localized).not.toContain("archive-media-unavailable");
    expect(localizeMediaUrl(source)).toBe(source);
  });

  it("rewrites recovered video sources and their fallback links", () => {
    const html = `<video controls><source src="${originalVideo}" type="video/mp4"></video><a href="${originalVideo}">Video</a>`;

    const localized = localizeMediaHtml(html);

    expect(localized).toContain(`src="${recoveredVideo}"`);
    expect(localized).toContain(`href="${recoveredVideo}"`);
  });

  it("renders every queued unresolved body image as a recovery card", () => {
    const queue = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "public/media/unresolved.json"),
        "utf8"
      )
    ) as { issues: Array<{ originalUrl: string }> };

    expect(Array.isArray(queue.issues)).toBe(true);
    for (const issue of queue.issues) {
      const localized = localizeMediaHtml(
        `<img src="${issue.originalUrl}" alt="Archive evidence">`
      );
      expect(localized).toContain('class="archive-media-unavailable"');
      expect(localized).toContain('aria-label="Vaizdas nepasiekiamas"');
      expect(localized).toContain("data-original-src=");
    }
  });

  it("removes the click target for a known unavailable media link", () => {
    const queue = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "public/media/unresolved.json"),
        "utf8"
      )
    ) as { issues: Array<{ originalUrl: string }> };
    const source = queue.issues[0]?.originalUrl;
    expect(source).toBeTruthy();
    const localized = localizeMediaHtml(
      `<a href="${source}">Original image</a>`
    );
    expect(localized).toContain("archive-link-unavailable");
    expect(localized).toContain("Nuoroda nepasiekiama");
    expect(localized).not.toContain(`<a href="${source}"`);
  });

  it("removes the click target for a confirmed dead external link", () => {
    const links = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "public/media/unavailable-links.json"),
        "utf8"
      )
    ) as { urls: string[] };
    const [source] = links.urls;
    const localized = localizeMediaHtml(
      `<p><a href="${source}">Source</a></p>`
    );
    expect(localized).toContain("archive-link-unavailable");
    expect(localized).toContain("Nuoroda nepasiekiama");
    expect(localized).not.toContain(`<a href="${source}"`);
  });
});
