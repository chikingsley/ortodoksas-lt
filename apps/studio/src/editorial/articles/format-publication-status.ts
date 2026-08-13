import type { CatalogArticle } from "./types";

const publicationStatusLabels: Record<CatalogArticle["status"], string> = {
  archived: "Archived",
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
};

export const formatPublicationStatus = (
  status: CatalogArticle["status"]
): string => publicationStatusLabels[status];
