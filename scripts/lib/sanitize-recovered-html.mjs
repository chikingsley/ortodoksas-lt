import * as cheerio from "cheerio";

function archivalVideoLink(source) {
  if (!source) return null;
  const youtube = source.match(/(?:youtube(?:apis)?\.com|youtu\.be)\/(?:v\/|embed\/|watch\?v=)?([^?&/]+)/i);
  if (youtube) return `https://www.youtube.com/watch?v=${youtube[1]}`;
  const facebook = source.match(/facebook\.com\/v\/([0-9]+)/i);
  if (facebook) return `https://www.facebook.com/watch/?v=${facebook[1]}`;
  return null;
}

export function sanitizeRecoveredHtml(html) {
  const $ = cheerio.load(html ?? "", null, false);

  $("object").each((_, element) => {
    const source = $(element).attr("data") || $(element).find("embed[src]").first().attr("src");
    const link = archivalVideoLink(source);
    if (link) {
      $(element).replaceWith(`<p><a href="${link}" rel="noreferrer">Peržiūrėti archyvinį vaizdo įrašą</a></p>`);
    } else {
      $(element).remove();
    }
  });

  $("embed").each((_, element) => {
    const link = archivalVideoLink($(element).attr("src"));
    if (link) {
      $(element).replaceWith(`<p><a href="${link}" rel="noreferrer">Peržiūrėti archyvinį vaizdo įrašą</a></p>`);
    } else {
      $(element).remove();
    }
  });

  $("script,style,iframe,frame,form,noscript,template,base").remove();
  $("*").each((_, element) => {
    for (const attribute of Object.keys(element.attribs ?? {})) {
      if (attribute.toLowerCase().startsWith("on")) $(element).removeAttr(attribute);
    }
  });
  $("[href],[src],[data],[action],[formaction]").each((_, element) => {
    for (const attribute of ["href", "src", "data", "action", "formaction"]) {
      const value = $(element).attr(attribute);
      if (value && /^\s*(?:javascript|vbscript|file)\s*:/i.test(value)) $(element).removeAttr(attribute);
    }
  });
  $("img:not([src])").remove();

  return $.root().html()?.trim() ?? "";
}
