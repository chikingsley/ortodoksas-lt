import {
  articles,
  homepageLayoutState,
  homepagePlacements,
  publicationGroups,
} from "@ortodoksas-lt/db";
import { and, asc, eq, exists, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { z } from "zod";

import type { StudioDatabase } from "../db";
import type { StudioOperationResult } from "./article-operations";

export const homepageLayoutSchema = z.object({
  expectedRevision: z.string().min(1),
  leadId: z.string().uuid().nullable().default(null),
  secondaryIds: z.array(z.string().uuid()).max(4).default([]),
});

export const getHomepagePlacements = async (database: StudioDatabase) => {
  const rows = await database
    .select({
      articleId: homepagePlacements.articleId,
      createdAt: homepagePlacements.createdAt,
      endsAt: homepagePlacements.endsAt,
      id: homepagePlacements.id,
      layoutRevision: homepagePlacements.layoutRevision,
      position: homepagePlacements.position,
      revision: homepageLayoutState.revision,
      slot: homepagePlacements.slot,
      startsAt: homepagePlacements.startsAt,
      updatedAt: homepagePlacements.updatedAt,
    })
    .from(homepageLayoutState)
    .leftJoin(
      homepagePlacements,
      eq(homepagePlacements.layoutRevision, homepageLayoutState.revision)
    )
    .where(eq(homepageLayoutState.id, "primary"))
    .orderBy(asc(homepagePlacements.slot), asc(homepagePlacements.position));
  const revision = rows[0]?.revision ?? "initial";
  const placements = rows.flatMap((row) =>
    row.id
      ? [
          {
            articleId: row.articleId as string,
            createdAt: row.createdAt as number,
            endsAt: row.endsAt,
            id: row.id,
            layoutRevision: row.layoutRevision as string,
            position: row.position as number,
            slot: row.slot as string,
            startsAt: row.startsAt,
            updatedAt: row.updatedAt as number,
          },
        ]
      : []
  );
  return { placements, revision };
};

export const updateHomepagePlacements = async (input: {
  database: StudioDatabase;
  payload: unknown;
}): Promise<
  StudioOperationResult<{
    leadId: string | null;
    revision: string;
    secondaryIds: string[];
  }>
> => {
  const parsed = homepageLayoutSchema.safeParse(input.payload);
  if (!parsed.success) {
    return {
      error: "Homepage validation failed",
      issues: parsed.error.issues.map((issue) => issue.message),
      ok: false,
      status: 422,
    };
  }
  const { expectedRevision, leadId, secondaryIds } = parsed.data;
  const currentState = await input.database.query.homepageLayoutState.findFirst(
    {
      where: eq(homepageLayoutState.id, "primary"),
    }
  );
  if (!currentState) {
    return {
      error: "Homepage layout state is unavailable",
      ok: false,
      status: 503,
    };
  }
  if (currentState.revision !== expectedRevision) {
    return {
      error: "Homepage layout changed since this editor loaded it",
      ok: false,
      status: 409,
    };
  }
  const uniqueIds = new Set(secondaryIds);
  if (uniqueIds.size !== secondaryIds.length || uniqueIds.has(leadId ?? "")) {
    return {
      error: "Homepage stories must use distinct placements",
      ok: false,
      status: 422,
    };
  }

  const requestedIds = [...(leadId ? [leadId] : []), ...secondaryIds];
  if (requestedIds.length > 0) {
    const eligible = await input.database
      .select({ id: articles.id })
      .from(articles)
      .innerJoin(
        publicationGroups,
        eq(publicationGroups.id, articles.translationGroupId)
      )
      .where(
        and(
          inArray(articles.id, requestedIds),
          eq(publicationGroups.kind, "article"),
          eq(articles.language, "lt"),
          eq(articles.status, "published"),
          isNotNull(articles.heroMediaId)
        )
      );
    if (eligible.length !== requestedIds.length) {
      return {
        error: "Homepage stories must be eligible published stories",
        ok: false,
        status: 422,
      };
    }
  }

  const timestamp = Date.now();
  const revision = crypto.randomUUID();
  const transactionEligibility = requestedIds.map((articleId) =>
    exists(
      input.database
        .select({ id: articles.id })
        .from(articles)
        .innerJoin(
          publicationGroups,
          eq(publicationGroups.id, articles.translationGroupId)
        )
        .where(
          and(
            eq(articles.id, articleId),
            eq(publicationGroups.kind, "article"),
            eq(articles.language, "lt"),
            eq(articles.status, "published"),
            isNotNull(articles.heroMediaId)
          )
        )
    )
  );
  const values = [
    ...(leadId
      ? [
          {
            articleId: leadId,
            createdAt: timestamp,
            id: crypto.randomUUID(),
            layoutRevision: revision,
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
      layoutRevision: revision,
      position,
      slot: "secondary",
      updatedAt: timestamp,
    })),
  ];
  const claimRevision = input.database
    .update(homepageLayoutState)
    .set({ revision, updatedAt: timestamp })
    .where(
      and(
        eq(homepageLayoutState.id, "primary"),
        eq(homepageLayoutState.revision, expectedRevision),
        ...transactionEligibility
      )
    );
  const deleteStalePlacements = input.database.delete(homepagePlacements).where(
    and(
      ne(homepagePlacements.layoutRevision, revision),
      exists(
        input.database
          .select({ id: homepageLayoutState.id })
          .from(homepageLayoutState)
          .where(
            and(
              eq(homepageLayoutState.id, "primary"),
              eq(homepageLayoutState.revision, revision)
            )
          )
      )
    )
  );
  const guardedPlacementInserts = values.map((value) =>
    input.database.insert(homepagePlacements).select(
      input.database
        .select({
          articleId: sql<string>`${value.articleId}`.as("article_id"),
          createdAt: sql<number>`${value.createdAt}`.as("created_at"),
          endsAt: sql<null>`NULL`.as("ends_at"),
          id: sql<string>`${value.id}`.as("id"),
          layoutRevision: sql<string>`${value.layoutRevision}`.as(
            "layout_revision"
          ),
          position: sql<number>`${value.position}`.as("position"),
          slot: sql<string>`${value.slot}`.as("slot"),
          startsAt: sql<null>`NULL`.as("starts_at"),
          updatedAt: sql<number>`${value.updatedAt}`.as("updated_at"),
        })
        .from(homepageLayoutState)
        .where(
          and(
            eq(homepageLayoutState.id, "primary"),
            eq(homepageLayoutState.revision, revision)
          )
        )
    )
  );
  await input.database.batch([
    claimRevision,
    ...guardedPlacementInserts,
    deleteStalePlacements,
  ]);
  const committedState =
    await input.database.query.homepageLayoutState.findFirst({
      where: eq(homepageLayoutState.id, "primary"),
    });
  if (committedState?.revision !== revision) {
    return {
      error: "Homepage layout changed since this editor loaded it",
      ok: false,
      status: 409,
    };
  }
  return { data: { leadId, revision, secondaryIds }, ok: true };
};
