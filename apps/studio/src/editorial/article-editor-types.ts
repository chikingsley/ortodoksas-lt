import type { JSONContent } from "@tiptap/core";

export interface StoredArticle {
  bodyJson: string;
  heroFit: "contain" | "cover";
  heroFocalX: number;
  heroFocalY: number;
  heroMediaId: string | null;
  id: string;
  kind: "article" | "page";
  labelsJson: string;
  language: string;
  publishedAt: number | null;
  section: string;
  slug: string;
  sourceCapture: string | null;
  sourceHtml: string | null;
  sourceUrl: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  summary: string;
  title: string;
  translationGroupId: string;
  translationKind: "original" | "human" | "machine";
  translationReviewedAt: number | null;
  translationReviewedBy: string | null;
  translationReviewStatus:
    | "approved"
    | "changes_requested"
    | "not_required"
    | "pending";
  translationSourceArticleId: string | null;
  translationSourceHash: string | null;
}

export interface ArticleResponse {
  article: StoredArticle;
}

export interface ContentChange {
  after_value: string | null;
  before_value: string | null;
  change_kind: "added" | "changed" | "removed";
  field_path: string;
  provenance: "generated" | "manual" | "normalized";
}

export interface BaselineResponse {
  baseline: { body_json: string };
  changes: ContentChange[];
}

export interface Revision {
  created_at: number;
  editor_id: string;
  id: string;
  metadata_json: string;
  version: number;
}

export interface PersistArticleInput {
  articleId: string | null;
  baseline: {
    body: JSONContent;
    converterVersion: string;
    summary: string;
    title: string;
  };
  payload: Record<string, unknown>;
  sourceArticleId: string;
}
