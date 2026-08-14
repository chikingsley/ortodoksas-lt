// biome-ignore-all lint/performance/noJsxPropsBind: Dynamic collection editors bind each control to its typed TanStack Form path.
import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import type {
  CommunityEditorInput,
  PersonEditorInput,
} from "@ortodoksas-lt/content/directory";
import {
  communityEditorSchema,
  personEditorSchema,
} from "@ortodoksas-lt/content/directory";
import { type SiteLocale, siteLocales } from "@ortodoksas-lt/content/site";
import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  StudioSidebar,
  type StudioView,
} from "@/editorial/shell/studio-sidebar";
import { handleImageUpload } from "@/lib/tiptap-utils";
import {
  communityDirectoryQueryOptions,
  peopleDirectoryQueryOptions,
  saveCommunityDirectoryMutation,
  savePersonDirectoryMutation,
} from "@/server/directories/directory.functions";

const emptyDocument: PersonEditorInput["localizations"][number]["biography"] = {
  content: [{ type: "paragraph" }],
  type: "doc",
};

const localeLabel: Record<SiteLocale, string> = {
  be: "Беларуская",
  en: "English",
  lt: "Lietuvių",
  ru: "Русский",
  uk: "Українська",
};

type DirectoryKind = "communities" | "people";

const studioPaths: Record<
  StudioView,
  "/articles" | "/communities" | "/homepage" | "/people"
> = {
  communities: "/communities",
  content: "/articles",
  homepage: "/homepage",
  people: "/people",
};

interface WorkspaceProps {
  kind: DirectoryKind;
  onNavigate: (view: StudioView) => void;
}

const Field = ({
  label,
  ...props
}: React.ComponentProps<typeof Input> & { label: string }) => {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <label className="grid gap-1.5 text-xs" htmlFor={id}>
      <span className="font-medium text-foreground">{label}</span>
      <Input {...props} id={id} />
    </label>
  );
};

const Section = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <section className="grid gap-4 rounded-xl border bg-card p-5">
    <h2 className="m-0 font-semibold text-base">{title}</h2>
    {children}
  </section>
);

const LocaleTabs = ({
  locale,
  onChange,
}: {
  locale: SiteLocale;
  onChange: (locale: SiteLocale) => void;
}) => (
  <fieldset
    aria-label="Content language"
    className="flex flex-wrap gap-1 border-0 p-0"
  >
    {siteLocales.map((candidate) => (
      <Button
        aria-pressed={candidate === locale}
        key={candidate}
        onClick={() => onChange(candidate)}
        size="sm"
        type="button"
        variant={candidate === locale ? "default" : "outline"}
      >
        {localeLabel[candidate]}
      </Button>
    ))}
  </fieldset>
);

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

const personDraft = (): PersonEditorInput => ({
  contacts: [],
  localizations: [
    {
      biography: emptyDocument,
      displayName: "",
      language: "lt",
      seoDescription: "",
    },
  ],
  media: [],
  positions: [],
  slug: "",
  sortOrder: 0,
  status: "draft",
});

const communityDraft = (): CommunityEditorInput => ({
  addressLine: "",
  contacts: [],
  countryCode: "LT",
  latitude: null,
  locality: "",
  localizations: [
    {
      accessibility: "",
      addressLabel: "",
      description: "",
      directions: "",
      language: "lt",
      name: "",
      operationalNotice: "",
      seoDescription: "",
    },
  ],
  longitude: null,
  media: [],
  operationalStatus: "active",
  postalCode: "",
  services: [],
  slug: "",
  sortOrder: 0,
  status: "draft",
  type: "community",
});

