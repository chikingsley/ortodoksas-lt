// biome-ignore-all lint/performance/noJsxPropsBind: TanStack Form collection controls bind each input to its typed field path.
import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import type { PersonEditorInput } from "@ortodoksas-lt/content/directory";
import { slugifyDirectoryName } from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useForm, useStore } from "@tanstack/react-form";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Button } from "@/components/ui/button";
import {
  Field,
  LocaleTabs,
  localeLabel,
  Section,
  SelectField,
  TextareaField,
} from "@/editorial/directories/directory-form-controls";
import { handleImageUpload } from "@/lib/tiptap-utils";
import { savePersonDirectoryMutation } from "@/server/directories/directory.functions";

const emptyDocument: PersonEditorInput["localizations"][number]["biography"] = {
  content: [{ type: "paragraph" }],
  type: "doc",
};

const publicationStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
] as const;

const contactKindOptions = [
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "Website", value: "website" },
  { label: "Facebook", value: "facebook" },
  { label: "Instagram", value: "instagram" },
  { label: "Telegram", value: "telegram" },
  { label: "Other", value: "other" },
] as const;

const mediaRoleOptions = [
  { label: "Primary portrait", value: "primary" },
  { label: "Gallery", value: "gallery" },
] as const;

const documentText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(documentText).filter(Boolean).join(" ");
  }
  if (!(value && typeof value === "object")) {
    return "";
  }
  const node = value as { content?: unknown; text?: unknown };
  return typeof node.text === "string" ? node.text : documentText(node.content);
};

const generatedSeoDescription = (
  localization: PersonEditorInput["localizations"][number]
) => {
  const name = [localization.honorific, localization.displayName]
    .filter(Boolean)
    .join(" ");
  const biography = documentText(localization.biography).trim();
  return [name, biography].filter(Boolean).join(". ").slice(0, 600);
};

const dateInputValue = (timestamp: number | null) =>
  timestamp === null ? "" : new Date(timestamp).toISOString().slice(0, 10);

const dateTimestamp = (value: string) =>
  value ? Date.parse(`${value}T00:00:00.000Z`) : null;

interface DirectoryOption {
  label: string;
  value: string;
}

