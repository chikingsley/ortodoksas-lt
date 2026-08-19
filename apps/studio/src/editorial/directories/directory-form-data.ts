import type { SiteLocale } from "@ortodoksas-lt/content/site";
import type { StandardSchemaV1 } from "@tanstack/react-form";

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

/**
 * TanStack Form validates the already-normalized editor value. Zod schemas in
 * the content package also accept a wider input shape because they apply
 * defaults. Narrowing the Standard Schema input here preserves Zod's field
 * paths while matching the form's normalized value type.
 */
export const normalizedFormSchema = <TInput, TOutput extends TInput>(
  schema: StandardSchemaV1<TInput, TOutput>
): StandardSchemaV1<TOutput, TOutput> =>
  schema as StandardSchemaV1<TOutput, TOutput>;

export const directoryIssueMessage = (issue?: { message: string }) => {
  if (issue?.message === "Invalid input") {
    return "Review the highlighted fields before saving.";
  }
  return issue?.message ?? "Complete the required fields before saving.";
};
