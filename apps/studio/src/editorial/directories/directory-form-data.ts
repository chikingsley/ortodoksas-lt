import type { SiteLocale } from "@ortodoksas-lt/content/site";

export const publicationStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
] as const;

export const contactKindOptions = [
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "Website", value: "website" },
  { label: "Facebook", value: "facebook" },
  { label: "Instagram", value: "instagram" },
  { label: "Telegram", value: "telegram" },
  { label: "Other", value: "other" },
] as const;

export const mediaRoleOptions = [
  { label: "Primary image", value: "primary" },
  { label: "Gallery", value: "gallery" },
] as const;

export const upsertLocalization = <T extends { language: SiteLocale }>(
  values: T[],
  locale: SiteLocale,
  create: () => T,
  update: (value: T) => T
) => {
  const index = values.findIndex((value) => value.language === locale);
  if (index < 0) {
    return [...values, update(create())];
  }
  return values.map((value, valueIndex) =>
    valueIndex === index ? update(value) : value
  );
};

export const directoryIssueMessage = (issue?: { message: string }) => {
  if (issue?.message === "Invalid input") {
    return "Review the highlighted fields before saving.";
  }
  return issue?.message ?? "Complete the required fields before saving.";
};
