import {
  Link,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import {
  Archive,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  ChevronRight,
  Heart,
  Search,
} from "lucide-react";
import { useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  type CatalogEntry,
  type ContentPage,
  contentFile,
  formatDate,
  normalizeText,
  useDocumentMetadata,
  useJson,
} from "@/lib/content";

const sections = [
  "Naujienos",
  "Bažnyčios gyvenimas",
  "Pamokslai",
  "Šventasis Raštas",
  "Tikėjimas ir kultūra",
] as const;

const primaryPages = [
  ["Pamaldos", "bendruomenes_21"],
  ["Dvasininkai", "dvasininkai"],
  ["Biblioteka", "biblioteka"],
  ["Kalendorius", "kalendorius"],
  ["Paremti", "paremti"],
] as const;

const emptyArchiveSearch = { metai: undefined, q: undefined, tema: undefined };

function SiteHeader() {
  return (
    <>
      <div className="utility-bar">
        <div className="site-width utility-inner">
          <span>Konstantinopolio patriarchato egzarchatas Lietuvoje</span>
          <div className="utility-links">
            <a href="https://www.facebook.com/ortodoksas.lt" rel="noreferrer">Facebook</a>
            <a href="https://www.instagram.com/lietuvos_egzarchatas/" rel="noreferrer">Instagram</a>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="site-width masthead">
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden="true">☦</span>
            <span>
              <strong>ortodoksas.lt</strong>
              <small>Tikėjimas · Tradicija · Gyvenimas</small>
            </span>
          </Link>
          <form className="header-search" action="/paieska" method="get">
            <label className="sr-only" htmlFor="header-search">Ieškoti svetainėje</label>
            <input id="header-search" name="q" placeholder="Ieškoti archyve" type="search" />
            <Button aria-label="Ieškoti" size="icon" type="submit" variant="ghost">
              <Search aria-hidden="true" size={19} />
            </Button>
          </form>
        </div>
        <nav className="primary-nav" aria-label="Pagrindinė navigacija">
          <div className="site-width nav-scroll">
            <Link activeOptions={{ exact: true }} activeProps={{ className: "active" }} to="/">Pradžia</Link>
            {primaryPages.map(([label, slug]) => (
              <Link key={slug} activeProps={{ className: "active" }} params={{ slug }} to="/p/$slug">
                {label}
              </Link>
            ))}
            <Link activeProps={{ className: "active" }} search={emptyArchiveSearch} to="/archyvas">Archyvas</Link>
          </div>
        </nav>
      </header>
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-width footer-grid">
        <div>
          <div className="footer-brand">☦ ortodoksas.lt</div>
          <p>Apie Ortodoksų Bažnyčią Lietuvoje ir pasaulyje, jos tikėjimą, tradiciją ir gyvenimą.</p>
        </div>
        <div>
          <h2>Pažinti</h2>
          <a href="/p/katekizmas_12.html">Katekizmas</a>
          <a href="/p/dvasingumas.html">Dvasingumas</a>
          <a href="/p/liturgika.html">Liturgika</a>
          <a href="/p/ortodoksu-terminu-zodynaw.html">Žodynas</a>
        </div>
        <div>
          <h2>Susisiekti</h2>
          <a href="/p/kontaktai_30.html">Kontaktai</a>
          <a href="/p/apie-mane.html">Apie projektą</a>
          <a href="/p/paremti.html">Paremti veiklą</a>
        </div>
      </div>
      <div className="site-width footer-base">
        <span>Atkurta iš viešojo ortodoksas.lt archyvo</span>
        <span>2012–2026</span>
      </div>
    </footer>
  );
}

function SiteLayout() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <Outlet />
      <SiteFooter />
      <ScrollRestoration />
    </div>
  );
}

function LoadingPage() {
  return (
    <main className="site-width loading-page">
      <div className="loading-rule" />
      <p>Kraunamas ortodoksas.lt archyvas…</p>
    </main>
  );
}

function BrokenImage() {
  return <div className="image-placeholder" aria-hidden="true">☦</div>;
}

