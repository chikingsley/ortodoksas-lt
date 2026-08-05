import { absoluteUrl, articles, escapeXml } from "../lib/publication";

export const prerender = true;

export function GET() {
  const items = articles
    .filter((entry) => entry.published)
    .slice(0, 50)
    .map(
      (entry) =>
        `<item><title>${escapeXml(entry.title)}</title><link>${escapeXml(absoluteUrl(entry.path))}</link><guid isPermaLink="true">${escapeXml(absoluteUrl(entry.path))}</guid><description>${escapeXml(entry.description)}</description><pubDate>${new Date(entry.published as string).toUTCString()}</pubDate><category>${escapeXml(entry.section)}</category></item>`
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ortodoksas.lt</title><link>${absoluteUrl("/")}</link><description>Ortodoksų tikėjimas, tradicija ir gyvenimas Lietuvoje bei pasaulyje.</description><language>lt-LT</language>${items}</channel></rss>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
