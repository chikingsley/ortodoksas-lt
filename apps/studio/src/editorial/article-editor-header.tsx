import { ArrowLeft, Eye, LoaderCircle, Save } from "lucide-react";
import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button";

import { formatTranslationLabel } from "./translation-label";
import type { CatalogArticle } from "./types";

interface Props {
  articleId: string | null;
  onBack: () => void;
  onOpenTranslation: (event: MouseEvent<HTMLButtonElement>) => void;
  onPreview: () => void;
  onSave: () => void;
  saveState: "saved" | "dirty" | "saving" | "error";
  title: string;
  translations: CatalogArticle[];
}

const EDITION_LANGUAGES = ["lt", "en", "ru", "uk", "be"] as const;

export function ArticleEditorHeader({
  articleId,
  onBack,
  onOpenTranslation,
  onPreview,
  onSave,
  saveState,
  title,
  translations,
}: Props) {
  const saveMessage = {
    dirty: "Unsaved changes",
    error: "Save failed — try again",
    saved: articleId ? "Saved to Studio" : "Source loaded",
    saving: "Saving…",
  }[saveState];

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
        <div className="flex items-center gap-2 max-md:grid max-md:w-full max-md:grid-cols-2 [&_svg]:size-4">
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
            <span>Save draft</span>
          </Button>
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
            return counterpart ? (
              <button
                aria-current={counterpart.id === articleId ? "page" : undefined}
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
            ) : (
              <span
                className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-dashed px-2.5 py-1.5 text-muted-foreground [&_small]:text-[10px] [&_strong]:text-[10px]"
                key={editionLanguage}
              >
                <strong>{editionLanguage.toUpperCase()}</strong>
                <small>Missing</small>
              </span>
            );
          })}
        </div>
      </nav>
    </>
  );
}
