import { z } from "zod";

import { tiptapDocumentSchema } from "./article";
import {
  directoryPublicationStatusSchema,
  siteLocaleSchema,
  siteLocales,
} from "./site";

const entityIdSchema = z.string().trim().min(1).max(128);
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

export const slugifyDirectoryName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 160);
const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).default("");

export const prepareDirectoryRecordForEditing = (record: {
  [key: string]: unknown;
  media: readonly { role: string }[];
  status: string;
}) =>
  record.status === "published" &&
  !record.media.some(({ role }) => role === "primary")
    ? { ...record, status: "draft" }
    : record;

export const personSchema = z.strictObject({
  id: entityIdSchema,
  slug: slugSchema,
  sortOrder: z.number().int().nonnegative(),
  status: directoryPublicationStatusSchema,
});

export const personLocalizationSchema = z.strictObject({
  alternateName: optionalText(240),
  biography: tiptapDocumentSchema,
  displayName: z.string().trim().min(1).max(240),
  honorific: optionalText(240),
  language: siteLocaleSchema,
  personId: entityIdSchema,
  seoDescription: optionalText(600),
});

export const personPositionSchema = z
  .strictObject({
    communityId: entityIdSchema.nullable(),
    endsAt: z.number().int().nonnegative().nullable(),
    id: entityIdSchema,
    personId: entityIdSchema,
    roleKey: slugSchema,
    sortOrder: z.number().int().nonnegative(),
    startsAt: z.number().int().nonnegative().nullable(),
  })
  .refine(
    ({ endsAt, startsAt }) =>
      endsAt === null || startsAt === null || startsAt <= endsAt,
    { error: "Position start must precede its end", path: ["endsAt"] }
  );

export const personPositionLocalizationSchema = z.strictObject({
  description: optionalText(2000),
  language: siteLocaleSchema,
  positionId: entityIdSchema,
  title: z.string().trim().min(1).max(240),
});

export const communityTypeSchema = z.enum([
  "parish",
  "church",
  "chapel",
  "mission",
  "monastery",
  "community",
]);

export const communityOperationalStatusSchema = z.enum([
  "active",
  "forming",
  "inactive",
]);

const communityBaseSchema = z.strictObject({
  addressLine: optionalText(500),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/u)
    .default("LT"),
  id: entityIdSchema,
  latitude: z.number().min(-90).max(90).nullable(),
  locality: optionalText(160),
  longitude: z.number().min(-180).max(180).nullable(),
  operationalStatus: communityOperationalStatusSchema,
  postalCode: optionalText(32),
  slug: slugSchema,
  sortOrder: z.number().int().nonnegative(),
  status: directoryPublicationStatusSchema,
  type: communityTypeSchema,
});

export const communitySchema = communityBaseSchema.refine(
  ({ latitude, longitude }) => (latitude === null) === (longitude === null),
  {
    error: "Latitude and longitude must be provided together",
    path: ["latitude"],
  }
);

export const communityLocalizationSchema = z.strictObject({
  accessibility: optionalText(4000),
  addressLabel: optionalText(500),
  communityId: entityIdSchema,
  description: optionalText(20_000),
  directions: optionalText(4000),
  language: siteLocaleSchema,
  name: z.string().trim().min(1).max(240),
  operationalNotice: optionalText(4000),
  seoDescription: optionalText(600),
});

export const communityContactKindSchema = z.enum([
  "email",
  "phone",
  "website",
  "facebook",
  "instagram",
  "telegram",
  "other",
]);

export const communityContactSchema = z.strictObject({
  communityId: entityIdSchema,
  href: z.string().trim().url().max(4096),
  id: entityIdSchema,
  kind: communityContactKindSchema,
  sortOrder: z.number().int().nonnegative(),
});

export const communityContactLocalizationSchema = z.strictObject({
  communityContactId: entityIdSchema,
  label: z.string().trim().min(1).max(240),
  language: siteLocaleSchema,
});

