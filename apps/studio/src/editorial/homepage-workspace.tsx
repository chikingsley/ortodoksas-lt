import { ExternalLink, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchHomepagePlacements,
  persistHomepagePlacements,
} from "./inventory/homepage-api";
import {
  AUTOMATIC_PLACEMENT,
  HomepageLayoutPanel,
} from "./inventory/homepage-layout-panel";
import type { CatalogArticle } from "./types";
import type { ValueOption } from "./value-combobox";

interface Props {
  articles: CatalogArticle[];
}

export function HomepageWorkspace({ articles }: Props) {
  const [leadId, setLeadId] = useState("");
  const [secondaryIds, setSecondaryIds] = useState(["", "", "", ""]);
  const [state, setState] = useState<
    "loading" | "idle" | "saving" | "saved" | "error"
  >("loading");

  useEffect(() => {
    fetchHomepagePlacements()
      .then((placements) => {
        const lead = placements.find((placement) => placement.slot === "lead");
        const supporting = placements
          .filter((placement) => placement.slot === "secondary")
          .sort((left, right) => left.position - right.position);
        setLeadId(lead?.articleId ?? "");
        setSecondaryIds(
          [0, 1, 2, 3].map((index) => supporting[index]?.articleId ?? "")
        );
        setState("idle");
      })
      .catch(() => setState("error"));
  }, []);

  const eligibleArticles = useMemo(
    () =>
      articles
        .filter(
          (article) =>
            article.kind === "article" &&
            article.language === "lt" &&
            article.status === "published" &&
            article.hero
        )
        .sort((left, right) =>
          (right.published ?? "").localeCompare(left.published ?? "")
        ),
    [articles]
  );
  const articleOptions = useMemo<ValueOption[]>(
    () => [
      { label: "Automatic", value: AUTOMATIC_PLACEMENT },
      ...eligibleArticles.map((article) => ({
        label: article.title,
        value: article.id,
      })),
    ],
    [eligibleArticles]
  );
  const leadOptions = useMemo<ValueOption[]>(
    () => [
      { label: "Automatic latest story", value: AUTOMATIC_PLACEMENT },
      ...articleOptions.slice(1),
    ],
    [articleOptions]
  );
  const updateLead = useCallback((value: string) => {
    setLeadId(value === AUTOMATIC_PLACEMENT ? "" : value);
    setState("idle");
  }, []);
  const updateSupporting = useCallback((position: number, value: string) => {
    const nextValue = value === AUTOMATIC_PLACEMENT ? "" : value;
    setSecondaryIds((current) =>
      current.map((currentValue, index) =>
        index === position ? nextValue : currentValue
      )
    );
    setState("idle");
  }, []);
  const save = useCallback(async () => {
    setState("saving");
    const saved = await persistHomepagePlacements({
      leadId: leadId || null,
      secondaryIds: secondaryIds.filter(Boolean),
    });
    setState(saved ? "saved" : "error");
  }, [leadId, secondaryIds]);

  return (
    <div className="mx-auto w-full max-w-[1500px] pb-[72px] max-inventory-mobile:pb-12">
      <header className="flex min-h-[76px] items-center justify-between gap-6 border-b px-[42px] py-3 max-inventory-compact:px-6 max-inventory-mobile:px-4">
        <div>
          <h1 className="m-0 font-[650] text-2xl tracking-[-0.03em]">
            Homepage
          </h1>
          {state === "saved" ? (
            <p className="mt-1 mb-0 text-primary text-xs" role="status">
              Layout saved.
            </p>
          ) : null}
          {state === "error" ? (
            <p className="mt-1 mb-0 text-destructive text-xs" role="alert">
              The layout needs another save attempt.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <a
            aria-label="View public homepage"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            href="https://ortodoksas.grassinside.com"
            rel="noreferrer"
            target="_blank"
          >
            <span className="max-inventory-mobile:hidden">View homepage</span>
            <ExternalLink />
          </a>
          <Button
            className="min-w-[112px]"
            disabled={state === "loading" || state === "saving"}
            onClick={save}
            size="lg"
          >
            <Save /> {state === "saving" ? "Saving…" : "Save layout"}
          </Button>
        </div>
      </header>
      <HomepageLayoutPanel
        articleOptions={articleOptions}
        leadId={leadId}
        leadOptions={leadOptions}
        onLeadChange={updateLead}
        onSecondaryChange={updateSupporting}
        secondaryIds={secondaryIds}
      />
      <div className="mx-[42px] border bg-muted/35 px-4 py-3 text-muted-foreground text-xs leading-5 max-inventory-compact:mx-6 max-inventory-mobile:mx-4">
        Automatic placement uses the newest eligible Lithuanian story with a
        valid image. Localized homepages use the matching translation from the
        same story group when that edition exists.
      </div>
    </div>
  );
}