const PersonEditor = ({
  initialValue,
  onSaved,
}: {
  initialValue: PersonEditorInput;
  onSaved: (id: string) => Promise<void>;
}) => {
  const [locale, setLocale] = useState<SiteLocale>("lt");
  const [message, setMessage] = useState("");
  const form = useForm({
    defaultValues: initialValue,
    onSubmit: async ({ value }) => {
      setMessage("Saving…");
      try {
        const result = await savePersonDirectoryMutation({ data: value });
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
            biography: emptyDocument,
            displayName: "",
            language: locale,
            seoDescription: "",
          }),
          update
        )
      ),
    [form, locale]
  );
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
                values.localizations[0]?.displayName ||
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
    [form, locale, values.localizations]
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
        <LocaleTabs locale={locale} onChange={setLocale} />
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span aria-live="polite">{message}</span>
          <Button type="submit">
            <Save /> Save person
          </Button>
        </div>
      </div>
      <Section title="Identity and publication">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Stable slug"
            onChange={(event) => form.setFieldValue("slug", event.target.value)}
            value={values.slug}
          />
          <label className="grid gap-1.5 text-xs">
            <span className="font-medium">Publication status</span>
            <select
              className="h-8 rounded-lg border bg-background px-2"
              onChange={(event) =>
                form.setFieldValue(
                  "status",
                  event.target.value as PersonEditorInput["status"]
                )
              }
              value={values.status}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
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
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={`Display name — ${localeLabel[locale]}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                displayName: event.target.value,
              }))
            }
            value={localization?.displayName ?? ""}
          />
          <Field
            label="SEO description"
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                seoDescription: event.target.value,
              }))
            }
            value={localization?.seoDescription ?? ""}
          />
        </div>
      </Section>
      <Section title={`Biography — ${localeLabel[locale]}`}>
        <div className="[&_.simple-editor-wrapper]:overflow-hidden [&_.simple-editor-wrapper]:rounded-lg [&_.simple-editor-wrapper]:border">
          <SimpleEditor
            content={localization?.biography ?? emptyDocument}
            key={`${initialValue.id ?? "new"}-${locale}`}
            onUpdate={(biography) =>
              updateLocalization((value) => ({
                ...value,
                biography: tiptapDocumentSchema.parse(biography),
              }))
            }
          />
        </div>
      </Section>
      <Section title="Positions">
        {values.positions.map((position, index) => {
          const translated = position.localizations.find(
            (item) => item.language === locale
          );
          const updatePositionLocalization = (title: string) =>
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
                        (value) => ({ ...value, title })
                      ),
                    }
                  : item
              )
            );
          return (
            <div
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_2fr_auto]"
              key={position.id ?? index}
            >
              <Field
                label="Role key"
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
              <Field
                label={`Display title — ${localeLabel[locale]}`}
                onChange={(event) =>
                  updatePositionLocalization(event.target.value)
                }
                value={translated?.title ?? ""}
              />
              <Button
                aria-label="Remove position"
                onClick={() =>
                  form.setFieldValue("positions", (current) =>
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
              <label className="grid gap-1.5 text-xs">
                <span className="font-medium">Kind</span>
                <select
                  className="h-8 rounded-lg border bg-background px-2"
                  onChange={(event) =>
                    form.setFieldValue("contacts", (current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              kind: event.target.value as typeof item.kind,
                            }
                          : item
                      )
                    )
                  }
                  value={contact.kind}
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="website">Website</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="telegram">Telegram</option>
                  <option value="other">Other</option>
                </select>
              </label>
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
                <select
                  className="h-8 rounded-lg border bg-background px-2 text-xs"
                  onChange={(event) =>
                    form.setFieldValue("media", (current) =>
                      current.map((value, valueIndex) =>
                        valueIndex === index
                          ? {
                              ...value,
                              role: event.target.value as "primary" | "gallery",
                            }
                          : value
                      )
                    )
                  }
                  value={item.role}
                >
                  <option value="primary">Primary portrait</option>
                  <option value="gallery">Gallery</option>
                </select>
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
    </form>
  );
};

const CommunityEditor = ({
  initialValue,
  onSaved,
}: {
  initialValue: CommunityEditorInput;
  onSaved: (id: string) => Promise<void>;
}) => {
  const [locale, setLocale] = useState<SiteLocale>("lt");
  const [message, setMessage] = useState("");
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
        <LocaleTabs locale={locale} onChange={setLocale} />
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span aria-live="polite">{message}</span>
          <Button type="submit">
            <Save /> Save community
          </Button>
        </div>
      </div>
      <Section title="Community identity">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Stable slug"
            onChange={(event) => form.setFieldValue("slug", event.target.value)}
            value={values.slug}
          />
          <Field
            label={`Name — ${localeLabel[locale]}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                name: event.target.value,
              }))
            }
            value={localization?.name ?? ""}
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
          <label className="grid gap-1.5 text-xs">
            <span className="font-medium">Publication</span>
            <select
              className="h-8 rounded-lg border bg-background px-2"
              onChange={(event) =>
                form.setFieldValue(
                  "status",
                  event.target.value as CommunityEditorInput["status"]
                )
              }
              value={values.status}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs">
            <span className="font-medium">Operational state</span>
            <select
              className="h-8 rounded-lg border bg-background px-2"
              onChange={(event) =>
                form.setFieldValue(
                  "operationalStatus",
                  event.target
                    .value as CommunityEditorInput["operationalStatus"]
                )
              }
              value={values.operationalStatus}
            >
              <option value="active">Active</option>
              <option value="forming">Forming</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs">
            <span className="font-medium">Type</span>
            <select
              className="h-8 rounded-lg border bg-background px-2"
              onChange={(event) =>
                form.setFieldValue(
                  "type",
                  event.target.value as CommunityEditorInput["type"]
                )
              }
              value={values.type}
            >
              <option value="community">Community</option>
              <option value="parish">Parish</option>
              <option value="church">Church</option>
              <option value="chapel">Chapel</option>
              <option value="mission">Mission</option>
              <option value="monastery">Monastery</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1.5 text-xs">
          <span className="font-medium">
            Description — {localeLabel[locale]}
          </span>
          <textarea
            className="min-h-28 rounded-lg border bg-background p-2"
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                description: event.target.value,
              }))
            }
            value={localization?.description ?? ""}
          />
        </label>
        <label className="grid gap-1.5 text-xs">
          <span className="font-medium">
            Operational notice — {localeLabel[locale]}
          </span>
          <textarea
            className="min-h-20 rounded-lg border bg-background p-2"
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                operationalNotice: event.target.value,
              }))
            }
            value={localization?.operationalNotice ?? ""}
          />
        </label>
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
              <label className="grid gap-1.5 text-xs">
                <span className="font-medium">Kind</span>
                <select
                  className="h-8 rounded-lg border bg-background px-2"
                  onChange={(event) =>
                    form.setFieldValue("contacts", (current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              kind: event.target.value as typeof item.kind,
                            }
                          : item
                      )
                    )
                  }
                  value={contact.kind}
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="website">Website</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="telegram">Telegram</option>
                  <option value="other">Other</option>
                </select>
              </label>
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
                <select
                  className="h-8 rounded-lg border bg-background px-2 text-xs"
                  onChange={(event) =>
                    form.setFieldValue("media", (current) =>
                      current.map((value, valueIndex) =>
                        valueIndex === index
                          ? {
                              ...value,
                              role: event.target.value as "primary" | "gallery",
                            }
                          : value
                      )
                    )
                  }
                  value={item.role}
                >
                  <option value="primary">Primary image</option>
                  <option value="gallery">Gallery</option>
                </select>
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
    </form>
  );
};

