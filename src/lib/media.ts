import { readFileSync } from "node:fs";

interface MediaManifestEntry {
  aliases: string[];
  path: string;
}

interface MediaManifest {
  media: MediaManifestEntry[];
  schemaVersion: number;
}

interface MediaAssignment {
  mediaPath: string;
  path: string;
}

interface MediaAssignments {
  assignments: MediaAssignment[];
  schemaVersion: number;
}

interface UnresolvedMedia {
  issues: Array<{ originalUrl: string }>;
  schemaVersion: number;
}

const altAttributePattern = /\balt=(?:"([^"]*)"|'([^']*)')/i;
const mediaAttributePattern = /\b(src|poster|srcset)=(?:"([^"]+)"|'([^']+)')/gi;
const mediaTagPattern = /<(?:img|source)\b[^>]*>/gi;
const whitespacePattern = /\s+/;

const manifestUrl = new URL(
  "../../public/media/manifest.json",
  import.meta.url
);
const assignmentsUrl = new URL(
  "../../public/media/assignments.json",
  import.meta.url
);
const unresolvedUrl = new URL(
  "../../public/media/unresolved.json",
  import.meta.url
);

function normalizeMediaUrl(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&#38;", "&");
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function loadMediaAliases() {
  try {
    const manifest = JSON.parse(
      readFileSync(manifestUrl, "utf8")
    ) as MediaManifest;
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.media)) {
      return new Map<string, string>();
    }
    return new Map(
      manifest.media.flatMap((entry) =>
        entry.aliases.map((alias) => [alias, entry.path] as const)
      )
    );
  } catch {
    return new Map<string, string>();
  }
}

const mediaAliases = loadMediaAliases();

function loadMediaAssignments() {
  try {
    const assignments = JSON.parse(
      readFileSync(assignmentsUrl, "utf8")
    ) as MediaAssignments;
    if (
      assignments.schemaVersion !== 1 ||
      !Array.isArray(assignments.assignments)
    ) {
      return new Map<string, string>();
    }
    return new Map(
      assignments.assignments.map((assignment) => [
        assignment.path,
        assignment.mediaPath,
      ])
    );
  } catch {
    return new Map<string, string>();
  }
}

const mediaAssignments = loadMediaAssignments();

function loadUnresolvedMedia() {
  try {
    const unresolved = JSON.parse(
      readFileSync(unresolvedUrl, "utf8")
    ) as UnresolvedMedia;
    if (unresolved.schemaVersion !== 1 || !Array.isArray(unresolved.issues)) {
      return new Set<string>();
    }
    return new Set(
      unresolved.issues.map((issue) => normalizeMediaUrl(issue.originalUrl))
    );
  } catch {
    return new Set<string>();
  }
}

const unresolvedMedia = loadUnresolvedMedia();

function mediaSourcesFromTag(tag: string) {
  const sources: string[] = [];
  for (const match of tag.matchAll(mediaAttributePattern)) {
    const attribute = match[1]?.toLowerCase();
    const raw = match[2] ?? match[3] ?? "";
    if (attribute === "srcset") {
      for (const candidate of raw.split(",")) {
        sources.push(candidate.trim().split(whitespacePattern)[0] ?? "");
      }
    } else {
      sources.push(raw);
    }
  }
  return sources.filter(Boolean);
}

function unavailableMediaPlaceholder(tag: string, source: string) {
  const altMatch = tag.match(altAttributePattern);
  const alt = (altMatch?.[1] ?? altMatch?.[2] ?? "").trim();
  const description = alt ? `<span>${escapeText(alt)}</span>` : "";
  return `<span class="archive-media-unavailable" role="img" aria-label="Archyvo vaizdas atkuriamas" data-original-src="${escapeAttribute(source)}"><strong>Archyvo vaizdas atkuriamas</strong>${description}</span>`;
}

export function localizeMediaUrl(value: string | null, path?: string) {
  return (
    (path ? mediaAssignments.get(path) : null) ??
    (value ? (mediaAliases.get(value) ?? value) : null)
  );
}

export function localizeMediaHtml(value: string) {
  return value.replace(mediaTagPattern, (tag) => {
    const sources = mediaSourcesFromTag(tag);
    const unresolvedSource = sources.find(
      (source) =>
        !(
          mediaAliases.has(source) ||
          mediaAliases.has(normalizeMediaUrl(source))
        ) && unresolvedMedia.has(normalizeMediaUrl(source))
    );
    if (unresolvedSource) {
      return unavailableMediaPlaceholder(tag, unresolvedSource);
    }
    return tag.replace(
      mediaAttributePattern,
      (_match, attribute, doubleQuoted, singleQuoted) => {
        const raw = doubleQuoted ?? singleQuoted;
        const localized =
          attribute.toLowerCase() === "srcset"
            ? raw
                .split(",")
                .map((candidate: string) => {
                  const [source = "", ...descriptor] = candidate
                    .trim()
                    .split(whitespacePattern);
                  const target =
                    mediaAliases.get(source) ??
                    mediaAliases.get(source.replaceAll("&amp;", "&")) ??
                    source;
                  return [target, ...descriptor].join(" ");
                })
                .join(", ")
            : (mediaAliases.get(raw) ??
              mediaAliases.get(raw.replaceAll("&amp;", "&")) ??
              raw);
        return `${attribute}="${localized}"`;
      }
    );
  });
}
