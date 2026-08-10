import {
  getSectionLabel,
  getSectionOptions,
  type SectionLocale,
} from "@ortodoksas-lt/content/sections";
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FilePlus2,
  Filter,
  House,
  Save,
  Search,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";

import { formatPublicationStatus } from "./format-publication-status";
import { formatTranslationLabel } from "./translation-label";
import type { CatalogArticle } from "./types";
import { ValueCombobox, type ValueOption } from "./value-combobox";

interface Props {
  articles: CatalogArticle[];
  catalogState: "loading" | "ready" | "error";
  onOpen: (article: CatalogArticle) => void;
}

interface ArticleRowProps {
  article: CatalogArticle;
  onOpen: (article: CatalogArticle) => void;
}

const PAGE_SIZE = 30;
const SUPPORTING_SLOTS = ["first", "second", "third", "fourth"] as const;
const AUTOMATIC_PLACEMENT = "automatic";
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const ArticleRow = ({ article, onOpen }: ArticleRowProps) => {
  const openArticle = useCallback(() => onOpen(article), [article, onOpen]);

  return (
    <tr>
      <td className="checkbox-cell">
        <input aria-label={`Select ${article.title}`} type="checkbox" />
      </td>
      <td>
        <button className="article-link" onClick={openArticle} type="button">
          <span className="article-thumb">
            {article.hero ? (
              <img alt="" height="43" src={article.hero} width="43" />
            ) : (
              <FilePlus2 />
            )}
          </span>
          <span>
            <strong>{article.title}</strong>
            <small>{article.description || article.path}</small>
          </span>
        </button>
      </td>
      <td>
        <div className="translation-identity">
          <span className="language-code">
            {article.language.toUpperCase()}
          </span>
          <span className="translation-badge">
            {formatTranslationLabel(
              article.translationKind,
              article.translationReviewStatus
            )}
          </span>
        </div>
      </td>
      <td>
        <span className="section-label">
          {article.section
            ? getSectionLabel(
                article.section,
                article.language as SectionLocale
              )
            : "Other"}
        </span>
      </td>
      <td>
        <span className="status-label">
          <CircleCheck /> {formatPublicationStatus(article.status)}
        </span>
      </td>
      <td className="date-cell">
        {article.published
          ? dateFormatter.format(new Date(article.published))
          : "—"}
      </td>
    </tr>
  );
};

interface HomepagePlacementFieldProps {
  label: string;
  onChange: (position: number, value: string) => void;
  options: ValueOption[];
  position: number;
  value: string;
}

const HomepagePlacementField = ({
  label,
  onChange,
  options,
  position,
  value,
}: HomepagePlacementFieldProps) => {
  const inputId = `homepage-supporting-${position}`;
  const updatePlacement = useCallback(
    (nextValue: string) => onChange(position, nextValue),
    [onChange, position]
  );

  return (
    <label htmlFor={inputId}>
      {label}
      <ValueCombobox
        ariaLabel={label}
        id={inputId}
        onChange={updatePlacement}
        options={options}
        value={value || AUTOMATIC_PLACEMENT}
      />
    </label>
  );
};

