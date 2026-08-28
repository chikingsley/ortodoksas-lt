import type { CommunityEditorInput } from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { CommunityEditor } from "@/editorial/directories/community-editor";
import { DirectoryShell } from "@/editorial/directories/directory-shell";
import { communityDirectoryQueryOptions } from "@/server/directories/directory.functions";

const communityDraft = (locale: SiteLocale): CommunityEditorInput => ({
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
      language: locale,
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

interface Props {
  locale: SiteLocale;
  onLocaleChange: (locale: SiteLocale) => void;
  onRecordChange: (record: string, replace?: boolean) => void;
  recordKey?: string;
}

export const CommunitiesDirectoryWorkspace = ({
  locale,
  onLocaleChange,
  onRecordChange,
  recordKey,
}: Props) => {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(communityDirectoryQueryOptions());
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
    communityDraft(locale);
  const onSaved = useCallback(
    async (id: string) => {
      await queryClient.invalidateQueries(communityDirectoryQueryOptions());
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
          record.localizations.find((item) => item.language === locale)?.name ??
          record.slug,
      }))}
      selectedId={selectedId}
      title="Communities"
    >
      <CommunityEditor
        initialValue={selected}
        key={selectedId ?? "new"}
        locale={locale}
        onLocaleChange={onLocaleChange}
        onSaved={onSaved}
      />
    </DirectoryShell>
  );
};
