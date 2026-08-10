import { access, readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import sharp from "sharp";

interface MediaAssignment {
  mediaPath: string;
  path: string;
}

interface MediaEntry {
  aliases: string[];
  path: string;
  sha256: string;
  storage: "r2";
}

interface MediaManifest {
  media: MediaEntry[];
  schemaVersion: number;
}

interface MediaAssignments {
  assignments: MediaAssignment[];
  schemaVersion: number;
}

const webDirectory = resolve(import.meta.dirname, "..");
const publicDirectory = join(webDirectory, "public");
const distDirectory = join(webDirectory, "dist");
const manifestPath = join(publicDirectory, "media/manifest.json");
const assignmentsPath = join(publicDirectory, "media/assignments.json");
const imageExtensions = new Set([
  ".avif",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
]);
const imageUrlPattern =
  /<(?:img|source)\b[^>]*\b(src|srcset)\s*=\s*(?:"([^"]+)"|'([^']+)')|url\(\s*(?:"([^"]+)"|'([^']+)'|([^"')\s]+))\s*\)|"(?:image|logo|thumbnailUrl)"\s*:\s*"([^"]+)"/gi;
const digestPattern = /^[a-f0-9]{64}$/u;
const whitespacePattern = /\s+/u;
const remoteMediaPattern = /^(?:https?:|data:image\/)/iu;
const queryOrFragmentPattern = /[?#]/u;
const mediaApiPattern = /^\/api\/media\/[A-Za-z0-9_-]+$/u;
const leadingSlashPattern = /^\//u;

function parseOptions(args: string[]) {
  const [mode, ...rest] = args;
  let scope = "all";
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--scope") {
      scope = rest[index + 1] ?? "";
      index += 1;
    } else if (argument?.startsWith("--scope=")) {
      scope = argument.slice(8);
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  if (mode !== "source" && mode !== "dist") {
    throw new Error("Mode must be source or dist");
  }
  if (scope !== "all" && scope !== "homepage") {
    throw new Error("--scope must be homepage or all");
  }
  return { mode, scope } as const;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function loadInputs() {
  const manifest = await readJson<MediaManifest>(manifestPath);
  const assignments = await readJson<MediaAssignments>(assignmentsPath);
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.media)) {
    throw new Error("Invalid media manifest");
  }
  if (
    assignments.schemaVersion !== 1 ||
    !Array.isArray(assignments.assignments)
  ) {
    throw new Error("Invalid media assignments");
  }
  return { assignments, manifest };
}

function checkSource(
  manifest: MediaManifest,
  assignments: MediaAssignments
): string[] {
  const failures: string[] = [];
  const aliases = new Set<string>();
  const paths = new Set<string>();
  for (const entry of manifest.media) {
    if (!entry.path.startsWith("/media/files/")) {
      failures.push(`Invalid R2 media path: ${entry.path}`);
    }
    if (entry.storage !== "r2") {
      failures.push(`Media entry lacks R2 storage: ${entry.path}`);
    }
    if (!digestPattern.test(entry.sha256)) {
      failures.push(`Invalid media digest: ${entry.path}`);
    }
    if (paths.has(entry.path)) {
      failures.push(`Duplicate media path: ${entry.path}`);
    }
    paths.add(entry.path);
    for (const alias of entry.aliases) {
      if (aliases.has(alias)) {
        failures.push(`Duplicate media alias: ${alias}`);
      }
      aliases.add(alias);
    }
  }
  const assignedPaths = new Set<string>();
  for (const assignment of assignments.assignments) {
    if (assignedPaths.has(assignment.path)) {
      failures.push(`Duplicate media assignment: ${assignment.path}`);
    }
    assignedPaths.add(assignment.path);
    if (!paths.has(assignment.mediaPath)) {
      failures.push(
        `Assignment media absent from manifest: ${assignment.path} -> ${assignment.mediaPath}`
      );
    }
  }
  return failures;
}

function mediaUrls(value: string): string[] {
  const urls: string[] = [];
  for (const match of value.matchAll(imageUrlPattern)) {
    const [attribute] = match.slice(1);
    const raw = match.slice(2).find(Boolean);
    if (!raw) {
      continue;
    }
    const candidates = attribute === "srcset" ? raw.split(",") : [raw];
    for (const candidate of candidates) {
      const [url] = candidate.trim().split(whitespacePattern);
      if (url) {
        urls.push(url);
      }
    }
  }
  return urls;
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : Promise.resolve([path]);
    })
  );
  return nested.flat();
}

async function validatePublishedUrl(
  url: string,
  file: string,
  checked: Set<string>,
  r2Paths: Set<string>
): Promise<string | undefined> {
  if (remoteMediaPattern.test(url)) {
    return `Remote published media: ${relative(distDirectory, file)} -> ${url}`;
  }
  if (!url.startsWith("/") || url.startsWith("//")) {
    return;
  }
  const [path = ""] = url.split(queryOrFragmentPattern);
  const cleanPath = decodeURIComponent(path);
  if (checked.has(cleanPath)) {
    return;
  }
  checked.add(cleanPath);
  if (mediaApiPattern.test(cleanPath) || r2Paths.has(cleanPath)) {
    return;
  }
  const target = join(
    distDirectory,
    cleanPath.replace(leadingSlashPattern, "")
  );
  try {
    await access(target);
    if (imageExtensions.has(extname(cleanPath).toLowerCase())) {
      await sharp(target, { animated: true }).metadata();
    }
  } catch (error) {
    return `Invalid local published media: ${cleanPath} (${error instanceof Error ? error.message : String(error)})`;
  }
}

async function checkDist(
  scope: "all" | "homepage",
  manifest: MediaManifest
): Promise<string[]> {
  const failures: string[] = [];
  const files =
    scope === "homepage"
      ? [join(distDirectory, "index.html")]
      : (await walk(distDirectory)).filter((file) =>
          [".css", ".html", ".json", ".xml"].includes(extname(file))
        );
  const checked = new Set<string>();
  const r2Paths = new Set(manifest.media.map((entry) => entry.path));
  const contents = await Promise.all(
    files.map((file) => readFile(file, "utf8"))
  );
  const checks = contents.flatMap((content, index) => {
    const file = files[index];
    if (!file) {
      return [];
    }
    return mediaUrls(content).map((url) =>
      validatePublishedUrl(url, file, checked, r2Paths)
    );
  });
  const results = await Promise.all(checks);
  failures.push(
    ...results.filter((result): result is string => Boolean(result))
  );
  return failures;
}

const options = parseOptions(process.argv.slice(2));
const inputs = await loadInputs();
const failures =
  options.mode === "source"
    ? checkSource(inputs.manifest, inputs.assignments)
    : await checkDist(options.scope, inputs.manifest);

if (failures.length > 0) {
  console.error(failures.slice(0, 100).join("\n"));
  if (failures.length > 100) {
    console.error(`…and ${failures.length - 100} more media failures`);
  }
  throw new Error(`Media integrity failed: ${failures.length} issue(s)`);
}

console.log(
  `Media integrity passed: mode=${options.mode} scope=${options.scope} entries=${inputs.manifest.media.length}`
);
