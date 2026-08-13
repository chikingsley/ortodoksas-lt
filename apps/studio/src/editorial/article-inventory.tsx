import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import { FilePlus2 } from "lucide-react";
import { type ChangeEvent, useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { InventoryPanel } from "./inventory/inventory-panel";
import type { CatalogArticle } from "./types";
import type { ValueOption } from "./value-combobox";

interface Props {
  articles: CatalogArticle[];
  catalogState: "loading" | "ready" | "error";
  createError: boolean;
  creating: boolean;
  onCreate: () => void;
  onOpen: (article: CatalogArticle) => void;
}

const PAGE_SIZE = 30;
export const ArticleInventory = ({
  articles,
  catalogState,
  createError,
  creating,
  onCreate,
  onOpen,
}: Props) => {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All sections");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const inventoryArticles = useMemo(
    () =>
      articles
        .filter((article) => article.kind === "article")
        .sort((left, right) =>
          (right.published ?? "").localeCompare(left.published ?? "")
        ),
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
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("lt");
    return inventoryArticles.filter((article) => {
      const matchesSection =
        section === "All sections" || article.section === section;
      const matchesStatus =
        statusFilter === "all" || article.status === statusFilter;
      const matchesQuery =
        normalized.length === 0 ||
        `${article.title} ${article.description} ${article.labels.join(" ")}`
          .toLocaleLowerCase("lt")
          .includes(normalized);
      return matchesSection && matchesStatus && matchesQuery;
    });
  }, [inventoryArticles, query, section, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const updateQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setPage(1);
  }, []);
  const updateSection = useCallback((value: string) => {
    setSection(value);
    setPage(1);
  }, []);
  const updateStatusFilter = useCallback((value: string | number) => {
    setStatusFilter(String(value));
    setPage(1);
  }, []);
  const previousPage = useCallback(
    () => setPage((value) => Math.max(1, value - 1)),
    []
  );
  const nextPage = useCallback(
    () => setPage((value) => Math.min(pageCount, value + 1)),
    [pageCount]
  );
  return (
    <div className="mx-auto w-full max-w-[1500px] pb-[72px] max-inventory-mobile:pb-12">
      <header className="flex h-[76px] items-center justify-between gap-6 border-b px-[42px] max-inventory-mobile:h-auto max-inventory-mobile:min-h-[72px] max-inventory-compact:px-6 max-inventory-mobile:px-4">
        <div>
          <h1 className="m-0 font-[650] text-2xl tracking-[-0.03em]">
            Articles
          </h1>
          {createError ? (
            <p className="mt-1 mb-0 text-destructive text-xs" role="alert">
              The draft needs another creation attempt.
            </p>
          ) : null}
        </div>
        <Button disabled={creating} onClick={onCreate} size="lg">
          <FilePlus2 data-icon="inline-start" />
          {creating ? "Creating…" : "New article"}
        </Button>
      </header>
      <div className="pt-6">
        <InventoryPanel
          catalogState={catalogState}
          filteredCount={filtered.length}
          inventoryArticles={inventoryArticles}
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
        />
      </div>
    </div>
  );
};
