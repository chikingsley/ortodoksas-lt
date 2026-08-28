import type { CommunityEditorInput } from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { type ChangeEvent, useCallback } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Section,
  SelectField,
} from "@/editorial/directories/directory-form-controls";

type Localization = CommunityEditorInput["localizations"][number];

const operationalStatusOptions = [
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

interface OverviewProps {
  locale: SiteLocale;
  localization?: Localization;
  onDescriptionChange: (description: string) => void;
  onNameChange: (name: string) => void;
}

export function CommunityOverviewFields({
  locale,
  localization,
  onDescriptionChange,
  onNameChange,
}: OverviewProps) {
  const changeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onNameChange(event.target.value),
    [onNameChange]
  );
  const changeDescription = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) =>
      onDescriptionChange(event.target.value),
    [onDescriptionChange]
  );

  return (
    <Section title="Overview">
      <Field>
        <FieldLabel htmlFor={`community-name-${locale}`}>Name</FieldLabel>
        <Input
          id={`community-name-${locale}`}
          onChange={changeName}
          value={localization?.name ?? ""}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`community-description-${locale}`}>
          Description
        </FieldLabel>
        <Textarea
          id={`community-description-${locale}`}
          onChange={changeDescription}
          rows={5}
          value={localization?.description ?? ""}
        />
      </Field>
    </Section>
  );
}

interface OperationsProps {
  locale: SiteLocale;
  localization?: Localization;
  onNoticeChange: (notice: string) => void;
  onOperationalStatusChange: (
    value: CommunityEditorInput["operationalStatus"]
  ) => void;
  onTypeChange: (value: CommunityEditorInput["type"]) => void;
  operationalStatus: CommunityEditorInput["operationalStatus"];
  type: CommunityEditorInput["type"];
}

export function CommunityOperationsFields({
  locale,
  localization,
  onNoticeChange,
  onOperationalStatusChange,
  onTypeChange,
  operationalStatus,
  type,
}: OperationsProps) {
  const changeNotice = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) =>
      onNoticeChange(event.target.value),
    [onNoticeChange]
  );

  return (
    <Section title="Operations">
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Operational state"
          onChange={onOperationalStatusChange}
          options={operationalStatusOptions}
          value={operationalStatus}
        />
        <SelectField
          label="Community type"
          onChange={onTypeChange}
          options={communityTypeOptions}
          value={type}
        />
      </div>
      <Field>
        <FieldLabel htmlFor={`community-notice-${locale}`}>
          Temporary public notice
        </FieldLabel>
        <Textarea
          id={`community-notice-${locale}`}
          onChange={changeNotice}
          placeholder="Use for temporary closures, relocated services, construction, or access disruptions."
          rows={3}
          value={localization?.operationalNotice ?? ""}
        />
      </Field>
    </Section>
  );
}
