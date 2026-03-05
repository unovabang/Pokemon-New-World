import { useState } from "react";

// Mêmes intitulés que le launcher (pnw-launcher)
const SIDEBAR_ITEMS = [
  { id: "accueil", label: "Accueil", icon: "fa-house" },
  { id: "pokedex", label: "Pokedex", icon: "fa-book" },
  { id: "guide", label: "Guide", icon: "fa-book-open" },
  { id: "patchnotes", label: "PatchNotes", icon: "fa-file-lines" },
  { id: "items", label: "Items locations", icon: "fa-location-dot" },
  { id: "evs", label: "EVs locations", icon: "fa-location-dot" },
  { id: "bst", label: "All BST + new Abilities", icon: "fa-table" },
  { id: "nerfs", label: "Nerfs and buffs", icon: "fa-scale-balanced" },
];

const Sidebar = () => {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      {/* Bouton pour ouvrir la sidebar (toujours visible) */}
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
      >
        <i className="fa-solid fa-bars" />
      </button>

      {/* Overlay pour fermer au clic (mobile / quand ouverte) */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={close}
          onKeyDown={(e) => e.key === "Escape" && close()}
          role="button"
          tabIndex={0}
          aria-label="Fermer le menu"
        />
      )}

      {/* Sidebar latérale */}
      <aside
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <img src="/logo.png" alt="" className="sidebar-logo" />
            <span className="sidebar-title">Menu</span>
            <button
              type="button"
              className="sidebar-close"
              onClick={close}
              aria-label="Fermer le menu"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <nav className="sidebar-nav">
            {SIDEBAR_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="sidebar-link"
                onClick={close}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
