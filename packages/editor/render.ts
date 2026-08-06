import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";

import type { TiptapDocument } from "@ortodoksas-lt/content/article";
import {
  resolveRecoveredMediaUrl,
  resolveTiptapMediaUrls,
} from "../content/media-url";
import { articleEditorExtensions } from "./extensions";

export const renderArticleBody = (document: TiptapDocument): string =>
  renderToHTMLString({
    content: document,
    extensions: articleEditorExtensions,
  });

const hasLeadFigure = (body: TiptapDocument): boolean =>
  body.content?.some(
    (node) => node.type === "figure" && node.attrs?.role === "lead"
  ) ?? false;

interface ArticleDocumentInput {
  body: TiptapDocument;
  hero?: string | null;
  language: string;
  summary: string;
  title: string;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const renderArticleDocument = ({
  body,
  hero,
  language,
  summary,
  title,
}: ArticleDocumentInput): string => `<!doctype html>
<html lang="${escapeHtml(language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *{box-sizing:border-box} body{margin:0;color:#17201d;background:#fff}
    article{width:min(100% - 40px,760px);margin:0 auto;padding:72px 0 120px}
    h1{margin:0 0 20px;font:700 clamp(38px,6vw,56px)/1.06 Georgia,serif;letter-spacing:-.035em}
    .summary{margin:0 0 38px;color:#5d6864;font:20px/1.5 "Helvetica Neue",Helvetica,sans-serif}
    .lead{display:block;width:100%;max-height:480px;margin:0 0 42px;object-fit:cover;background:#eef1ef}
    main{font:19px/1.72 Georgia,serif} main p{margin:0 0 1.1em}
    main h2,main h3,main h4{margin:2em 0 .65em;font-family:"Helvetica Neue",Helvetica,sans-serif;line-height:1.15;letter-spacing:-.02em}
    main img{display:block;max-width:100%;height:auto;margin:34px auto}
    main .article-figure{margin:34px 0} main .article-figure img{width:100%;margin:0}
    main .article-figure figcaption{margin:10px auto 0;color:#66706c;font:italic 14px/1.45 "Helvetica Neue",Helvetica,sans-serif;text-align:center}
    main .article-figure-credit{margin:3px 0 0;color:#78817e;font:italic 13px/1.4 "Helvetica Neue",Helvetica,sans-serif;text-align:center}
    main .article-figure[data-figure-role="lead"]{margin-top:0;margin-bottom:42px}
    main blockquote{margin:2em 0;padding-left:24px;border-left:3px solid #0b705c;color:#46534e}
    main a{color:#075c4d;text-decoration-thickness:1px;text-underline-offset:3px}
    main pre{padding:18px;overflow:auto;background:#f1f3f1;border-radius:8px}
    main table{width:100%;border-collapse:collapse} main td,main th{padding:10px;border:1px solid #d8dedb}
    @media(max-width:520px){article{width:min(100% - 32px,760px);padding:42px 0 80px}h1{font-size:38px}.summary{font-size:18px;margin-bottom:34px}main{font-size:18px}}
  </style>
</head>
  <body><article><h1>${escapeHtml(title)}</h1><p class="summary">${escapeHtml(summary)}</p>${hero && !hasLeadFigure(body) ? `<img class="lead" src="${escapeHtml(resolveRecoveredMediaUrl(hero))}" alt="">` : ""}<main>${renderArticleBody(resolveTiptapMediaUrls(body))}</main></article></body>
</html>`;
