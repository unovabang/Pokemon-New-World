import { useState } from "react";
import { Link } from "react-router-dom";

// Mêmes intitulés que le launcher (pnw-launcher) — to = route ou #id
const SIDEBAR_ITEMS = [
  { id: "accueil", label: "Accueil", icon: "fa-house", to: "/" },
  { id: "pokedex", label: "Pokedex", icon: "fa-book", to: "/pokedex" },
  { id: "guide", label: "Guide", icon: "fa-book-open", to: "/guide" },
  { id: "patchnotes", label: "PatchNotes", icon: "fa-file-lines", to: "#patchnotes" },
  { id: "items", label: "Items locations", icon: "fa-location-dot", to: "/item-location" },
  { id: "evs", label: "EVs locations", icon: "fa-location-dot", to: "#evs" },
  { id: "bst", label: "All BST + new Abilities", icon: "fa-table", to: "/bst" },
  { id: "nerfs", label: "Nerfs and buffs", icon: "fa-scale-balanced", to: "#nerfs" },
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
            {SIDEBAR_ITEMS.map((item) =>
              item.to.startsWith("/") ? (
                <Link
                  key={item.id}
                  to={item.to}
                  className="sidebar-link"
                  onClick={close}
                >
                  <i className={`fa-solid ${item.icon}`} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <a
                  key={item.id}
                  href={item.to}
                  className="sidebar-link"
                  onClick={close}
                >
                  <i className={`fa-solid ${item.icon}`} aria-hidden />
                  <span>{item.label}</span>
                </a>
              )
            )}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
