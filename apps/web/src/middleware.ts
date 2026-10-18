import { defineMiddleware } from "astro:middleware";

import { cachedPublication } from "./server/publication-cache";

export const onRequest = defineMiddleware(
  async (context, next) => await cachedPublication(context.request, next)
);
