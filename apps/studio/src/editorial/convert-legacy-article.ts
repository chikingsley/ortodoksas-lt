import { generateJSON } from "@tiptap/html";
import {
  type TiptapDocument,
  tiptapDocumentSchema,
} from "../../shared/content/article";
import { resolveRecoveredMediaUrl } from "../../shared/content/media-url";
import { canonicalizeTiptapDocument } from "../../shared/editor/canonicalize";
import { articleContentExtensions } from "../../shared/editor/extensions";
import { annotateArticleBody } from "../../shared/editor/provenance";
import {
  type NormalizedLegacyArticle,
  normalizeLegacyHtml,
} from "./normalize-legacy-html";

export interface ConvertedLegacyArticle extends NormalizedLegacyArticle {
  body: TiptapDocument;
}

const IMAGE_RESIZE_QUERY_PATTERN = /[=][^/=]+$/u;
const IMAGE_SIZE_PATH_PATTERN = /\/s\d+\//u;
const getImageIdentity = (url: string): string =>
  resolveRecoveredMediaUrl(url)
    .replace(IMAGE_RESIZE_QUERY_PATTERN, "")
    .replace(IMAGE_SIZE_PATH_PATTERN, "/");

export const convertLegacyArticle = (
  sourceHtml: string,
  heroUrl?: string | null
): ConvertedLegacyArticle => {
  const normalized = normalizeLegacyHtml(sourceHtml);
  const body = tiptapDocumentSchema.parse(
    canonicalizeTiptapDocument(
      generateJSON(
        normalized.normalizedHtml || "<p></p>",
        articleContentExtensions
      )
    )
  );
  const firstNode = body.content?.[0];
  const firstImageUrl =
    (firstNode?.type === "image" || firstNode?.type === "figure") &&
    typeof firstNode.attrs?.src === "string"
      ? firstNode.attrs.src
      : null;
  const duplicateHero =
    heroUrl &&
    firstImageUrl &&
    getImageIdentity(heroUrl) === getImageIdentity(firstImageUrl)
      ? firstImageUrl
      : null;
  if (duplicateHero) {
    body.content = body.content?.slice(1);
  }
  const annotatedBody = annotateArticleBody(body, body).body;

  return {
    ...normalized,
    body: annotatedBody,
    images: duplicateHero
      ? normalized.images.filter((image) => image.sourceUrl !== duplicateHero)
      : normalized.images,
    warnings: duplicateHero
      ? normalized.warnings.filter(
          (warning) =>
            warning !== `Image needs alternative text: ${duplicateHero}`
        )
      : normalized.warnings,
  };
};
