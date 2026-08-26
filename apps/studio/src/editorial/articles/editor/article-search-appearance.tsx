import {
  type ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSeoDescriptionChange: (value: string) => void;
  onSeoTitleChange: (value: string) => void;
  publicPath: string;
  seoDescription: string;
  seoTitle: string;
  summary: string;
  title: string;
}

const fallbackTitle = "Untitled article";
const fallbackDescription = "Add an article summary to complete this preview.";

export function ArticleSearchAppearance({
  onSeoDescriptionChange,
  onSeoTitleChange,
  publicPath,
  seoDescription,
  seoTitle,
  summary,
  title,
}: Props) {
  const effectiveTitle = seoTitle.trim() || title.trim() || fallbackTitle;
  const effectiveDescription =
    seoDescription.trim() || summary.trim() || fallbackDescription;
  const hasOverrides = Boolean(seoTitle.trim() || seoDescription.trim());
  const [customizeOpen, setCustomizeOpen] = useState(hasOverrides);
  const changeSeoTitle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onSeoTitleChange(event.target.value),
    [onSeoTitleChange]
  );
  const changeSeoDescription = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) =>
      onSeoDescriptionChange(event.target.value),
    [onSeoDescriptionChange]
  );
  const useArticleFields = useCallback(() => {
    onSeoTitleChange("");
    onSeoDescriptionChange("");
  }, [onSeoDescriptionChange, onSeoTitleChange]);
  const toggleCustomization = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>) =>
      setCustomizeOpen(event.currentTarget.open),
    []
  );

  return (
    <>
      <div aria-live="polite" className="rounded-lg border bg-card p-3.5">
        <div className="truncate text-[11px] text-emerald-700">
          ortodoksas.lt › {publicPath.replaceAll("/", " › ")}
        </div>
        <div className="mt-1 line-clamp-2 text-[#1a0dab] text-base leading-snug">
          {effectiveTitle} · ortodoksas.lt
        </div>
        <p className="mt-1 mb-0 line-clamp-3 text-[11px] text-muted-foreground leading-relaxed">
          {effectiveDescription}
        </p>
      </div>

      <details
        className="mt-3.5"
        onToggle={toggleCustomization}
        open={customizeOpen}
      >
        <summary className="cursor-pointer font-semibold text-xs">
          Customize search result
        </summary>
        <div className="mt-3 grid gap-4">
          <Field>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="article-seo-title">Search title</FieldLabel>
              <span className="text-[10px] text-muted-foreground">
                {effectiveTitle.length} characters
              </span>
            </div>
            <Input
              id="article-seo-title"
              maxLength={240}
              onChange={changeSeoTitle}
              placeholder={title || fallbackTitle}
              value={seoTitle}
            />
          </Field>
          <Field>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="article-seo-description">
                Search description
              </FieldLabel>
              <span className="text-[10px] text-muted-foreground">
                {effectiveDescription.length} characters
              </span>
            </div>
            <Textarea
              id="article-seo-description"
              maxLength={600}
              onChange={changeSeoDescription}
              placeholder={summary || fallbackDescription}
              rows={3}
              value={seoDescription}
            />
          </Field>
          <Button
            disabled={!hasOverrides}
            onClick={useArticleFields}
            size="sm"
            type="button"
            variant="outline"
          >
            Use article title and summary
          </Button>
        </div>
      </details>
    </>
  );
}
