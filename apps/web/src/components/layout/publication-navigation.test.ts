import { describe, expect, it } from "vitest";
import { siteLocales } from "../../i18n/config";
import {
  getContactNavigation,
  getPrimaryNavigation,
  isNavigationItemActive,
} from "./publication-navigation";

describe("publication navigation contract", () => {
  it("uses one complete primary navigation in every locale", () => {
    for (const locale of siteLocales) {
      const items = getPrimaryNavigation(locale, (path) => path);
      expect(items).toHaveLength(6);
      expect(new Set(items.map((item) => item.id)).size).toBe(6);
      expect(items.every((item) => item.label.length > 0)).toBe(true);
      expect(items.every((item) => item.targetLocale === locale)).toBe(true);
    }
  });

  it("marks home active only on the edition root", () => {
    const items = getPrimaryNavigation("en");
    const home = items.find((item) => item.id === "home");
    const archive = items.find((item) => item.id === "archive");
    expect(home).toBeDefined();
    expect(archive).toBeDefined();
    if (!(home && archive)) {
      return;
    }
    expect(isNavigationItemActive("/en", home)).toBe(true);
    expect(isNavigationItemActive("/en", archive)).toBe(false);
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

  it("shows only published counterparts in a localized edition", () => {
    const items = getPrimaryNavigation("en");
    expect(items.map((item) => item.id)).toEqual(["home", "archive"]);
    expect(getContactNavigation("en")).toEqual([]);
  });
});
