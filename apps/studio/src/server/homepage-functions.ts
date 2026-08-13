import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";

import { getDatabase } from "../../worker/db";
import {
  getHomepagePlacements,
  homepageLayoutSchema,
  updateHomepagePlacements,
} from "../../worker/services/homepage-operations";
import { requireStudioEditor } from "./auth";
import { requireStudioWritesOpen } from "./write-mode";

export const loadHomepagePlacements = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireStudioEditor(env);
    return getHomepagePlacements(getDatabase(env.DB));
  }
);

export const updateHomepagePlacementsMutation = createServerFn({
  method: "POST",
})
  .validator((input: unknown) => homepageLayoutSchema.parse(input))
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    requireStudioWritesOpen(env);
    return updateHomepagePlacements({
      database: getDatabase(env.DB),
      payload: data,
    });
  });
