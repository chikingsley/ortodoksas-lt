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
import { localeMetadata, type SiteLocale, siteLocales } from "@/i18n/config";
import { ui } from "@/i18n/ui";
import type { LocaleDestination } from "@/lib/publication";
import {
  isNavigationItemActive,
  type NavigationItem,
} from "@/navigation/publication";
import InstitutionalMarks from "./institutional-marks";
import "./publication-header.css";

interface Props {
  currentPath: string;
  locale?: SiteLocale;
  localeLinks: Record<SiteLocale, LocaleDestination>;
  navigationItems: NavigationItem[];
}

export default function PublicationHeader({
  currentPath,
  localeLinks,
  locale = "lt",
  navigationItems,
}: Props) {
  const copy = ui[locale];
  const localized = locale !== "lt";

  return (
    <header className="publication-header">
      <div className="site-width publication-masthead">
        <div className="publication-masthead-row">
          <a
            aria-label={`${copy.home} · ortodoksas.lt`}
            className="publication-institution-brand"
            href={localized ? `/${locale}` : "/"}
            translate="no"
          >
            <InstitutionalMarks />
          </a>
          <span aria-hidden="true" className="publication-masthead-rule" />
          <a
            className="publication-wordmark"
            href={localized ? `/${locale}` : "/"}
            translate="no"
          >
            <strong>ortodoksas.lt</strong>
            <span>Bažnyčios leidinys</span>
          </a>
          <div className="publication-mobile-trigger">
            <Sheet>
              <SheetTrigger
                render={
                  <button
                    aria-label={copy.navigation}
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
                  {navigationItems.map((item) => (
                    <a
                      aria-current={
                        isNavigationItemActive(currentPath, item)
                          ? "page"
                          : undefined
                      }
                      className={
                        isNavigationItemActive(currentPath, item)
                          ? "active"
                          : undefined
                      }
                      href={item.href}
                      key={item.id}
                    >
                      {item.label}
                    </a>
                  ))}
                  {localized ? null : <a href="/paieska">{copy.search}</a>}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div aria-hidden="true" className="publication-masthead-divider" />
        <nav aria-label={copy.languages} className="publication-languages">
          {siteLocales.map((code) => (
            <a
              aria-current={code === locale ? "page" : undefined}
              aria-label={`${localeMetadata[code].languageName}${
                localeLinks[code].hasCounterpart
                  ? ""
                  : `. ${copy.pageUnavailable}`
              }`}
              className={code === locale ? "active" : undefined}
              data-counterpart={
                localeLinks[code].hasCounterpart ? "available" : "unavailable"
              }
              href={localeLinks[code].href}
              key={code}
              lang={code}
              title={
                localeLinks[code].hasCounterpart
                  ? localeMetadata[code].languageName
                  : `${localeMetadata[code].languageName} — ${copy.pageUnavailable}`
              }
              translate="no"
            >
              {localeMetadata[code].displayCode}
            </a>
          ))}
        </nav>
      </div>
      <nav aria-label={copy.edition} className="publication-primary-nav">
        <div className="site-width publication-nav-inner">
          <NavigationMenu>
            <NavigationMenuList>
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.id}>
                  <NavigationMenuLink
                    active={isNavigationItemActive(currentPath, item)}
                    className="publication-nav-link"
                    href={item.href}
                  >
                    {item.label}
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