export const communityServiceSchema = z
  .strictObject({
    communityId: entityIdSchema,
    endsAt: z.number().int().nonnegative().nullable(),
    id: entityIdSchema,
    sortOrder: z.number().int().nonnegative(),
    startsAt: z.number().int().nonnegative().nullable(),
  })
  .refine(
    ({ endsAt, startsAt }) =>
      endsAt === null || startsAt === null || startsAt <= endsAt,
    { error: "Service start must precede its end", path: ["endsAt"] }
  );

export const communityServiceLocalizationSchema = z.strictObject({
  communityServiceId: entityIdSchema,
  language: siteLocaleSchema,
  scheduleText: z.string().trim().min(1).max(1000),
});

export const directoryMediaSchema = z.strictObject({
  id: entityIdSchema,
  mediaId: entityIdSchema,
  role: z.enum(["primary", "gallery"]),
  sortOrder: z.number().int().nonnegative(),
});

const directoryMediaLocalizationFields = {
  altText: z.string().trim().min(1).max(500),
  caption: optionalText(1000),
  language: siteLocaleSchema,
} as const;

export const personMediaLocalizationSchema = z.strictObject({
  ...directoryMediaLocalizationFields,
  personMediaId: entityIdSchema,
});

export const communityMediaLocalizationSchema = z.strictObject({
  ...directoryMediaLocalizationFields,
  communityMediaId: entityIdSchema,
});

const personPositionEditorSchema = z
  .strictObject({
    communityId: entityIdSchema.nullable().default(null),
    endsAt: z.number().int().nonnegative().nullable().default(null),
    id: entityIdSchema.optional(),
    localizations: z.array(
      personPositionLocalizationSchema.omit({ positionId: true })
    ),
    roleKey: slugSchema,
    sortOrder: z.number().int().nonnegative(),
    startsAt: z.number().int().nonnegative().nullable().default(null),
  })
  .refine(
    ({ endsAt, startsAt }) =>
      endsAt === null || startsAt === null || startsAt <= endsAt,
    { error: "Position start must precede its end", path: ["endsAt"] }
  );

const personMediaEditorSchema = z.strictObject({
  id: entityIdSchema.optional(),
  localizations: z.array(
    personMediaLocalizationSchema.omit({ personMediaId: true })
  ),
  mediaId: entityIdSchema,
  role: z.enum(["primary", "gallery"]),
  sortOrder: z.number().int().nonnegative(),
});

const personContactEditorSchema = z.strictObject({
  href: z.string().trim().url().max(4096),
  id: entityIdSchema.optional(),
  kind: communityContactKindSchema,
  localizations: z.array(
    z.strictObject({
      label: z.string().trim().min(1).max(240),
      language: siteLocaleSchema,
    })
  ),
  sortOrder: z.number().int().nonnegative(),
});

interface LocalizedValue {
  language: (typeof siteLocales)[number];
}

const validateLocalizedCollection = (input: {
  collection: LocalizedValue[];
  context: z.RefinementCtx;
  path: (string | number)[];
  requireComplete: boolean;
}) => {
  const { collection, context, path, requireComplete } = input;
  const locales = collection.map(({ language }) => language);
  const uniqueLocales = new Set(locales);
  if (uniqueLocales.size !== locales.length) {
    context.addIssue({
      code: "custom",
      message: "Each locale may appear once",
      path,
    });
  }
  if (
    requireComplete &&
    siteLocales.some((locale) => !uniqueLocales.has(locale))
  ) {
    context.addIssue({
      code: "custom",
      message: "Published records require all five site locales",
      path,
    });
  }
};

