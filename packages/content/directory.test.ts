import { describe, expect, it } from "vitest";

import {
  communityEditorSchema,
  personEditorSchema,
  prepareDirectoryRecordForEditing,
  slugifyDirectoryName,
} from "./directory";
import { siteLocales } from "./site";

const biography = { content: [{ type: "paragraph" }], type: "doc" } as const;
const peopleLocalizations = siteLocales.map((language) => ({
  alternateName: "",
  biography,
  displayName: `Name ${language}`,
  honorific: "",
  language,
  seoDescription: "",
}));
const primaryPersonMedia = {
  localizations: siteLocales.map((language) => ({
    altText: `Portrait ${language}`,
    caption: "",
    language,
  })),
  mediaId: "primary-portrait",
  role: "primary" as const,
  sortOrder: 0,
};
const communityLocalizations = siteLocales.map((language) => ({
  accessibility: "",
  addressLabel: "",
  description: "",
  directions: "",
  language,
  name: `Community ${language}`,
  operationalNotice: "",
  seoDescription: "",
}));
const primaryCommunityMedia = {
  localizations: siteLocales.map((language) => ({
    altText: `Community ${language}`,
    caption: "",
    language,
  })),
  mediaId: "primary-community-image",
  role: "primary" as const,
  sortOrder: 0,
};

const person = {
  contacts: [],
  localizations: peopleLocalizations,
  media: [primaryPersonMedia],
  positions: [],
  slug: "example-person",
  sortOrder: 0,
  status: "published" as const,
};

describe("directory publication contracts", () => {
  it("generates stable URL slugs from Lithuanian names", () => {
    expect(slugifyDirectoryName("  Jo Ekselencija Panaretas  ")).toBe(
      "jo-ekselencija-panaretas"
    );
    expect(slugifyDirectoryName("Viačeslav Jurčenko")).toBe(
      "viaceslav-jurcenko"
    );
  });

  it("requires every locale for published people", () => {
    expect(personEditorSchema.safeParse(person).success).toBe(true);
    expect(
      personEditorSchema.safeParse({
        ...person,
        localizations: peopleLocalizations.slice(0, 4),
      }).success
    ).toBe(false);
  });

  it("requires one primary portrait before publishing a person", () => {
    expect(personEditorSchema.safeParse({ ...person, media: [] }).success).toBe(
      false
    );
    expect(
      personEditorSchema.safeParse({
        ...person,
        media: [],
        status: "draft",
      }).success
    ).toBe(true);
  });

  it("opens a legacy published record without media as a repairable draft", () => {
    const legacyRecord = { ...person, media: [] };
    const editableRecord = prepareDirectoryRecordForEditing(legacyRecord);

    expect(editableRecord.status).toBe("draft");
    expect(personEditorSchema.safeParse(editableRecord).success).toBe(true);
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

  it("requires one primary image before publishing a community", () => {
    const community = {
      addressLine: "",
      contacts: [],
      countryCode: "LT",
      latitude: null,
      locality: "Vilnius",
      localizations: communityLocalizations,
      longitude: null,
      media: [primaryCommunityMedia],
      operationalStatus: "active" as const,
      postalCode: "",
      services: [],
      slug: "example-community",
      sortOrder: 0,
      status: "published" as const,
      type: "community" as const,
    };

    expect(communityEditorSchema.safeParse(community).success).toBe(true);
    expect(
      communityEditorSchema.safeParse({ ...community, media: [] }).success
    ).toBe(false);
    expect(
      communityEditorSchema.safeParse({
        ...community,
        media: [],
        status: "draft",
      }).success
    ).toBe(true);
  });
});
