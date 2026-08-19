import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { Save } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  localeLabel,
  localeOptions,
} from "@/editorial/directories/directory-form-controls";

interface DirectoryEditorHeaderProps {
  canSubmit: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  locale: SiteLocale;
  message: string;
  onLocaleChange: (locale: SiteLocale) => void;
  recordTitle: string;
  saveLabel: string;
}

export function DirectoryEditorHeader({
  canSubmit,
  isDirty,
  isSubmitting,
  locale,
  message,
  onLocaleChange,
  recordTitle,
  saveLabel,
}: DirectoryEditorHeaderProps) {
  let saveState = message || "All changes saved";
  if (isDirty && (!message || message === "Saved")) {
    saveState = "Unsaved changes";
  }
  if (isSubmitting) {
    saveState = "Saving…";
  }
  const isSaveDisabled = !(isDirty && canSubmit) || isSubmitting;
  const changeLocale = useCallback(
    (value: string | null) => {
      if (value) {
        onLocaleChange(value as SiteLocale);
      }
    },
    [onLocaleChange]
  );

  return (
    <header className="sticky top-0 z-20 -mx-[clamp(16px,3vw,40px)] mb-5 border-b bg-background/95 px-[clamp(16px,3vw,40px)] py-3 backdrop-blur-sm max-md:top-[var(--studio-mobile-header-height)] min-[1001px]:-mt-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-2">
        <div className="min-w-0 flex-1 max-md:col-start-1 max-md:row-start-1">
          <p className="m-0 text-muted-foreground text-xs">Directory record</p>
          <h1 className="m-0 truncate font-semibold text-base">
            {recordTitle}
          </h1>
        </div>
        <Select onValueChange={changeLocale} value={locale}>
          <SelectTrigger
            aria-label="Content language"
            className="w-40 max-md:col-start-1 max-md:row-start-2 max-md:w-full"
          >
            <SelectValue>{localeLabel[locale]}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false}>
            {localeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span
          aria-live="polite"
          className="min-w-24 text-right text-muted-foreground text-xs max-md:col-start-2 max-md:row-start-1"
        >
          {saveState}
        </span>
        <Button
          className="max-md:col-start-2 max-md:row-start-2 max-md:justify-self-end"
          disabled={isSaveDisabled}
          type="submit"
        >
          <Save /> {saveLabel}
        </Button>
      </div>
    </header>
  );
}
