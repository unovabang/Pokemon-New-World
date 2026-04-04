import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const DEFAULT_ITEMS = [
  { id: "accueil", label: "Accueil", icon: "fa-house", to: "/" },
  { id: "lore", label: "Le Lore", icon: "fa-scroll", to: "/lore", highlight: true },
  { id: "pokedex", label: "Pokedex", icon: "fa-book", to: "/pokedex" },
  { id: "guide", label: "Guide", icon: "fa-book-open", to: "/guide" },
  { id: "patchnotes", label: "PatchNotes", icon: "fa-file-lines", to: "/patchnotes" },
  { id: "items", label: "Items locations", icon: "fa-location-dot", to: "/item-location" },
  { id: "evs", label: "EVs locations", icon: "fa-location-dot", to: "/evs-location" },
  { id: "bst", label: "All BST + new Abilities", icon: "fa-table", to: "/bst" },
  { id: "nerfs", label: "Nerfs and buffs", icon: "fa-scale-balanced", to: "/nerfs-and-buffs" },
  { id: "equipe", label: "L'équipe", icon: "fa-users", to: "/equipe" },
];

let cachedConfig = null;
/** `undefined` = pas encore chargé ; `null` = pas de logo configuré */
let cachedSiteLogo;

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(cachedConfig?.items || DEFAULT_ITEMS);
  const [bgUrl, setBgUrl] = useState(cachedConfig?.backgroundImage || "");
  const [logoUrl, setLogoUrl] = useState(() => (cachedSiteLogo !== undefined ? cachedSiteLogo : null));

  useEffect(() => {
    if (cachedSiteLogo !== undefined) {
      setLogoUrl(cachedSiteLogo);
      return;
    }
    fetch(`${API_BASE}/config/site?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.config?.branding?.logo) {
          const v = String(d.config.branding.logo).trim();
          cachedSiteLogo = v.startsWith("public/") ? "/" + v.slice(7) : v;
        } else {
          cachedSiteLogo = null;
        }
        setLogoUrl(cachedSiteLogo);
      })
      .catch(() => {
        cachedSiteLogo = null;
        setLogoUrl(null);
      });
  }, []);

  useEffect(() => {
    if (cachedConfig) return;
    fetch(`${API_BASE}/config/sidebar?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.config) {
          const cfg = d.config;
          cachedConfig = cfg;
          if (Array.isArray(cfg.items) && cfg.items.length) setItems(cfg.items);
          if (typeof cfg.backgroundImage === "string") setBgUrl(cfg.backgroundImage);
        }
      })
      .catch(() => {});
  }, []);

  const close = () => setOpen(false);

  const innerStyle = bgUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(8,14,28,.85) 0%, rgba(5,9,20,.9) 100%), url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
      >
        <i className="fa-solid fa-bars" />
      </button>

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

      <aside
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="sidebar-inner" style={innerStyle}>
          <div className="sidebar-header">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="sidebar-logo" />
            ) : (
              <span className="sidebar-brand-text">Pokémon New World</span>
            )}
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
            {items.map((item) => {
              const linkClass = `sidebar-link${item.highlight ? " sidebar-link--lore" : ""}`;
              return item.to.startsWith("/") ? (
                <Link
                  key={item.id}
                  to={item.to}
                  className={linkClass}
                  onClick={close}
                >
                  <i className={`fa-solid ${item.icon}`} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <a
                  key={item.id}
                  href={item.to}
                  className={linkClass}
                  onClick={close}
                >
                  <i className={`fa-solid ${item.icon}`} aria-hidden />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="sidebar-contact-wrap">
            <Link to="/contact" className="sidebar-contact-btn" onClick={close}>
              <i className="fa-solid fa-envelope" aria-hidden />
              <span>Contacter l'équipe</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
