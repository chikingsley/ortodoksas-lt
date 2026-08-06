import {
  absoluteUrl,
  articles,
  escapeXml,
  getLocalizedArticles,
  localeShells,
  pages,
  sectionSlug,
  sections,
} from "../lib/publication";

export const prerender = true;

export function GET() {
  const paths = [
    "/",
    "/archyvas",
    "/paieska",
    ...localeShells.map((locale) => `/${locale}`),
    ...localeShells.flatMap((locale) =>
      getLocalizedArticles(locale).map((page) => `/${locale}${page.path}`)
    ),
    ...sections.map((section) => `/tema/${sectionSlug(section)}`),
    ...pages.map((page) => page.path),
  ];
  const lastModified = new Map(
    articles
      .filter((entry) => entry.published)
      .map((entry) => [entry.path, entry.published as string])
  );
  const urls = [...new Set(paths)]
    .map((path) => {
      const modified = lastModified.get(path);
      return `<url><loc>${escapeXml(absoluteUrl(path))}</loc>${modified ? `<lastmod>${new Date(modified).toISOString()}</lastmod>` : ""}</url>`;
    })
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } }
  );
}
