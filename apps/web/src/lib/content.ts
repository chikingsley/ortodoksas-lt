import { useEffect, useState } from "react";

export type CatalogEntry = {
  path: string;
  kind: "article" | "page";
  title: string;
  description: string;
  published: string | null;
  section: string;
  labels: string[];
  hero: string | null;
  capture: string;
  source: string;
  file: string;
};

export type ContentPage = Omit<CatalogEntry, "file"> & { html: string };

export function contentFile(path: string) {
  return `${path.slice(1).replace(/\.html$/, "").replaceAll("/", "--")}.json`;
}

export function formatDate(value: string | null) {
  if (!value) return "Archyvo publikacija";
  return new Intl.DateTimeFormat("lt-LT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("lt");
}

export function useJson<T>(url: string) {
  const [state, setState] = useState<{ data: T | null; error: Error | null }>({ data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null });
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<T>;
      })
      .then((data) => setState({ data, error: null }))
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ data: null, error });
      });
    return () => controller.abort();
  }, [url]);
  return state;
}

export function useDocumentMetadata(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (!description) return;
    const existing = document.querySelector<HTMLMetaElement>("meta[name='description']");
    const meta = existing ?? document.createElement("meta");
    meta.name = "description";
    meta.content = description;
    if (!existing) document.head.appendChild(meta);
  }, [description, title]);
}
