const publicationHtmlPathPattern =
  /^\/(?:(?:be|en|ru|uk)\/)?(?:p\/[^/]+|\d{4}\/\d{2}\/[^/]+)\.html$/u;

const historicalBloggerAliases = new Map<string, string>([
  [
    "/ru/2022/05/blog-post_10.html",
    "/ru/2022/05/pochemu-ya-ne-mogu-nazyvat-kirilla-ottsom",
  ],
  [
    "/ru/2022/05/blog-post_11.html",
    "/ru/2022/05/duhovenstvo-pokidaet-moskovskiy-patriarhat",
  ],
  [
    "/ru/2022/05/blog-post_19.html",
    "/ru/2022/05/pismo-pravoslavnyh-miryan-mitropolitu",
  ],
  [
    "/ru/2022/05/blog-post_50.html",
    "/ru/2022/05/konstantinopolskiy-patriarhat-v-litve",
  ],
  [
    "/ru/2022/07/blog-post.html",
    "/ru/2022/07/v-selyavko-obrashchenie-litovskoy-eparhii-k-prezidentu",
  ],
  [
    "/ru/2022/07/blog-post_27.html",
    "/ru/2022/07/v-selyavko-zachem-litve-yurisdiktsiya-konstantinopolya",
  ],
  ["/uk/2022/05/blog-post.html", "/uk/2022/05/vitayemo"],
  [
    "/uk/2022/05/blog-post_15.html",
    "/uk/2022/05/istoriya-konstantynopolskoho-patriarkhatu-u-lytvi",
  ],
  [
    "/uk/2022/05/blog-post_16.html",
    "/uk/2022/05/serbska-tserkva-vidnovlyuye-spilkuvannya-z-ohridom",
  ],
  [
    "/uk/2022/05/blog-post_18.html",
    "/uk/2022/05/lyst-pravoslavnykh-myrian-lytovskomu-mytropolytu",
  ],
  [
    "/uk/2022/05/blog-post_21.html",
    "/uk/2022/05/posol-lytvy-vidvidav-vselenskyi-patriarkhat",
  ],
  ["/uk/2022/06/22.html", "/uk/2022/06/psalom-22-lytovskoyu"],
]);

export function getHistoricalPublicationRedirect(pathname: string) {
  const aliasedPath = historicalBloggerAliases.get(pathname);
  if (aliasedPath) {
    return aliasedPath;
  }
  return publicationHtmlPathPattern.test(pathname)
    ? pathname.slice(0, -".html".length)
    : undefined;
}
