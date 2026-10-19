import type { UpdateArticleInput } from "@ortodoksas-lt/content/article";
import type { JSONContent } from "@tiptap/core";
import type { z } from "zod";

import type {
  contentChangeSchema,
  storedArticleSchema,
} from "@/shared/article-contract";

export type StoredArticle = z.infer<typeof storedArticleSchema>;

export interface ArticleResponse {
  article: StoredArticle;
}

export type ContentChange = z.infer<typeof contentChangeSchema>;

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
  payload: UpdateArticleInput & {
    kind: "article" | "page";
    translationGroupId: string;
  };
}

export interface PublicationVerification {
  reachable: boolean;
  status: number | null;
  url: string;
}
