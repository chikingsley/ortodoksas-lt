// biome-ignore-all lint/performance/noJsxPropsBind: TanStack Form collection controls bind each input to its typed field path.
import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import {
  type PersonEditorInput,
  personEditorSchema,
  slugifyDirectoryName,
} from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useForm, useSelector } from "@tanstack/react-form";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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

const dateInputValue = (timestamp: number | null) =>
  timestamp === null ? "" : new Date(timestamp).toISOString().slice(0, 10);

const dateTimestamp = (value: string) =>
  value ? Date.parse(`${value}T00:00:00.000Z`) : null;

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
        {positions.map((position, index) => {
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
          const positionId = position.id ?? String(index);
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
                    disabled={index === positions.length - 1}
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
                <Field>
                  <FieldLabel htmlFor={`position-${positionId}-role`}>
                    Internal role key
                  </FieldLabel>
                  <Input
                    id={`position-${positionId}-role`}
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
                </Field>
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
              <Field>
                <FieldLabel htmlFor={`position-${positionId}-title-${locale}`}>
                  Display title
                </FieldLabel>
                <Input
                  id={`position-${positionId}-title-${locale}`}
                  onChange={(event) =>
                    updatePositionLocalization((value) => ({
                      ...value,
                      title: event.target.value,
                    }))
                  }
                  value={translated?.title ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel
                  htmlFor={`position-${positionId}-description-${locale}`}
                >
                  Description
                </FieldLabel>
                <Textarea
                  id={`position-${positionId}-description-${locale}`}
                  onChange={(event) =>
                    updatePositionLocalization((value) => ({
                      ...value,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  value={translated?.description ?? ""}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`position-${positionId}-start`}>
                    Start date
                  </FieldLabel>
                  <Input
                    id={`position-${positionId}-start`}
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
                </Field>
                <Field>
                  <FieldLabel htmlFor={`position-${positionId}-end`}>
                    End date
                  </FieldLabel>
                  <Input
                    id={`position-${positionId}-end`}
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
                </Field>
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
