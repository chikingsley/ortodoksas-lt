import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { type ChangeEvent, useCallback } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Section,
  SelectField,
} from "@/editorial/directories/directory-form-controls";
import { publicationStatusOptions } from "@/editorial/directories/directory-form-data";

type PublicationStatus = "archived" | "draft" | "published";
type FieldIssue = { message?: string } | undefined;

interface DirectoryPublishingFieldsProps {
  entityId: "community" | "person";
  locale: SiteLocale;
  onSeoDescriptionChange: (value: string) => void;
  onSlugBlur: () => void;
  onSlugChange: (value: string) => void;
  onSlugReset: () => void;
  onSortOrderBlur: () => void;
  onSortOrderChange: (value: number) => void;
  onStatusChange: (value: PublicationStatus) => void;
  seoDescription: string;
  slug: string;
  slugErrors: FieldIssue[];
  sortOrder: number;
  sortOrderErrors: FieldIssue[];
  status: PublicationStatus;
}

export function DirectoryPublishingFields({
  entityId,
  locale,
  onSeoDescriptionChange,
  onSlugBlur,
  onSlugChange,
  onSlugReset,
  onSortOrderBlur,
  onSortOrderChange,
  onStatusChange,
  seoDescription,
  slug,
  slugErrors,
  sortOrder,
  sortOrderErrors,
  status,
}: DirectoryPublishingFieldsProps) {
  const slugIsValid = slugErrors.length === 0;
  const sortOrderIsValid = sortOrderErrors.length === 0;
  const changeSlug = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onSlugChange(event.target.value),
    [onSlugChange]
  );
  const changeSortOrder = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onSortOrderChange(Number(event.target.value)),
    [onSortOrderChange]
  );
  const changeSeoDescription = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) =>
      onSeoDescriptionChange(event.target.value),
    [onSeoDescriptionChange]
  );

  return (
    <Section title="Search and publishing">
      <div className="grid gap-4 md:grid-cols-3">
        <Field data-invalid={!slugIsValid}>
          <FieldLabel htmlFor={`${entityId}-slug`}>URL slug</FieldLabel>
          <InputGroup>
            <InputGroupInput
              aria-invalid={!slugIsValid}
              id={`${entityId}-slug`}
              name="slug"
              onBlur={onSlugBlur}
              onChange={changeSlug}
              value={slug}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Reset slug from the current name"
                onClick={onSlugReset}
                type="button"
              >
                Reset
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError errors={slugErrors} />
        </Field>
        <SelectField
          label="Publication status"
          onChange={onStatusChange}
          options={publicationStatusOptions}
          value={status}
        />
        <Field data-invalid={!sortOrderIsValid}>
          <FieldLabel htmlFor={`${entityId}-sort-order`}>Sort order</FieldLabel>
          <Input
            aria-invalid={!sortOrderIsValid}
            id={`${entityId}-sort-order`}
            min="0"
            name="sortOrder"
            onBlur={onSortOrderBlur}
            onChange={changeSortOrder}
            type="number"
            value={sortOrder}
          />
          <FieldError errors={sortOrderErrors} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${entityId}-seo-description-${locale}`}>
          SEO description
        </FieldLabel>
        <Textarea
          id={`${entityId}-seo-description-${locale}`}
          onChange={changeSeoDescription}
          rows={3}
          value={seoDescription}
        />
      </Field>
    </Section>
  );
}
