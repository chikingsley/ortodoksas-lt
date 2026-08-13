export type TranslationKind = "human" | "machine" | "original";

export type TranslationReviewStatus =
  | "approved"
  | "changes_requested"
  | "not_required"
  | "pending";

export type TranslationDisplayState =
  | "automatic"
  | "editor_reviewed"
  | "original";

export const getTranslationDisplayState = ({
  kind,
  reviewStatus,
}: {
  kind: TranslationKind;
  reviewStatus: TranslationReviewStatus;
}): TranslationDisplayState => {
  if (kind === "original") {
    return "original";
  }
  if (reviewStatus === "approved") {
    return "editor_reviewed";
  }
  return "automatic";
};
