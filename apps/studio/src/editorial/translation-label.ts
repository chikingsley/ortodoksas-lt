import {
  getTranslationDisplayState,
  type TranslationKind,
  type TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";

const translationLabels = {
  automatic: "Automatic",
  editor_reviewed: "Editor reviewed",
  original: "Original",
} as const;

export const formatTranslationLabel = (
  kind: TranslationKind,
  reviewStatus: TranslationReviewStatus
): string =>
  translationLabels[getTranslationDisplayState({ kind, reviewStatus })];
