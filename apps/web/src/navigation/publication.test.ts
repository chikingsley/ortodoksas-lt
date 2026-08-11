import { describe, expect, it } from "vitest";
import { siteLocales } from "../i18n/config";
import { getLocaleLinks, getPage } from "../lib/publication";
import {
  getContactNavigation,
  getPrimaryNavigation,
  isNavigationItemActive,
} from "./publication";

describe("publication navigation contract", () => {
  it("uses one complete primary navigation in every locale", () => {
    for (const locale of siteLocales) {
      const items = getPrimaryNavigation(locale);
      expect(items).toHaveLength(6);
      expect(new Set(items.map((item) => item.id)).size).toBe(6);
      expect(items.every((item) => item.label.length > 0)).toBe(true);
    }
  });

  it("points every Lithuanian content destination at a canonical page", () => {
    const contentItems = [
      ...getPrimaryNavigation("lt").filter(
        (item) => item.id !== "archive" && item.id !== "home"
      ),
      ...getContactNavigation("lt"),
    ];
    for (const item of contentItems) {
      expect(getPage(item.href), item.href).toBeDefined();
    }
  });

  it("marks home active only on the edition root", () => {
    const [home] = getPrimaryNavigation("en");
    expect(home).toBeDefined();
    if (!home) {
      return;
    }
    expect(isNavigationItemActive("/en", home)).toBe(true);
    expect(isNavigationItemActive("/en/2022/article.html", home)).toBe(false);
  });

  it("routes published localized institutional pages to their locale", () => {
    const items = getPrimaryNavigation("en", (path) =>
      path.endsWith("dvasininkai.html") ? "/p/clergy.html" : undefined
    );
    expect(items.find((item) => item.id === "clergy")).toMatchObject({
      href: "/en/p/clergy.html",
      targetLocale: "en",
    });
  });

  it("exposes page-level translation availability in locale destinations", () => {
    const editionRoots = getLocaleLinks("/");
    expect(
      Object.values(editionRoots).every(
        (destination) => destination.hasCounterpart
      )
    ).toBe(true);

    const missingPage = getLocaleLinks("/page-that-does-not-exist");
    expect(missingPage.en).toEqual({
      hasCounterpart: false,
      href: "/en",
    });
    expect(missingPage.lt).toEqual({
      hasCounterpart: false,
      href: "/",
    });
  });
});
