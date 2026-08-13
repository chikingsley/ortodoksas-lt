import { UserButton } from "@clerk/tanstack-react-start";
import { ArrowLeft, Eye, LoaderCircle, Save, Send } from "lucide-react";
import { type MouseEvent, useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatTranslationLabel } from "@/editorial/shared/translation-label";

import type { CatalogArticle } from "../types";

interface Props {
  articleId: string | null;
  onBack: () => void;
  onCreateTranslation: (language: "en" | "ru" | "uk" | "be") => Promise<void>;
  onOpenTranslation: (event: MouseEvent<HTMLButtonElement>) => void;
  onPreview: () => void;
  onPublish: () => void;
  onSave: () => void;
  saveError: string | null;
  saveState: "saved" | "dirty" | "saving" | "error";
  status: "archived" | "draft" | "published" | "scheduled";
  title: string;
  translations: CatalogArticle[];
}

const EDITION_LANGUAGES = ["lt", "en", "ru", "uk", "be"] as const;

interface CreateTranslationButtonProps {
  language: "en" | "ru" | "uk" | "be";
  onCreate: (language: "en" | "ru" | "uk" | "be") => Promise<void>;
}

const CreateTranslationButton = ({
  language,
  onCreate,
}: CreateTranslationButtonProps) => {
  const [state, setState] = useState<"idle" | "creating" | "error">("idle");
  const label = { creating: "Creating", error: "Retry", idle: "Create" }[state];
  const createTranslation = useCallback(() => {
    if (state === "creating") {
      return;
    }
    setState("creating");
    onCreate(language).catch(() => setState("error"));
  }, [language, onCreate, state]);

  return (
    <button
      aria-label={`Create ${language.toUpperCase()} translation`}
      className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-dashed px-2.5 py-1.5 text-primary transition-colors hover:border-primary hover:bg-accent disabled:cursor-wait disabled:opacity-60 [&_small]:text-[10px] [&_strong]:text-[10px]"
      disabled={state === "creating"}
      onClick={createTranslation}
      type="button"
    >
      <strong>{language.toUpperCase()}</strong>
      <small className="inline-flex items-center gap-1">
        {state === "creating" ? (
          <LoaderCircle className="size-3 animate-spin" />
        ) : null}
        {label}
      </small>
    </button>
  );
};

export function ArticleEditorHeader({
  articleId,
  onBack,
  onCreateTranslation,
  onOpenTranslation,
  onPreview,
  onPublish,
  onSave,
  saveError,
  saveState,
  status,
  title,
  translations,
}: Props) {
  const saveMessage = {
    dirty: "Unsaved changes",
    error: saveError ?? "Save failed — try again",
    saved: articleId ? "Saved to Studio" : "Source loaded",
    saving: "Saving…",
  }[saveState];
  const saveLabel = status === "draft" ? "Save draft" : "Save changes";

  return (
    <>
      <header className="sticky top-0 z-[70] flex min-h-16 items-center justify-between border-b bg-card/95 px-5 py-2.5 shadow-sm max-md:grid max-md:min-h-[102px] max-md:grid-cols-1 max-md:gap-2 max-md:px-3 max-md:py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Back to articles"
            className="size-9 flex-none"
            onClick={onBack}
            size="icon-lg"
            type="button"
            variant="outline"
          >
            <ArrowLeft />
          </Button>
          <div className="flex min-w-0 flex-col items-start">
            <strong className="max-w-[min(42vw,540px)] overflow-hidden text-ellipsis whitespace-nowrap text-sm max-md:max-w-[calc(100vw-76px)]">
              {title || "Untitled article"}
            </strong>
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              {saveMessage}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 max-md:grid max-md:w-full max-md:grid-cols-3 [&_svg]:size-4">
          <Button onClick={onPreview} variant="outline">
            <Eye /> <span>Preview</span>
          </Button>
          <Button
            disabled={saveState === "saving"}
            onClick={onSave}
            variant="outline"
          >
            {saveState === "saving" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Save />
            )}
            <span>{saveLabel}</span>
          </Button>
          <Button disabled={saveState === "saving"} onClick={onPublish}>
            <Send />
            <span>{status === "published" ? "Verify live" : "Publish"}</span>
          </Button>
          <span className="ml-1 max-md:absolute max-md:top-3 max-md:right-3">
            <UserButton />
          </span>
        </div>
      </header>

      <nav
        aria-label="Article translations"
        className="flex min-h-[52px] items-center gap-4 border-b bg-card px-5 py-2 max-md:block max-md:px-3"
      >
        <span className="flex-none font-bold text-[11px] text-muted-foreground max-md:mb-1.5 max-md:block">
          Translations
        </span>
        <div className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
          {EDITION_LANGUAGES.map((editionLanguage) => {
            const counterpart = translations.find(
              (candidate) => candidate.language === editionLanguage
            );
            if (counterpart) {
              return (
                <button
                  aria-current={
                    counterpart.id === articleId ? "page" : undefined
                  }
                  className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-md border bg-muted px-2.5 py-1.5 text-muted-foreground aria-[current=page]:border-primary/30 aria-[current=page]:bg-accent aria-[current=page]:text-primary [&_small]:text-[10px] [&_strong]:text-[10px]"
                  data-article-id={counterpart.id}
                  key={editionLanguage}
                  onClick={onOpenTranslation}
                  type="button"
                >
                  <strong>{editionLanguage.toUpperCase()}</strong>
                  <small>
                    {formatTranslationLabel(
                      counterpart.translationKind,
                      counterpart.translationReviewStatus
                    )}
                  </small>
                </button>
              );
            }
            if (editionLanguage === "lt") {
              return (
                <span
                  className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-dashed px-2.5 py-1.5 text-muted-foreground [&_small]:text-[10px] [&_strong]:text-[10px]"
                  key={editionLanguage}
                >
                  <strong>{editionLanguage.toUpperCase()}</strong>
                  <small>Missing</small>
                </span>
              );
            }
            return (
              <CreateTranslationButton
                key={editionLanguage}
                language={editionLanguage}
                onCreate={onCreateTranslation}
              />
            );
          })}
        </div>
      </nav>
    </>
  );
}
