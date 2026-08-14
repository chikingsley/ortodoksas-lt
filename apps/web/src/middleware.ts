import { defineMiddleware } from "astro:middleware";
import { getHistoricalPublicationRedirect } from "./historical-publication-redirects";

export const onRequest = defineMiddleware(({ redirect, url }, next) => {
  const destination = getHistoricalPublicationRedirect(url.pathname);
  return destination ? redirect(`${destination}${url.search}`, 301) : next();
});