function EditorialImage({ alt, className, src }: { alt: string; className?: string; src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <BrokenImage />;
  return <img alt={alt} className={className} decoding="async" loading="lazy" onError={() => setFailed(true)} src={src} />;
}

function ArticleCard({ entry, featured = false }: { entry: CatalogEntry; featured?: boolean }) {
  return (
    <article className={featured ? "article-card featured-card" : "article-card"}>
      <a className="card-image" href={entry.path}>
        <EditorialImage alt="" src={entry.hero} />
      </a>
      <div className="card-copy">
        <div className="eyebrow">{entry.section}</div>
        <h2><a href={entry.path}>{entry.title}</a></h2>
        {featured ? <p>{entry.description}</p> : null}
        <div className="article-meta">
          {entry.published ? <time dateTime={entry.published}>{formatDate(entry.published)}</time> : null}
          <span aria-hidden="true">·</span>
          <span>Skaityti</span>
        </div>
      </div>
    </article>
  );
}

function SectionHeading({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

function HomePage() {
  const { data, error } = useJson<CatalogEntry[]>("/content/home.json");
  useDocumentMetadata("ortodoksas.lt", "Tikėjimas, tradicija ir Ortodoksų Bažnyčios gyvenimas Lietuvoje.");
  if (!data && !error) return <LoadingPage />;
  if (!data) return <NotFoundPage />;

  const articles = data.filter((entry) => entry.kind === "article");
  const feature = articles.find((entry) => entry.hero) ?? articles[0];
  if (!feature) return <NotFoundPage />;
  const latest = articles.filter((entry) => entry.path !== feature.path).slice(0, 6);
  const standalone = new Map(data.filter((entry) => entry.kind === "page").map((entry) => [entry.path, entry]));

  return (
    <main>
      <section className="hero-section site-width">
        <div className="edition-line">
          <span>Naujausia</span>
          <span>{new Intl.DateTimeFormat("lt-LT", { dateStyle: "long" }).format(new Date())}</span>
        </div>
        <div className="hero-grid">
          <ArticleCard entry={feature} featured />
          <div className="latest-stack">
            {latest.slice(0, 3).map((entry, index) => (
              <article className="headline-item" key={entry.path}>
                <span className="headline-number">0{index + 1}</span>
                <div>
                  <div className="eyebrow">{entry.section}</div>
                  <h2><a href={entry.path}>{entry.title}</a></h2>
                  <time dateTime={entry.published ?? undefined}>{formatDate(entry.published)}</time>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="service-band">
        <div className="site-width service-grid">
          <a href="/p/bendruomenes_21.html"><CalendarDays /><span><strong>Pamaldos</strong><small>Bendruomenės ir tvarkaraščiai</small></span><ChevronRight /></a>
          <a href="/p/kalendorius.html"><Archive /><span><strong>Kalendorius</strong><small>Pasninkai ir šventės</small></span><ChevronRight /></a>
          <a href="/p/biblioteka.html"><BookOpenText /><span><strong>Biblioteka</strong><small>Tekstai, natos ir paskaitos</small></span><ChevronRight /></a>
          <a href="/p/paremti.html"><Heart /><span><strong>Paremti</strong><small>Prisidėkite prie veiklos</small></span><ChevronRight /></a>
        </div>
      </section>

      <section className="site-width content-section">
        <SectionHeading action={<Link search={emptyArchiveSearch} to="/archyvas">Visi įrašai <ArrowRight size={16} /></Link>}>Naujausi įrašai</SectionHeading>
        <div className="article-grid">
          {latest.slice(3).concat(articles.slice(7, 10)).map((entry) => <ArticleCard entry={entry} key={entry.path} />)}
        </div>
      </section>

      {sections.slice(0, 3).map((section) => {
        const sectionArticles = articles.filter((entry) => entry.section === section).slice(0, 4);
        return (
          <section className="site-width content-section section-row" key={section}>
            <SectionHeading action={<a href={`/archyvas?tema=${encodeURIComponent(section)}`}>Daugiau <ArrowRight size={16} /></a>}>{section}</SectionHeading>
            <div className="section-articles">
              {sectionArticles.map((entry) => (
                <article key={entry.path}>
                  <div className="section-thumb"><EditorialImage alt="" src={entry.hero} /></div>
                  <div>
                    <time dateTime={entry.published ?? undefined}>{formatDate(entry.published)}</time>
                    <h3><a href={entry.path}>{entry.title}</a></h3>
                    <p>{entry.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="site-width library-callout">
        <div>
          <span className="eyebrow">Skaitymui ir studijoms</span>
          <h2>{standalone.get("/p/biblioteka.html")?.title ?? "Biblioteka"}</h2>
          <p>{standalone.get("/p/biblioteka.html")?.description}</p>
          <a className="text-link" href="/p/biblioteka.html">Atverti biblioteką <ArrowRight size={17} /></a>
        </div>
        <div className="library-mark" aria-hidden="true">☦</div>
      </section>
    </main>
  );
}

function ContentRoutePage() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { data, error } = useJson<ContentPage>(`/content/pages/${contentFile(path)}`);
  useDocumentMetadata(data?.title ?? "ortodoksas.lt", data?.description);
  if (!data && !error) return <LoadingPage />;
  if (!data) return <NotFoundPage />;

  return (
    <main className="article-page">
      <div className="site-width article-breadcrumbs">
        <Link to="/">Pradžia</Link><ChevronRight size={14} />
        <Link search={emptyArchiveSearch} to="/archyvas">{data.kind === "page" ? "Informacija" : data.section}</Link>
      </div>
      <article className="reading-column">
        <header className="article-header">
          <div className="eyebrow">{data.kind === "page" ? "ortodoksas.lt" : data.section}</div>
          <h1>{data.title}</h1>
          {data.published ? (
            <div className="article-byline">
              <time dateTime={data.published}>{formatDate(data.published)}</time>
              <span>Atkurta iš {data.capture.slice(0, 4)} m. archyvo kopijos</span>
            </div>
          ) : null}
          {data.hero ? <div className="article-hero"><EditorialImage alt="" src={data.hero} /></div> : null}
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: data.html }} />
        {data.labels.length ? (
          <footer className="article-tags">
            {data.labels.map((label) => <span key={label}>{label}</span>)}
          </footer>
        ) : null}
      </article>
      <aside className="site-width archive-note">
        <Archive aria-hidden="true" />
        <p>Šis tekstas atkurtas iš paskutinės prieinamos viešos ortodoksas.lt archyvo kopijos. Išsaugotas originalus turinys ir nuorodos.</p>
      </aside>
    </main>
  );
}

type ArchiveSearch = { q: string | undefined; tema: string | undefined; metai: string | undefined };

function ArchivePage() {
  const search = archiveRoute.useSearch();
  const navigate = archiveRoute.useNavigate();
  const [limit, setLimit] = useState(30);
  const { data, error } = useJson<CatalogEntry[]>("/content/catalog.json");
  const deferredQuery = useDeferredValue(search.q ?? "");
  useDocumentMetadata("Archyvas · ortodoksas.lt", "Visas atkurtas ortodoksas.lt straipsnių archyvas.");
  if (!data && !error) return <LoadingPage />;
  if (!data) return <NotFoundPage />;

  const articles = data.filter((entry) => entry.kind === "article");
  const years = [...new Set(articles.map((entry) => entry.path.slice(1, 5)))].sort((a, b) => b.localeCompare(a));
  const query = normalizeText(deferredQuery);
  const filtered = articles.filter((entry) => {
    const matchesQuery = !query || normalizeText(`${entry.title} ${entry.description} ${entry.labels.join(" ")}`).includes(query);
    const matchesSection = !search.tema || entry.section === search.tema;
    const matchesYear = !search.metai || entry.path.startsWith(`/${search.metai}/`);
    return matchesQuery && matchesSection && matchesYear;
  });

  const update = (next: Partial<ArchiveSearch>) => {
    setLimit(30);
    navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) });
  };

  return (
    <main className="site-width archive-page">
      <header className="page-intro">
        <div className="eyebrow">2012–2026</div>
        <h1>Publikacijų archyvas</h1>
        <p>{articles.length.toLocaleString("lt-LT")} atkurti straipsniai, pamokslai, paskaitos ir Bažnyčios gyvenimo naujienos.</p>
      </header>
      <div className="archive-controls">
        <label className="archive-search">
          <Search aria-hidden="true" size={19} />
          <span className="sr-only">Ieškoti archyve</span>
          <input onChange={(event) => update({ q: event.target.value || undefined })} placeholder="Ieškoti pagal pavadinimą ar temą" type="search" value={search.q ?? ""} />
        </label>
        <select aria-label="Tema" onChange={(event) => update({ tema: event.target.value || undefined })} value={search.tema ?? ""}>
          <option value="">Visos temos</option>
          {sections.map((section) => <option key={section}>{section}</option>)}
        </select>
        <select aria-label="Metai" onChange={(event) => update({ metai: event.target.value || undefined })} value={search.metai ?? ""}>
          <option value="">Visi metai</option>
          {years.map((year) => <option key={year}>{year}</option>)}
        </select>
      </div>
      <div className="results-line"><strong>{filtered.length.toLocaleString("lt-LT")}</strong> rezultatai</div>
      <div className="archive-list">
        {filtered.slice(0, limit).map((entry) => (
          <article key={entry.path}>
            <time dateTime={entry.published ?? undefined}>{formatDate(entry.published)}</time>
            <div>
              <span>{entry.section}</span>
              <h2><a href={entry.path}>{entry.title}</a></h2>
              <p>{entry.description}</p>
            </div>
            <a aria-label={`Skaityti: ${entry.title}`} href={entry.path}><ArrowRight /></a>
          </article>
        ))}
      </div>
      {filtered.length > limit ? (
        <div className="load-more">
          <Button onClick={() => setLimit((current) => current + 30)} variant="outline">Rodyti dar 30</Button>
          <span>Rodoma {limit} iš {filtered.length.toLocaleString("lt-LT")}</span>
        </div>
      ) : null}
    </main>
  );
}

function SearchPage() {
  const { q = "" } = searchRoute.useSearch();
  const { data, error } = useJson<CatalogEntry[]>("/content/catalog.json");
  const query = normalizeText(q);
  useDocumentMetadata(q ? `„${q}“ paieška · ortodoksas.lt` : "Paieška · ortodoksas.lt");
  if (!data && !error) return <LoadingPage />;
  const results = data?.filter((entry) => normalizeText(`${entry.title} ${entry.description} ${entry.labels.join(" ")}`).includes(query)) ?? [];

  return (
    <main className="site-width search-page">
      <header className="page-intro compact">
        <div className="eyebrow">Paieška</div>
        <h1>{q ? `Rezultatai: „${q}“` : "Ko ieškote?"}</h1>
      </header>
      <form className="search-form" action="/paieska">
        <Search aria-hidden="true" />
        <input autoFocus name="q" defaultValue={q} placeholder="Įveskite žodį ar frazę" type="search" />
        <Button type="submit">Ieškoti</Button>
      </form>
      {q ? <p className="results-line"><strong>{results.length.toLocaleString("lt-LT")}</strong> rezultatai</p> : null}
      <div className="search-results">
        {results.slice(0, 80).map((entry) => (
          <article key={entry.path}>
            <div className="eyebrow">{entry.section}</div>
            <h2><a href={entry.path}>{entry.title}</a></h2>
            <p>{entry.description}</p>
            <time dateTime={entry.published ?? undefined}>{formatDate(entry.published)}</time>
          </article>
        ))}
      </div>
    </main>
  );
}

function NotFoundPage() {
  useDocumentMetadata("Puslapis nerastas · ortodoksas.lt");
  return (
    <main className="site-width not-found">
      <span aria-hidden="true">☦</span>
      <div className="eyebrow">404</div>
      <h1>Puslapio archyve nėra</h1>
      <p>Šio adreso viešoje kopijoje rasti nepavyko. Visas išsaugotas publikacijas rasite archyve.</p>
      <Link search={emptyArchiveSearch} to="/archyvas">Atverti archyvą <ArrowRight size={17} /></Link>
    </main>
  );
}

const rootRoute = createRootRoute({ component: SiteLayout, notFoundComponent: NotFoundPage });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage });
const archiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/archyvas",
  validateSearch: (search: Record<string, unknown>): ArchiveSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    tema: typeof search.tema === "string" ? search.tema : undefined,
    metai: typeof search.metai === "string" ? search.metai : undefined,
  }),
  component: ArchivePage,
});
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/paieska",
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : "" }),
  component: SearchPage,
});
const articleRoute = createRoute({ getParentRoute: () => rootRoute, path: "/$year/$month/$slug", component: ContentRoutePage });
const pageRoute = createRoute({ getParentRoute: () => rootRoute, path: "/p/$slug", component: ContentRoutePage });
const routeTree = rootRoute.addChildren([indexRoute, archiveRoute, searchRoute, articleRoute, pageRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