export const ArticleInventory = ({ articles, catalogState, onOpen }: Props) => {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All sections");
  const [page, setPage] = useState(1);
  const [homepageOpen, setHomepageOpen] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [secondaryIds, setSecondaryIds] = useState(["", "", "", ""]);
  const [homepageState, setHomepageState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    fetch("/api/homepage")
      .then((response) => response.json())
      .then(
        (data: {
          placements: Array<{
            articleId: string;
            position: number;
            slot: string;
          }>;
        }) => {
          const lead = data.placements.find(
            (placement) => placement.slot === "lead"
          );
          const secondary = data.placements
            .filter((placement) => placement.slot === "secondary")
            .sort((left, right) => left.position - right.position);
          setLeadId(lead?.articleId ?? "");
          setSecondaryIds(
            [0, 1, 2, 3].map((index) => secondary[index]?.articleId ?? "")
          );
        }
      )
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
      const matchesQuery =
        normalized.length === 0 ||
        `${article.title} ${article.description} ${article.labels.join(" ")}`
          .toLocaleLowerCase("lt")
          .includes(normalized);
      return matchesSection && matchesQuery;
    });
  }, [inventoryArticles, query, section]);

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
    const response = await fetch("/api/homepage", {
      body: JSON.stringify({
        leadId: leadId || null,
        secondaryIds: secondaryIds.filter(Boolean),
      }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });
    setHomepageState(response.ok ? "saved" : "error");
  }, [inventoryArticles, leadId, secondaryIds]);

  return (
    <div className="inventory-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Content</p>
          <div className="title-row">
            <h1>Articles</h1>
            <span className="count-pill">
              {inventoryArticles.length.toLocaleString("en-US")}
            </span>
          </div>
          <p>
            The complete publication archive and current editorial work in one
            place.
          </p>
        </div>
        <div className="page-header-actions">
          <Button onClick={toggleHomepage} size="lg" variant="outline">
            <House data-icon="inline-start" /> Homepage layout
          </Button>
          <Button className="primary-action" size="lg">
            <FilePlus2 data-icon="inline-start" /> New article
          </Button>
        </div>
      </header>

      {homepageOpen ? (
        <section aria-label="Homepage layout" className="homepage-editor">
          <div>
            <strong>Homepage placements</strong>
            <span>
              Choose one lead story and up to four supporting stories.
            </span>
          </div>
          <label htmlFor="homepage-lead-story">
            Lead story
            <ValueCombobox
              ariaLabel="Lead story"
              id="homepage-lead-story"
              onChange={updateLead}
              options={leadOptions}
              value={leadId || AUTOMATIC_PLACEMENT}
            />
          </label>
          {SUPPORTING_SLOTS.map((slot, position) => (
            <HomepagePlacementField
              key={slot}
              label={`Supporting story ${position + 1}`}
              onChange={updateSecondary}
              options={articleOptions}
              position={position}
              value={secondaryIds[position] ?? ""}
            />
          ))}
          <Button disabled={homepageState === "saving"} onClick={saveHomepage}>
            <Save /> {homepageState === "saving" ? "Saving…" : "Save layout"}
          </Button>
          {homepageState === "saved" ? (
            <span>Homepage layout saved.</span>
          ) : null}
          {homepageState === "error" ? (
            <span>
              Homepage placements require a valid image and a successful save.
            </span>
          ) : null}
        </section>
      ) : null}

      <section aria-label="Article inventory" className="inventory-panel">
        <div className="status-tabs" role="tablist">
          <button aria-selected="true" role="tab" type="button">
            All <span>{inventoryArticles.length.toLocaleString("en-US")}</span>
          </button>
          <button role="tab" type="button">
            Published{" "}
            <span>
              {inventoryArticles
                .filter((article) => article.status === "published")
                .length.toLocaleString("en-US")}
            </span>
          </button>
          <button role="tab" type="button">
            Drafts{" "}
            <span>
              {
                inventoryArticles.filter(
                  (article) => article.status === "draft"
                ).length
              }
            </span>
          </button>
        </div>

        <div className="inventory-tools">
          <label className="search-field">
            <Search />
            <input
              aria-label="Search articles"
              onChange={updateQuery}
              placeholder="Search by title, text, or tag…"
              type="search"
              value={query}
            />
            <kbd>⌘ K</kbd>
          </label>
          <ValueCombobox
            ariaLabel="Filter by section"
            className="inventory-section-combobox"
            onChange={updateSection}
            options={sectionOptions}
            value={section}
          />
          <button className="tool-button" type="button">
            <Filter /> More filters
          </button>
        </div>

        <div className="article-table-wrap">
          <table className="article-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input aria-label="Select all" type="checkbox" />
                </th>
                <th>
                  <button type="button">
                    Article <ArrowDown />
                  </button>
                </th>
                <th>Language</th>
                <th>Section</th>
                <th>Status</th>
                <th>Published</th>
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
            <div className="table-state">Loading the complete archive…</div>
          ) : null}
          {catalogState === "error" ? (
            <div className="table-state error">
              The archive could not be loaded. Refresh the page.
            </div>
          ) : null}
          {catalogState === "ready" && visible.length === 0 ? (
            <div className="table-state">No articles match these filters.</div>
          ) : null}
        </div>

        <footer className="table-footer">
          <p>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
            –{Math.min(safePage * PAGE_SIZE, filtered.length)} iš{" "}
            {filtered.length.toLocaleString("en-US")}
          </p>
          <div>
            <button
              disabled={safePage === 1}
              onClick={previousPage}
              type="button"
            >
              <ChevronLeft />
            </button>
            <span>
              {safePage} / {pageCount}
            </span>
            <button
              disabled={safePage === pageCount}
              onClick={nextPage}
              type="button"
            >
              <ChevronRight />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
