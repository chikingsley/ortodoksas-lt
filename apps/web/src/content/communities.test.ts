import { describe, expect, it } from "vitest";
import { worshipCommunities, worshipVerificationNotice } from "./communities";

describe("worship community content", () => {
  it("keeps every active community in the same complete schema", () => {
    expect(worshipCommunities).toHaveLength(8);
    expect(
      new Set(worshipCommunities.map((community) => community.name)).size
    ).toBe(8);

    for (const community of worshipCommunities) {
      expect(community.address.length).toBeGreaterThan(0);
      expect(community.services.length).toBeGreaterThan(0);
      expect(community.contacts.length).toBeGreaterThan(0);
      expect(community.images.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the unverified Elektrėnai listing outside the active directory", () => {
    expect(worshipVerificationNotice.name).toBe("Elektrėnai");
    expect(
      worshipCommunities.some((community) =>
        community.name.includes("Elektrėn")
      )
    ).toBe(false);
  });
});
