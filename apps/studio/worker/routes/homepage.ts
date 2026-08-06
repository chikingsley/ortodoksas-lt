import { homepagePlacements } from "@ortodoksas-lt/db";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDatabase } from "../db";
import type { StudioEnvironment } from "../types";

export const homepageRoutes = new Hono<StudioEnvironment>();

homepageRoutes.get("/", async (context) => {
  const database = getDatabase(context.env.DB);
  const placements = await database
    .select()
    .from(homepagePlacements)
    .orderBy(asc(homepagePlacements.slot), asc(homepagePlacements.position));
  return context.json({ placements });
});

homepageRoutes.put("/", async (context) => {
  const payload = (await context.req.json()) as {
    leadId?: string | null;
    secondaryIds?: string[];
  };
  const secondaryIds = (payload.secondaryIds ?? []).slice(0, 3);
  const timestamp = Date.now();
  await getDatabase(context.env.DB)
    .delete(homepagePlacements)
    .where(eq(homepagePlacements.slot, "lead"));
  await getDatabase(context.env.DB)
    .delete(homepagePlacements)
    .where(eq(homepagePlacements.slot, "secondary"));

  const values = [
    ...(payload.leadId
      ? [
          {
            articleId: payload.leadId,
            createdAt: timestamp,
            id: crypto.randomUUID(),
            position: 0,
            slot: "lead",
            updatedAt: timestamp,
          },
        ]
      : []),
    ...secondaryIds.map((articleId, position) => ({
      articleId,
      createdAt: timestamp,
      id: crypto.randomUUID(),
      position,
      slot: "secondary",
      updatedAt: timestamp,
    })),
  ];
  if (values.length > 0) {
    await getDatabase(context.env.DB).insert(homepagePlacements).values(values);
  }
  return context.json({ leadId: payload.leadId ?? null, secondaryIds });
});
