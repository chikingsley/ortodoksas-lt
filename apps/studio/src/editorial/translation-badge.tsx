import { formatTranslationLabel } from "./translation-label";

interface Props {
  kind: "human" | "machine" | "original";
  reviewStatus: "approved" | "changes_requested" | "not_required" | "pending";
}

export const TranslationBadge = ({ kind, reviewStatus }: Props) => (
  <span className="inline-flex min-h-[22px] items-center whitespace-nowrap rounded-full border bg-muted px-2 font-semibold text-[9px] text-muted-foreground">
    {formatTranslationLabel(kind, reviewStatus)}
  </span>
);
