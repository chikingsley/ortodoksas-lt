import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { localizeMediaHtml } from "./media";

const originalVideo = "http://lrt-podcasts.data.lt/video2014/LAI15528.mp4";
const recoveredVideo =
  "/media/files/0ce819c3c94edde5ff30361c023aa177e08a6e700ebc8643e8c161acd8d9480b.mp4";

describe("localizeMediaHtml", () => {
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
      expect(localized).toContain('aria-label="Archyvo vaizdas atkuriamas"');
      expect(localized).toContain("data-original-src=");
    }
  });
});
