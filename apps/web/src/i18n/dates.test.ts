import { describe, expect, it } from "vitest";

import { formatPublicationDate, formatPublicationMonth } from "./dates";

describe("Publication dates", () => {
  it("uses Belarusian grammatical month forms for dates and archive headings", () => {
    const date = new Date("2026-10-18T00:00:00Z");
    expect(formatPublicationDate(date, "be")).toBe("18 кастрычніка 2026 г.");
    expect(formatPublicationMonth(date, "be")).toBe("кастрычнік 2026 г.");
  });

  it("keeps publication calendar dates in UTC across locale formats", () => {
    const date = new Date("2026-10-18T23:30:00Z");
    expect(formatPublicationDate(date, "lt")).toBe("2026 m. spalio 18 d.");
    expect(formatPublicationDate(date, "en")).toBe("18 October 2026");
    expect(formatPublicationDate(date, "uk")).toBe("18 жовтня 2026 р.");
  });
});
