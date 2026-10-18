import { formatTranslationLabel } from "./translation-label";

interface Props {
  kind: "human" | "machine" | "original";
  reviewStatus: "approved" | "changes_requested" | "not_required" | "pending";
}

export const TranslationBadge = ({ kind, reviewStatus }: Props) => (
  <span className="bg-muted text-muted-foreground inline-flex min-h-[22px] items-center rounded-full border px-2 text-[9px] font-semibold whitespace-nowrap">
    {formatTranslationLabel(kind, reviewStatus)}
  </span>
);
