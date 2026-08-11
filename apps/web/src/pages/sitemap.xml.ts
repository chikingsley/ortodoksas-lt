import {
  absoluteUrl,
  articles,
  escapeXml,
  getLocalizedPages,
  pages,
  sectionSlug,
  sections,
} from "../lib/publication";
import { localeShells } from "../i18n/config";

export const prerender = true;

export function GET() {
  const localizedEntries = localeShells.flatMap((locale) =>
    getLocalizedPages(locale).map((page) => ({ locale, page }))
  );
  const paths = [
    "/",
    "/archyvas",
    "/paieska",
    ...localeShells.map((locale) => `/${locale}`),
    ...localizedEntries.map(({ locale, page }) => `/${locale}${page.path}`),
    ...sections.map((section) => `/tema/${sectionSlug(section)}`),
    ...pages.map((page) => page.path),
  ];
  const lastModified = new Map(
    [
      ...articles.map((entry) => ({ path: entry.path, published: entry.published })),
      ...localizedEntries.map(({ locale, page }) => ({
        path: `/${locale}${page.path}`,
        published: page.published,
      })),
    ]
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
