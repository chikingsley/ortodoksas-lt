interface HomepageEntry {
  hero: string | null;
  homepage?: "feed" | "lead" | "secondary";
  homepageOrder?: number;
  path: string;
  published: string | null;
}

export function selectHomepageArticles<T extends HomepageEntry>(entries: T[]) {
  const sorted = [...entries].sort((a, b) => {
    const left = a.published ? Date.parse(a.published) : 0;
    const right = b.published ? Date.parse(b.published) : 0;
    return right - left;
  });
  const lead =
    sorted.find((entry) => entry.homepage === "lead") ??
    sorted.find((entry) => entry.hero) ??
    sorted[0];
  const available = sorted.filter((entry) => entry.path !== lead?.path);
  const promoted = available
    .filter((entry) => entry.homepage === "secondary")
    .sort((a, b) => (a.homepageOrder ?? 99) - (b.homepageOrder ?? 99));
  const secondary = [...promoted];
  for (const entry of available) {
    if (secondary.length >= 4) {
      break;
    }
    if (!secondary.some((candidate) => candidate.path === entry.path)) {
      secondary.push(entry);
    }
  }
  const used = new Set([lead?.path, ...secondary.map((entry) => entry.path)]);
  return {
    lead,
    remaining: sorted.filter((entry) => !used.has(entry.path)),
    secondary: secondary.slice(0, 4),
  };
}
