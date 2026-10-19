import { hasText } from "@ortodoksas-lt/content/value";

import { absoluteUrl, escapeXml } from "../components/publication/publication";
import { getRecentArticles } from "../server/publication-catalog";

export async function GET() {
  const articles = await getRecentArticles("lt", 50);

  const items = articles
    .flatMap((entry) =>
      hasText(entry.published) ? [{ ...entry, published: entry.published }] : []
    )
    .slice(0, 50)
    .map(
      (entry) =>
        `<item><title>${escapeXml(entry.title)}</title><link>${escapeXml(absoluteUrl(entry.path))}</link><guid isPermaLink="true">${escapeXml(absoluteUrl(entry.path))}</guid><description>${escapeXml(entry.description)}</description><pubDate>${new Date(entry.published).toUTCString()}</pubDate><category>${escapeXml(entry.section)}</category></item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ortodoksas.lt</title><link>${absoluteUrl("/")}</link><description>Ortodoksų tikėjimas, tradicija ir gyvenimas Lietuvoje bei pasaulyje.</description><language>lt-LT</language>${items}</channel></rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
