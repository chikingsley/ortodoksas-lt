import { MenuIcon } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { localeUi } from "@/lib/locale-ui";
import type { SiteLocale } from "@/lib/publication";
import InstitutionalMarks from "./institutional-marks";
import "./publication-header.css";

interface Props {
  currentPath: string;
  locale?: SiteLocale;
  localeLinks: Record<SiteLocale, string>;
}

const locales = [
  ["lt", "LT"],
  ["en", "EN"],
  ["ru", "RU"],
  ["uk", "UA"],
  ["be", "BY"],
] as const;

function isActive(currentPath: string, href: string) {
  return (
    currentPath === href || (href !== "/" && currentPath.startsWith(`${href}/`))
  );
}

export default function PublicationHeader({
  currentPath,
  localeLinks,
  locale = "lt",
}: Props) {
  const copy = localeUi[locale];
  const localized = locale !== "lt";
  const items: [string, string][] = localized
    ? [[copy.articles, `/${locale}`]]
    : [
        ["Pradžia", "/"],
        ["Pamaldos", "/p/bendruomenes_21.html"],
        ["Dvasininkai", "/p/dvasininkai.html"],
        ["Biblioteka", "/p/biblioteka.html"],
        ["Kalendorius", "/p/kalendorius.html"],
        ["Archyvas", "/archyvas"],
      ];

  return (
    <header className="publication-header">
      <div className="site-width publication-masthead">
        <div className="publication-masthead-row">
          <a
            aria-label={`${copy.home} · ortodoksas.lt`}
            className="publication-institution-brand"
            href={localized ? `/${locale}` : "/"}
          >
            <InstitutionalMarks />
          </a>
          <span aria-hidden="true" className="publication-masthead-rule" />
          <a
            className="publication-wordmark"
            href={localized ? `/${locale}` : "/"}
          >
            <strong>ortodoksas.lt</strong>
            <span>Bažnyčios leidinys</span>
          </a>
          <div className="publication-mobile-trigger">
            <Sheet>
              <SheetTrigger
                render={
                  <button
                    aria-label="Atverti meniu"
                    className="publication-menu-button"
                    type="button"
                  />
                }
              >
                <MenuIcon aria-hidden="true" />
              </SheetTrigger>
              <SheetContent className="publication-mobile-sheet" side="right">
                <SheetHeader>
                  <SheetTitle>ortodoksas.lt</SheetTitle>
                </SheetHeader>
                <nav
                  aria-label={copy.edition}
                  className="publication-mobile-links"
                >
                  {items.map(([label, href]) => (
                    <a
                      aria-current={
                        isActive(currentPath, href) ? "page" : undefined
                      }
                      className={
                        isActive(currentPath, href) ? "active" : undefined
                      }
                      href={href}
                      key={href}
                    >
                      {label}
                    </a>
                  ))}
                  <a href="/paieska">Paieška</a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div aria-hidden="true" className="publication-masthead-divider" />
        <nav aria-label={copy.languages} className="publication-languages">
          {locales.map(([code, label]) => (
            <a
              aria-current={code === locale ? "page" : undefined}
              className={code === locale ? "active" : undefined}
              href={localeLinks[code]}
              key={code}
              lang={code}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
      <nav aria-label={copy.edition} className="publication-primary-nav">
        <div className="site-width publication-nav-inner">
          <NavigationMenu>
            <NavigationMenuList>
              {items.map(([label, href]) => (
                <NavigationMenuItem key={href}>
                  <NavigationMenuLink
                    active={isActive(currentPath, href)}
                    className="publication-nav-link"
                    href={href}
                  >
                    {label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
              {localized ? null : (
                <NavigationMenuItem>
                  <NavigationMenuLink
                    aria-label={copy.search}
                    className="publication-nav-search"
                    href="/paieska"
                  >
                    ⌕
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </nav>
    </header>
  );
}
