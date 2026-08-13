const TRAILING_SLASH_PATTERN = /\/$/u;

export const parseAuthorizedParties = (
  configuredOrigins: string | undefined
): string[] => {
  const configured =
    configuredOrigins
      ?.split(",")
      .map((candidate) => candidate.trim())
      .filter(Boolean) ?? [];
  const origins = [
    ...new Set(
      configured.map((candidate) => {
        const normalized = candidate.replace(TRAILING_SLASH_PATTERN, "");
        const url = new URL(candidate);
        if (
          (url.protocol !== "http:" && url.protocol !== "https:") ||
          url.origin !== normalized
        ) {
          throw new Error(
            `CLERK_AUTHORIZED_PARTIES requires HTTP origins; received ${candidate}`
          );
        }
        return normalized;
      })
    ),
  ];
  if (origins.length === 0) {
    throw new Error("CLERK_AUTHORIZED_PARTIES requires at least one origin");
  }
  return origins;
};
