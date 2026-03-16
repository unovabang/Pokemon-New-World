import { useState } from "react";
import SiteEditor from "./SiteEditor";
import PatreonEditor from "./PatreonEditor";
import FooterEditor from "./FooterEditor";
import ExternalLinksEditor from "./ExternalLinksEditor";
import SidebarEditor from "./SidebarEditor";

const SECTIONS = [
  { id: "site", label: "Site", icon: "fa-cog" },
  { id: "sidebar", label: "Sidebar (menu)", icon: "fa-bars" },
  { id: "patreon", label: "Patreon", icon: "fa-heart" },
  { id: "footer", label: "Pied de page", icon: "fa-window-minimize" },
  { id: "external", label: "Liens externes", icon: "fa-external-link" },
];

export default function SiteSettingsEditor({ onSave }) {
  const [expanded, setExpanded] = useState({ site: true, patreon: true, footer: true, external: true });

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="admin-settings-unified">
      {SECTIONS.map(({ id, label, icon }) => (
        <section key={id} className="admin-settings-section">
          <button
            type="button"
            className="admin-settings-section-header"
            onClick={() => toggle(id)}
            aria-expanded={expanded[id]}
          >
            <i className={`fa-solid ${icon}`} aria-hidden />
            <span>{label}</span>
            <i className={`fa-solid fa-chevron-down admin-settings-chevron ${expanded[id] ? "open" : ""}`} aria-hidden />
          </button>
          {expanded[id] && (
            <div className="admin-settings-section-body">
              {id === "site" && <SiteEditor onSave={(c) => onSave("site", c)} />}
              {id === "sidebar" && <SidebarEditor onSave={onSave} />}
              {id === "patreon" && <PatreonEditor onSave={(c) => onSave("patreon", c)} />}
              {id === "footer" && <FooterEditor onSave={(c) => onSave("footer", c)} />}
              {id === "external" && <ExternalLinksEditor onSave={(c) => onSave("external", c)} />}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
