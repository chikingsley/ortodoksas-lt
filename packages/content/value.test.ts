import { describe, expect, it } from "vitest";

import { parsePageNumber } from "./value";

describe("publication page parameters", () => {
  it.each([
    null,
    "",
    "Infinity",
    "-Infinity",
    "NaN",
    "2abc",
    "-1",
    "0",
    "1.5",
    "9007199254740993",
  ])("uses the first page for %s", (value) => {
    expect(parsePageNumber(value)).toBe(1);
  });

  it("accepts ordinary pages and bounds large offsets", () => {
    expect(parsePageNumber("2")).toBe(2);
    expect(parsePageNumber("10001")).toBe(10_000);
  });
});
