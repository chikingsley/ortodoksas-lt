export interface ClergyProfileHtml {
  detailsHtml: string;
  figureHtml: string;
}

export interface ClergyDirectoryHtml {
  introductionHtml: string;
  profiles: ClergyProfileHtml[];
}

const horizontalRulePattern = /<hr\s*\/?>/gi;
const headingPattern = /<h2>([\s\S]*?)<\/h2>/gi;
const leadingNamePattern =
  /^\s*<p>\s*<strong>([^<]{1,160})<\/strong>(?:\s|&nbsp;)*(?:[–—-](?:\s|&nbsp;)*)?([\s\S]*?)<\/p>/i;
const figureAtStartPattern = /^\s*(<figure\b[\s\S]*?<\/figure>)([\s\S]*)$/i;
const figureBoundaryPattern = /(?=<figure\b)/i;

function decorateClergyHeadings(html: string) {
  const withNamedOpening = html.replace(
    leadingNamePattern,
    (_paragraph, name: string, description: string) =>
      `<h2 class="clergy-name">${name.trim()}</h2>${description.trim() ? `<p>${description.trim()}</p>` : ""}`
  );
  const headingCount = [...withNamedOpening.matchAll(headingPattern)].length;
  let headingIndex = 0;
  return withNamedOpening.replace(
    headingPattern,
    (heading, contents: string) => {
      if (heading.includes('class="clergy-name"')) {
        return heading;
      }
      const className =
        headingCount > 1 && headingIndex === 0 ? "clergy-role" : "clergy-name";
      headingIndex += 1;
      return `<h2 class="${className}">${contents}</h2>`;
    }
  );
}

export function structureClergyHtml(html: string): ClergyDirectoryHtml {
  const segments = html.split(figureBoundaryPattern);
  const introductionHtml = (segments.shift() ?? "")
    .replace(horizontalRulePattern, "")
    .trim();
  const profiles = segments.flatMap((segment) => {
    const match = segment.match(figureAtStartPattern);
    if (!match) {
      return [];
    }
    const [, figureHtml, detailsHtml] = match;
    if (!(figureHtml && detailsHtml)) {
      return [];
    }
    return [
      {
        detailsHtml: decorateClergyHeadings(
          detailsHtml.replace(horizontalRulePattern, "").trim()
        ),
        figureHtml,
      },
    ];
  });
  return { introductionHtml, profiles };
}
