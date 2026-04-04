import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const EMPTY_BST = { fakemon: [], megas: [], speciaux: [] };

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

/** Normalise les talents : supporte l'ancien format (arrays) et le nouveau format (tableau d'objets). */
function normalizeAbilities(row) {
  if (Array.isArray(row?.talents)) {
    return {
      talents: row.talents.map((t) => ({ name: (t.name || "").trim(), desc: (t.desc || "").trim(), hidden: !!t.hidden })),
      abilities: row.talents.map((t) => (t.name || "").trim()),
      abilityDescs: row.talents.map((t) => (t.desc || "").trim()),
    };
  }
  const abilities = Array.isArray(row?.abilities) ? [...row.abilities] : [];
  const abilityDescs = Array.isArray(row?.abilityDescs) ? [...row.abilityDescs] : [];
  if (abilities.length < 3 && row?.ability != null && String(row.ability).trim() !== "") {
    abilities[0] = row.ability ?? "";
    if (abilityDescs.length < 1) abilityDescs[0] = row?.abilityDesc ?? "";
  }
  while (abilities.length < 3) abilities.push("");
  while (abilityDescs.length < 3) abilityDescs.push("");
  const talents = abilities.map((name, i) => ({ name: (name || "").trim(), desc: (abilityDescs[i] || "").trim(), hidden: i === 2 }));
  return {
    talents,
    abilities: abilities.slice(0, 3).map((a) => (a || "").trim()),
    abilityDescs: abilityDescs.slice(0, 3).map((d) => (d || "").trim()),
  };
}

/** Normalise les attaques : supporte l'ancien format (string) et le nouveau format (tableau d'objets). */
function normalizeAttacks(row) {
  if (Array.isArray(row?.attacks)) {
    return row.attacks.map((a) => ({ name: (a.name || "").trim(), desc: (a.desc || "").trim() }));
  }
  const attacksStr = (row?.attacks || "").trim();
  if (!attacksStr) return [];
  const lines = attacksStr.split(/\n/).filter((l) => l.trim());
  const attacks = [];
  for (const line of lines) {
    const match = line.match(/^(?:\d+\))\s*([^:]+)(?:\s*:\s*(.*))?$/);
    if (match) {
      attacks.push({ name: match[1].trim(), desc: (match[2] || "").trim() });
    } else {
      attacks.push({ name: line.trim(), desc: "" });
    }
  }
  return attacks;
}

/** Retourne la liste des talents remplis (pour affichage compact). */
function getFilledAbilities(row) {
  const { abilities } = normalizeAbilities(row);
  return abilities.filter(Boolean);
}

