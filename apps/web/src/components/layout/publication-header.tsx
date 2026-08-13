import { MenuIcon, SearchIcon } from "lucide-react";
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
import PublicationLogo from "./publication-logo";
import SocialLinks from "./social-links";

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
  const homeHref = localized ? `/${locale}` : "/";
  const searchHref = localized ? `/${locale}/paieska` : "/paieska";
  const searchActive = currentPath === searchHref;

  const languageLink = (code: SiteLocale, mobile = false) => (
    <a
      aria-current={code === locale ? "page" : undefined}
      aria-label={`${localeMetadata[code].languageName}${
        localeLinks[code].hasCounterpart ? "" : `. ${copy.pageUnavailable}`
      }`}
      className={
        code === locale
          ? `inline-flex items-center justify-center font-bold text-primary ${
              mobile
                ? "min-h-11 min-w-11 text-[10px]"
                : "min-h-9 min-w-8 text-[10px]"
            }`
          : `inline-flex items-center justify-center font-bold text-muted-foreground transition-colors hover:text-primary data-[counterpart=unavailable]:opacity-55 ${
              mobile
                ? "min-h-11 min-w-11 text-[10px]"
                : "min-h-9 min-w-8 text-[10px]"
            }`
      }
      data-counterpart={
        localeLinks[code].hasCounterpart ? "available" : "unavailable"
      }
      href={localeLinks[code].href}
      key={`${mobile ? "mobile" : "desktop"}-${code}`}
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
  );

  return (
    <header className="relative z-20 bg-white text-foreground">
      <div className="mx-auto w-[min(1200px,calc(100%-64px))] max-sm:w-full">
        <div className="grid min-h-20 grid-cols-[1fr_auto_1fr] items-center max-sm:min-h-16 max-sm:grid-cols-[48px_minmax(0,1fr)_48px] max-sm:px-3">
          <SocialLinks
            className="justify-self-start max-sm:hidden"
            locale={locale}
          />

          <div className="justify-self-start sm:hidden">
            <Sheet>
              <SheetTrigger
                render={
                  <button
                    aria-label={copy.navigation}
                    className="inline-grid size-11 place-items-center border-0 bg-transparent text-foreground transition-colors hover:text-primary [&_svg]:size-6"
                    type="button"
                  />
                }
              >
                <MenuIcon aria-hidden="true" />
              </SheetTrigger>
              <SheetContent
                className="fixed inset-y-0 right-0 z-50 flex w-[min(340px,88vw)] max-w-full flex-col gap-4 border-primary border-l bg-white p-0 shadow-[-12px_0_28px_rgb(46_16_18/18%)] [&_[data-slot=sheet-close]]:top-[18px] [&_[data-slot=sheet-close]]:right-[18px] [&_[data-slot=sheet-close]]:size-9 [&_[data-slot=sheet-close]_svg]:size-[22px] [&_[data-slot=sheet-header]]:relative [&_[data-slot=sheet-header]]:border-primary [&_[data-slot=sheet-header]]:border-b [&_[data-slot=sheet-header]]:p-6"
                side="right"
              >
                <SheetHeader>
                  <SheetTitle className="sr-only">{copy.navigation}</SheetTitle>
                  <PublicationLogo className="w-[178px]" />
                </SheetHeader>
                <nav aria-label={copy.edition} className="grid gap-0 px-6 pt-3">
                  {navigationItems.map((item) => (
                    <a
                      aria-current={
                        isNavigationItemActive(currentPath, item)
                          ? "page"
                          : undefined
                      }
                      className={
                        isNavigationItemActive(currentPath, item)
                          ? "flex min-h-12 items-center border-border border-b py-3 font-semibold font-serif text-[17px] text-primary leading-none"
                          : "flex min-h-12 items-center border-border border-b py-3 font-semibold font-serif text-[17px] text-foreground leading-none transition-colors hover:text-primary"
                      }
                      href={item.href}
                      key={item.id}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
                <div className="mt-auto border-border border-t px-6 py-5">
                  <SocialLinks locale={locale} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <a
            aria-label={`${copy.home} · ortodoksas.lt`}
            className="justify-self-center"
            href={homeHref}
            translate="no"
          >
            <PublicationLogo className="max-sm:w-[174px]" />
          </a>

          <div className="flex items-center justify-self-end max-sm:hidden">
            <nav
              aria-label={copy.languages}
              className="flex items-center gap-1"
            >
              {siteLocales.map((code) => languageLink(code))}
            </nav>
            <a
              aria-current={searchActive ? "page" : undefined}
              aria-label={copy.search}
              className={
                searchActive
                  ? "ml-2 grid size-9 place-items-center text-primary [&_svg]:size-4"
                  : "ml-2 grid size-9 place-items-center transition-colors hover:text-primary [&_svg]:size-4"
              }
              href={searchHref}
            >
              <SearchIcon aria-hidden="true" />
            </a>
          </div>

          <a
            aria-current={searchActive ? "page" : undefined}
            aria-label={copy.search}
            className={
              searchActive
                ? "grid size-11 place-items-center justify-self-end text-primary sm:hidden [&_svg]:size-5"
                : "grid size-11 place-items-center justify-self-end text-foreground transition-colors hover:text-primary sm:hidden [&_svg]:size-5"
            }
            href={searchHref}
          >
            <SearchIcon aria-hidden="true" />
          </a>
        </div>

        <nav
          aria-label={copy.languages}
          className="hidden min-h-11 items-center justify-center border-primary border-y max-sm:flex"
        >
          {siteLocales.map((code) => languageLink(code, true))}
        </nav>
      </div>

      <nav
        aria-label={copy.edition}
        className="border-primary border-y max-sm:hidden"
      >
        <div className="mx-auto flex min-h-12 w-[min(1200px,calc(100%-64px))] items-center justify-center">
          <NavigationMenu className="w-full max-w-none">
            <NavigationMenuList className="m-0 flex list-none justify-center gap-0 p-0">
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.id}>
                  <NavigationMenuLink
                    active={isNavigationItemActive(currentPath, item)}
                    className="relative inline-flex min-h-12 items-center rounded-none bg-transparent px-[27px] pt-4 pb-3.5 font-semibold font-serif text-foreground text-sm leading-none transition-colors hover:bg-transparent hover:text-primary focus:bg-transparent focus:text-primary data-[active]:bg-transparent data-[active]:font-bold data-[active]:text-primary"
                    href={item.href}
                  >
                    {item.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </nav>
    </header>
  );
}
