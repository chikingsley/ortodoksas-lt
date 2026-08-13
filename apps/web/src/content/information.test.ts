import { describe, expect, it } from "vitest";
import {
  calendarLinks,
  contactGroups,
  libraryGroups,
  supportActions,
} from "./information";

const lithuanianPhonePattern = /^\+370\d{8}$/;

describe("information page content", () => {
  it("preserves the twelve unique library destinations", () => {
    const links = libraryGroups.flatMap((group) => group.links);

    expect(links).toHaveLength(12);
    expect(new Set(links.map((link) => link.href)).size).toBe(12);
  });

  it("keeps both contact records actionable", () => {
    expect(contactGroups).toHaveLength(2);
    for (const contact of contactGroups) {
      expect(contact.email).toContain("@");
      expect(contact.phoneHref).toMatch(lithuanianPhonePattern);
    }
  });

  it("uses secure links for the support and calendar services", () => {
    const externalLinks = [...supportActions, ...calendarLinks].filter((link) =>
      link.href.startsWith("http")
    );

    expect(
      externalLinks.every((link) => link.href.startsWith("https://"))
    ).toBe(true);
  });
});
