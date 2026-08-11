import { defineMiddleware } from "astro:middleware";

const legacyRedirects = new Map([
  [
    "/ru/2022/05/blog-post_10.html",
    "/ru/2022/05/pochemu-ya-ne-mogu-nazyvat-kirilla-ottsom.html",
  ],
  [
    "/ru/2022/05/blog-post_11.html",
    "/ru/2022/05/duhovenstvo-pokidaet-moskovskiy-patriarhat.html",
  ],
  [
    "/ru/2022/05/blog-post_19.html",
    "/ru/2022/05/pismo-pravoslavnyh-miryan-mitropolitu.html",
  ],
  [
    "/ru/2022/05/blog-post_50.html",
    "/ru/2022/05/konstantinopolskiy-patriarhat-v-litve.html",
  ],
  [
    "/ru/2022/07/blog-post.html",
    "/ru/2022/07/v-selyavko-obrashchenie-litovskoy-eparhii-k-prezidentu.html",
  ],
  [
    "/ru/2022/07/blog-post_27.html",
    "/ru/2022/07/v-selyavko-zachem-litve-yurisdiktsiya-konstantinopolya.html",
  ],
  ["/uk/2022/05/blog-post.html", "/uk/2022/05/vitayemo.html"],
  [
    "/uk/2022/05/blog-post_15.html",
    "/uk/2022/05/istoriya-konstantynopolskoho-patriarkhatu-u-lytvi.html",
  ],
  [
    "/uk/2022/05/blog-post_16.html",
    "/uk/2022/05/serbska-tserkva-vidnovlyuye-spilkuvannya-z-ohridom.html",
  ],
  [
    "/uk/2022/05/blog-post_18.html",
    "/uk/2022/05/lyst-pravoslavnykh-myrian-lytovskomu-mytropolytu.html",
  ],
  [
    "/uk/2022/05/blog-post_21.html",
    "/uk/2022/05/posol-lytvy-vidvidav-vselenskyi-patriarkhat.html",
  ],
  ["/uk/2022/06/22.html", "/uk/2022/06/psalom-22-lytovskoyu.html"],
]);

export const onRequest = defineMiddleware(({ redirect, url }, next) => {
  const destination = legacyRedirects.get(url.pathname);
  return destination ? redirect(destination, 301) : next();
});
