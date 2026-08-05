export interface CatalogArticle {
  capture: string;
  description: string;
  file: string;
  hero: string | null;
  kind: "article" | "page";
  labels: string[];
  path: string;
  published: string | null;
  section: string;
  source: string;
  title: string;
}

export interface SourceArticle extends CatalogArticle {
  html: string;
}
