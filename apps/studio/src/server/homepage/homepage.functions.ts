import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { requireStudioEditor } from "../auth";
import { getDatabase } from "../db.server";
import { requireStudioWritesOpen } from "../write-mode";
import {
  getHomepagePlacements,
  homepageLayoutSchema,
  updateHomepagePlacements,
} from "./homepage-operations.server";

export const loadHomepagePlacements = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireStudioEditor(env);

    return await getHomepagePlacements(getDatabase(env.DB));
  }
);

export const updateHomepagePlacementsMutation = createServerFn({
  method: "POST",
})
  .validator(homepageLayoutSchema)
  .handler(async ({ data }) => {
    await requireStudioEditor(env);
    requireStudioWritesOpen(env);

    return await updateHomepagePlacements({
      database: getDatabase(env.DB),
      payload: data,
    });
  });
