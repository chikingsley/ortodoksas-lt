import {
  getSectionLabel,
  type SectionLocale,
} from "@ortodoksas-lt/content/sections";
import { CircleCheck, FilePlus2 } from "lucide-react";
import { useCallback } from "react";

import { formatPublicationStatus } from "../format-publication-status";
import { TranslationBadge } from "../translation-badge";
import type { CatalogArticle } from "../types";

interface Props {
  article: CatalogArticle;
  onOpen: (article: CatalogArticle) => void;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ArticleRow({ article, onOpen }: Props) {
  const openArticle = useCallback(() => onOpen(article), [article, onOpen]);

  return (
    <tr className="h-[67px] border-b transition-colors hover:bg-muted/50 max-sm:block max-sm:h-auto max-sm:min-h-[75px] max-sm:px-3.5 max-sm:py-3">
      <td className="w-[42px] py-2 pr-1 pl-4 align-middle text-[11px] text-muted-foreground max-sm:hidden">
        <input
          aria-label={`Select ${article.title}`}
          className="size-3.5 accent-primary"
          type="checkbox"
        />
      </td>
      <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground max-sm:block max-sm:p-0">
        <button
          className="grid w-full grid-cols-[43px_minmax(0,1fr)] items-center gap-3 border-0 bg-transparent p-0 text-left max-sm:grid-cols-[48px_minmax(0,1fr)]"
          onClick={openArticle}
          type="button"
        >
          <span className="grid size-[43px] place-items-center overflow-hidden rounded-sm bg-secondary text-muted-foreground max-sm:size-12 [&_img]:size-full [&_img]:object-cover [&_svg]:w-4">
            {article.hero ? (
              <img alt="" height="43" src={article.hero} width="43" />
            ) : (
              <FilePlus2 />
            )}
          </span>
          <span className="min-w-0">
            <strong className="block overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-foreground text-xs max-sm:line-clamp-2 max-sm:whitespace-normal max-sm:leading-snug">
              {article.title}
            </strong>
            <small className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground max-sm:line-clamp-1 max-sm:whitespace-normal max-sm:leading-snug">
              {article.description || article.path}
            </small>
          </span>
        </button>
      </td>
      <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground max-sm:hidden">
        <div className="flex items-center gap-1.5">
          <span className="inline-grid h-[22px] min-w-[27px] place-items-center rounded-sm border bg-card font-bold text-[9px]">
            {article.language.toUpperCase()}
          </span>
          <TranslationBadge
            kind={article.translationKind}
            reviewStatus={article.translationReviewStatus}
          />
        </div>
      </td>
      <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground max-sm:hidden max-md:hidden">
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
          {article.section
            ? getSectionLabel(
                article.section,
                article.language as SectionLocale
              )
            : "Other"}
        </span>
      </td>
      <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground max-sm:mt-2 max-sm:mr-4 max-sm:ml-[59px] max-sm:inline-block max-sm:p-0 max-md:hidden">
        <span className="inline-flex items-center gap-1.5 font-medium text-primary [&_svg]:w-3.5">
          <CircleCheck /> {formatPublicationStatus(article.status)}
        </span>
      </td>
      <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground tabular-nums max-sm:mt-2 max-sm:inline-block max-sm:p-0">
        {article.published
          ? dateFormatter.format(new Date(article.published))
          : "—"}
      </td>
    </tr>
  );
}
