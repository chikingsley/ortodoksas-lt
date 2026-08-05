import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleCheck,
  FilePlus2,
  Filter,
  Search,
} from "lucide-react";
import { type ChangeEvent, useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import type { CatalogArticle } from "./types";

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
const dateFormatter = new Intl.DateTimeFormat("lt-LT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const getLanguage = (path: string) => {
  const [, language] = path.split("/");
  return ["en", "ru", "uk", "be"].includes(language ?? "")
    ? language?.toUpperCase()
    : "LT";
};

const ArticleRow = ({ article, onOpen }: ArticleRowProps) => {
  const openArticle = useCallback(() => onOpen(article), [article, onOpen]);

  return (
    <tr>
      <td className="checkbox-cell">
        <input aria-label={`Pažymėti ${article.title}`} type="checkbox" />
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
        <span className="language-code">{getLanguage(article.path)}</span>
      </td>
      <td>
        <span className="section-label">{article.section || "Kita"}</span>
      </td>
      <td>
        <span className="status-label">
          <CircleCheck /> Publikuota
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

export const ArticleInventory = ({ articles, catalogState, onOpen }: Props) => {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("Visi skyriai");
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
      Array.from(
        new Set(
          inventoryArticles.map((article) => article.section).filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right, "lt")),
    [inventoryArticles]
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("lt");
    return inventoryArticles.filter((article) => {
      const matchesSection =
        section === "Visi skyriai" || article.section === section;
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
  const updateSection = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSection(event.target.value);
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
    <div className="inventory-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Turinys</p>
          <div className="title-row">
            <h1>Straipsniai</h1>
            <span className="count-pill">
              {inventoryArticles.length.toLocaleString("lt-LT")}
            </span>
          </div>
          <p>
            Visas publikacijos archyvas ir dabartinis redakcinis darbas vienoje
            vietoje.
          </p>
        </div>
        <Button className="primary-action" size="lg">
          <FilePlus2 data-icon="inline-start" /> Naujas straipsnis
        </Button>
      </header>

      <section aria-label="Straipsnių inventorius" className="inventory-panel">
        <div className="status-tabs" role="tablist">
          <button aria-selected="true" role="tab" type="button">
            Visi <span>{inventoryArticles.length.toLocaleString("lt-LT")}</span>
          </button>
          <button role="tab" type="button">
            Publikuoti{" "}
            <span>{inventoryArticles.length.toLocaleString("lt-LT")}</span>
          </button>
          <button role="tab" type="button">
            Juodraščiai <span>0</span>
          </button>
        </div>

        <div className="inventory-tools">
          <label className="search-field">
            <Search />
            <input
              aria-label="Ieškoti straipsnių"
              onChange={updateQuery}
              placeholder="Ieškoti pagal pavadinimą, tekstą ar žymą…"
              type="search"
              value={query}
            />
            <kbd>⌘ K</kbd>
          </label>
          <label className="select-field">
            <span className="sr-only">Skyrius</span>
            <select onChange={updateSection} value={section}>
              <option>Visi skyriai</option>
              {sections.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ChevronsUpDown />
          </label>
          <button className="tool-button" type="button">
            <Filter /> Daugiau filtrų
          </button>
        </div>

        <div className="article-table-wrap">
          <table className="article-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input aria-label="Pažymėti visus" type="checkbox" />
                </th>
                <th>
                  <button type="button">
                    Straipsnis <ArrowDown />
                  </button>
                </th>
                <th>Kalba</th>
                <th>Skyrius</th>
                <th>Būsena</th>
                <th>Publikuota</th>
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
            <div className="table-state">Įkeliamas visas archyvas…</div>
          ) : null}
          {catalogState === "error" ? (
            <div className="table-state error">
              Archyvo įkelti nepavyko. Atnaujinkite puslapį.
            </div>
          ) : null}
          {catalogState === "ready" && visible.length === 0 ? (
            <div className="table-state">
              Pagal šiuos filtrus straipsnių nerasta.
            </div>
          ) : null}
        </div>

        <footer className="table-footer">
          <p>
            Rodomi {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} iš{" "}
            {filtered.length.toLocaleString("lt-LT")}
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
