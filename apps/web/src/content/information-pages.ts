export const informationPageGroups = {
  calendar: "1cef25a2-d6bc-4a35-b09f-2da96ca841bf",
  clergy: "edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f",
  communities: "b7e18d0e-ddd5-49ed-9590-253666cf2d3f",
  contact: "d049617c-00d0-4aff-860f-78dc8e513c9e",
  library: "a1e2f5f6-c7f5-4b6a-93ba-125dade2f7d2",
  support: "fe5459d1-9bc6-4db7-81c5-0919c02581ab",
} as const;

export type InformationPageRole = keyof typeof informationPageGroups;

const rolesByGroup = new Map<string, InformationPageRole>(
  Object.entries(informationPageGroups).map(([role, group]) => [
    group,
    role as InformationPageRole,
  ])
);

const legacyLithuanianPaths: Record<string, InformationPageRole> = {
  "/p/bendruomenes_21.html": "communities",
  "/p/biblioteka.html": "library",
  "/p/dvasininkai.html": "clergy",
  "/p/kalendorius.html": "calendar",
  "/p/kontaktai_30.html": "contact",
  "/p/paremti.html": "support",
};

export function getInformationPageRole(
  translationGroupId: string | undefined,
  path: string
) {
  return (
    (translationGroupId ? rolesByGroup.get(translationGroupId) : undefined) ??
    legacyLithuanianPaths[path]
  );
}