const PeopleWorkspace = ({
  onNavigate,
}: Pick<WorkspaceProps, "onNavigate">) => {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(peopleDirectoryQueryOptions());
  const [selectedId, setSelectedId] = useState<string | null>(
    data.records[0]?.id ?? null
  );
  const selected = useMemo<PersonEditorInput>(() => {
    const record = data.records.find((item) => item.id === selectedId);
    if (!record) {
      return personDraft();
    }
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...person } = record;
    return personEditorSchema.parse({
      ...person,
      contacts: data.contacts
        .filter((item) => item.personId === record.id)
        .map(
          ({
            createdAt: _contactCreatedAt,
            personId: _personId,
            updatedAt: _contactUpdatedAt,
            ...item
          }) => ({
            ...item,
            localizations: data.contactLocalizations
              .filter((value) => value.personContactId === item.id)
              .map(({ personContactId: _id, ...value }) => value),
          })
        ),
      localizations: data.localizations
        .filter((item) => item.personId === record.id)
        .map(({ personId: _id, ...item }) => item),
      media: data.media
        .filter((item) => item.personId === record.id)
        .map(
          ({ createdAt: _mediaCreatedAt, personId: _personId, ...item }) => ({
            ...item,
            localizations: data.mediaLocalizations
              .filter((value) => value.personMediaId === item.id)
              .map(({ personMediaId: _id, ...value }) => value),
          })
        ),
      positions: data.positions
        .filter((item) => item.personId === record.id)
        .map(
          ({
            createdAt: _positionCreatedAt,
            personId: _personId,
            updatedAt: _positionUpdatedAt,
            ...item
          }) => ({
            ...item,
            localizations: data.positionLocalizations
              .filter((value) => value.positionId === item.id)
              .map(({ positionId: _id, ...value }) => value),
          })
        ),
    });
  }, [data, selectedId]);
  const onSaved = useCallback(
    async (id: string) => {
      await queryClient.invalidateQueries(peopleDirectoryQueryOptions());
      setSelectedId(id);
    },
    [queryClient]
  );
  return (
    <DirectoryShell
      activeView="people"
      onCreate={() => setSelectedId(null)}
      onNavigate={onNavigate}
      onSelect={setSelectedId}
      records={data.records.map((record) => ({
        id: record.id,
        label:
          data.localizations.find(
            (item) => item.personId === record.id && item.language === "lt"
          )?.displayName ?? record.slug,
      }))}
      selectedId={selectedId}
      title="People"
    >
      <PersonEditor
        initialValue={selected}
        key={selectedId ?? "new"}
        onSaved={onSaved}
      />
    </DirectoryShell>
  );
};