const upsertLocalization = <T extends { language: SiteLocale }>(
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

export const PersonEditor = ({
  communityOptions,
  initialValue,
  locale,
  onLocaleChange,
  onSaved,
}: {
  communityOptions: DirectoryOption[];
  initialValue: PersonEditorInput;
  locale: SiteLocale;
  onLocaleChange: (locale: SiteLocale) => void;
  onSaved: (id: string) => Promise<void>;
}) => {
  const [message, setMessage] = useState("");
  const [slugOverride, setSlugOverride] = useState(Boolean(initialValue.slug));
  const form = useForm({
    defaultValues: initialValue,
    onSubmit: async ({ value }) => {
      setMessage("Saving…");
      try {
        const preparedValue = {
          ...value,
          localizations: value.localizations.map((item) => ({
            ...item,
            seoDescription:
              item.seoDescription || generatedSeoDescription(item),
          })),
        };
        const result = await savePersonDirectoryMutation({
          data: preparedValue,
        });
        await onSaved(result.id);
        setMessage("Saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Save failed");
      }
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const localization = values.localizations.find(
    (value) => value.language === locale
  );
  const updateLocalization = useCallback(
    (
      update: (
        value: PersonEditorInput["localizations"][number]
      ) => PersonEditorInput["localizations"][number]
    ) =>
      form.setFieldValue("localizations", (current) =>
        upsertLocalization(
          current,
          locale,
          () => ({
            alternateName: "",
            biography: emptyDocument,
            displayName: "",
            honorific: "",
            language: locale,
            seoDescription: "",
          }),
          update
        )
      ),
    [form, locale]
  );
  const updateDisplayName = useCallback(
    (displayName: string) => {
      updateLocalization((value) => ({ ...value, displayName }));
      if (locale === "lt" && !slugOverride) {
        form.setFieldValue("slug", slugifyDirectoryName(displayName));
      }
    },
    [form, locale, slugOverride, updateLocalization]
  );
  const generateSlug = useCallback(() => {
    const lithuanianName = values.localizations.find(
      (value) => value.language === "lt"
    )?.displayName;
    form.setFieldValue("slug", slugifyDirectoryName(lithuanianName ?? ""));
    setSlugOverride(false);
  }, [form, values.localizations]);
  const generateSeo = useCallback(() => {
    if (localization) {
      updateLocalization((value) => ({
        ...value,
        seoDescription: generatedSeoDescription(value),
      }));
    }
  }, [localization, updateLocalization]);
  const upload = useCallback(
    async (file: File) => {
      setMessage("Uploading image…");
      const uploaded = await handleImageUpload(file);
      form.setFieldValue("media", (current) => [
        ...current,
        {
          localizations: [
            {
              altText:
                uploaded.altText ||
                [localization?.honorific, localization?.displayName]
                  .filter(Boolean)
                  .join(" ") ||
                "Portrait",
              caption: uploaded.caption,
              language: locale,
            },
          ],
          mediaId: uploaded.id,
          role: current.some((item) => item.role === "primary")
            ? ("gallery" as const)
            : ("primary" as const),
          sortOrder: current.length,
        },
      ]);
      setMessage("Image uploaded");
    },
    [form, locale, localization]
  );

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit().catch(() => setMessage("Save failed"));
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <LocaleTabs locale={locale} onChange={onLocaleChange} />
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span aria-live="polite">{message}</span>
          <Button type="submit">
            <Save /> Save person
          </Button>
        </div>
      </div>
      <Section title="Identity and publication">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Field
              label="URL slug"
              onChange={(event) => {
                setSlugOverride(true);
                form.setFieldValue("slug", event.target.value);
              }}
              value={values.slug}
            />
            <Button
              className="w-fit px-0"
              onClick={generateSlug}
              size="xs"
              type="button"
              variant="link"
            >
              Generate from Lithuanian name
            </Button>
          </div>
          <SelectField
            label="Publication status"
            onChange={(status) => form.setFieldValue("status", status)}
            options={publicationStatusOptions}
            value={values.status}
          />
          <Field
            label="Sort order"
            min="0"
            onChange={(event) =>
              form.setFieldValue("sortOrder", Number(event.target.value))
            }
            type="number"
            value={values.sortOrder}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label={`Honorific — ${localeLabel[locale]}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                honorific: event.target.value,
              }))
            }
            value={localization?.honorific ?? ""}
          />
          <Field
            label={`Display name — ${localeLabel[locale]}`}
            onChange={(event) => updateDisplayName(event.target.value)}
            value={localization?.displayName ?? ""}
          />
          <Field
            label={`Alternate name — ${localeLabel[locale]}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                alternateName: event.target.value,
              }))
            }
            value={localization?.alternateName ?? ""}
          />
        </div>
        <div className="grid gap-1.5">
          <Field
            label={`SEO description — ${localeLabel[locale]}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                seoDescription: event.target.value,
              }))
            }
            value={localization?.seoDescription ?? ""}
          />
          <Button
            className="w-fit px-0"
            onClick={generateSeo}
            size="xs"
            type="button"
            variant="link"
          >
            Generate from name and biography
          </Button>
        </div>
      </Section>
      <Section title={`Biography — ${localeLabel[locale]}`}>
        <SimpleEditor
          ariaLabel={`Biography in ${localeLabel[locale]}`}
          className="overflow-hidden rounded-lg border"
          content={localization?.biography ?? emptyDocument}
          key={`${initialValue.id ?? "new"}-${locale}`}
          onUpdate={(biography) =>
            updateLocalization((value) => ({
              ...value,
              biography: tiptapDocumentSchema.parse(biography),
            }))
          }
          variant="compact"
        />
      </Section>
      <Section title="Positions">
        {values.positions.map((position, index) => {
          const translated = position.localizations.find(
            (item) => item.language === locale
          );
          const updatePositionLocalization = (
            update: (value: { description: string; title: string }) => {
              description: string;
              title: string;
            }
          ) =>
            form.setFieldValue("positions", (current) =>
              current.map((item, itemIndex) =>
                itemIndex === index
                  ? {
                      ...item,
                      localizations: upsertLocalization(
                        item.localizations,
                        locale,
                        () => ({
                          description: "",
                          language: locale,
                          title: "",
                        }),
                        (value) => ({ ...value, ...update(value) })
                      ),
                    }
                  : item
              )
            );
          return (
            <div
              className="grid gap-4 border-t pt-4 first:border-t-0 first:pt-0"
              key={position.id ?? index}
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm">Position {index + 1}</strong>
                <div className="flex items-center gap-1">
                  <Button
                    aria-label="Move position up"
                    disabled={index === 0}
                    onClick={() =>
                      form.setFieldValue("positions", (current) => {
                        const next = [...current];
                        [next[index - 1], next[index]] = [
                          next[index],
                          next[index - 1],
                        ];
                        return next.map((item, itemIndex) => ({
                          ...item,
                          sortOrder: itemIndex,
                        }));
                      })
                    }
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    aria-label="Move position down"
                    disabled={index === values.positions.length - 1}
                    onClick={() =>
                      form.setFieldValue("positions", (current) => {
                        const next = [...current];
                        [next[index], next[index + 1]] = [
                          next[index + 1],
                          next[index],
                        ];
                        return next.map((item, itemIndex) => ({
                          ...item,
                          sortOrder: itemIndex,
                        }));
                      })
                    }
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    aria-label="Remove position"
                    onClick={() =>
                      form.setFieldValue("positions", (current) =>
                        current
                          .filter((_, itemIndex) => itemIndex !== index)
                          .map((item, itemIndex) => ({
                            ...item,
                            sortOrder: itemIndex,
                          }))
                      )
                    }
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Internal role key"
                  onChange={(event) =>
                    form.setFieldValue("positions", (current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, roleKey: event.target.value }
                          : item
                      )
                    )
                  }
                  value={position.roleKey}
                />
                <SelectField
                  label="Assigned community"
                  onChange={(communityId) =>
                    form.setFieldValue("positions", (current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              communityId:
                                communityId === "unassigned"
                                  ? null
                                  : communityId,
                            }
                          : item
                      )
                    )
                  }
                  options={[
                    { label: "Unassigned", value: "unassigned" },
                    ...communityOptions,
                  ]}
                  value={position.communityId ?? "unassigned"}
                />
              </div>
              <Field
                label={`Display title — ${localeLabel[locale]}`}
                onChange={(event) =>
                  updatePositionLocalization((value) => ({
                    ...value,
                    title: event.target.value,
                  }))
                }
                value={translated?.title ?? ""}
              />
              <TextareaField
                label={`Description — ${localeLabel[locale]}`}
                onChange={(event) =>
                  updatePositionLocalization((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
                rows={3}
                value={translated?.description ?? ""}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Start date"
                  onChange={(event) =>
                    form.setFieldValue("positions", (current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              startsAt: dateTimestamp(event.target.value),
                            }
                          : item
                      )
                    )
                  }
                  type="date"
                  value={dateInputValue(position.startsAt)}
                />
                <Field
                  label="End date"
                  onChange={(event) =>
                    form.setFieldValue("positions", (current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              endsAt: dateTimestamp(event.target.value),
                            }
                          : item
                      )
                    )
                  }
                  type="date"
                  value={dateInputValue(position.endsAt)}
                />
              </div>
            </div>
          );
        })}
        <Button
          onClick={() =>
            form.setFieldValue("positions", (current) => [
              ...current,
              {
                communityId: null,
                endsAt: null,
                localizations: [
                  { description: "", language: locale, title: "" },
                ],
                roleKey: "clergy",
                sortOrder: current.length,
                startsAt: null,
              },
            ])
          }
          type="button"
          variant="outline"
        >
          <Plus /> Add position
        </Button>
      </Section>
      <Section title="Contact methods">
        {values.contacts.map((contact, index) => {
          const translated = contact.localizations.find(
            (item) => item.language === locale
          );
          return (
            <div
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_2fr_2fr_auto]"
              key={contact.id ?? index}
            >
              <SelectField
                label="Kind"
                onChange={(kind) =>
                  form.setFieldValue("contacts", (current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, kind } : item
                    )
                  )
                }
                options={contactKindOptions}
                value={contact.kind}
              />
              <Field
                label="URL"
                onChange={(event) =>
                  form.setFieldValue("contacts", (current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, href: event.target.value }
                        : item
                    )
                  )
                }
                value={contact.href}
              />
              <Field
                label={`Label — ${localeLabel[locale]}`}
                onChange={(event) =>
                  form.setFieldValue("contacts", (current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            localizations: upsertLocalization(
                              item.localizations,
                              locale,
                              () => ({ label: "", language: locale }),
                              (value) => ({
                                ...value,
                                label: event.target.value,
                              })
                            ),
                          }
                        : item
                    )
                  )
                }
                value={translated?.label ?? ""}
              />
              <Button
                aria-label="Remove contact"
                onClick={() =>
                  form.setFieldValue("contacts", (current) =>
                    current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button
          onClick={() =>
            form.setFieldValue("contacts", (current) => [
              ...current,
              {
                href: "https://",
                kind: "website" as const,
                localizations: [{ label: "", language: locale }],
                sortOrder: current.length,
              },
            ])
          }
          type="button"
          variant="outline"
        >
          <Plus /> Add contact
        </Button>
      </Section>
      <Section title="Portrait and gallery">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <ImagePlus className="size-4" /> Upload image
          <input
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                upload(file).catch((error) =>
                  setMessage(
                    error instanceof Error ? error.message : "Upload failed"
                  )
                );
              }
            }}
            type="file"
          />
        </label>
        <div className="grid gap-5">
          {values.media.map((item, index) => {
            const translated = item.localizations.find(
              (value) => value.language === locale
            );
            return (
              <div
                className="grid gap-3 border-t pt-4 first:border-t-0 first:pt-0"
                key={item.id ?? item.mediaId}
              >
                <img
                  alt={translated?.altText ?? ""}
                  className="aspect-[4/5] w-full max-w-64 rounded-lg bg-muted/35 object-contain"
                  height="640"
                  src={`/api/media/${item.mediaId}`}
                  width="512"
                />
                <SelectField
                  label="Image role"
                  onChange={(role) =>
                    form.setFieldValue("media", (current) =>
                      current.map((value, valueIndex) =>
                        valueIndex === index ? { ...value, role } : value
                      )
                    )
                  }
                  options={mediaRoleOptions}
                  value={item.role}
                />
                <Field
                  label={`Alt text — ${localeLabel[locale]}`}
                  onChange={(event) =>
                    form.setFieldValue("media", (current) =>
                      current.map((value, valueIndex) =>
                        valueIndex === index
                          ? {
                              ...value,
                              localizations: upsertLocalization(
                                value.localizations,
                                locale,
                                () => ({
                                  altText: "",
                                  caption: "",
                                  language: locale,
                                }),
                                (localized) => ({
                                  ...localized,
                                  altText: event.target.value,
                                })
                              ),
                            }
                          : value
                      )
                    )
                  }
                  value={translated?.altText ?? ""}
                />
                <TextareaField
                  label={`Caption — ${localeLabel[locale]}`}
                  onChange={(event) =>
                    form.setFieldValue("media", (current) =>
                      current.map((value, valueIndex) =>
                        valueIndex === index
                          ? {
                              ...value,
                              localizations: upsertLocalization(
                                value.localizations,
                                locale,
                                () => ({
                                  altText: "",
                                  caption: "",
                                  language: locale,
                                }),
                                (localized) => ({
                                  ...localized,
                                  caption: event.target.value,
                                })
                              ),
                            }
                          : value
                      )
                    )
                  }
                  rows={2}
                  value={translated?.caption ?? ""}
                />
                <Button
                  onClick={() =>
                    form.setFieldValue("media", (current) =>
                      current.filter((_, valueIndex) => valueIndex !== index)
                    )
                  }
                  type="button"
                  variant="ghost"
                >
                  <Trash2 /> Remove
                </Button>
              </div>
            );
          })}
        </div>
      </Section>
    </form>
  );
};
