import type { JSONContent } from "@tiptap/core";

import type { TiptapDocument } from "./article";

const ARCHIVED_BLOGGER_MEDIA_PATTERN =
  /^https:\/\/web\.archive\.org\/web\/\d+[a-z_]*\/(https:\/\/blogger\.googleusercontent\.com\/.+)$/u;
const BLOGGER_SIZE_PARAMETER_PATTERN = /[=][^/?#]+$/u;
const BLOGGER_SIZE_PATH_PATTERN = /\/s\d+(?:-[a-z0-9-]+)?\//u;

export const isBloggerMediaUrl = (value: string): boolean =>
  value.startsWith("https://blogger.googleusercontent.com/");

export const resolveRecoveredMediaUrl = (value: string): string => {
  const directUrl = value.match(ARCHIVED_BLOGGER_MEDIA_PATTERN)?.[1] ?? value;
  if (!isBloggerMediaUrl(directUrl)) {
    return directUrl;
  }
  return directUrl
    .replace(BLOGGER_SIZE_PATH_PATTERN, "/s0/")
    .replace(BLOGGER_SIZE_PARAMETER_PATTERN, "");
};

const resolveNodeMediaUrls = (node: JSONContent): JSONContent => {
  const source = node.attrs?.src;
  return {
    ...node,
    ...(node.attrs && typeof source === "string"
      ? {
          attrs: {
            ...node.attrs,
            src: resolveRecoveredMediaUrl(source),
          },
        }
      : {}),
    ...(node.content
      ? { content: node.content.map(resolveNodeMediaUrls) }
      : {}),
  };
};

export const resolveTiptapMediaUrls = (
  document: TiptapDocument
): TiptapDocument => resolveNodeMediaUrls(document) as TiptapDocument;
