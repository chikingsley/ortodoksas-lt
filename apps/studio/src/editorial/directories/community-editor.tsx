// biome-ignore-all lint/performance/noJsxPropsBind: TanStack Form collection controls bind each input to its typed field path.
import type { CommunityEditorInput } from "@ortodoksas-lt/content/directory";
import { slugifyDirectoryName } from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useForm, useStore } from "@tanstack/react-form";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  InputActionField,
  LocaleTabs,
  localeLabel,
  Section,
  SelectField,
  TextareaField,
} from "@/editorial/directories/directory-form-controls";
import { handleImageUpload } from "@/lib/tiptap-utils";
import { saveCommunityDirectoryMutation } from "@/server/directories/directory.functions";

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
  { label: "Primary image", value: "primary" },
  { label: "Gallery", value: "gallery" },
] as const;

const communityOperationalStatusOptions = [
  { label: "Active", value: "active" },
  { label: "Forming", value: "forming" },
  { label: "Inactive", value: "inactive" },
] as const;

const communityTypeOptions = [
  { label: "Community", value: "community" },
  { label: "Parish", value: "parish" },
  { label: "Church", value: "church" },
  { label: "Chapel", value: "chapel" },
  { label: "Mission", value: "mission" },
  { label: "Monastery", value: "monastery" },
] as const;

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

