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
import InstitutionalMarks from "./institutional-marks";

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
    <header className="relative z-20 bg-white/[0.98] text-foreground">
      <div className="relative mx-auto w-[min(1200px,calc(100%-64px))] max-sm:w-[min(1200px,calc(100%-32px))]">
        <div className="grid min-h-20 grid-cols-[max-content_max-content_max-content_1fr] items-center py-3.5 max-sm:min-h-15 max-sm:grid-cols-[151px_1px_minmax(0,1fr)_44px] max-sm:gap-x-2 max-sm:py-2">
          <a
            aria-label={`${copy.home} · ortodoksas.lt`}
            className="inline-flex w-[199px] max-sm:w-[151px]"
            href={localized ? `/${locale}` : "/"}
            translate="no"
          >
            <InstitutionalMarks />
          </a>
          <span
            aria-hidden="true"
            className="mx-[18px] h-[42px] w-px bg-border max-sm:mx-0 max-sm:h-8"
          />
          <a
            className="block"
            href={localized ? `/${locale}` : "/"}
            translate="no"
          >
            <strong className="block font-bold font-serif text-[clamp(27px,2.5vw,31px)] leading-[0.95] tracking-[-0.025em] max-sm:text-[19px]">
              ortodoksas.lt
            </strong>
            <span className="mt-2 block font-bold text-[9px] text-primary uppercase tracking-[0.11em] max-sm:hidden">
              Bažnyčios leidinys
            </span>
          </a>
          <div className="hidden max-sm:col-start-4 max-sm:row-start-1 max-sm:block max-sm:justify-self-end">
            <Sheet>
              <SheetTrigger
                render={
                  <button
                    aria-label={copy.navigation}
                    className="inline-grid size-11 place-items-center border-0 bg-transparent text-foreground [&_svg]:size-[26px]"
                    type="button"
                  />
                }
              >
                <MenuIcon aria-hidden="true" />
              </SheetTrigger>
              <SheetContent
                className="fixed inset-y-0 right-0 z-50 flex w-[min(340px,88vw)] max-w-full flex-col gap-4 border-border border-l bg-white p-0 shadow-[-12px_0_28px_rgb(0_39_31/15%)] [&_[data-slot=sheet-close]]:top-[18px] [&_[data-slot=sheet-close]]:right-[18px] [&_[data-slot=sheet-close]]:size-9 [&_[data-slot=sheet-close]_svg]:size-[22px] [&_[data-slot=sheet-header]]:relative [&_[data-slot=sheet-header]]:border-primary [&_[data-slot=sheet-header]]:border-b [&_[data-slot=sheet-header]]:p-6"
                side="right"
              >
                <SheetHeader>
                  <SheetTitle>ortodoksas.lt</SheetTitle>
                </SheetHeader>
                <nav
                  aria-label={copy.edition}
                  className="grid gap-0 px-6 pt-3 pb-6"
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
                          ? "flex min-h-12 items-center border-border border-b py-3 font-semibold font-serif text-[17px] text-primary leading-none"
                          : "flex min-h-12 items-center border-border border-b py-3 font-semibold font-serif text-[17px] text-foreground leading-none"
                      }
                      href={item.href}
                      key={item.id}
                    >
                      {item.label}
                    </a>
                  ))}
                  {localized ? null : (
                    <a
                      className="flex min-h-12 items-center border-border border-b py-3 font-semibold font-serif text-[17px] text-foreground leading-none"
                      href="/paieska"
                    >
                      {copy.search}
                    </a>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div aria-hidden="true" className="h-px bg-primary" />
        <nav
          aria-label={copy.languages}
          className="absolute top-4 right-0 flex gap-4 max-sm:static max-sm:min-h-11 max-sm:w-full max-sm:items-center max-sm:justify-center"
        >
          {siteLocales.map((code) => (
            <a
              aria-current={code === locale ? "page" : undefined}
              aria-label={`${localeMetadata[code].languageName}${
                localeLinks[code].hasCounterpart
                  ? ""
                  : `. ${copy.pageUnavailable}`
              }`}
              className={
                code === locale
                  ? "border-[#face6b] border-b-2 pb-[5px] font-bold text-[10px] text-primary max-sm:inline-flex max-sm:min-h-11 max-sm:min-w-11 max-sm:items-center max-sm:justify-center"
                  : "pb-[5px] font-bold text-[10px] text-muted-foreground data-[counterpart=unavailable]:opacity-55 max-sm:inline-flex max-sm:min-h-11 max-sm:min-w-11 max-sm:items-center max-sm:justify-center"
              }
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
      <nav aria-label={copy.edition} className="block max-sm:hidden">
        <div className="mx-auto flex min-h-12 w-[min(1200px,calc(100%-64px))] items-center justify-center">
          <NavigationMenu className="w-full max-w-none">
            <NavigationMenuList className="m-0 flex list-none justify-center gap-0 p-0">
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.id}>
                  <NavigationMenuLink
                    active={isNavigationItemActive(currentPath, item)}
                    className="relative inline-flex min-h-12 items-center rounded-none bg-transparent px-[27px] pt-4 pb-3.5 font-semibold font-serif text-foreground text-sm leading-none hover:bg-transparent hover:text-primary focus:bg-transparent focus:text-primary data-[active]:bg-transparent data-[active]:text-primary data-[active]:after:absolute data-[active]:after:inset-x-[27px] data-[active]:after:-bottom-px data-[active]:after:h-0.5 data-[active]:after:bg-[#face6b]"
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
                    className="inline-flex min-h-12 items-center bg-transparent px-[18px] text-foreground hover:bg-transparent hover:text-primary"
                    href="/paieska"
                  >
                    <SearchIcon aria-hidden="true" className="size-4" />
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
