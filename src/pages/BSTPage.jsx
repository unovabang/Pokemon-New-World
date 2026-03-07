import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import bstData from "../config/bst.json";
import pokedexData from "../config/pokedex.json";

/** Données BST : priorité aux JSON (source de vérité), pas au localStorage. */
function getBSTData() {
  return bstData;
}

const PLACEHOLDER_SPRITE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect fill='%23222' width='96' height='96' rx='12'/%3E%3Ctext x='48' y='56' fill='%23555' font-size='24' text-anchor='middle' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";

const FILTER_OPTIONS = [
  { id: "all", label: "Tout afficher", icon: "fa-layer-group" },
  { id: "fakemon", label: "Fakemon + Formes Régionales", icon: "fa-leaf" },
  { id: "megas", label: "Nouvelles Mégas", icon: "fa-bolt" },
  { id: "speciaux", label: "Pokémons Spéciaux", icon: "fa-star" },
];

/** Normalise un nom pour la recherche (accents, espaces, tirets) */
function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trouve l'entrée pokedex (sprite + types) par nom */
function findPokedexEntry(name, entries) {
  if (!name || !entries?.length) return null;
  const n = normalizeName(name);
  let e = entries.find((x) => normalizeName(x.name) === n);
  if (e) return e;
  const nAlt = n.replace(/\s+/g, "-");
  e = entries.find(
    (x) =>
      normalizeName(x.name) === nAlt ||
      normalizeName(x.name).replace(/\s+/g, "-") === n
  );
  if (e) return e;
  const baseName = n.replace(/^mega\s*-?\s*/i, "").trim();
  e = entries.find((x) => normalizeName(x.name) === baseName);
  if (e) return e;
  e = entries.find(
    (x) =>
      n.includes(normalizeName(x.name)) || normalizeName(x.name).includes(n)
  );
  return e || null;
}

