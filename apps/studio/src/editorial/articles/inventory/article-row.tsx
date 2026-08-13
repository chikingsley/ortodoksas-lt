import {
  getSectionLabel,
  type SectionLocale,
} from "@ortodoksas-lt/content/sections";
import { FileText, LoaderCircle } from "lucide-react";
import { useCallback, useState } from "react";

import type { CatalogArticle } from "../types";
import {
  type ArticleGroup,
  EDITION_LANGUAGES,
  getGroupPublicationSummary,
} from "./article-groups";

interface Props {
  group: ArticleGroup;
  onCreateTranslation: (
    source: CatalogArticle,
    language: "en" | "ru" | "uk" | "be"
  ) => Promise<void>;
  onOpen: (article: CatalogArticle) => void;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const editionStatusLabel = (article: CatalogArticle) => {
  if (article.status === "published") {
    return "Live";
  }
  if (article.status === "scheduled") {
    return "Scheduled";
  }
  if (article.status === "archived") {
    return "Archived";
  }
  return "Draft";
};

const reviewStatusLabel = (status: CatalogArticle["translationReviewStatus"]) =>
  status.replace("_", " ");

interface EditionButtonProps {
  article: CatalogArticle;
  language: string;
  onOpen: (article: CatalogArticle) => void;
}

const EditionButton = ({ article, language, onOpen }: EditionButtonProps) => {
  const openEdition = useCallback(() => onOpen(article), [article, onOpen]);
  const status = editionStatusLabel(article);
  const reviewStatus = reviewStatusLabel(article.translationReviewStatus);

  return (
    <button
      aria-label={`Open ${language.toUpperCase()} edition, ${status}, review ${reviewStatus}`}
      className="inline-flex min-h-9 min-w-12 flex-col items-center justify-center rounded-md border bg-card px-1.5 py-1 leading-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&_small]:mt-1 [&_small]:text-[8px] [&_strong]:text-[9px]"
      onClick={openEdition}
      title={`${language.toUpperCase()} · ${status} · ${reviewStatus}`}
      type="button"
    >
      <strong>{language.toUpperCase()}</strong>
      <small>{status}</small>
    </button>
  );
};

interface CreateEditionButtonProps {
  language: "en" | "ru" | "uk" | "be";
  onCreate: (
    source: CatalogArticle,
    language: "en" | "ru" | "uk" | "be"
  ) => Promise<void>;
  source: CatalogArticle;
}

const CreateEditionButton = ({
  language,
  onCreate,
  source,
}: CreateEditionButtonProps) => {
  const [state, setState] = useState<"idle" | "creating" | "error">("idle");
  const label = { creating: "Creating", error: "Retry", idle: "Create" }[state];
  const createEdition = useCallback(() => {
    if (state === "creating") {
      return;
    }
    setState("creating");
    onCreate(source, language).catch(() => setState("error"));
  }, [language, onCreate, source, state]);

  return (
    <button
      aria-label={`Create ${language.toUpperCase()} translation`}
      className="inline-flex min-h-9 min-w-12 flex-col items-center justify-center rounded-md border border-dashed px-1.5 py-1 text-primary leading-none transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-60 [&_small]:mt-1 [&_small]:text-[8px] [&_strong]:text-[9px]"
      disabled={state === "creating"}
      onClick={createEdition}
      title={`Create ${language.toUpperCase()} translation`}
      type="button"
    >
      <strong>{language.toUpperCase()}</strong>
      <small className="inline-flex items-center gap-0.5">
        {state === "creating" ? (
          <LoaderCircle className="size-2 animate-spin" />
        ) : null}
        {label}
      </small>
    </button>
  );
};

export function ArticleRow({ group, onCreateTranslation, onOpen }: Props) {
  const { representative: article } = group;
  const translationSource = group.editions.lt ?? article;
  const openArticle = useCallback(() => onOpen(article), [article, onOpen]);

  return (
    <tr className="h-[67px] border-b transition-colors hover:bg-muted/50 max-sm:block max-sm:h-auto max-sm:min-h-[75px] max-sm:px-3.5 max-sm:py-3">
      <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground max-sm:block max-sm:p-0">
        <button
          className="grid w-full grid-cols-[43px_minmax(0,1fr)] items-center gap-3 border-0 bg-transparent p-0 text-left max-sm:grid-cols-[48px_minmax(0,1fr)]"
          onClick={openArticle}
          type="button"
        >
          <span className="grid size-[43px] place-items-center overflow-hidden rounded-sm bg-secondary text-muted-foreground max-sm:size-12 [&_img]:size-full [&_img]:object-cover [&_svg]:w-4">
            {article.thumbnail ? (
              <img alt="" height="43" src={article.thumbnail} width="43" />
            ) : (
              <FileText />
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
      <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground max-sm:mt-3 max-sm:block max-sm:p-0">
        <fieldset
          aria-label="Available editions"
          className="m-0 flex gap-1 border-0 p-0"
        >
          {EDITION_LANGUAGES.map((language) => {
            const edition = group.editions[language];
            if (edition) {
              return (
                <EditionButton
                  article={edition}
                  key={language}
                  language={language}
                  onOpen={onOpen}
                />
              );
            }
            if (language === "lt") {
              return (
                <span
                  className="inline-flex min-h-9 min-w-12 flex-col items-center justify-center rounded-md border border-dashed px-1.5 py-1 text-muted-foreground/60 leading-none [&_small]:mt-1 [&_small]:text-[8px] [&_strong]:text-[9px]"
                  key={language}
                  title={`${language.toUpperCase()} · Missing`}
                >
                  <strong>{language.toUpperCase()}</strong>
                  <small>Missing</small>
                </span>
              );
            }
            return (
              <CreateEditionButton
                key={language}
                language={language}
                onCreate={onCreateTranslation}
                source={translationSource}
              />
            );
          })}
        </fieldset>
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
        <span className="font-medium text-foreground">
          {getGroupPublicationSummary(group)}
        </span>
      </td>
      <td className="px-3 py-2 align-middle text-[11px] text-muted-foreground tabular-nums max-sm:mt-2 max-sm:inline-block max-sm:p-0">
        {group.latestPublished
          ? dateFormatter.format(new Date(group.latestPublished))
          : "—"}
      </td>
    </tr>
  );
}
