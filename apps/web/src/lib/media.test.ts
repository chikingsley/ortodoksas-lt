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
});
