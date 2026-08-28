import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
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
