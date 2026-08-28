import { queryOptions } from "@tanstack/react-query";
import type { StudioOperationResult } from "@/server/articles/article-operation-support.server";
import {
  loadHomepagePlacements,
  updateHomepagePlacementsMutation,
} from "@/server/homepage/homepage.functions";

export interface HomepagePlacement {
  articleId: string;
  position: number;
  slot: string;
}

export interface HomepageLayout {
  placements: HomepagePlacement[];
  revision: string;
}

export async function fetchHomepagePlacements(): Promise<HomepageLayout> {
  return (await loadHomepagePlacements()) as HomepageLayout;
}

export const homepagePlacementsQueryOptions = () =>
  queryOptions({
    queryFn: fetchHomepagePlacements,
    queryKey: ["studio", "homepage", "placements"] as const,
  });

export function persistHomepagePlacements(input: {
  expectedRevision: string;
  leadId: string | null;
  secondaryIds: string[];
}): Promise<
  StudioOperationResult<{
    leadId: string | null;
    revision: string;
    secondaryIds: string[];
  }>
> {
  return updateHomepagePlacementsMutation({ data: input });
}
