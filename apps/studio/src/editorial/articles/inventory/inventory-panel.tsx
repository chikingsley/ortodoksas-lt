import { Tabs } from "@base-ui/react/tabs";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  ValueCombobox,
  type ValueOption,
} from "@/editorial/shared/value-combobox";

import type { CatalogArticle } from "../types";
import type { ArticleGroup } from "./article-groups";
import { groupPagesByRole } from "./article-groups";
import { ArticleRow } from "./article-row";

interface Props {
  articleGroups: ArticleGroup[];
  catalogState: "loading" | "ready" | "error";
  contentLabel: "page" | "story";
  filteredCount: number;
  onCreateTranslation: (
    source: CatalogArticle,
    language: "en" | "ru" | "uk" | "be"
  ) => Promise<void>;
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
  visible: ArticleGroup[];
  visibleLabel: "pages" | "stories";
}

const tabClass =
  "relative flex h-[50px] items-center gap-2 border-0 bg-transparent px-0 pt-px pb-0 text-xs font-medium text-muted-foreground data-active:text-primary data-active:after:absolute data-active:after:right-0 data-active:after:bottom-[-1px] data-active:after:left-0 data-active:after:h-0.5 data-active:after:bg-primary data-active:after:content-[''] max-sm:h-10 max-sm:w-full [&_span]:rounded-sm [&_span]:bg-muted [&_span]:px-1.5 [&_span]:py-0.5 [&_span]:text-[10px]";

const headerCellClass =
  "h-10 border-b bg-muted/40 px-3 py-0 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide max-sm:hidden";

export function InventoryPanel({
  articleGroups,
  catalogState,
  contentLabel,
  filteredCount,
  onNextPage,
  onCreateTranslation,
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
  visibleLabel,
}: Props) {
  const capitalizedLabel =
    contentLabel.charAt(0).toUpperCase() + contentLabel.slice(1);
  const hasActiveFilters =
    query.trim().length > 0 ||
    section !== "All sections" ||
    statusFilter !== "all";
  const pageRoleGroups =
    contentLabel === "page" ? groupPagesByRole(visible, !hasActiveFilters) : [];

  return (
    <section
      aria-label={`${capitalizedLabel} inventory`}
      className="overflow-hidden border-y bg-card"
    >
      <Tabs.Root onValueChange={onStatusChange} value={statusFilter}>
        <Tabs.List className="flex h-[51px] items-end gap-6 border-b px-5 max-sm:grid max-sm:h-auto max-sm:grid-cols-3 max-sm:gap-x-5 max-sm:gap-y-0 max-sm:pt-1">
          <Tabs.Tab className={tabClass} value="all">
            All <span>{articleGroups.length.toLocaleString("en-US")}</span>
          </Tabs.Tab>
          <Tabs.Tab className={tabClass} value="published">
            Published
          </Tabs.Tab>
          <Tabs.Tab className={tabClass} value="draft">
            Drafts
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={statusFilter}>
          <div className="grid grid-cols-[minmax(300px,1fr)_180px] items-center gap-2 border-b px-4 py-3 max-sm:grid-cols-1">
            <InputGroup className="h-9 bg-card">
              <InputGroupAddon className="pl-2.5">
                <Search className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label={`Search ${visibleLabel}`}
                className="h-8 px-0 text-xs"
                onChange={onQueryChange}
                placeholder={`Search ${visibleLabel} by title, text, or tag…`}
                type="search"
                value={query}
              />
            </InputGroup>
            <ValueCombobox
              ariaLabel="Filter by section"
              className="max-sm:hidden [&_[data-slot=input-group]]:h-9 [&_[data-slot=input-group]]:w-full"
              onChange={onSectionChange}
              options={sectionOptions}
              value={section}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed border-collapse max-sm:min-w-0 max-sm:table-auto max-md:min-w-[650px]">
              <thead>
                <tr>
                  <th className={`${headerCellClass} w-[40%]`}>
                    {capitalizedLabel}
                  </th>
                  <th className={`${headerCellClass} w-[300px]`}>Editions</th>
                  <th className={`${headerCellClass} w-[145px] max-md:hidden`}>
                    Section
                  </th>
                  <th className={`${headerCellClass} w-[130px] max-md:hidden`}>
                    Coverage
                  </th>
                  <th className={`${headerCellClass} w-[118px]`}>Published</th>
                </tr>
              </thead>
              {contentLabel === "page" ? (
                pageRoleGroups.map((roleGroup) => (
                  <tbody key={roleGroup.role}>
                    <tr>
                      <th
                        className="border-b bg-muted/70 px-4 py-2 text-left font-semibold text-[10px] text-primary uppercase tracking-[0.1em]"
                        colSpan={5}
                        scope="rowgroup"
                      >
                        <span>
                          {roleGroup.label} · {roleGroup.groups.length}
                        </span>
                        <span className="ml-2 font-normal text-muted-foreground normal-case tracking-normal">
                          {roleGroup.description}
                        </span>
                      </th>
                    </tr>
                    {roleGroup.groups.map((group) => (
                      <ArticleRow
                        group={group}
                        key={group.id}
                        onCreateTranslation={onCreateTranslation}
                        onOpen={onOpen}
                      />
                    ))}
                    {roleGroup.groups.length === 0 ? (
                      <tr>
                        <td
                          className="border-b px-4 py-4 text-[11px] text-muted-foreground"
                          colSpan={5}
                        >
                          This group is currently empty.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                ))
              ) : (
                <tbody>
                  {visible.map((group) => (
                    <ArticleRow
                      group={group}
                      key={group.id}
                      onCreateTranslation={onCreateTranslation}
                      onOpen={onOpen}
                    />
                  ))}
                </tbody>
              )}
            </table>
            {catalogState === "loading" ? (
              <div className="px-5 py-16 text-center text-[13px] text-muted-foreground">
                Loading the complete archive…
              </div>
            ) : null}
            {catalogState === "error" ? (
              <div className="px-5 py-16 text-center text-[13px] text-destructive">
                Archive loading failed. Refresh the page.
              </div>
            ) : null}
            {catalogState === "ready" && visible.length === 0 ? (
              <div className="px-5 py-16 text-center text-[13px] text-muted-foreground">
                These filters currently return zero {visibleLabel}.
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
