import { absoluteUrl } from "../components/publication/publication";

export const prerender = true;

export function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