function getFilledAbilityDescs(row) {
  const { abilityDescs } = normalizeAbilities(row);
  return abilityDescs.filter(Boolean);
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

/** Extrait les types: priorité au champ BST (row.type), sinon Pokédex. Même source que l'admin. */
function getTypes(row, pokedexEntry) {
  const str = (row.type || "").trim();
  if (str) {
    return str
      .split(/[/\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((part) => TYPE_LABELS[getTypeKey(part)] || part);
  }
  if (pokedexEntry?.types?.length) {
    return pokedexEntry.types.map((t) => TYPE_LABELS[t] || t);
  }
  return [];
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

/** Couleur pour types personnalisés (hors liste) : dérivée du nom pour être stable et distincte. */
const FALLBACK_TYPE_COLORS = ["#e91e63", "#9c27b0", "#673ab7", "#00bcd4", "#009688", "#8bc34a", "#ff9800", "#ff5722", "#795548", "#607d8b"];
function getColorForType(label) {
  const key = getTypeKey(label);
  if (TYPE_COLORS[key]) return TYPE_COLORS[key];
  let h = 0;
  const s = (key || "").toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return FALLBACK_TYPE_COLORS[Math.abs(h) % FALLBACK_TYPE_COLORS.length];
}

function TypeBadges({ types }) {
  if (!types?.length) return <span className="bst-type-empty">—</span>;
  return (
    <span className="bst-type-badges">
      {types.map((t) => {
        const color = getColorForType(t);
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
        {(() => {
          const { talents } = normalizeAbilities(pokemon);
          const slots = talents.filter((t) => (t.name || "").trim() || (t.desc || "").trim());
          if (slots.length === 0) return null;
          let normalCount = 0;
          return (
            <div className="bst-modal-talents-wrap">
              <div className="bst-modal-talents-label"><i className="fa-solid fa-star" aria-hidden /> Talents</div>
              <div className="bst-modal-talents-list">
                {slots.map((slot, i) => {
                  if (!slot.hidden) normalCount++;
                  const talentTitle = slot.hidden ? <><i className="fa-solid fa-sparkles" aria-hidden /> Talent Caché</> : <>Talent {normalCount}</>;
                  return (
                    <div key={i} className="bst-modal-talent-slot">
                      <div className="bst-modal-talent-title">{talentTitle}</div>
                      {slot.name && <div className="bst-modal-talent-name"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden /> {slot.name}</div>}
                      {slot.desc && <div className="bst-modal-talent-desc">{slot.desc}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {(() => {
          const attacks = normalizeAttacks(pokemon);
          if (attacks.length === 0) return null;
          return (
            <div className="bst-modal-attacks-wrap">
              <div className="bst-modal-talents-label"><i className="fa-solid fa-bolt" aria-hidden /> Attaque{attacks.length > 1 ? "s" : ""} signature</div>
              <div className="bst-modal-attacks-list">
                {attacks.map((attack, i) => (
                  <div key={i} className="bst-modal-attack-item">
                    <div className="bst-modal-attack-header">
                      <span className="bst-modal-attack-num">{i + 1})</span>
                      <span className="bst-modal-attack-name">{attack.name}</span>
                    </div>
                    {attack.desc && <p className="bst-modal-attack-desc">{attack.desc}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
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
                <td className="bst-td-ability">
                  {(() => {
                    const filled = getFilledAbilities(row);
                    if (filled.length === 0) return "—";
                    return filled.join(" · ");
                  })()}
                </td>
                <td className="bst-td-desc">
                  {(() => {
                    const filled = getFilledAbilityDescs(row);
                    if (filled.length === 0) return "—";
                    return filled.map((d) => (d.length > 40 ? `${d.slice(0, 37)}…` : d)).join(" · ");
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function BSTPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [bstSource, setBstSource] = useState(EMPTY_BST);
  const [pokedexList, setPokedexList] = useState([]);
  const [pageBackground, setPageBackground] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const MOBILE_BREAKPOINT = 768;
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) setViewMode("grid");
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    Promise.all([
      fetch(`${API_BASE}/bst?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()),
    ]).then(([bstRes, pokedexRes]) => {
      if (cancelled) return;
      if (bstRes.success && bstRes.bst) {
        setBstSource({
          fakemon: Array.isArray(bstRes.bst.fakemon) ? bstRes.bst.fakemon : [],
          megas: Array.isArray(bstRes.bst.megas) ? bstRes.bst.megas : [],
          speciaux: Array.isArray(bstRes.bst.speciaux) ? bstRes.bst.speciaux : [],
        });
        setPageBackground(bstRes.bst.background && String(bstRes.bst.background).trim() ? bstRes.bst.background.trim() : null);
      } else {
        setLoadError(true);
      }
      if (pokedexRes.success && pokedexRes.pokedex && Array.isArray(pokedexRes.pokedex.entries)) {
        setPokedexList(pokedexRes.pokedex.entries);
      }
      setIsReady(true);
    }).catch(() => {
      if (cancelled) return;
      setLoadError(true);
      setIsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

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

  if (!isReady) {
    return (
      <div className="page bst-page">
        <Sidebar />
        <div className="bst-bg">
          <div className="bst-bg-grid" />
          <div className="lore-page-loading-spinner" style={{ padding: "4rem", position: "relative", zIndex: 1 }}>
            <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            <span>Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page bst-page">
        <Sidebar />
        <div className="bst-bg">
          <div className="bst-bg-grid" />
          <div className="lore-page-unavailable" style={{ position: "relative", zIndex: 1 }}>
            <p className="lore-page-unavailable-text">
              Les données BST sont temporairement indisponibles. Réessayez plus tard.
            </p>
            <button type="button" className="lore-page-unavailable-retry" onClick={() => window.location.reload()}>
              <i className="fa-solid fa-rotate-right" aria-hidden />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`page bst-page${pageBackground ? " bst-page--has-bg" : ""}`}>
      {pageBackground && (
        <>
          <div className="page-bg-layer" aria-hidden>
            <img src={pageBackground} alt="" />
          </div>
          <div className="page-overlay-layer" aria-hidden />
        </>
      )}
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
