import { z } from "zod";

export const siteLocales = ["lt", "en", "ru", "uk", "be"] as const;

export const siteLocaleSchema = z.enum(siteLocales);

export type SiteLocale = z.infer<typeof siteLocaleSchema>;

export const directoryPublicationStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);

export type DirectoryPublicationStatus = z.infer<
  typeof directoryPublicationStatusSchema
>;

export const pageTemplateSchema = z.enum([
  "standard",
  "calendar",
  "people_directory",
  "community_directory",
  "contact",
  "library",
  "support",
]);

export type PageTemplate = z.infer<typeof pageTemplateSchema>;
