import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import { FilePlus2, House } from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  fetchHomepagePlacements,
  persistHomepagePlacements,
} from "./inventory/homepage-api";
import {
  AUTOMATIC_PLACEMENT,
  HomepageLayoutPanel,
} from "./inventory/homepage-layout-panel";
import { InventoryPanel } from "./inventory/inventory-panel";
import type { CatalogArticle } from "./types";
import type { ValueOption } from "./value-combobox";

interface Props {
  articles: CatalogArticle[];
  catalogState: "loading" | "ready" | "error";
  onOpen: (article: CatalogArticle) => void;
}

const PAGE_SIZE = 30;
export const ArticleInventory = ({ articles, catalogState, onOpen }: Props) => {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All sections");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [homepageOpen, setHomepageOpen] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [secondaryIds, setSecondaryIds] = useState(["", "", "", ""]);
  const [homepageState, setHomepageState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    fetchHomepagePlacements()
      .then((placements) => {
        const lead = placements.find((placement) => placement.slot === "lead");
        const secondary = placements
          .filter((placement) => placement.slot === "secondary")
          .sort((left, right) => left.position - right.position);
        setLeadId(lead?.articleId ?? "");
        setSecondaryIds(
          [0, 1, 2, 3].map((index) => secondary[index]?.articleId ?? "")
        );
      })
      .catch(() => setHomepageState("error"));
  }, []);

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
  const articleOptions = useMemo<ValueOption[]>(
    () => [
      { label: "Automatic", value: AUTOMATIC_PLACEMENT },
      ...inventoryArticles.map((article) => ({
        label: article.title,
        value: article.id,
      })),
    ],
    [inventoryArticles]
  );
  const leadOptions = useMemo<ValueOption[]>(
    () => [
      { label: "Automatic latest story", value: AUTOMATIC_PLACEMENT },
      ...articleOptions.slice(1),
    ],
    [articleOptions]
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
  const toggleHomepage = useCallback(
    () => setHomepageOpen((open) => !open),
    []
  );
  const updateLead = useCallback((value: string) => {
    setLeadId(value === AUTOMATIC_PLACEMENT ? "" : value);
    setHomepageState("idle");
  }, []);
  const updateSecondary = useCallback((position: number, value: string) => {
    const nextValue = value === AUTOMATIC_PLACEMENT ? "" : value;
    setSecondaryIds((current) =>
      current.map((currentValue, index) =>
        index === position ? nextValue : currentValue
      )
    );
    setHomepageState("idle");
  }, []);
  const saveHomepage = useCallback(async () => {
    setHomepageState("saving");
    const selectedIds = [leadId, ...secondaryIds].filter(Boolean);
    const hasMissingImage = selectedIds.some(
      (id) => !inventoryArticles.find((article) => article.id === id)?.hero
    );
    if (hasMissingImage) {
      setHomepageState("error");
      return;
    }
    const saved = await persistHomepagePlacements({
      leadId: leadId || null,
      secondaryIds: secondaryIds.filter(Boolean),
    });
    setHomepageState(saved ? "saved" : "error");
  }, [inventoryArticles, leadId, secondaryIds]);

  return (
    <div className="mx-auto w-[min(100%,1500px)] px-[42px] pt-[42px] pb-[72px] max-inventory-compact:px-6 max-inventory-mobile:px-4 max-inventory-compact:pt-8 max-inventory-mobile:pt-[26px] max-inventory-compact:pb-[60px] max-inventory-mobile:pb-12">
      <header className="mb-[30px] flex min-h-24 items-end justify-between gap-8 max-inventory-mobile:mb-[22px] max-inventory-phone:block max-inventory-mobile:min-h-0 max-inventory-mobile:items-start">
        <div>
          <p className="mt-0 mb-[7px] font-bold text-[11px] text-primary uppercase tracking-[0.08em]">
            Content
          </p>
          <div className="flex items-center gap-2.5">
            <h1 className="m-0 font-[650] text-[30px] leading-[1.1] tracking-[-0.035em] max-inventory-mobile:text-[27px]">
              Articles
            </h1>
            <span className="inline-flex h-[23px] min-w-[38px] items-center justify-center rounded-full bg-muted px-2 font-semibold text-[11px] text-muted-foreground">
              {inventoryArticles.length.toLocaleString("en-US")}
            </span>
          </div>
          <p className="mt-2 mb-0 text-[13px] text-muted-foreground max-inventory-mobile:max-w-[480px]">
            The complete publication archive and current editorial work in one
            place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 max-inventory-mobile:mt-[18px]">
          <Button onClick={toggleHomepage} size="lg" variant="outline">
            <House data-icon="inline-start" /> Homepage layout
          </Button>
          <Button
            className="shadow-[0_1px_1px_rgb(0_0_0/0.08)] max-inventory-phone:w-full"
            size="lg"
          >
            <FilePlus2 data-icon="inline-start" /> New article
          </Button>
        </div>
      </header>

      {homepageOpen ? (
        <HomepageLayoutPanel
          articleOptions={articleOptions}
          leadId={leadId}
          leadOptions={leadOptions}
          onLeadChange={updateLead}
          onSave={saveHomepage}
          onSecondaryChange={updateSecondary}
          secondaryIds={secondaryIds}
          state={homepageState}
        />
      ) : null}

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
  );
};
