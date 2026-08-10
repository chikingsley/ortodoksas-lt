import { getTranslationDisplayState } from "@ortodoksas-lt/content/translation";
import { describe, expect, it } from "vitest";

describe("getTranslationDisplayState", () => {
  it("keeps source articles labeled as originals", () => {
    expect(
      getTranslationDisplayState({
        kind: "original",
        reviewStatus: "not_required",
      })
    ).toBe("original");
  });

  it("labels pending machine translations as automatic", () => {
    expect(
      getTranslationDisplayState({ kind: "machine", reviewStatus: "pending" })
    ).toBe("automatic");
  });

  it("labels approved translations as editor reviewed", () => {
    expect(
      getTranslationDisplayState({ kind: "machine", reviewStatus: "approved" })
    ).toBe("editor_reviewed");
    expect(
      getTranslationDisplayState({ kind: "human", reviewStatus: "approved" })
    ).toBe("editor_reviewed");
  });
});
