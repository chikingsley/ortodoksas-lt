import {
  articleBaselines,
  articleContentChanges,
  articleRevisions,
  articles,
  homepagePlacements,
  mediaAliases,
  mediaAssets,
} from "@ortodoksas-lt/db";
import { drizzle } from "drizzle-orm/d1";

const schema = {
  articleBaselines,
  articleContentChanges,
  articleRevisions,
  articles,
  homepagePlacements,
  mediaAliases,
  mediaAssets,
};

export const getDatabase = (database: D1Database) =>
  drizzle(database, { schema });

export type StudioDatabase = ReturnType<typeof getDatabase>;
