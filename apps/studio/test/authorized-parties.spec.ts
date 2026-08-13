import { describe, expect, it } from "vitest";

import { parseAuthorizedParties } from "../src/server/authorized-parties";

describe("Clerk authorized parties", () => {
  it("normalizes and deduplicates configured origins", () => {
    expect(
      parseAuthorizedParties(
        "http://localhost:5173/, https://studio.example, http://localhost:5173"
      )
    ).toEqual(["http://localhost:5173", "https://studio.example"]);
  });

  it("requires an explicit origin list", () => {
    expect(() => parseAuthorizedParties(undefined)).toThrow(
      "CLERK_AUTHORIZED_PARTIES requires at least one origin"
    );
  });

  it("rejects paths and unsupported protocols", () => {
    expect(() => parseAuthorizedParties("https://studio.example/path")).toThrow(
      "CLERK_AUTHORIZED_PARTIES requires HTTP origins"
    );
    expect(() => parseAuthorizedParties("ftp://studio.example")).toThrow(
      "CLERK_AUTHORIZED_PARTIES requires HTTP origins"
    );
  });
});
