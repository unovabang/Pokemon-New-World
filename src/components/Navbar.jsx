import { useState } from "react";

// Mêmes intitulés que le launcher (pnw-launcher) — le contenu des liens viendra après
const NAV_ITEMS = [
  { id: "accueil", label: "Accueil", icon: "fa-house" },
  { id: "pokedex", label: "Pokedex", icon: "fa-book" },
  { id: "guide", label: "Guide", icon: "fa-book-open" },
  { id: "patchnotes", label: "PatchNotes", icon: "fa-file-lines" },
  { id: "items", label: "Items locations", icon: "fa-location-dot" },
  { id: "evs", label: "EVs locations", icon: "fa-location-dot" },
  { id: "bst", label: "All BST + new Abilities", icon: "fa-table" },
  { id: "nerfs", label: "Nerfs and buffs", icon: "fa-scale-balanced" },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="nav-inner container">
        <a href="/" className="brand" aria-label="Accueil">
          <img className="brand-logo" src="/logo.png" alt="Pokémon New World" />
        </a>

        <div className={`links ${menuOpen ? "open" : ""}`}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="navlink"
              onClick={() => setMenuOpen(false)}
            >
              <i className={`fa-solid ${item.icon}`} aria-hidden />
              {item.label}
            </a>
          ))}
        </div>

        <button
          type="button"
          className="burger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
        >
          <i className={menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
