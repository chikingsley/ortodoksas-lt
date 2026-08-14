import { describe, expect, it } from "vitest";

import { communityEditorSchema, personEditorSchema } from "./directory";
import { siteLocales } from "./site";

const biography = { content: [{ type: "paragraph" }], type: "doc" } as const;
const peopleLocalizations = siteLocales.map((language) => ({
  biography,
  displayName: `Name ${language}`,
  language,
  seoDescription: "",
}));

const person = {
  contacts: [],
  localizations: peopleLocalizations,
  media: [],
  positions: [],
  slug: "example-person",
  sortOrder: 0,
  status: "published" as const,
};

describe("directory publication contracts", () => {
  it("requires every locale for published people", () => {
    expect(personEditorSchema.safeParse(person).success).toBe(true);
    expect(
      personEditorSchema.safeParse({
        ...person,
        localizations: peopleLocalizations.slice(0, 4),
      }).success
    ).toBe(false);
  });

  it("rejects duplicate locales and competing primary images", () => {
    expect(
      personEditorSchema.safeParse({
        ...person,
        localizations: [...peopleLocalizations, peopleLocalizations[0]],
      }).success
    ).toBe(false);
    expect(
      personEditorSchema.safeParse({
        ...person,
        media: ["first", "second"].map((mediaId, sortOrder) => ({
          localizations: siteLocales.map((language) => ({
            altText: `Portrait ${language}`,
            caption: "",
            language,
          })),
          mediaId,
          role: "primary" as const,
          sortOrder,
        })),
      }).success
    ).toBe(false);
  });

  it("requires paired coordinates", () => {
    expect(
      communityEditorSchema.safeParse({
        addressLine: "",
        contacts: [],
        countryCode: "LT",
        latitude: 54.6,
        locality: "Vilnius",
        localizations: [],
        longitude: null,
        media: [],
        operationalStatus: "active",
        postalCode: "",
        services: [],
        slug: "example-community",
        sortOrder: 0,
        status: "draft",
        type: "community",
      }).success
    ).toBe(false);
  });
});
