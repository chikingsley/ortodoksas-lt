import { getTranslationDisplayState } from "@ortodoksas-lt/content/translation";
import type {
  TranslationKind,
  TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";

const translationLabels = {
  automatic: "Automatic",
  editor_reviewed: "Editor reviewed",
  human_draft: "Human draft",
  original: "Original",
} as const;

export const formatTranslationLabel = (
  kind: TranslationKind,
  reviewStatus: TranslationReviewStatus
): string =>
  translationLabels[getTranslationDisplayState({ kind, reviewStatus })];
