import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import {
  type CatalogEntry,
  formatDate,
  normalizeText,
  useJson,
} from "@/lib/content";

const pageSize = 30;

function publicationYear(entry: CatalogEntry) {
  return entry.published?.slice(0, 4) ?? entry.path.slice(1, 5);
}

export default function AdminArticleInventory() {
  const { data, error } = useJson<CatalogEntry[]>("/content/catalog.json");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("");
  const [kind, setKind] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);

  const options = useMemo(() => {
    const entries = data ?? [];
    return {
      sections: [...new Set(entries.map((entry) => entry.section))].sort(
        (left, right) => left.localeCompare(right, "lt")
      ),
      years: [...new Set(entries.map(publicationYear))]
        .filter(Boolean)
        .sort((left, right) => right.localeCompare(left)),
    };
  }, [data]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(deferredQuery.trim());
    return (data ?? []).filter((entry) => {
      const searchable = normalizeText(
        `${entry.title} ${entry.description} ${entry.labels.join(" ")}`
      );
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (!section || entry.section === section) &&
        (!kind || entry.kind === kind) &&
        (!year || publicationYear(entry) === year)
      );
    });
  }, [data, deferredQuery, kind, section, year]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const setFilter = (update: () => void) => {
    update();
    setPage(1);
  };

  if (error) {
    return (
      <section className="admin-state admin-state--error">
        <h2>Turinio sąrašas neįkeltas</h2>
        <p>
          Atnaujinkite puslapį. Jei klaida kartojasi, patikrinkite turinio
          katalogą.
        </p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="admin-state">
        Kraunamas visas publikacijų katalogas…
      </section>
    );
  }

  return (
    <section aria-label="Publikacijų sąrašas" className="admin-inventory">
      <div className="admin-filterbar">
        <label className="admin-search">
          <Search aria-hidden="true" size={18} />
          <span className="admin-sr-only">Ieškoti straipsnių</span>
          <input
            onChange={(event) => setFilter(() => setQuery(event.target.value))}
            placeholder="Ieškoti pagal pavadinimą, aprašą ar žymą"
            type="search"
            value={query}
          />
        </label>
        <select
          aria-label="Skiltis"
          onChange={(event) => setFilter(() => setSection(event.target.value))}
          value={section}
        >
          <option value="">Visos skiltys</option>
          {options.sections.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select
          aria-label="Turinio tipas"
          onChange={(event) => setFilter(() => setKind(event.target.value))}
          value={kind}
        >
          <option value="">Visas turinys</option>
          <option value="article">Straipsniai</option>
          <option value="page">Nuolatiniai puslapiai</option>
        </select>
        <select
          aria-label="Metai"
          onChange={(event) => setFilter(() => setYear(event.target.value))}
          value={year}
        >
          <option value="">Visi metai</option>
          {options.years.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="admin-resultline">
        <p>
          <strong>{filtered.length.toLocaleString("lt-LT")}</strong> iš{" "}
          {data.length.toLocaleString("lt-LT")} publikacijų
        </p>
        <span>30 eilučių puslapyje</span>
      </div>

      {visible.length ? (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Publikacija</th>
                <th scope="col">Būsena</th>
                <th scope="col">Skiltis</th>
                <th scope="col">Data</th>
                <th scope="col">Tipas</th>
                <th scope="col">
                  <span className="admin-sr-only">Veiksmai</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => (
                <tr key={entry.path}>
                  <td>
                    <a
                      className="admin-article-title"
                      href={`/admin/article?path=${encodeURIComponent(entry.path)}`}
                    >
                      {entry.title}
                    </a>
                    <span>{entry.path}</span>
                  </td>
                  <td>
                    <span className="admin-status">Atkurta</span>
                  </td>
                  <td>{entry.section}</td>
                  <td>{formatDate(entry.published)}</td>
                  <td>
                    {entry.kind === "article" ? "Straipsnis" : "Puslapis"}
                  </td>
                  <td>
                    <a
                      aria-label={`Atverti viešai: ${entry.title}`}
                      className="admin-public-action"
                      href={entry.path}
                      rel="noopener"
                      target="_blank"
                    >
                      <ExternalLink aria-hidden="true" size={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-state">
          <h2>Publikacijų pagal šiuos filtrus nėra</h2>
          <p>Pakeiskite paieškos frazę arba vieną iš filtrų.</p>
        </div>
      )}

      <nav aria-label="Publikacijų puslapiai" className="admin-pagination">
        <button
          aria-label="Ankstesnis puslapis"
          disabled={currentPage === 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={17} />
        </button>
        <span>
          {currentPage} / {pageCount}
        </span>
        <button
          aria-label="Kitas puslapis"
          disabled={currentPage === pageCount}
          onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </nav>
    </section>
  );
}
