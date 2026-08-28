// biome-ignore-all lint/performance/noJsxPropsBind: TanStack Form collection controls bind each input to its typed field path.
import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import {
  type PersonEditorInput,
  personEditorSchema,
  slugifyDirectoryName,
} from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useForm, useSelector } from "@tanstack/react-form";
import { useCallback, useState } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DirectoryContactMethods } from "@/editorial/directories/directory-contact-methods";
import { DirectoryEditorHeader } from "@/editorial/directories/directory-editor-header";
import {
  localeLabel,
  Section,
} from "@/editorial/directories/directory-form-controls";
import {
  directoryIssueMessage,
  upsertLocalization,
} from "@/editorial/directories/directory-form-data";
import { DirectoryMediaGallery } from "@/editorial/directories/directory-media-gallery";
import { DirectoryPublishingFields } from "@/editorial/directories/directory-publishing-fields";
import { DirectoryUnsavedChanges } from "@/editorial/directories/directory-unsaved-changes";
import { PersonPositionsFields } from "@/editorial/directories/person-positions-fields";
import { EditorialRichTextEditor } from "@/editorial/shared/editorial-rich-text-editor";
import { uploadStudioMedia } from "@/editorial/shared/media-upload";
import { normalizedFormSchema } from "@/editorial/shared/normalized-form-schema";
import { savePersonDirectoryMutation } from "@/server/directories/directory.functions";

const emptyDocument: PersonEditorInput["localizations"][number]["biography"] = {
  content: [{ type: "paragraph" }],
  type: "doc",
};

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

interface DirectoryOption {
  label: string;
  value: string;
}

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
        form.reset({ ...preparedValue, id: result.id });
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
      if (!activeLocalization?.displayName.trim()) {
        setMessage("Enter a display name before saving.");
        return;
      }
      const result = personEditorSchema.safeParse(value);
      const issue = result.success ? undefined : result.error.issues[0];
      setMessage(directoryIssueMessage(issue));
    },
    validators: {
      onSubmit: normalizedFormSchema(personEditorSchema),
    },
  });
  const localizations = useSelector(
    form.store,
    (state) => state.values.localizations
  );
  const positions = useSelector(form.store, (state) => state.values.positions);
  const localization = localizations.find((value) => value.language === locale);
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
      if (!slugOverride) {
        form.setFieldValue("slug", slugifyDirectoryName(displayName));
      }
    },
    [form, slugOverride, updateLocalization]
  );
  const generateSlug = useCallback(() => {
    const sourceName =
      localizations.find((value) => value.language === "lt")?.displayName ??
      localization?.displayName;
    form.setFieldValue("slug", slugifyDirectoryName(sourceName ?? ""));
    setSlugOverride(false);
  }, [form, localization?.displayName, localizations]);
  const upload = useCallback(
    async (file: File) => {
      setMessage("Uploading image…");
      const uploaded = await uploadStudioMedia(file);
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
              localization?.displayName || initialValue.slug || "New person"
            }
            saveLabel="Save person"
          />
        )}
      </form.Subscribe>
      <form.Subscribe selector={(state) => state.isDirty}>
        {(isDirty) => <DirectoryUnsavedChanges isDirty={isDirty} />}
      </form.Subscribe>
      <Section title="Profile">
        <div className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={`person-honorific-${locale}`}>
              Honorific
            </FieldLabel>
            <Input
              id={`person-honorific-${locale}`}
              onChange={(event) =>
                updateLocalization((value) => ({
                  ...value,
                  honorific: event.target.value,
                }))
              }
              value={localization?.honorific ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`person-display-name-${locale}`}>
              Display name
            </FieldLabel>
            <Input
              id={`person-display-name-${locale}`}
              onChange={(event) => updateDisplayName(event.target.value)}
              value={localization?.displayName ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`person-alternate-name-${locale}`}>
              Civil or alternate name
            </FieldLabel>
            <Input
              id={`person-alternate-name-${locale}`}
              onChange={(event) =>
                updateLocalization((value) => ({
                  ...value,
                  alternateName: event.target.value,
                }))
              }
              value={localization?.alternateName ?? ""}
            />
          </Field>
        </div>
      </Section>
      <Section title="Biography">
        <EditorialRichTextEditor
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
          purpose="biography"
        />
      </Section>
      <PersonPositionsFields
        communityOptions={communityOptions}
        locale={locale}
        onChange={(nextPositions) =>
          form.setFieldValue("positions", nextPositions)
        }
        positions={positions}
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
            imageClassName="aspect-square object-contain"
            locale={locale}
            media={field.state.value}
            onChange={field.handleChange}
            onUpload={upload}
            onUploadError={setMessage}
            requirement="Published people require one primary portrait."
            title="Portrait and gallery"
          />
        )}
      </form.Field>
      <form.Field name="slug">
        {(slugField) => (
          <form.Field name="status">
            {(statusField) => (
              <form.Field name="sortOrder">
                {(sortOrderField) => (
                  <DirectoryPublishingFields
                    entityId="person"
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
