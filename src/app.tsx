import { useEffect, useMemo, useState } from "react";

type ArchivePage = {
  file: string;
  path: string;
  title: string;
};

const originalHost = "www.ortodoksas.lt";

function unwrapArchiveUrl(value: string) {
  return value.replace(
    /^https?:\/\/web\.archive\.org\/web\/\d+[^/]*\/(?:im_|js_|id_)?(https?:\/\/)/,
    "$1",
  );
}

function pagePath(value: string) {
  try {
    const url = new URL(unwrapArchiveUrl(value), window.location.origin);
    if (url.hostname === originalHost || url.hostname === "ortodoksas.lt") {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }
  return null;
}

function preparePage(raw: string, pages: ArchivePage[]) {
  const document = new DOMParser().parseFromString(raw, "text/html");
  const available = new Set(pages.map((page) => page.path));

  document.querySelectorAll("script, iframe, .wb-autocomplete-suggestions").forEach((node) => {
    node.remove();
  });
  document.querySelectorAll("link[rel='stylesheet']").forEach((node) => node.remove());

  document.querySelectorAll("a[href]").forEach((node) => {
    const href = node.getAttribute("href");
    if (!href) return;
    const local = pagePath(href);
    if (local && available.has(local)) node.setAttribute("href", local);
    else node.setAttribute("href", unwrapArchiveUrl(href));
  });

  document.querySelectorAll("img[src], source[src]").forEach((node) => {
    const src = node.getAttribute("src");
    if (src) node.setAttribute("src", unwrapArchiveUrl(src));
  });

  const styles = [...document.querySelectorAll("style")]
    .map((node) => unwrapArchiveUrl(node.textContent ?? ""))
    .join("\n");

  return {
    bodyClass: document.body.className,
    markup: document.body.innerHTML,
    styles,
    title: document.title,
    description:
      document.querySelector("meta[name='description']")?.getAttribute("content") ??
      "Viskas apie Ortodoksų Bažnyčią Lietuvoje ir pasaulyje.",
  };
}

function App() {
  const [pages, setPages] = useState<ArchivePage[]>([]);
  const [locationPath, setLocationPath] = useState(window.location.pathname);
  const [page, setPage] = useState<ReturnType<typeof preparePage> | null>(null);

  useEffect(() => {
    fetch("/archive/manifest.json")
      .then((response) => response.json() as Promise<ArchivePage[]>)
      .then(setPages);
  }, []);

  const selected = useMemo(() => {
    if (!pages.length) return null;
    return pages.find((item) => item.path === locationPath) ?? pages.find((item) => item.path === "/") ?? null;
  }, [locationPath, pages]);

  useEffect(() => {
    if (!selected) return;
    fetch(`/archive/html/${selected.file}`)
      .then((response) => response.text())
      .then((raw) => setPage(preparePage(raw, pages)));
  }, [pages, selected]);

  useEffect(() => {
    const handleNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || !link.href.startsWith(window.location.origin)) return;
      event.preventDefault();
      window.history.pushState({}, "", link.pathname + link.search + link.hash);
      setLocationPath(link.pathname);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const handlePopState = () => setLocationPath(window.location.pathname);
    document.addEventListener("click", handleNavigation);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleNavigation);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!page) return;
    document.title = page.title;
    document.body.className = page.bodyClass;
    const description = document.querySelector("meta[name='description']") ?? document.createElement("meta");
    description.setAttribute("name", "description");
    description.setAttribute("content", page.description);
    document.head.appendChild(description);
  }, [page]);

  if (!page) {
    return <main className="loading">Atidaroma ortodoksas.lt archyvo kopija...</main>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: page.styles }} />
      <div dangerouslySetInnerHTML={{ __html: page.markup }} />
    </>
  );
}

export default App;
