const { h } = window;

function PublicationPreview({ entry, widgetFor }) {
  const data = entry.getIn(["data"]);
  const placement = data.get("homepage") || "feed";
  const placementLabels = {
    feed: "Bendras srautas",
    lead: "Pagrindinė istorija",
    secondary: "Antrinė istorija",
  };
  const hero = data.get("hero");
  return h(
    "main",
    { className: "editor-preview" },
    h(
      "header",
      { className: "editor-preview__masthead" },
      h("img", {
        alt: "Visuotinio Patriarchato Egzarchatas Lietuvoje",
        src: "/assets/brand/production/exarchate-lockup-client.png",
      }),
      h("span", null, "ortodoksas.lt")
    ),
    h(
      "article",
      {
        className: `editor-preview__article editor-preview__article--${placement}`,
      },
      hero ? h("img", { alt: "", src: hero }) : null,
      h(
        "div",
        { className: "editor-preview__placement" },
        placementLabels[placement]
      ),
      h("div", { className: "editor-preview__section" }, data.get("section")),
      h("h1", null, data.get("title") || "Publikacijos antraštė"),
      h(
        "p",
        { className: "editor-preview__description" },
        data.get("description")
      ),
      h("div", { className: "editor-preview__body" }, widgetFor("body"))
    )
  );
}

window.CMS.registerPreviewStyle("/admin/preview.css");
window.CMS.registerPreviewTemplate("publications", PublicationPreview);
