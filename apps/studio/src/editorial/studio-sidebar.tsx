import {
  BookOpenText,
  FileText,
  Globe2,
  Home,
  Image,
  Languages,
} from "lucide-react";

const navGroups = [
  {
    items: [
      { active: true, icon: BookOpenText, label: "Articles" },
      { icon: FileText, label: "Pages" },
      { icon: Image, label: "Media" },
    ],
    label: "Content",
  },
  {
    items: [
      { icon: Home, label: "Homepage" },
      { icon: Languages, label: "Translations" },
      { icon: Globe2, label: "Publishing" },
    ],
    label: "Publication",
  },
] as const;

export const StudioSidebar = () => (
  <aside className="studio-sidebar">
    <div className="studio-brand">
      <div>
        <strong>Ortodoksas.lt</strong>
        <span>Studio</span>
      </div>
    </div>

    <nav aria-label="Editorial navigation" className="studio-nav">
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

    <div className="editor-identity">
      <span className="avatar">SR</span>
      <span>
        <strong>Development editor</strong>
        <small>Editor access</small>
      </span>
    </div>
  </aside>
);