export const CommunityEditor = ({
  initialValue,
  locale,
  onLocaleChange,
  onSaved,
}: {
  initialValue: CommunityEditorInput;
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
        const result = await saveCommunityDirectoryMutation({ data: value });
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
        value: CommunityEditorInput["localizations"][number]
      ) => CommunityEditorInput["localizations"][number]
    ) =>
      form.setFieldValue("localizations", (current) =>
        upsertLocalization(
          current,
          locale,
          () => ({
            accessibility: "",
            addressLabel: "",
            description: "",
            directions: "",
            language: locale,
            name: "",
            operationalNotice: "",
            seoDescription: "",
          }),
          update
        )
      ),
    [form, locale]
  );
  const updateName = useCallback(
    (name: string) => {
      updateLocalization((value) => ({ ...value, name }));
      if (locale === "lt" && !slugOverride) {
        form.setFieldValue("slug", slugifyDirectoryName(name));
      }
    },
    [form, locale, slugOverride, updateLocalization]
  );
  const generateSlug = useCallback(() => {
    const lithuanianName = values.localizations.find(
      (value) => value.language === "lt"
    )?.name;
    form.setFieldValue("slug", slugifyDirectoryName(lithuanianName ?? ""));
    setSlugOverride(false);
  }, [form, values.localizations]);
  const upload = useCallback(
    async (file: File) => {
      setMessage("Uploading image…");
      const uploaded = await handleImageUpload(file);
      form.setFieldValue("media", (current) => [
        ...current,
        {
          localizations: [
            {
              altText: uploaded.altText || localization?.name || "Community",
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
    [form, locale, localization?.name]
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
            <Save /> Save community
          </Button>
        </div>
      </div>
      <Section title="Overview">
        <div className="grid gap-4">
          <Field
            label={`Name — ${localeLabel[locale]}`}
            onChange={(event) => updateName(event.target.value)}
            value={localization?.name ?? ""}
          />
        </div>
        <TextareaField
          label={`Description — ${localeLabel[locale]}`}
          onChange={(event) =>
            updateLocalization((value) => ({
              ...value,
              description: event.target.value,
            }))
          }
          rows={5}
          value={localization?.description ?? ""}
        />
      </Section>
      <Section title="Address and access">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Address"
            onChange={(event) =>
              form.setFieldValue("addressLine", event.target.value)
            }
            value={values.addressLine}
          />
          <Field
            label="Locality"
            onChange={(event) =>
              form.setFieldValue("locality", event.target.value)
            }
            value={values.locality}
          />
          <Field
            label="Postal code"
            onChange={(event) =>
              form.setFieldValue("postalCode", event.target.value)
            }
            value={values.postalCode}
          />
        </div>
        <Field
          label={`Address as displayed — ${localeLabel[locale]}`}
          onChange={(event) =>
            updateLocalization((value) => ({
              ...value,
              addressLabel: event.target.value,
            }))
          }
          value={localization?.addressLabel ?? ""}
        />
        <TextareaField
          label={`Directions — ${localeLabel[locale]}`}
          onChange={(event) =>
            updateLocalization((value) => ({
              ...value,
              directions: event.target.value,
            }))
          }
          rows={3}
          value={localization?.directions ?? ""}
        />
        <TextareaField
          label={`Accessibility — ${localeLabel[locale]}`}
          onChange={(event) =>
            updateLocalization((value) => ({
              ...value,
              accessibility: event.target.value,
            }))
          }
          rows={3}
          value={localization?.accessibility ?? ""}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Country code"
            maxLength={2}
            onChange={(event) =>
              form.setFieldValue(
                "countryCode",
                event.target.value.toUpperCase()
              )
            }
            value={values.countryCode}
          />
          <Field
            label="Latitude"
            onChange={(event) =>
              form.setFieldValue(
                "latitude",
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            type="number"
            value={values.latitude ?? ""}
          />
          <Field
            label="Longitude"
            onChange={(event) =>
              form.setFieldValue(
                "longitude",
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            type="number"
            value={values.longitude ?? ""}
          />
        </div>
      </Section>
      <Section title="Service schedule">
        {values.services.map((service, index) => {
          const translated = service.localizations.find(
            (item) => item.language === locale
          );
          return (
            <div
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto]"
              key={service.id ?? index}
            >
              <Field
                label={`Schedule — ${localeLabel[locale]}`}
                onChange={(event) =>
                  form.setFieldValue("services", (current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            localizations: upsertLocalization(
                              item.localizations,
                              locale,
                              () => ({ language: locale, scheduleText: "" }),
                              (value) => ({
                                ...value,
                                scheduleText: event.target.value,
                              })
                            ),
                          }
                        : item
                    )
                  )
                }
                value={translated?.scheduleText ?? ""}
              />
              <Button
                aria-label="Remove service"
                onClick={() =>
                  form.setFieldValue("services", (current) =>
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
            form.setFieldValue("services", (current) => [
              ...current,
              {
                endsAt: null,
                localizations: [{ language: locale, scheduleText: "" }],
                sortOrder: current.length,
                startsAt: null,
              },
            ])
          }
          type="button"
          variant="outline"
        >
          <Plus /> Add service time
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
                kind: "website",
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
      <Section title="Primary image and gallery">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {values.media.map((item, index) => {
            const translated = item.localizations.find(
              (value) => value.language === locale
            );
            return (
              <article
                className="grid gap-2 rounded-lg border p-3"
                key={item.id ?? item.mediaId}
              >
                <img
                  alt={translated?.altText ?? ""}
                  className="aspect-video w-full rounded-md object-cover"
                  height="360"
                  src={`/api/media/${item.mediaId}`}
                  width="640"
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
              </article>
            );
          })}
        </div>
      </Section>
      <Section title="Operations">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Operational state"
            onChange={(operationalStatus) =>
              form.setFieldValue("operationalStatus", operationalStatus)
            }
            options={communityOperationalStatusOptions}
            value={values.operationalStatus}
          />
          <SelectField
            label="Community type"
            onChange={(type) => form.setFieldValue("type", type)}
            options={communityTypeOptions}
            value={values.type}
          />
        </div>
        <TextareaField
          label={`Temporary public notice — ${localeLabel[locale]}`}
          onChange={(event) =>
            updateLocalization((value) => ({
              ...value,
              operationalNotice: event.target.value,
            }))
          }
          placeholder="Use for temporary closures, relocated services, construction, or access disruptions."
          rows={3}
          value={localization?.operationalNotice ?? ""}
        />
      </Section>
      <Section title="Search and publishing">
        <div className="grid gap-4 md:grid-cols-3">
          <InputActionField
            actionLabel="Reset slug from Lithuanian name"
            actionText="Reset"
            label="URL slug"
            onAction={generateSlug}
            onChange={(event) => {
              setSlugOverride(true);
              form.setFieldValue("slug", event.target.value);
            }}
            value={values.slug}
          />
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
        <TextareaField
          label={`SEO description — ${localeLabel[locale]}`}
          onChange={(event) =>
            updateLocalization((value) => ({
              ...value,
              seoDescription: event.target.value,
            }))
          }
          rows={3}
          value={localization?.seoDescription ?? ""}
        />
      </Section>
    </form>
  );
};
