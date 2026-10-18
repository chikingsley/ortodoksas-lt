import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import {
  createColumnHelper,
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { FilePlus2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import type { ValueOption } from "@/editorial/shared/value-combobox";
import { StudioPageHeader } from "@/editorial/shell/studio-page-header";
import { cn } from "@/lib/utils";

import type { CatalogArticle } from "../types";
import { filterArticleGroups, groupArticles } from "./article-groups";
import type { ArticleGroup } from "./article-groups";
import { InventoryPanel } from "./inventory-panel";

interface Props {
  articles: CatalogArticle[];
  catalogState: "loading" | "ready" | "error";
  contentKind: CatalogArticle["kind"];
  createError: boolean;
  creating: boolean;
  onContentKindChange: (kind: CatalogArticle["kind"]) => void;
  onCreate: (kind: CatalogArticle["kind"]) => void;
  onCreateTranslation: (
    source: CatalogArticle,
    language: "en" | "ru" | "uk" | "be"
  ) => Promise<void>;
  onOpen: (article: CatalogArticle) => void;
}

const PAGE_SIZE = 30;

const inventoryTableFeatures = tableFeatures({
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
});

const inventoryColumnHelper = createColumnHelper<
  typeof inventoryTableFeatures,
  ArticleGroup
>();

const inventoryColumns = inventoryColumnHelper.columns([
  inventoryColumnHelper.accessor("id", { header: "Editorial group" }),
]);

const contentKinds = [
  { label: "Stories", value: "article" },
  { label: "Pages", value: "page" },
] as const;

export const ArticleInventory = ({
  articles,
  catalogState,
  contentKind,
  createError,
  creating,
  onContentKindChange,
  onCreate,
  onCreateTranslation,
  onOpen,
}: Props) => {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All sections");
  const [statusFilter, setStatusFilter] = useState("all");

  const inventoryArticles = useMemo(
    () =>
      articles
        .filter((article) => article.kind === contentKind)
        .sort((left, right) =>
          (right.published ?? "").localeCompare(left.published ?? "")
        ),
    [articles, contentKind]
  );

  const contentCounts = useMemo(
    () => ({
      article: groupArticles(
        articles.filter((article) => article.kind === "article")
      ).length,
      page: groupArticles(articles.filter((article) => article.kind === "page"))
        .length,
    }),
    [articles]
  );

  const sections = useMemo(
    () =>
      getSectionOptions(inventoryArticles.map((article) => article.section)),
    [inventoryArticles]
  );

  const sectionOptions = useMemo<ValueOption[]>(
    () => [
      { label: "All sections", value: "All sections" },
      ...sections.map((item) => ({ label: item, value: item })),
    ],
    [sections]
  );

  const articleGroups = useMemo(
    () => groupArticles(inventoryArticles),
    [inventoryArticles]
  );

  const filtered = useMemo(
    () =>
      filterArticleGroups(articleGroups, {
        query,
        section,
        status: statusFilter,
      }),
    [articleGroups, query, section, statusFilter]
  );

  const table = useTable({
    columns: inventoryColumns,
    data: filtered,
    features: inventoryTableFeatures,
    getRowId: (group) => group.id,
    initialState: {
      pagination: { pageIndex: 0, pageSize: PAGE_SIZE },
    },
  });

  const visible = table.getRowModel().rows.map((row) => row.original);
  const pageCount = Math.max(1, table.getPageCount());
  const safePage = Math.min(table.state.pagination.pageIndex + 1, pageCount);

  const updateQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      table.firstPage();
    },
    [table]
  );

  const updateSection = useCallback(
    (value: string) => {
      setSection(value);
      table.firstPage();
    },
    [table]
  );

  const updateStatusFilter = useCallback(
    (value: string | number) => {
      setStatusFilter(String(value));
      table.firstPage();
    },
    [table]
  );

  const previousPage = useCallback(() => {
    table.previousPage();
  }, [table]);
  const nextPage = useCallback(() => {
    table.nextPage();
  }, [table]);

  const selectContentKind = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const nextKind = event.currentTarget.value as CatalogArticle["kind"];
      onContentKindChange(nextKind);
      setQuery("");
      setSection("All sections");
      setStatusFilter("all");
      table.firstPage();
    },
    [onContentKindChange, table]
  );

  const createSelectedKind = useCallback(() => {
    onCreate(contentKind);
  }, [contentKind, onCreate]);

  const singularLabel = contentKind === "page" ? "page" : "story";
  const pluralLabel = contentKind === "page" ? "pages" : "stories";

  return (
    <div className="max-inventory-mobile:pb-12 mx-auto w-full max-w-[1500px] pb-[72px]">
      <StudioPageHeader className="max-inventory-phone:flex-wrap max-inventory-phone:gap-2 max-inventory-phone:py-3">
        <div className="max-inventory-phone:gap-3 flex min-w-0 items-center gap-5">
          <h1 className="m-0 text-2xl font-[650] tracking-[-0.03em]">
            Content
          </h1>
          <fieldset className="bg-muted flex h-9 items-center rounded-lg p-1">
            <legend className="sr-only">Content type</legend>
            {contentKinds.map((item) => {
              const active = item.value === contentKind;

              return (
                <button
                  aria-pressed={active}
                  className={cn(
                    "text-muted-foreground hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border-0 bg-transparent px-2.5 text-xs font-medium transition-colors",
                    active &&
                      "bg-card text-foreground shadow-[0_1px_2px_rgb(17_17_17/0.08)]"
                  )}
                  key={item.value}
                  onClick={selectContentKind}
                  type="button"
                  value={item.value}
                >
                  {item.label}
                  <span className="text-muted-foreground text-[10px] tabular-nums">
                    {contentCounts[item.value].toLocaleString("en-US")}
                  </span>
                </button>
              );
            })}
          </fieldset>
        </div>
        <div className="max-inventory-phone:ml-auto flex flex-col items-end gap-1">
          <Button disabled={creating} onClick={createSelectedKind} size="lg">
            <FilePlus2 data-icon="inline-start" />
            {creating ? "Creating…" : `New ${singularLabel}`}
          </Button>
          {createError ? (
            <p className="text-destructive m-0 text-xs" role="alert">
              The draft needs another creation attempt.
            </p>
          ) : null}
        </div>
      </StudioPageHeader>
      <div>
        <InventoryPanel
          articleGroups={articleGroups}
          catalogState={catalogState}
          contentLabel={singularLabel}
          filteredCount={filtered.length}
          onCreateTranslation={onCreateTranslation}
          onNextPage={nextPage}
          onOpen={onOpen}
          onPreviousPage={previousPage}
          onQueryChange={updateQuery}
          onSectionChange={updateSection}
          onStatusChange={updateStatusFilter}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          query={query}
          safePage={safePage}
          section={section}
          sectionOptions={sectionOptions}
          statusFilter={statusFilter}
          visible={visible}
          visibleLabel={pluralLabel}
        />
      </div>
    </div>
  );
};
