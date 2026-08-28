// biome-ignore-all lint/performance/noJsxPropsBind: TanStack Form collection controls bind each input to its typed field path.
import {
  type CommunityEditorInput,
  communityEditorSchema,
  slugifyDirectoryName,
} from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useForm, useSelector } from "@tanstack/react-form";
import { useCallback, useRef, useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CommunityAddressSearch } from "@/editorial/directories/community-address-search";
import {
  CommunityOperationsFields,
  CommunityOverviewFields,
} from "@/editorial/directories/community-localized-fields";
import { CommunityServiceFields } from "@/editorial/directories/community-service-fields";
import { DirectoryContactMethods } from "@/editorial/directories/directory-contact-methods";
import { DirectoryEditorHeader } from "@/editorial/directories/directory-editor-header";
import { Section } from "@/editorial/directories/directory-form-controls";
import {
  directoryIssueMessage,
  upsertLocalization,
} from "@/editorial/directories/directory-form-data";
import { DirectoryMediaGallery } from "@/editorial/directories/directory-media-gallery";
import { DirectoryPublishingFields } from "@/editorial/directories/directory-publishing-fields";
import { DirectoryUnsavedChanges } from "@/editorial/directories/directory-unsaved-changes";
import { uploadStudioMedia } from "@/editorial/shared/media-upload";
import { normalizedFormSchema } from "@/editorial/shared/normalized-form-schema";
import type { CommunityAddressSuggestion } from "@/server/directories/community-geocoding";
import { saveCommunityDirectoryMutation } from "@/server/directories/directory.functions";

const structuredAddressFingerprint = ({
  addressLine,
  locality,
  postalCode,
}: Pick<CommunityEditorInput, "addressLine" | "locality" | "postalCode">) =>
  [addressLine, locality, postalCode]
    .map((value) => value.trim().toLocaleLowerCase("lt-LT"))
    .join("\u0000");

const createCommunityLocalization = (
  language: SiteLocale
): CommunityEditorInput["localizations"][number] => ({
  accessibility: "",
  addressLabel: "",
  description: "",
  directions: "",
  language,
  name: "",
  operationalNotice: "",
  seoDescription: "",
});

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
  const labelAddressFingerprints = useRef(
    new Map(
      initialValue.localizations
        .filter((value) => Boolean(value.addressLabel.trim()))
        .map(
          (value) =>
            [
              value.language,
              structuredAddressFingerprint(initialValue),
            ] as const
        )
    )
  );
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
        setMessage("Enter a name before saving.");
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
  const operationalStatus = useSelector(
    form.store,
    (state) => state.values.operationalStatus
  );
  const communityType = useSelector(form.store, (state) => state.values.type);
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
          () => createCommunityLocalization(locale),
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
  const selectAddress = useCallback(
    (suggestion: CommunityAddressSuggestion) => {
      const suggestionFingerprint = structuredAddressFingerprint(suggestion);
      const currentAddressFingerprint = structuredAddressFingerprint(
        form.state.values
      );
      const localizedLabelsReferenceAnotherAddress = [
        ...labelAddressFingerprints.current.values(),
      ].some((fingerprint) => fingerprint !== suggestionFingerprint);
      const physicalAddressChanged =
        currentAddressFingerprint !== suggestionFingerprint ||
        localizedLabelsReferenceAnotherAddress;
      const labelAddressFingerprint =
        labelAddressFingerprints.current.get(locale);
      form.setFieldValue("addressLine", suggestion.addressLine);
      form.setFieldValue("countryCode", suggestion.countryCode);
      form.setFieldValue("latitude", suggestion.latitude);
      form.setFieldValue("locality", suggestion.locality);
      form.setFieldValue("longitude", suggestion.longitude);
      form.setFieldValue("postalCode", suggestion.postalCode);
      form.setFieldValue("localizations", (current) => {
        const updated = upsertLocalization(
          current,
          locale,
          () => createCommunityLocalization(locale),
          (value) => {
            const preserveCuratedLabel =
              Boolean(value.addressLabel.trim()) &&
              labelAddressFingerprint === suggestionFingerprint;
            return preserveCuratedLabel
              ? value
              : { ...value, addressLabel: suggestion.addressLabel };
          }
        );
        if (!physicalAddressChanged) {
          labelAddressFingerprints.current.set(locale, suggestionFingerprint);
          return updated;
        }
        return updated.map((value) => {
          labelAddressFingerprints.current.set(
            value.language,
            suggestionFingerprint
          );
          return { ...value, addressLabel: suggestion.addressLabel };
        });
      });
      setMessage("Address details filled");
    },
    [form, locale]
  );
  const clearMapLocation = useCallback(() => {
    form.setFieldValue("latitude", null);
    form.setFieldValue("longitude", null);
    setMessage("Choose an address result to refresh map coordinates");
  }, [form]);
  const upload = useCallback(
    async (file: File) => {
      setMessage("Uploading image…");
      const uploaded = await uploadStudioMedia(file);
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
      <CommunityOverviewFields
        locale={locale}
        localization={localization}
        onDescriptionChange={(description) =>
          updateLocalization((value) => ({ ...value, description }))
        }
        onNameChange={updateName}
      />
      <Section title="Address and access">
        <CommunityAddressSearch onSelect={selectAddress} />
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
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearMapLocation();
                  }}
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
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearMapLocation();
                  }}
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
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearMapLocation();
                  }}
                  value={field.state.value}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`community-address-label-${locale}`}>
            Address as displayed
          </FieldLabel>
          <Input
            id={`community-address-label-${locale}`}
            onChange={(event) => {
              const nextLabel = event.target.value;
              if (nextLabel.trim()) {
                labelAddressFingerprints.current.set(
                  locale,
                  structuredAddressFingerprint(form.state.values)
                );
              } else {
                labelAddressFingerprints.current.delete(locale);
              }
              updateLocalization((value) => ({
                ...value,
                addressLabel: nextLabel,
              }));
            }}
            value={localization?.addressLabel ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`community-accessibility-${locale}`}>
            Accessibility
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
      </Section>
      <CommunityServiceFields
        locale={locale}
        onChange={(nextServices) =>
          form.setFieldValue("services", nextServices)
        }
        services={services}
      />
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
      <CommunityOperationsFields
        locale={locale}
        localization={localization}
        onNoticeChange={(operationalNotice) =>
          updateLocalization((value) => ({ ...value, operationalNotice }))
        }
        onOperationalStatusChange={(nextOperationalStatus) =>
          form.setFieldValue("operationalStatus", nextOperationalStatus)
        }
        onTypeChange={(type) => form.setFieldValue("type", type)}
        operationalStatus={operationalStatus}
        type={communityType}
      />
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
