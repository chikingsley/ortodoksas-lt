import type {
  TranslationKind,
  TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";

export interface CatalogArticle {
  description: string;
  hero: string | null;
  id: string;
  kind: "article" | "page";
  labels: string[];
  language: string;
  path: string;
  published: string | null;
  section: string;
  status: "draft" | "scheduled" | "published" | "archived";
  thumbnail: string | null;
  title: string;
  translationGroupId: string;
  translationKind: TranslationKind;
  translationReviewStatus: TranslationReviewStatus;
}
