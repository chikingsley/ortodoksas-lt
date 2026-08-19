// biome-ignore-all lint/performance/noJsxPropsBind: TanStack Form collection controls bind each input to its typed field path.
import {
  type CommunityEditorInput,
  communityEditorSchema,
  slugifyDirectoryName,
} from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useForm, useSelector } from "@tanstack/react-form";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DirectoryContactMethods } from "@/editorial/directories/directory-contact-methods";
import { DirectoryEditorHeader } from "@/editorial/directories/directory-editor-header";
import {
  localeLabel,
  Section,
  SelectField,
} from "@/editorial/directories/directory-form-controls";
import {
  directoryIssueMessage,
  normalizedFormSchema,
  upsertLocalization,
} from "@/editorial/directories/directory-form-data";
import { DirectoryMediaGallery } from "@/editorial/directories/directory-media-gallery";
import { DirectoryPublishingFields } from "@/editorial/directories/directory-publishing-fields";
import { DirectoryUnsavedChanges } from "@/editorial/directories/directory-unsaved-changes";
import { handleImageUpload } from "@/lib/tiptap-utils";
import { saveCommunityDirectoryMutation } from "@/server/directories/directory.functions";

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
        form.reset({ ...value, id: result.id });
        await onSaved(result.id);
        setMessage("Saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Save failed");
      }
    },
    onSubmitInvalid: ({ value }) => {
      const activeLocalization = value.localizations.find(
        (item) => item.language === locale
      );
      if (!activeLocalization?.name.trim()) {
        setMessage(`Enter a name in ${localeLabel[locale]} before saving.`);
        return;
      }
      const result = communityEditorSchema.safeParse(value);
      const issue = result.success ? undefined : result.error.issues[0];
      setMessage(directoryIssueMessage(issue));
    },
    validators: {
      onSubmit: normalizedFormSchema(communityEditorSchema),
    },
  });
  const localizations = useSelector(
    form.store,
    (state) => state.values.localizations
  );
  const services = useSelector(form.store, (state) => state.values.services);
  const localization = localizations.find((value) => value.language === locale);
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
      if (!slugOverride) {
        form.setFieldValue("slug", slugifyDirectoryName(name));
      }
    },
    [form, slugOverride, updateLocalization]
  );
  const generateSlug = useCallback(() => {
    const sourceName =
      localizations.find((value) => value.language === "lt")?.name ??
      localization?.name;
    form.setFieldValue("slug", slugifyDirectoryName(sourceName ?? ""));
    setSlugOverride(false);
  }, [form, localization?.name, localizations]);
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
      <form.Subscribe
        selector={(state) => [
          state.canSubmit,
          state.isDirty,
          state.isSubmitting,
        ]}
      >
        {([canSubmit, isDirty, isSubmitting]) => (
          <DirectoryEditorHeader
            canSubmit={canSubmit}
            isDirty={isDirty}
            isSubmitting={isSubmitting}
            locale={locale}
            message={message}
            onLocaleChange={onLocaleChange}
            recordTitle={
              localization?.name || initialValue.slug || "New community"
            }
            saveLabel="Save community"
          />
        )}
      </form.Subscribe>
      <form.Subscribe selector={(state) => state.isDirty}>
        {(isDirty) => <DirectoryUnsavedChanges isDirty={isDirty} />}
      </form.Subscribe>
      <Section title="Overview">
        <Field>
          <FieldLabel htmlFor={`community-name-${locale}`}>
            Name — {localeLabel[locale]}
          </FieldLabel>
          <Input
            id={`community-name-${locale}`}
            onChange={(event) => updateName(event.target.value)}
            value={localization?.name ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`community-description-${locale}`}>
            Description — {localeLabel[locale]}
          </FieldLabel>
          <Textarea
            id={`community-description-${locale}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                description: event.target.value,
              }))
            }
            rows={5}
            value={localization?.description ?? ""}
          />
        </Field>
      </Section>
      <Section title="Address and access">
        <div className="grid gap-4 md:grid-cols-3">
          <form.Field name="addressLine">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Address</FieldLabel>
                <Input
                  aria-invalid={!field.state.meta.isValid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <form.Field name="locality">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Locality</FieldLabel>
                <Input
                  aria-invalid={!field.state.meta.isValid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <form.Field name="postalCode">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Postal code</FieldLabel>
                <Input
                  aria-invalid={!field.state.meta.isValid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`community-address-label-${locale}`}>
            Address as displayed — {localeLabel[locale]}
          </FieldLabel>
          <Input
            id={`community-address-label-${locale}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                addressLabel: event.target.value,
              }))
            }
            value={localization?.addressLabel ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`community-directions-${locale}`}>
            Directions — {localeLabel[locale]}
          </FieldLabel>
          <Textarea
            id={`community-directions-${locale}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                directions: event.target.value,
              }))
            }
            rows={3}
            value={localization?.directions ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`community-accessibility-${locale}`}>
            Accessibility — {localeLabel[locale]}
          </FieldLabel>
          <Textarea
            id={`community-accessibility-${locale}`}
            onChange={(event) =>
              updateLocalization((value) => ({
                ...value,
                accessibility: event.target.value,
              }))
            }
            rows={3}
            value={localization?.accessibility ?? ""}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <form.Field name="countryCode">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Country code</FieldLabel>
                <Input
                  aria-invalid={!field.state.meta.isValid}
                  id={field.name}
                  maxLength={2}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(event.target.value.toUpperCase())
                  }
                  value={field.state.value}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <form.Field name="latitude">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Latitude</FieldLabel>
                <Input
                  aria-invalid={!field.state.meta.isValid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                  type="number"
                  value={field.state.value ?? ""}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <form.Field name="longitude">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Longitude</FieldLabel>
                <Input
                  aria-invalid={!field.state.meta.isValid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                  type="number"
                  value={field.state.value ?? ""}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>
      </Section>
      <Section title="Service schedule">
        {services.map((service, index) => {
          const translated = service.localizations.find(
            (item) => item.language === locale
          );
          const serviceId = service.id ?? String(index);
          return (
            <div
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto]"
              key={service.id ?? index}
            >
              <Field>
                <FieldLabel htmlFor={`service-${serviceId}-${locale}`}>
                  Schedule — {localeLabel[locale]}
                </FieldLabel>
                <Input
                  id={`service-${serviceId}-${locale}`}
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
              </Field>
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
      <form.Field name="contacts">
        {(field) => (
          <DirectoryContactMethods
            contacts={field.state.value}
            locale={locale}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <form.Field name="media">
        {(field) => (
          <DirectoryMediaGallery
            imageClassName="aspect-video object-cover"
            locale={locale}
            media={field.state.value}
            onChange={field.handleChange}
            onUpload={upload}
            onUploadError={setMessage}
            requirement="Published communities require one primary image."
            title="Primary image and gallery"
          />
        )}
      </form.Field>
      <Section title="Operations">
        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="operationalStatus">
            {(field) => (
              <SelectField
                label="Operational state"
                onChange={field.handleChange}
                options={communityOperationalStatusOptions}
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field name="type">
            {(field) => (
              <SelectField
                label="Community type"
                onChange={field.handleChange}
                options={communityTypeOptions}
                value={field.state.value}
              />
            )}
          </form.Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`community-notice-${locale}`}>
            Temporary public notice — {localeLabel[locale]}
          </FieldLabel>
          <Textarea
            id={`community-notice-${locale}`}
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
        </Field>
      </Section>
      <form.Field name="slug">
        {(slugField) => (
          <form.Field name="status">
            {(statusField) => (
              <form.Field name="sortOrder">
                {(sortOrderField) => (
                  <DirectoryPublishingFields
                    entityId="community"
                    locale={locale}
                    onSeoDescriptionChange={(seoDescription) =>
                      updateLocalization((value) => ({
                        ...value,
                        seoDescription,
                      }))
                    }
                    onSlugBlur={slugField.handleBlur}
                    onSlugChange={(slug) => {
                      setSlugOverride(true);
                      slugField.handleChange(slug);
                    }}
                    onSlugReset={generateSlug}
                    onSortOrderBlur={sortOrderField.handleBlur}
                    onSortOrderChange={sortOrderField.handleChange}
                    onStatusChange={statusField.handleChange}
                    seoDescription={localization?.seoDescription ?? ""}
                    slug={slugField.state.value}
                    slugErrors={slugField.state.meta.errors}
                    sortOrder={sortOrderField.state.value}
                    sortOrderErrors={sortOrderField.state.meta.errors}
                    status={statusField.state.value}
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        )}
      </form.Field>
    </form>
  );
};
