import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

import type { CatalogArticle } from "../types";
import { ValueCombobox, type ValueOption } from "../value-combobox";
import { ArticleRow } from "./article-row";

interface Props {
  catalogState: "loading" | "ready" | "error";
  filteredCount: number;
  inventoryArticles: CatalogArticle[];
  onNextPage: () => void;
  onOpen: (article: CatalogArticle) => void;
  onPreviousPage: () => void;
  onQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSectionChange: (value: string) => void;
  onStatusChange: (value: string | number) => void;
  pageCount: number;
  pageSize: number;
  query: string;
  safePage: number;
  section: string;
  sectionOptions: ValueOption[];
  statusFilter: string;
  visible: CatalogArticle[];
}

const tabClass =
  "relative flex h-[50px] items-center gap-2 border-0 bg-transparent px-0 pt-px pb-0 text-xs font-medium text-muted-foreground data-active:text-primary data-active:after:absolute data-active:after:right-0 data-active:after:bottom-[-1px] data-active:after:left-0 data-active:after:h-0.5 data-active:after:bg-primary data-active:after:content-[''] max-sm:h-10 max-sm:w-full [&_span]:rounded-sm [&_span]:bg-muted [&_span]:px-1.5 [&_span]:py-0.5 [&_span]:text-[10px]";

const headerCellClass =
  "h-10 border-b bg-muted/40 px-3 py-0 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide max-sm:hidden";

export function InventoryPanel({
  catalogState,
  filteredCount,
  inventoryArticles,
  onNextPage,
  onOpen,
  onPreviousPage,
  onQueryChange,
  onSectionChange,
  onStatusChange,
  pageCount,
  pageSize,
  query,
  safePage,
  section,
  sectionOptions,
  statusFilter,
  visible,
}: Props) {
  const publishedCount = inventoryArticles.filter(
    (article) => article.status === "published"
  ).length;
  const draftCount = inventoryArticles.filter(
    (article) => article.status === "draft"
  ).length;

  return (
    <section
      aria-label="Article inventory"
      className="overflow-hidden rounded-lg border bg-card shadow-xs"
    >
      <Tabs.Root onValueChange={onStatusChange} value={statusFilter}>
        <Tabs.List className="flex h-[51px] items-end gap-6 border-b px-5 max-sm:grid max-sm:h-auto max-sm:grid-cols-2 max-sm:gap-x-5 max-sm:gap-y-0 max-sm:pt-1">
          <Tabs.Tab className={tabClass} value="all">
            All <span>{inventoryArticles.length.toLocaleString("en-US")}</span>
          </Tabs.Tab>
          <Tabs.Tab className={tabClass} value="published">
            Published <span>{publishedCount.toLocaleString("en-US")}</span>
          </Tabs.Tab>
          <Tabs.Tab className={tabClass} value="draft">
            Drafts <span>{draftCount}</span>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={statusFilter}>
          <div className="grid grid-cols-[minmax(300px,1fr)_180px_auto] items-center gap-2 border-b px-4 py-3 max-sm:grid-cols-1 max-md:grid-cols-[1fr_160px]">
            <InputGroup className="h-9 bg-card">
              <InputGroupAddon className="pl-2.5">
                <Search className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Search articles"
                className="h-8 px-0 text-xs"
                onChange={onQueryChange}
                placeholder="Search by title, text, or tag…"
                type="search"
                value={query}
              />
              <InputGroupAddon align="inline-end" className="pr-2.5">
                <kbd className="rounded-sm border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  ⌘ K
                </kbd>
              </InputGroupAddon>
            </InputGroup>
            <ValueCombobox
              ariaLabel="Filter by section"
              className="max-sm:hidden [&_[data-slot=input-group]]:h-9 [&_[data-slot=input-group]]:w-full"
              onChange={onSectionChange}
              options={sectionOptions}
              value={section}
            />
            <Button
              className="h-9 px-3 text-xs max-md:hidden [&_svg]:w-3.5"
              type="button"
              variant="outline"
            >
              <Filter /> More filters
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed border-collapse max-sm:min-w-0 max-sm:table-auto max-md:min-w-[650px]">
              <thead>
                <tr>
                  <th className={`${headerCellClass} w-[42px] pr-1 pl-4`}>
                    <input
                      aria-label="Select all"
                      className="size-3.5 accent-primary"
                      type="checkbox"
                    />
                  </th>
                  <th className={`${headerCellClass} w-[48%]`}>
                    <button
                      className="flex items-center gap-1.5 border-0 bg-transparent font-inherit text-inherit uppercase [&_svg]:w-3"
                      type="button"
                    >
                      Article <ArrowDown />
                    </button>
                  </th>
                  <th className={`${headerCellClass} w-[72px]`}>Language</th>
                  <th className={`${headerCellClass} w-[145px] max-md:hidden`}>
                    Section
                  </th>
                  <th className={`${headerCellClass} w-[120px] max-md:hidden`}>
                    Status
                  </th>
                  <th className={`${headerCellClass} w-[118px]`}>Published</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((article) => (
                  <ArticleRow
                    article={article}
                    key={article.path}
                    onOpen={onOpen}
                  />
                ))}
              </tbody>
            </table>
            {catalogState === "loading" ? (
              <div className="px-5 py-16 text-center text-[13px] text-muted-foreground">
                Loading the complete archive…
              </div>
            ) : null}
            {catalogState === "error" ? (
              <div className="px-5 py-16 text-center text-[13px] text-destructive">
                The archive could not be loaded. Refresh the page.
              </div>
            ) : null}
            {catalogState === "ready" && visible.length === 0 ? (
              <div className="px-5 py-16 text-center text-[13px] text-muted-foreground">
                No articles match these filters.
              </div>
            ) : null}
          </div>

          <footer className="flex min-h-[52px] items-center justify-between gap-4 bg-muted/40 px-4 max-sm:items-start max-sm:px-3.5 max-sm:py-3">
            <p className="m-0 text-[11px] text-muted-foreground max-sm:max-w-40 max-sm:leading-snug">
              Showing {filteredCount === 0 ? 0 : (safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredCount)} of{" "}
              {filteredCount.toLocaleString("en-US")}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Button
                aria-label="Previous page"
                className="size-7"
                disabled={safePage === 1}
                onClick={onPreviousPage}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <ChevronLeft />
              </Button>
              <span>
                {safePage} / {pageCount}
              </span>
              <Button
                aria-label="Next page"
                className="size-7"
                disabled={safePage === pageCount}
                onClick={onNextPage}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <ChevronRight />
              </Button>
            </div>
          </footer>
        </Tabs.Panel>
      </Tabs.Root>
    </section>
  );
}
