export interface HomepagePlacement {
  articleId: string;
  position: number;
  slot: string;
}

export async function fetchHomepagePlacements(): Promise<HomepagePlacement[]> {
  const response = await fetch("/api/homepage");
  if (!response.ok) {
    throw new Error("Homepage request failed");
  }
  const data = (await response.json()) as {
    placements: HomepagePlacement[];
  };
  return data.placements;
}

export async function persistHomepagePlacements(input: {
  leadId: string | null;
  secondaryIds: string[];
}): Promise<boolean> {
  const response = await fetch("/api/homepage", {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "PUT",
  });
  return response.ok;
}
