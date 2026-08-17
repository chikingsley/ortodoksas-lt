// biome-ignore-all lint/performance/noJsxPropsBind: Record lists bind each row to its record identifier.
import type {
  CommunityEditorInput,
  PersonEditorInput,
} from "@ortodoksas-lt/content/directory";
import {
  communityEditorSchema,
  personEditorSchema,
  prepareDirectoryRecordForEditing,
} from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CommunityEditor } from "@/editorial/directories/community-editor";
import { PersonEditor } from "@/editorial/directories/person-editor";
import { StudioShell } from "@/editorial/shell/studio-shell";
import type { StudioView } from "@/editorial/shell/studio-sidebar";
import {
  communityDirectoryQueryOptions,
  peopleDirectoryQueryOptions,
} from "@/server/directories/directory.functions";

const TRAILING_S_PATTERN = /s$/u;
const emptyDocument: PersonEditorInput["localizations"][number]["biography"] = {
  content: [{ type: "paragraph" }],
  type: "doc",
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
  locale: SiteLocale;
  onLocaleChange: (locale: SiteLocale) => void;
  onNavigate: (view: StudioView) => void;
}

const personDraft = (): PersonEditorInput => ({
  contacts: [],
  localizations: [
    {
      alternateName: "",
      biography: emptyDocument,
      displayName: "",
      honorific: "",
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

const PeopleWorkspace = ({
  locale,
  onLocaleChange,
  onNavigate,
}: Pick<WorkspaceProps, "locale" | "onLocaleChange" | "onNavigate">) => {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(peopleDirectoryQueryOptions());
  const { data: communityData } = useSuspenseQuery(
    communityDirectoryQueryOptions()
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    data.records[0]?.id ?? null
  );
  const selected = useMemo<PersonEditorInput>(() => {
    const record = data.records.find((item) => item.id === selectedId);
    if (!record) {
      return personDraft();
    }
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...person } = record;
    return personEditorSchema.parse(
      prepareDirectoryRecordForEditing({
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
      })
    );
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
            (item) => item.personId === record.id && item.language === locale
          )?.displayName ?? record.slug,
      }))}
      selectedId={selectedId}
      title="People"
    >
      <PersonEditor
        communityOptions={communityData.records.map((record) => ({
          label:
            communityData.localizations.find(
              (item) =>
                item.communityId === record.id && item.language === locale
            )?.name ?? record.slug,
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

const CommunitiesWorkspace = ({
  locale,
  onLocaleChange,
  onNavigate,
}: Pick<WorkspaceProps, "locale" | "onLocaleChange" | "onNavigate">) => {
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
    return communityEditorSchema.parse(
      prepareDirectoryRecordForEditing({
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
      })
    );
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
            (item) => item.communityId === record.id && item.language === locale
          )?.name ?? record.slug,
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
}) => {
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const selectRecord = useCallback(
    (id: string) => {
      onSelect(id);
      setMobilePickerOpen(false);
    },
    [onSelect]
  );
  const recordList = (
    <div className="grid gap-1">
      {records.map((record) => (
        <button
          aria-current={record.id === selectedId ? "true" : undefined}
          className={`rounded-md px-3 py-2 text-left text-sm ${record.id === selectedId ? "bg-accent font-medium" : "hover:bg-muted"}`}
          key={record.id}
          onClick={() => selectRecord(record.id)}
          type="button"
        >
          {record.label}
        </button>
      ))}
    </div>
  );
  const selectedLabel =
    records.find((record) => record.id === selectedId)?.label ??
    `New ${title.toLowerCase().replace(TRAILING_S_PATTERN, "")}`;
  return (
    <StudioShell activeView={activeView} onNavigate={onNavigate}>
      <div className="grid min-h-svh min-w-0 grid-cols-[224px_minmax(0,1fr)] max-[1000px]:block">
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
          {recordList}
        </aside>
        <main className="min-w-0 px-[clamp(16px,3vw,40px)] py-6 sm:py-8">
          <div className="mx-auto mb-4 hidden max-w-6xl items-center justify-between gap-3 max-[1000px]:flex">
            <Sheet onOpenChange={setMobilePickerOpen} open={mobilePickerOpen}>
              <SheetTrigger
                render={
                  <Button className="min-w-0 max-w-full" variant="outline" />
                }
              >
                <span className="truncate">{selectedLabel}</span>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>{title}</SheetTitle>
                  <SheetDescription>
                    Choose a record to edit or create a new one.
                  </SheetDescription>
                </SheetHeader>
                <div className="overflow-y-auto px-4 pb-4">{recordList}</div>
              </SheetContent>
            </Sheet>
            <Button onClick={onCreate} size="sm" type="button">
              <Plus /> Add
            </Button>
          </div>
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </StudioShell>
  );
};

export const DirectoryWorkspace = ({
  kind,
  locale,
  onLocaleChange,
  onNavigate,
}: WorkspaceProps) =>
  kind === "people" ? (
    <PeopleWorkspace
      locale={locale}
      onLocaleChange={onLocaleChange}
      onNavigate={onNavigate}
    />
  ) : (
    <CommunitiesWorkspace
      locale={locale}
      onLocaleChange={onLocaleChange}
      onNavigate={onNavigate}
    />
  );

export const DirectoryRouteWorkspace = ({
  kind,
  locale,
  onLocaleChange,
}: {
  kind: DirectoryKind;
  locale: SiteLocale;
  onLocaleChange: (locale: SiteLocale) => void;
}) => {
  const navigate = useNavigate();
  const onNavigate = useCallback(
    (view: StudioView) => {
      if (view === "people" || view === "communities") {
        return navigate({
          search: { language: locale },
          to: studioPaths[view],
        });
      }
      return navigate({ to: studioPaths[view] });
    },
    [locale, navigate]
  );
  return (
    <DirectoryWorkspace
      kind={kind}
      locale={locale}
      onLocaleChange={onLocaleChange}
      onNavigate={onNavigate}
    />
  );
};
