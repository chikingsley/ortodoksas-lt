import { describe, expect, it } from "vitest";

import { requireStudioWritesOpen } from "../src/server/write-mode";

describe("Studio write mode", () => {
  it("allows the standard editorial mode", () => {
    expect(() =>
      requireStudioWritesOpen({ STUDIO_WRITE_MODE: "open" })
    ).not.toThrow();
  });

  it("returns a retryable maintenance response during cutover", () => {
    try {
      requireStudioWritesOpen({ STUDIO_WRITE_MODE: "frozen" });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(503);
      expect(response.headers.get("retry-after")).toBe("300");
      return;
    }
    throw new Error("Frozen write mode must return a maintenance response");
  });
});
