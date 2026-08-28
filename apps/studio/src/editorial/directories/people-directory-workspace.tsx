import type { PersonEditorInput } from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { DirectoryShell } from "@/editorial/directories/directory-shell";
import { PersonEditor } from "@/editorial/directories/person-editor";
import {
  communityDirectoryQueryOptions,
  peopleDirectoryQueryOptions,
} from "@/server/directories/directory.functions";

const EMPTY_DOCUMENT: PersonEditorInput["localizations"][number]["biography"] =
  {
    content: [{ type: "paragraph" }],
    type: "doc",
  };

const personDraft = (locale: SiteLocale): PersonEditorInput => ({
  contacts: [],
  localizations: [
    {
      alternateName: "",
      biography: EMPTY_DOCUMENT,
      displayName: "",
      honorific: "",
      language: locale,
      seoDescription: "",
    },
  ],
  media: [],
  positions: [],
  slug: "",
  sortOrder: 0,
  status: "draft",
});

interface Props {
  locale: SiteLocale;
  onLocaleChange: (locale: SiteLocale) => void;
  onRecordChange: (record: string, replace?: boolean) => void;
  recordKey?: string;
}

export const PeopleDirectoryWorkspace = ({
  locale,
  onLocaleChange,
  onRecordChange,
  recordKey,
}: Props) => {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(peopleDirectoryQueryOptions());
  const { data: communityData } = useSuspenseQuery(
    communityDirectoryQueryOptions()
  );
  const selectedId =
    recordKey === "new"
      ? null
      : (data.records.find((record) => record.id === recordKey)?.id ??
        data.records[0]?.id ??
        null);
  useEffect(() => {
    const normalizedRecord = selectedId ?? "new";
    if (recordKey !== normalizedRecord) {
      onRecordChange(normalizedRecord, true);
    }
  }, [onRecordChange, recordKey, selectedId]);
  const selected =
    data.records.find((record) => record.id === selectedId) ??
    personDraft(locale);
  const onSaved = useCallback(
    async (id: string) => {
      await queryClient.invalidateQueries(peopleDirectoryQueryOptions());
      onRecordChange(id, true);
    },
    [onRecordChange, queryClient]
  );
  const createRecord = useCallback(
    () => onRecordChange("new"),
    [onRecordChange]
  );

  return (
    <DirectoryShell
      onCreate={createRecord}
      onSelect={onRecordChange}
      records={data.records.map((record) => ({
        id: record.id,
        label:
          record.localizations.find((item) => item.language === locale)
            ?.displayName ?? record.slug,
      }))}
      selectedId={selectedId}
      title="People"
    >
      <PersonEditor
        communityOptions={communityData.records.map((record) => ({
          label:
            record.localizations.find((item) => item.language === locale)
              ?.name ?? record.slug,
          value: record.id,
        }))}
        initialValue={selected}
        key={selectedId ?? "new"}
        locale={locale}
        onLocaleChange={onLocaleChange}
        onSaved={onSaved}
      />
    </DirectoryShell>
  );
};
