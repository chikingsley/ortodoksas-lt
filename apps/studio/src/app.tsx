import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignInButton,
  SignUpButton,
} from "@clerk/react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { ArticleInventory } from "@/editorial/article-inventory";
import { StudioSidebar } from "@/editorial/studio-sidebar";
import type { CatalogArticle } from "@/editorial/types";
import { useArticleCatalog } from "@/editorial/use-article-catalog";

const ArticleEditor = lazy(() =>
  import("@/editorial/article-editor").then((module) => ({
    default: module.ArticleEditor,
  }))
);

const Studio = () => {
  const catalog = useArticleCatalog();
  const [selectedArticle, setSelectedArticle] = useState<CatalogArticle | null>(
    null
  );
  useEffect(() => {
    if (catalog.state !== "ready" || selectedArticle) {
      return;
    }
    const file = new URLSearchParams(window.location.search).get("article");
    const requested = catalog.articles.find((article) => article.file === file);
    if (requested) {
      setSelectedArticle(requested);
    }
  }, [catalog, selectedArticle]);

  const openArticle = useCallback((article: CatalogArticle) => {
    window.history.replaceState(
      null,
      "",
      `?article=${encodeURIComponent(article.file)}`
    );
    setSelectedArticle(article);
  }, []);
  const closeArticle = useCallback(() => {
    window.history.replaceState(null, "", window.location.pathname);
    setSelectedArticle(null);
  }, []);
  const translations = useMemo(
    () =>
      selectedArticle
        ? catalog.articles.filter(
            (article) =>
              article.translationGroupId === selectedArticle.translationGroupId
          )
        : [],
    [catalog.articles, selectedArticle]
  );

  return (
    <div
      className={
        selectedArticle
          ? "grid min-h-screen grid-cols-[minmax(0,1fr)]"
          : "grid min-h-screen grid-cols-[232px_minmax(0,1fr)] max-[801px]:block max-[1101px]:grid-cols-[196px_minmax(0,1fr)]"
      }
    >
      {selectedArticle ? null : <StudioSidebar />}
      <div className="min-w-0">
        {selectedArticle ? (
          <Suspense
            fallback={
              <div className="grid min-h-screen place-items-center text-[13px] text-muted-foreground">
                Įkeliamas redaktorius…
              </div>
            }
          >
            <ArticleEditor
              article={selectedArticle}
              key={selectedArticle.file}
              onBack={closeArticle}
              onOpenTranslation={openArticle}
              translations={translations}
            />
          </Suspense>
        ) : (
          <ArticleInventory
            articles={catalog.articles}
            catalogState={catalog.state}
            onOpen={openArticle}
          />
        )}
      </div>
    </div>
  );
};

const SignInScreen = () => (
  <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#e6f0ec_0,transparent_42%)] px-5 py-12">
    <section className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm max-inventory-phone:p-6">
      <div className="mb-8">
        <span className="mb-4 grid size-11 place-items-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
          O
        </span>
        <p className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-[0.14em]">
          Ortodoksas.lt
        </p>
        <h1 className="m-0 text-2xl tracking-[-0.025em]">Editorial Studio</h1>
        <p className="mt-3 mb-0 text-muted-foreground text-sm leading-6">
          Sign in to review translations, edit articles, and manage the
          publication homepage.
        </p>
      </div>
      <div className="grid gap-3">
        <SignInButton mode="modal">
          <Button className="w-full" size="lg">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button className="w-full" size="lg" variant="outline">
            Create account
          </Button>
        </SignUpButton>
      </div>
    </section>
  </main>
);

const App = () => (
  <>
    <ClerkLoading>
      <div className="grid min-h-screen place-items-center text-muted-foreground text-sm">
        Loading Studio…
      </div>
    </ClerkLoading>
    <ClerkLoaded>
      <Show when="signed-out">
        <SignInScreen />
      </Show>
      <Show when="signed-in">
        <Studio />
      </Show>
    </ClerkLoaded>
  </>
);

export default App;
