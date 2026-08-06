export interface CatalogArticle {
  capture: string;
  description: string;
  file: string;
  hero: string | null;
  id: string;
  kind: "article" | "page";
  labels: string[];
  path: string;
  published: string | null;
  section: string;
  source: string;
  status: "draft" | "scheduled" | "published" | "archived";
  title: string;
}

export interface SourceArticle extends CatalogArticle {
  html: string;
}