export const personEditorSchema = personSchema
  .omit({ id: true })
  .extend({
    contacts: z.array(personContactEditorSchema),
    id: entityIdSchema.optional(),
    localizations: z
      .array(personLocalizationSchema.omit({ personId: true }))
      .min(1),
    media: z.array(personMediaEditorSchema),
    positions: z.array(personPositionEditorSchema),
  })
  .superRefine((value, context) => {
    const requireComplete = value.status === "published";
    validateLocalizedCollection({
      collection: value.localizations,
      context,
      path: ["localizations"],
      requireComplete,
    });
    for (const [index, item] of value.contacts.entries()) {
      validateLocalizedCollection({
        collection: item.localizations,
        context,
        path: ["contacts", index, "localizations"],
        requireComplete,
      });
    }
    for (const [index, item] of value.positions.entries()) {
      validateLocalizedCollection({
        collection: item.localizations,
        context,
        path: ["positions", index, "localizations"],
        requireComplete,
      });
    }
    for (const [index, item] of value.media.entries()) {
      validateLocalizedCollection({
        collection: item.localizations,
        context,
        path: ["media", index, "localizations"],
        requireComplete,
      });
    }
    const primaryImageCount = value.media.filter(
      ({ role }) => role === "primary"
    ).length;
    if (primaryImageCount > 1) {
      context.addIssue({
        code: "custom",
        message: "A person may have one primary image",
        path: ["media"],
      });
    }
    if (requireComplete && primaryImageCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Published people require one primary portrait",
        path: ["media"],
      });
    }
  });

const communityContactEditorSchema = z.strictObject({
  href: z.string().trim().url().max(4096),
  id: entityIdSchema.optional(),
  kind: communityContactKindSchema,
  localizations: z.array(
    communityContactLocalizationSchema.omit({ communityContactId: true })
  ),
  sortOrder: z.number().int().nonnegative(),
});

const communityServiceEditorSchema = z
  .strictObject({
    endsAt: z.number().int().nonnegative().nullable().default(null),
    id: entityIdSchema.optional(),
    localizations: z.array(
      communityServiceLocalizationSchema.omit({ communityServiceId: true })
    ),
    sortOrder: z.number().int().nonnegative(),
    startsAt: z.number().int().nonnegative().nullable().default(null),
  })
  .refine(
    ({ endsAt, startsAt }) =>
      endsAt === null || startsAt === null || startsAt <= endsAt,
    { error: "Service start must precede its end", path: ["endsAt"] }
  );

const communityMediaEditorSchema = z.strictObject({
  id: entityIdSchema.optional(),
  localizations: z.array(
    communityMediaLocalizationSchema.omit({ communityMediaId: true })
  ),
  mediaId: entityIdSchema,
  role: z.enum(["primary", "gallery"]),
  sortOrder: z.number().int().nonnegative(),
});

export const communityEditorSchema = communityBaseSchema
  .omit({ id: true })
  .extend({
    contacts: z.array(communityContactEditorSchema),
    id: entityIdSchema.optional(),
    localizations: z
      .array(communityLocalizationSchema.omit({ communityId: true }))
      .min(1),
    media: z.array(communityMediaEditorSchema),
    services: z.array(communityServiceEditorSchema),
  })
  .superRefine((value, context) => {
    const requireComplete = value.status === "published";
    validateLocalizedCollection({
      collection: value.localizations,
      context,
      path: ["localizations"],
      requireComplete,
    });
    for (const key of ["contacts", "services", "media"] as const) {
      for (const [index, item] of value[key].entries()) {
        validateLocalizedCollection({
          collection: item.localizations,
          context,
          path: [key, index, "localizations"],
          requireComplete,
        });
      }
    }
    const primaryImageCount = value.media.filter(
      ({ role }) => role === "primary"
    ).length;
    if (primaryImageCount > 1) {
      context.addIssue({
        code: "custom",
        message: "A community may have one primary image",
        path: ["media"],
      });
    }
    if (requireComplete && primaryImageCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Published communities require one primary image",
        path: ["media"],
      });
    }
  });

export type Community = z.infer<typeof communitySchema>;
export type CommunityLocalization = z.infer<typeof communityLocalizationSchema>;
export type Person = z.infer<typeof personSchema>;
export type PersonLocalization = z.infer<typeof personLocalizationSchema>;
export type CommunityEditorInput = z.infer<typeof communityEditorSchema>;
export type PersonEditorInput = z.infer<typeof personEditorSchema>;