const CommunitiesWorkspace = ({
  onNavigate,
}: Pick<WorkspaceProps, "onNavigate">) => {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(communityDirectoryQueryOptions());
  const [selectedId, setSelectedId] = useState<string | null>(
    data.records[0]?.id ?? null
  );
  const selected = useMemo<CommunityEditorInput>(() => {
    const record = data.records.find((item) => item.id === selectedId);
    if (!record) {
      return communityDraft();
    }
    const {
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...community
    } = record;
    return communityEditorSchema.parse({
      ...community,
      contacts: data.contacts
        .filter((item) => item.communityId === record.id)
        .map(
          ({
            communityId: _communityId,
            createdAt: _contactCreatedAt,
            updatedAt: _contactUpdatedAt,
            ...item
          }) => ({
            ...item,
            localizations: data.contactLocalizations
              .filter((value) => value.communityContactId === item.id)
              .map(({ communityContactId: _id, ...value }) => value),
          })
        ),
      localizations: data.localizations
        .filter((item) => item.communityId === record.id)
        .map(({ communityId: _id, ...item }) => item),
      media: data.media
        .filter((item) => item.communityId === record.id)
        .map(
          ({
            communityId: _communityId,
            createdAt: _mediaCreatedAt,
            ...item
          }) => ({
            ...item,
            localizations: data.mediaLocalizations
              .filter((value) => value.communityMediaId === item.id)
              .map(({ communityMediaId: _id, ...value }) => value),
          })
        ),
      services: data.services
        .filter((item) => item.communityId === record.id)
        .map(
          ({
            communityId: _communityId,
            createdAt: _serviceCreatedAt,
            updatedAt: _serviceUpdatedAt,
            ...item
          }) => ({
            ...item,
            localizations: data.serviceLocalizations
              .filter((value) => value.communityServiceId === item.id)
              .map(({ communityServiceId: _id, ...value }) => value),
          })
        ),
    });
  }, [data, selectedId]);
  const onSaved = useCallback(
    async (id: string) => {
      await queryClient.invalidateQueries(communityDirectoryQueryOptions());
      setSelectedId(id);
    },
    [queryClient]
  );
  return (
    <DirectoryShell
      activeView="communities"
      onCreate={() => setSelectedId(null)}
      onNavigate={onNavigate}
      onSelect={setSelectedId}
      records={data.records.map((record) => ({
        id: record.id,
        label:
          data.localizations.find(
            (item) => item.communityId === record.id && item.language === "lt"
          )?.name ?? record.slug,
      }))}
      selectedId={selectedId}
      title="Communities"
    >
      <CommunityEditor
        initialValue={selected}
        key={selectedId ?? "new"}
        onSaved={onSaved}
      />
    </DirectoryShell>
  );
};

const DirectoryShell = ({
  activeView,
  children,
  onCreate,
  onNavigate,
  onSelect,
  records,
  selectedId,
  title,
}: {
  activeView: StudioView;
  children: React.ReactNode;
  onCreate: () => void;
  onNavigate: (view: StudioView) => void;
  onSelect: (id: string) => void;
  records: { id: string; label: string }[];
  selectedId: string | null;
  title: string;
}) => (
  <div className="grid min-h-screen grid-cols-[232px_250px_minmax(0,1fr)] max-[1000px]:grid-cols-[196px_minmax(0,1fr)]">
    <StudioSidebar activeView={activeView} onNavigate={onNavigate} />
    <aside className="border-r bg-muted/25 p-3 max-[1000px]:hidden">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="m-0 font-semibold text-sm">{title}</h1>
        <Button
          aria-label={`Add ${title.toLowerCase()}`}
          onClick={onCreate}
          size="icon-sm"
          type="button"
        >
          <Plus />
        </Button>
      </div>
      <div className="grid gap-1">
        {records.map((record) => (
          <button
            className={`rounded-md px-3 py-2 text-left text-sm ${record.id === selectedId ? "bg-accent font-medium" : "hover:bg-muted"}`}
            key={record.id}
            onClick={() => onSelect(record.id)}
            type="button"
          >
            {record.label}
          </button>
        ))}
      </div>
    </aside>
    <main className="min-w-0 overflow-hidden px-[clamp(20px,4vw,56px)] py-8">
      <div className="mx-auto max-w-5xl">{children}</div>
    </main>
  </div>
);

export const DirectoryWorkspace = ({ kind, onNavigate }: WorkspaceProps) =>
  kind === "people" ? (
    <PeopleWorkspace onNavigate={onNavigate} />
  ) : (
    <CommunitiesWorkspace onNavigate={onNavigate} />
  );

export const DirectoryRouteWorkspace = ({ kind }: { kind: DirectoryKind }) => {
  const navigate = useNavigate();
  const onNavigate = useCallback(
    (view: StudioView) =>
      navigate({
        to: studioPaths[view],
      }),
    [navigate]
  );
  return <DirectoryWorkspace kind={kind} onNavigate={onNavigate} />;
};
