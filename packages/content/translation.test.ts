import { describe, expect, it } from "vitest";
import { getTranslationDisplayState } from "./translation";

describe("getTranslationDisplayState", () => {
  it("keeps source articles labeled as originals", () => {
    expect(
      getTranslationDisplayState({
        kind: "original",
        reviewStatus: "not_required",
      })
    ).toBe("original");
  });

  it("keeps translation provenance visible while review is pending", () => {
    expect(
      getTranslationDisplayState({ kind: "machine", reviewStatus: "pending" })
    ).toBe("automatic");
    expect(
      getTranslationDisplayState({ kind: "human", reviewStatus: "pending" })
    ).toBe("human_draft");
    expect(
      getTranslationDisplayState({
        kind: "human",
        reviewStatus: "changes_requested",
      })
    ).toBe("human_draft");
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
