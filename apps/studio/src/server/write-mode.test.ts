import { describe, expect, it } from "vitest";

import { requireStudioWritesOpen } from "./write-mode";

describe("Studio write mode", () => {
  it("allows the standard editorial mode", () => {
    expect(() => {
      requireStudioWritesOpen({ STUDIO_WRITE_MODE: "open" });
    }).not.toThrow();
  });

  it("returns a retryable maintenance response during cutover", () => {
    let response: unknown;

    try {
      requireStudioWritesOpen({ STUDIO_WRITE_MODE: "frozen" });
    } catch (error: unknown) {
      response = error;
    }

    expect(response).toBeInstanceOf(Response);

    if (!(response instanceof Response)) {
      throw new TypeError("Expected the maintenance response");
    }

    expect({
      retryAfter: response.headers.get("retry-after"),
      status: response.status,
    }).toStrictEqual({ retryAfter: "300", status: 503 });
  });
});
