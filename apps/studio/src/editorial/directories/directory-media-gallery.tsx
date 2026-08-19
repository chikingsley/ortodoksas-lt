// biome-ignore-all lint/performance/noJsxPropsBind: Each collection row binds controls to its own index.
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  localeLabel,
  Section,
  SelectField,
} from "@/editorial/directories/directory-form-controls";
import {
  mediaRoleOptions,
  upsertLocalization,
} from "@/editorial/directories/directory-form-data";
import { cn } from "@/lib/utils";

export interface DirectoryMediaItem {
  id?: string;
  localizations: {
    altText: string;
    caption: string;
    language: SiteLocale;
  }[];
  mediaId: string;
  role: "gallery" | "primary";
  sortOrder: number;
}

interface DirectoryMediaGalleryProps {
  imageClassName: string;
  locale: SiteLocale;
  media: DirectoryMediaItem[];
  onChange: (media: DirectoryMediaItem[]) => void;
  onUpload: (file: File) => Promise<void>;
  onUploadError: (message: string) => void;
  requirement: string;
  title: string;
}

export function DirectoryMediaGallery({
  imageClassName,
  locale,
  media,
  onChange,
  onUpload,
  onUploadError,
  requirement,
  title,
}: DirectoryMediaGalleryProps) {
  return (
    <Section title={title}>
      <p className="m-0 text-muted-foreground text-sm">{requirement}</p>
      <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm">
        <ImagePlus className="size-4" /> Upload image
        <input
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onUpload(file).catch((error) =>
                onUploadError(
                  error instanceof Error ? error.message : "Upload failed"
                )
              );
            }
          }}
          type="file"
        />
      </label>
      <div className="grid gap-4">
        {media.map((item, index) => {
          const translated = item.localizations.find(
            (value) => value.language === locale
          );
          return (
            <article
              className="grid gap-4 border-t pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(160px,220px)_minmax(0,1fr)]"
              key={item.id ?? item.mediaId}
            >
              <img
                alt={translated?.altText ?? ""}
                className={cn("w-full rounded-lg bg-muted/35", imageClassName)}
                height="640"
                src={`/api/media/${item.mediaId}`}
                width="640"
              />
              <div className="grid content-start gap-3">
                <SelectField
                  label="Image role"
                  onChange={(role) =>
                    onChange(
                      media.map((value, valueIndex) =>
                        valueIndex === index ? { ...value, role } : value
                      )
                    )
                  }
                  options={mediaRoleOptions}
                  value={item.role}
                />
                <Field>
                  <FieldLabel htmlFor={`media-${item.mediaId}-alt`}>
                    Alt text — {localeLabel[locale]}
                  </FieldLabel>
                  <Input
                    id={`media-${item.mediaId}-alt`}
                    onChange={(event) =>
                      onChange(
                        media.map((value, valueIndex) =>
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
                </Field>
                <Field>
                  <FieldLabel htmlFor={`media-${item.mediaId}-caption`}>
                    Caption — {localeLabel[locale]}
                  </FieldLabel>
                  <Textarea
                    id={`media-${item.mediaId}-caption`}
                    onChange={(event) =>
                      onChange(
                        media.map((value, valueIndex) =>
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
                </Field>
                <Button
                  className="justify-self-start"
                  onClick={() =>
                    onChange(
                      media
                        .filter((_, valueIndex) => valueIndex !== index)
                        .map((value, valueIndex) => ({
                          ...value,
                          sortOrder: valueIndex,
                        }))
                    )
                  }
                  type="button"
                  variant="ghost"
                >
                  <Trash2 /> Remove
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
