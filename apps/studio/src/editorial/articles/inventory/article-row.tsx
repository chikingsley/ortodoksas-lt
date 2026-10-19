import { getSectionLabel } from "@ortodoksas-lt/content/sections";
import { hasText } from "@ortodoksas-lt/content/value";
import { FileText, LoaderCircle } from "lucide-react";
import { useCallback, useState } from "react";

import type { CatalogArticle } from "../types";
import type { ArticleGroup } from "./article-groups";
import {
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

function EditionButton({ article, language, onOpen }: EditionButtonProps) {
  const openEdition = useCallback(() => {
    onOpen(article);
  }, [article, onOpen]);

  const status = editionStatusLabel(article);
  const reviewStatus = reviewStatusLabel(article.translationReviewStatus);

  return (
    <button
      aria-label={`Open ${language.toUpperCase()} edition, ${status}, review ${reviewStatus}`}
      className="bg-card hover:border-primary/40 hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 inline-flex min-h-9 min-w-12 flex-col items-center justify-center rounded-md border px-1.5 py-1 leading-none transition-colors focus-visible:ring-2 focus-visible:outline-none [&_small]:mt-1 [&_small]:text-xs [&_strong]:text-xs"
      onClick={openEdition}
      title={`${language.toUpperCase()} · ${status} · ${reviewStatus}`}
      type="button"
    >
      <strong>{language.toUpperCase()}</strong>
      <small>{status}</small>
    </button>
  );
}

interface CreateEditionButtonProps {
  language: "en" | "ru" | "uk" | "be";
  onCreate: (
    source: CatalogArticle,
    language: "en" | "ru" | "uk" | "be"
  ) => Promise<void>;
  source: CatalogArticle;
}

function CreateEditionButton({
  language,
  onCreate,
  source,
}: CreateEditionButtonProps) {
  const [state, setState] = useState<"idle" | "creating" | "error">("idle");
  const label = { creating: "Creating", error: "Retry", idle: "Create" }[state];

  const createEdition = useCallback(() => {
    if (state === "creating") {
      return;
    }

    setState("creating");
    void (async () => {
      try {
        await onCreate(source, language);
      } catch {
        setState("error");
      }
    })();
  }, [language, onCreate, source, state]);

  return (
    <button
      aria-label={`Create ${language.toUpperCase()} translation`}
      className="text-primary hover:border-primary hover:bg-accent focus-visible:ring-ring/50 inline-flex min-h-9 min-w-12 flex-col items-center justify-center rounded-md border border-dashed px-1.5 py-1 leading-none transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 [&_small]:mt-1 [&_small]:text-xs [&_strong]:text-xs"
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
}

export function ArticleRow({ group, onCreateTranslation, onOpen }: Props) {
  const { representative: article } = group;
  const translationSource = group.editions.lt ?? article;

  const openArticle = useCallback(() => {
    onOpen(article);
  }, [article, onOpen]);

  return (
    <tr className="hover:bg-muted/50 h-[67px] border-b transition-colors max-sm:block max-sm:h-auto max-sm:min-h-[75px] max-sm:px-3.5 max-sm:py-3">
      <td className="text-muted-foreground px-3 py-2 align-middle text-xs max-sm:block max-sm:p-0">
        <button
          aria-label={`Edit ${article.title}`}
          className="grid w-full grid-cols-[43px_minmax(0,1fr)] items-center gap-3 border-0 bg-transparent p-0 text-left max-sm:grid-cols-[48px_minmax(0,1fr)]"
          onClick={openArticle}
          type="button"
        >
          <span className="bg-secondary text-muted-foreground grid size-[43px] place-items-center overflow-hidden rounded-sm max-sm:size-12 [&_img]:size-full [&_img]:object-cover [&_svg]:w-4">
            {hasText(article.thumbnail) ? (
              <img alt="" height="43" src={article.thumbnail} width="43" />
            ) : (
              <FileText />
            )}
          </span>
          <span className="min-w-0">
            <strong className="text-foreground block overflow-hidden text-xs font-semibold text-ellipsis whitespace-nowrap max-sm:line-clamp-2 max-sm:leading-snug max-sm:whitespace-normal">
              {article.title}
            </strong>
            <small className="text-muted-foreground mt-1 block overflow-hidden text-xs text-ellipsis whitespace-nowrap max-sm:line-clamp-1 max-sm:leading-snug max-sm:whitespace-normal">
              {article.description || article.path}
            </small>
          </span>
        </button>
      </td>
      <td className="text-muted-foreground px-3 py-2 align-middle text-xs max-sm:mt-3 max-sm:block max-sm:p-0">
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
                  className="text-muted-foreground/60 inline-flex min-h-9 min-w-12 flex-col items-center justify-center rounded-md border border-dashed px-1.5 py-1 leading-none [&_small]:mt-1 [&_small]:text-xs [&_strong]:text-xs"
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
      <td className="text-muted-foreground px-3 py-2 align-middle text-xs max-md:hidden max-sm:hidden">
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
          {article.section
            ? getSectionLabel(article.section, article.language)
            : "Other"}
        </span>
      </td>
      <td className="text-muted-foreground px-3 py-2 align-middle text-xs max-md:hidden max-sm:mt-2 max-sm:mr-4 max-sm:ml-[59px] max-sm:inline-block max-sm:p-0">
        <span className="text-foreground font-medium">
          {getGroupPublicationSummary(group)}
        </span>
      </td>
      <td className="text-muted-foreground px-3 py-2 align-middle text-xs tabular-nums max-sm:mt-2 max-sm:inline-block max-sm:p-0">
        {hasText(group.latestPublished)
          ? dateFormatter.format(new Date(group.latestPublished))
          : "—"}
      </td>
    </tr>
  );
}
