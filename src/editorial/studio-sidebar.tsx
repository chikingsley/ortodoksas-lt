import {
  ArchiveRestore,
  BookOpenText,
  ChevronDown,
  FileText,
  Globe2,
  Home,
  Image,
  Languages,
  PanelLeftClose,
} from "lucide-react";

const navGroups = [
  {
    items: [
      { active: true, icon: BookOpenText, label: "Straipsniai" },
      { icon: FileText, label: "Puslapiai" },
      { icon: Image, label: "Medija" },
    ],
    label: "Turinys",
  },
  {
    items: [
      { icon: Home, label: "Pagrindinis puslapis" },
      { icon: Languages, label: "Vertimai" },
      { icon: Globe2, label: "Publikavimas" },
    ],
    label: "Leidyba",
  },
  {
    items: [{ icon: ArchiveRestore, label: "Archyvo perkėlimas" }],
    label: "Sistema",
  },
] as const;

export const StudioSidebar = () => (
  <aside className="studio-sidebar">
    <div className="studio-brand">
      <img
        alt="Lietuvos egzarchato herbas"
        height="42"
        src="/brand/exarchate-crest.png"
        width="36"
      />
      <div>
        <strong>ortodoksas.lt</strong>
        <span>Redakcija</span>
      </div>
      <button
        aria-label="Suskleisti navigaciją"
        className="icon-button"
        type="button"
      >
        <PanelLeftClose />
      </button>
    </div>

    <nav aria-label="Redakcijos navigacija" className="studio-nav">
      {navGroups.map((group) => (
        <div className="nav-group" key={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={"active" in item && item.active ? "active" : ""}
                key={item.label}
                type="button"
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>

    <button className="editor-identity" type="button">
      <span className="avatar">SR</span>
      <span>
        <strong>Simonas Redaktorius</strong>
        <small>Vyriausiasis redaktorius</small>
      </span>
      <ChevronDown />
    </button>
  </aside>
);