/** Extrait les types: pokedex en priorité, sinon parse "Eau/Psy" */
function getTypes(row, pokedexEntry) {
  if (pokedexEntry?.types?.length) {
    return pokedexEntry.types.map((t) => TYPE_LABELS[t] || t);
  }
  const str = row.type || "";
  return str
    .split(/[/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const TYPE_COLORS = {
  plante: "#7ec850",
  feu: "#f08030",
  eau: "#6890f0",
  glace: "#98d8d8",
  malice: "#705898",
  poison: "#a040a0",
  vol: "#a890f0",
  dragon: "#7038f8",
  sol: "#e0c068",
  combat: "#c03028",
  spectre: "#705898",
  psy: "#f85888",
  electrik: "#f8d030",
  electr: "#f8d030",
  fee: "#ee99ac",
  tenebres: "#705848",
  roche: "#b8a038",
  acier: "#b8b8d0",
  normal: "#a8a878",
  insecte: "#a8b820",
  aspic: "#a08060",
  neant: "#5a5a8a",
};

const TYPE_LABELS = {
  plante: "Plante", feu: "Feu", eau: "Eau", glace: "Glace", malice: "Malice",
  poison: "Poison", vol: "Vol", dragon: "Dragon", sol: "Sol", combat: "Combat",
  spectre: "Spectre", psy: "Psy", electrik: "Électrik", electr: "Électrik",
  fee: "Fée", tenebres: "Ténèbres", roche: "Roche", acier: "Acier",
  normal: "Normal", insecte: "Insecte", aspic: "Aspic", neant: "Néant",
};

function getTypeKey(label) {
  return Object.entries(TYPE_LABELS).find(
    ([, v]) => v.toLowerCase() === (label || "").toLowerCase()
  )?.[0] || label?.toLowerCase().replace(/[^a-z]/g, "") || "normal";
}

function TypeBadges({ types }) {
  if (!types?.length) return <span className="bst-type-empty">—</span>;
  return (
    <span className="bst-type-badges">
      {types.map((t) => {
        const key = getTypeKey(t);
        const color = TYPE_COLORS[key] || TYPE_COLORS.normal;
        return (
          <span
            key={t}
            className="bst-type-badge"
            style={{
              background: `linear-gradient(135deg, ${color}44, ${color}22)`,
              borderColor: color,
              color: color,
              boxShadow: `0 0 12px ${color}40`,
            }}
          >
            {t}
          </span>
        );
      })}
    </span>
  );
}

function BSTModal({ pokemon, pokedexList = [], onClose }) {
  const overlayRef = useRef(null);
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    overlayRef.current?.focus();
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!pokemon) return null;
  const list = Array.isArray(pokedexList) ? pokedexList : [];
  const types = pokemon.types || getTypes(pokemon, findPokedexEntry(pokemon.name, list));

  return createPortal(
    <div
      ref={overlayRef}
      className="bst-modal-overlay"
      onClick={onClose}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bst-modal-title"
    >
      <div className="bst-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="bst-modal-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="bst-modal-sprite-wrap">
          <img
            src={pokemon.sprite || PLACEHOLDER_SPRITE}
            alt=""
            className="bst-modal-sprite"
            onError={(e) => (e.target.src = PLACEHOLDER_SPRITE)}
          />
        </div>
        <h2 id="bst-modal-title" className="bst-modal-name">{pokemon.name}</h2>
        <div className="bst-modal-types">
          <TypeBadges types={types} />
        </div>
        <div className="bst-modal-stats">
          <div className="bst-modal-stat"><span className="bst-modal-stat-label"><i className="fa-solid fa-heart-pulse" aria-hidden /> PV</span><span>{pokemon.hp}</span></div>
          <div className="bst-modal-stat"><span className="bst-modal-stat-label"><i className="fa-solid fa-hand-fist" aria-hidden /> ATK</span><span>{pokemon.atk}</span></div>
          <div className="bst-modal-stat"><span className="bst-modal-stat-label"><i className="fa-solid fa-shield" aria-hidden /> DEF</span><span>{pokemon.def}</span></div>
          <div className="bst-modal-stat"><span className="bst-modal-stat-label"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden /> ATK SPE</span><span>{pokemon.spa}</span></div>
          <div className="bst-modal-stat"><span className="bst-modal-stat-label"><i className="fa-solid fa-gem" aria-hidden /> DEF SPE</span><span>{pokemon.spd}</span></div>
          <div className="bst-modal-stat"><span className="bst-modal-stat-label"><i className="fa-solid fa-gauge-high" aria-hidden /> SPE</span><span>{pokemon.spe}</span></div>
          <div className="bst-modal-stat bst-modal-stat-total"><span className="bst-modal-stat-label"><i className="fa-solid fa-calculator" aria-hidden /> Total</span><span>{pokemon.total}</span></div>
        </div>
        {pokemon.ability && (
          <div className="bst-modal-ability">
            <strong><i className="fa-solid fa-star" /> Talent</strong>
            <p>{pokemon.ability}</p>
          </div>
        )}
        {pokemon.abilityDesc && (
          <div className="bst-modal-ability-desc">
            <strong><i className="fa-solid fa-book" /> Description</strong>
            <p>{pokemon.abilityDesc}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function BSTTable({ id, title, icon, data, pokedexList = [], onSelect, viewMode }) {
  const list = Array.isArray(pokedexList) ? pokedexList : [];
  const rows = useMemo(() => {
    return (data || []).map((row) => {
      const entry = findPokedexEntry(row.name, list);
      const sprite = row.imageUrl || entry?.imageUrl || PLACEHOLDER_SPRITE;
      return {
        ...row,
        sprite,
        types: getTypes(row, entry),
      };
    });
  }, [data, list]);

  if (viewMode === "grid") {
    return (
      <section className="bst-section bst-section--grid" data-accent={id}>
        <div className="bst-section-header">
          <i className={`fa-solid ${icon} bst-section-icon`} aria-hidden />
          <h2 className="bst-section-title">{title}</h2>
          <span className="bst-section-count"><i className="fa-solid fa-paw" aria-hidden /> {rows.length} Pokémon</span>
        </div>
        <div className="bst-grid">
          {rows.map((row, i) => (
            <button
              key={`${row.name}-${i}`}
              type="button"
              className="bst-card"
              onClick={() => onSelect(row)}
            >
              <div className="bst-card-sprite-wrap">
                <img
                  src={row.sprite}
                  alt=""
                  className="bst-card-sprite"
                  loading="lazy"
                  onError={(e) => (e.target.src = PLACEHOLDER_SPRITE)}
                />
              </div>
              <span className="bst-card-name">{row.name}</span>
              <div className="bst-card-types">
                <TypeBadges types={row.types} />
              </div>
              <span className="bst-card-total"><i className="fa-solid fa-calculator" aria-hidden /> {row.total}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="bst-section" data-accent={id}>
      <div className="bst-section-header">
        <i className={`fa-solid ${icon} bst-section-icon`} />
        <h2 className="bst-section-title">{title}</h2>
        <span className="bst-section-count">{rows.length} Pokémon</span>
      </div>
      <div className="bst-table-wrap">
        <table className="bst-table">
          <thead>
            <tr>
              <th className="bst-th-sprite"><i className="fa-solid fa-image" aria-hidden /> Sprite</th>
              <th><i className="fa-solid fa-tag" aria-hidden /> Nom</th>
              <th><i className="fa-solid fa-shield-halved" aria-hidden /> Type</th>
              <th className="bst-th-stat"><i className="fa-solid fa-heart-pulse" aria-hidden /> PV</th>
              <th className="bst-th-stat"><i className="fa-solid fa-hand-fist" aria-hidden /> ATK</th>
              <th className="bst-th-stat"><i className="fa-solid fa-shield" aria-hidden /> DEF</th>
              <th className="bst-th-stat"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden /> ATK SPE</th>
              <th className="bst-th-stat"><i className="fa-solid fa-gem" aria-hidden /> DEF SPE</th>
              <th className="bst-th-stat"><i className="fa-solid fa-gauge-high" aria-hidden /> SPE</th>
              <th className="bst-th-total"><i className="fa-solid fa-calculator" aria-hidden /> Total</th>
              <th><i className="fa-solid fa-star" aria-hidden /> Talent</th>
              <th className="bst-th-desc"><i className="fa-solid fa-book-open" aria-hidden /> Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.name}-${i}`}
                className="bst-row bst-row-clickable"
                onClick={() => onSelect(row)}
              >
                <td className="bst-td-sprite">
                  <div className="bst-sprite-wrap">
                    <img
                      src={row.sprite}
                      alt=""
                      className="bst-sprite"
                      loading="lazy"
                      onError={(e) => (e.target.src = PLACEHOLDER_SPRITE)}
                    />
                  </div>
                </td>
                <td className="bst-td-name">{row.name}</td>
                <td className="bst-td-type">
                  <TypeBadges types={row.types} />
                </td>
                <td className="bst-td-stat">{row.hp}</td>
                <td className="bst-td-stat">{row.atk}</td>
                <td className="bst-td-stat">{row.def}</td>
                <td className="bst-td-stat">{row.spa}</td>
                <td className="bst-td-stat">{row.spd}</td>
                <td className="bst-td-stat">{row.spe}</td>
                <td className="bst-td-total">
                  <span className="bst-total-value">{row.total}</span>
                </td>
                <td className="bst-td-ability">{row.ability}</td>
                <td className="bst-td-desc">{row.abilityDesc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Entrées Pokédex pour les sprites BST : priorité au JSON (pokedex.json), pas au localStorage. */
function getPokedexEntriesForBST() {
  return pokedexData?.entries || [];
}

export default function BSTPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const bstSource = getBSTData();
  const pokedexList = getPokedexEntriesForBST();

  const sections = useMemo(() => {
    const source = bstSource && typeof bstSource === "object" ? bstSource : { fakemon: [], megas: [], speciaux: [] };
    const q = search.trim().toLowerCase();
    const filterData = (arr) =>
      !q ? (arr || []) : (arr || []).filter((r) => normalizeName(r.name || "").includes(q));
    const list = [
      { id: "fakemon", title: "Fakemon + Formes Régionales", icon: "fa-leaf", accent: "plante", data: filterData(source.fakemon) },
      { id: "megas", title: "Nouvelles Mégas", icon: "fa-bolt", accent: "electrik", data: filterData(source.megas) },
      { id: "speciaux", title: "Pokémons Spéciaux", icon: "fa-star", accent: "fee", data: filterData(source.speciaux) },
    ];
    if (filter === "all") return list;
    return list.filter((s) => s.id === filter);
  }, [filter, search, bstSource]);

  const totalCount = useMemo(() => sections.reduce((acc, s) => acc + (s.data?.length || 0), 0), [sections]);

  return (
    <div className="page bst-page">
      <Sidebar />
      <div className="bst-bg">
        <div className="bst-bg-grid" />
        <div className="bst-bg-glow bst-bg-glow-1" />
        <div className="bst-bg-glow bst-bg-glow-2" />
      </div>
      <main className="bst-main">
        <header className="bst-header">
          <Link to="/" className="bst-back">
            <i className="fa-solid fa-arrow-left" aria-hidden />
            Retour
          </Link>
          <div className="bst-title-block">
            <h1 className="bst-title">
              <i className="fa-solid fa-chart-line" aria-hidden />
              All BST + new Abilities
            </h1>
            <p className="bst-subtitle">
              <i className="fa-solid fa-database" aria-hidden />
              Statistiques de base et talents des Fakemon, Mégas et Pokémon spéciaux
            </p>
          </div>

          <section className="bst-toolbar container">
            <div className="bst-toolbar-row">
              <div className="bst-search-wrap">
                <i className="fa-solid fa-magnifying-glass bst-search-icon" aria-hidden />
                <input
                  type="search"
                  className="bst-search"
                  placeholder="Rechercher un Pokémon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Recherche"
                />
              </div>
              <div className="bst-view-toggle" role="group" aria-label="Mode d'affichage">
                <button
                  type="button"
                  className={`bst-view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Vue grille"
                  aria-pressed={viewMode === "grid"}
                >
                  <i className="fa-solid fa-grip" aria-hidden /> Grille
                </button>
                <button
                  type="button"
                  className={`bst-view-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Vue tableau"
                  aria-pressed={viewMode === "table"}
                >
                  <i className="fa-solid fa-table-list" aria-hidden /> Tableau
                </button>
              </div>
            </div>
            <div className="bst-filter-panel">
              <span className="bst-filter-label">
                <i className="fa-solid fa-filter" aria-hidden /> Filtrer par catégorie
              </span>
              <div className="bst-filter-pills">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`bst-filter-pill ${filter === opt.id ? "active" : ""}`}
                    onClick={() => setFilter(opt.id)}
                  >
                    <i className={`fa-solid ${opt.icon}`} aria-hidden />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="bst-content-wrap container">
            <p className="bst-count">
              <i className="fa-solid fa-list-check" aria-hidden />
              {totalCount} résultat{totalCount !== 1 ? "s" : ""}
            </p>

        <div className="bst-content">
          {sections.map((s) => (
            <BSTTable
              key={s.id}
              id={s.id}
              title={s.title}
              icon={s.icon}
              data={s.data}
              pokedexList={pokedexList}
              onSelect={setSelectedPokemon}
              viewMode={viewMode}
            />
          ))}
        </div>
          </div>
        </header>
      </main>

      {selectedPokemon && (
        <BSTModal
          pokemon={selectedPokemon}
          pokedexList={pokedexList}
          onClose={() => setSelectedPokemon(null)}
        />
      )}
    </div>
  );
}
