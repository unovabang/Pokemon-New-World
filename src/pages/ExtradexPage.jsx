import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import extradexBgImg from "../assets/extradex-background.jpg";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

/* Palette enrichie : gradient + glow + icône par type. */
const TYPE_META = {
  plante:   { from: "#7BC85A", to: "#3B7E2B", glow: "rgba(123,200,90,.5)",  icon: "fa-leaf",            fg: "#fff" },
  feu:      { from: "#F59E42", to: "#C2410C", glow: "rgba(245,158,66,.55)", icon: "fa-fire",            fg: "#fff" },
  eau:      { from: "#60A5FA", to: "#1E40AF", glow: "rgba(96,165,250,.5)",  icon: "fa-droplet",         fg: "#fff" },
  glace:    { from: "#7DD3FC", to: "#0E7490", glow: "rgba(125,211,252,.5)", icon: "fa-snowflake",       fg: "#082F49" },
  malice:   { from: "#A78BFA", to: "#5B21B6", glow: "rgba(167,139,250,.5)", icon: "fa-mask",            fg: "#fff" },
  poison:   { from: "#C084FC", to: "#7E22CE", glow: "rgba(192,132,252,.5)", icon: "fa-skull-crossbones", fg: "#fff" },
  vol:      { from: "#A5B4FC", to: "#4338CA", glow: "rgba(165,180,252,.5)", icon: "fa-feather",         fg: "#fff" },
  dragon:   { from: "#7C3AED", to: "#312E81", glow: "rgba(124,58,237,.55)", icon: "fa-dragon",          fg: "#fff" },
  sol:      { from: "#EAB308", to: "#854D0E", glow: "rgba(234,179,8,.5)",   icon: "fa-mountain",        fg: "#fff" },
  combat:   { from: "#EF4444", to: "#7F1D1D", glow: "rgba(239,68,68,.55)",  icon: "fa-fist-raised",     fg: "#fff" },
  spectre:  { from: "#8B5CF6", to: "#1E1B4B", glow: "rgba(139,92,246,.55)", icon: "fa-ghost",           fg: "#fff" },
  psy:      { from: "#F472B6", to: "#9D174D", glow: "rgba(244,114,182,.55)", icon: "fa-eye",            fg: "#fff" },
  electr:   { from: "#FACC15", to: "#A16207", glow: "rgba(250,204,21,.55)", icon: "fa-bolt",            fg: "#1F2937" },
  fee:      { from: "#F9A8D4", to: "#BE185D", glow: "rgba(249,168,212,.5)", icon: "fa-wand-magic-sparkles", fg: "#831843" },
  tenebres: { from: "#52525B", to: "#18181B", glow: "rgba(82,82,91,.55)",   icon: "fa-moon",            fg: "#fff" },
  roche:    { from: "#D6B074", to: "#78350F", glow: "rgba(214,176,116,.5)", icon: "fa-gem",             fg: "#fff" },
  acier:    { from: "#94A3B8", to: "#334155", glow: "rgba(148,163,184,.55)", icon: "fa-shield-halved",  fg: "#fff" },
  normal:   { from: "#D6D3D1", to: "#78716C", glow: "rgba(214,211,209,.45)", icon: "fa-circle",         fg: "#1F2937" },
  insecte:  { from: "#A3E635", to: "#3F6212", glow: "rgba(163,230,53,.5)",  icon: "fa-bug",             fg: "#1F2937" },
  aspic:    { from: "#A3704F", to: "#5C2E0F", glow: "rgba(163,112,79,.55)", icon: "fa-staff-snake",     fg: "#fff" },
};

const DEFAULT_TYPE_META = { from: "#9CA3AF", to: "#4B5563", glow: "rgba(156,163,175,.45)", icon: "fa-circle", fg: "#fff" };
function getTypeMeta(t) {
  const k = (t || "").toLowerCase().trim();
  return TYPE_META[k] || DEFAULT_TYPE_META;
}

const TYPE_LABELS = {
  acier: "Acier", aspic: "Aspic", combat: "Combat", dragon: "Dragon", eau: "Eau",
  electr: "Électrik", fee: "Fée", feu: "Feu", glace: "Glace", insecte: "Insecte",
  malice: "Malice", normal: "Normal", plante: "Plante", poison: "Poison",
  psy: "Psy", roche: "Roche", sol: "Sol", spectre: "Spectre", tenebres: "Ténèbres", vol: "Vol",
};

function getTypeLabel(key) {
  const k = (key || "").toLowerCase().trim();
  return TYPE_LABELS[k] || (k.charAt(0).toUpperCase() + k.slice(1));
}

function getTypeStyle(type) {
  const m = getTypeMeta(type);
  return {
    background: `linear-gradient(135deg, ${m.from} 0%, ${m.to} 100%)`,
    border: `1px solid rgba(255,255,255,.18)`,
    color: m.fg,
    boxShadow: `0 2px 10px ${m.glow}, 0 0 0 1px rgba(0,0,0,.2) inset`,
    textShadow: m.fg === "#fff" ? "0 1px 2px rgba(0,0,0,.4)" : "none",
  };
}

function TypePill({ type, withIcon = true }) {
  const m = getTypeMeta(type);
  return (
    <span className="pokedex-type-pill" style={getTypeStyle(type)}>
      {withIcon && <i className={`fa-solid ${m.icon} pokedex-type-pill-icon`} aria-hidden />}
      <span className="pokedex-type-pill-label">{getTypeLabel(type)}</span>
    </span>
  );
}

function useCountUp(target, duration = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === null || target === undefined) { setV(0); return; }
    let raf;
    let start = null;
    const t0 = target || 0;
    const step = (now) => {
      if (start === null) start = now;
      const elapsed = now - start;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(eased * t0));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return v;
}

function TypeDropdown({ value, options, onChange, label, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const meta = value ? getTypeMeta(value) : null;
  const displayLabel = value ? getTypeLabel(value) : "— Aucun —";
  const displayStyle = value
    ? getTypeStyle(value)
    : { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)", color: "var(--text)" };

  return (
    <label className="pokedex-filter-select-label" ref={ref}>
      {label}
      <div className="pokedex-type-dropdown">
        <button
          type="button"
          className="pokedex-type-dropdown-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          style={displayStyle}
        >
          {meta && <i className={`fa-solid ${meta.icon} pokedex-type-dropdown-icon`} aria-hidden />}
          <span className="pokedex-type-dropdown-value">{displayLabel}</span>
          <i className={`fa-solid fa-chevron-down pokedex-type-dropdown-chevron ${open ? "open" : ""}`} aria-hidden />
        </button>
        {open && (
          <ul className="pokedex-type-dropdown-list" role="listbox" aria-label={ariaLabel}>
            <li
              role="option"
              aria-selected={!value}
              className="pokedex-type-dropdown-option pokedex-type-dropdown-option-none"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              <i className="fa-solid fa-ban pokedex-type-dropdown-icon" aria-hidden />
              <span>— Aucun —</span>
            </li>
            {options.map((t) => {
              const m = getTypeMeta(t);
              return (
                <li
                  key={t}
                  role="option"
                  aria-selected={value === t}
                  className="pokedex-type-dropdown-option"
                  style={getTypeStyle(t)}
                  onClick={() => { onChange(t); setOpen(false); }}
                >
                  <i className={`fa-solid ${m.icon} pokedex-type-dropdown-icon`} aria-hidden />
                  <span>{getTypeLabel(t)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </label>
  );
}

const EMPTY_EXTRADEX = { title: "Extradex", entries: [], customTypes: [] };

export default function ExtradexPage() {
  const [extradexData, setExtradexData] = useState(EMPTY_EXTRADEX);
  const [extradexBgSrc, setExtradexBgSrc] = useState(extradexBgImg);
  const [pokedexCount, setPokedexCount] = useState(null);
  const [extradexCount, setExtradexCount] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedPokemon, setSelectedPokemon] = useState(null);
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
      fetch(`${API_BASE}/extradex?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()),
    ]).then(([extradexRes, pokedexRes]) => {
      if (cancelled) return;
      if (extradexRes.success && extradexRes.extradex) {
        const list = extradexRes.extradex.entries || [];
        setExtradexData({
          title: extradexRes.extradex.title || "Extradex",
          entries: list,
          customTypes: extradexRes.extradex.customTypes || [],
        });
        setExtradexCount(new Set(list.filter((p) => !p.name || !p.name.startsWith("Méga-")).map((p) => p.num)).size);
        const bg = extradexRes.extradex.background && extradexRes.extradex.background.trim();
        setExtradexBgSrc(bg ? bg.trim() : extradexBgImg);
      } else {
        setLoadError(true);
      }
      if (pokedexRes.success && pokedexRes.pokedex && Array.isArray(pokedexRes.pokedex.entries)) {
        setPokedexCount(new Set(pokedexRes.pokedex.entries.filter((p) => !p.name || !p.name.startsWith("Méga-")).map((p) => p.num)).size);
      }
      setIsReady(true);
    }).catch(() => {
      if (cancelled) return;
      setLoadError(true);
      setIsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const entries = Array.isArray(extradexData?.entries) ? extradexData.entries : [];
  const customTypes = Array.isArray(extradexData?.customTypes) ? extradexData.customTypes : [];

  const allTypes = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => {
      if (Array.isArray(e.types)) e.types.forEach((t) => set.add(String(t).trim()));
    });
    customTypes.forEach((t) => set.add(String(t).trim()));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [entries, customTypes]);

  const setType1 = (key) => {
    setSelectedTypes((prev) => (key ? [key, prev[1]].filter(Boolean) : (prev[1] ? [prev[1]] : [])));
  };
  const setType2 = (key) => {
    setSelectedTypes((prev) => (key ? [prev[0], key].filter(Boolean) : (prev[0] ? [prev[0]] : [])));
  };

  const animatedPokedex = useCountUp(pokedexCount);
  const animatedExtradex = useCountUp(extradexCount);

  const sortByNum = (a, b) => (parseInt(String(a.num), 10) || 0) - (parseInt(String(b.num), 10) || 0);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const typeFilters = selectedTypes.map((x) => x.toLowerCase().trim()).filter(Boolean);
    const list = entries.filter((e) => {
      const matchSearch = !q || (e.name && e.name.toLowerCase().includes(q)) || (e.num && String(e.num).includes(q));
      if (!matchSearch) return false;
      if (typeFilters.length === 0) return true;
      const types = (Array.isArray(e.types) ? e.types : []).map((x) => String(x).toLowerCase().trim());
      return typeFilters.every((tf) => types.includes(tf));
    });
    return [...list].sort(sortByNum);
  }, [entries, search, selectedTypes]);

  if (!isReady) {
    return (
      <main className="page page-with-sidebar pokedex-page extradex-page">
        <Sidebar />
        <div className="pokedex-wrap">
          <div className="lore-page-loading-spinner" style={{ padding: "4rem" }}>
            <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            <span>Chargement...</span>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="page page-with-sidebar pokedex-page extradex-page">
        <Sidebar />
        <div className="pokedex-wrap">
          <div className="lore-page-unavailable">
            <p className="lore-page-unavailable-text">
              L&apos;Extradex est temporairement indisponible. Réessayez plus tard.
            </p>
            <button type="button" className="lore-page-unavailable-retry" onClick={() => window.location.reload()}>
              <i className="fa-solid fa-rotate-right" aria-hidden />
              Réessayer
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page page-with-sidebar pokedex-page extradex-page">
      <div className="pokedex-page-bg" aria-hidden>
        <img src={extradexBgSrc} alt="" />
      </div>
      <div className="pokedex-page-overlay" aria-hidden />
      <Sidebar />

      <div className="pokedex-wrap">
        <header className="pokedex-hero">
          <div className="container pokedex-hero-content">
            <Link to="/pokedex" className="pokedex-back">
              <i className="fa-solid fa-arrow-left" /> Retour
            </Link>
            <div className="dex-hero-tabs">
              <Link to="/pokedex" className="dex-panel dex-panel--pokedex dex-panel--dimmed">
                <div className="dex-panel-sparkles" aria-hidden>
                  <span className="dex-sparkle dex-sparkle--1" />
                  <span className="dex-sparkle dex-sparkle--2" />
                  <span className="dex-sparkle dex-sparkle--3" />
                </div>
                <div className="dex-panel-icon">
                  <i className="fa-solid fa-book-open" aria-hidden />
                </div>
                <div className="dex-panel-text">
                  <h1 className="dex-panel-title">Pokédex</h1>
                  <p className="dex-panel-subtitle">
                    Pokémon New World — <span className="dex-panel-count">{pokedexCount !== null ? animatedPokedex : "…"}</span> Pokémon
                  </p>
                </div>
              </Link>
              <div className="dex-panel dex-panel--extradex dex-panel--active">
                <div className="dex-panel-sparkles" aria-hidden>
                  <span className="dex-sparkle dex-sparkle--1" />
                  <span className="dex-sparkle dex-sparkle--2" />
                  <span className="dex-sparkle dex-sparkle--3" />
                  <span className="dex-sparkle dex-sparkle--4" />
                </div>
                <div className="dex-panel-icon">
                  <i className="fa-solid fa-star" aria-hidden />
                </div>
                <div className="dex-panel-text">
                  <h1 className="dex-panel-title">Extradex</h1>
                  <p className="dex-panel-subtitle">
                    Pokémon New World — <span className="dex-panel-count">{extradexCount !== null ? animatedExtradex : "…"}</span> Pokémon
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="pokedex-toolbar container">
          <div className="pokedex-toolbar-row">
            <div className="pokedex-search-wrap">
              <i className="fa-solid fa-magnifying-glass pokedex-search-icon" />
              <input
                type="search"
                className="pokedex-search"
                placeholder="Rechercher un Pokémon ou un nº..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Recherche"
              />
            </div>
            <div className="pokedex-view-toggle" role="group" aria-label="Mode d'affichage">
              <button
                type="button"
                className={`pokedex-view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Vue grille"
                aria-pressed={viewMode === "grid"}
              >
                <i className="fa-solid fa-grip" /> Grille
              </button>
              <button
                type="button"
                className={`pokedex-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Vue tableau"
                aria-pressed={viewMode === "table"}
              >
                <i className="fa-solid fa-table-list" /> Tableau
              </button>
            </div>
          </div>
          <div className="pokedex-filter-panel pokedex-filter-panel-dropdown">
            <span className="pokedex-filter-label">
              <i className="fa-solid fa-filter" aria-hidden /> Filtrer par type (1 ou 2 types)
            </span>
            <div className="pokedex-filter-dropdown-wrap">
              <TypeDropdown
                label="Type 1"
                value={selectedTypes[0] ?? null}
                options={allTypes}
                onChange={(v) => setType1(v)}
                ariaLabel="Premier type"
              />
              <span className="pokedex-filter-plus" aria-hidden>+</span>
              <TypeDropdown
                label="Type 2"
                value={selectedTypes[1] ?? null}
                options={allTypes}
                onChange={(v) => setType2(v)}
                ariaLabel="Deuxième type"
              />
            </div>
            {selectedTypes.length > 0 && (
              <p className="pokedex-filter-hint">
                <i className="fa-solid fa-circle-info" aria-hidden />
                Sélection : {selectedTypes.map(getTypeLabel).join(" + ")} — affiche les Pokémon ayant {selectedTypes.length === 1 ? "ce type" : "ces 2 types"}.
              </p>
            )}
          </div>
        </section>

        <section className="pokedex-content-wrap container">
          <p className="pokedex-count">
            <i className="fa-solid fa-list-check" aria-hidden /> {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </p>
          {viewMode === "grid" && (
            <div className="pokedex-grid">
              {filtered.map((pokemon, i) => {
                const primary = pokemon.types?.[0];
                const meta = primary ? getTypeMeta(primary) : null;
                const cardStyle = meta ? {
                  ["--card-glow"]: meta.glow,
                  ["--card-tint"]: meta.from,
                  ["--card-tint-deep"]: meta.to,
                } : undefined;
                return (
                  <button
                    key={`grid-${i}-${pokemon.num}-${pokemon.name}`}
                    type="button"
                    className={`pokedex-card${meta ? " pokedex-card--typed" : ""}`}
                    onClick={() => setSelectedPokemon(pokemon)}
                    style={cardStyle}
                  >
                    <div className="pokedex-card-sprite">
                      {pokemon.imageUrl ? (
                        <img src={pokemon.imageUrl} alt={pokemon.name} loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <i className="fa-solid fa-paw" />
                      )}
                    </div>
                    <span className="pokedex-card-num">#{pokemon.num}</span>
                    <span className="pokedex-card-name">{pokemon.name}</span>
                    <div className="pokedex-card-types">
                      {pokemon.types?.length
                        ? pokemon.types.map((t) => <TypePill key={t} type={t} />)
                        : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {viewMode === "table" && (
            <div className="pokedex-table-wrap">
              <div className="pokedex-table pokedex-table-grid" role="table" aria-label="Liste des Pokémon">
                <div className="pokedex-table-header" role="row">
                  <div className="pokedex-table-th pokedex-col-num" role="columnheader"><i className="fa-solid fa-hashtag" aria-hidden /> N°</div>
                  <div className="pokedex-table-th pokedex-col-name" role="columnheader"><i className="fa-solid fa-dragon" aria-hidden /> Pokémon</div>
                  <div className="pokedex-table-th pokedex-col-sprite" role="columnheader"><i className="fa-solid fa-image" aria-hidden /> Image</div>
                  <div className="pokedex-table-th pokedex-col-types" role="columnheader"><i className="fa-solid fa-bolt" aria-hidden /> Type</div>
                  <div className="pokedex-table-th pokedex-col-rarity" role="columnheader"><i className="fa-solid fa-gem" aria-hidden /> Rareté</div>
                  <div className="pokedex-table-th pokedex-col-obtention" role="columnheader"><i className="fa-solid fa-map-location-dot" aria-hidden /> Obtention</div>
                </div>
                {filtered.map((pokemon, i) => (
                  <div
                    key={`table-${i}-${pokemon.num}-${pokemon.name}`}
                    className="pokedex-table-row"
                    role="row"
                    onClick={() => setSelectedPokemon(pokemon)}
                  >
                    <div className="pokedex-table-cell pokedex-table-num" role="cell">#{pokemon.num}</div>
                    <div className="pokedex-table-cell pokedex-table-name" role="cell">{pokemon.name}</div>
                    <div className="pokedex-table-cell pokedex-table-sprite" role="cell">
                      {pokemon.imageUrl ? (
                        <img src={pokemon.imageUrl} alt={pokemon.name} loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <i className="fa-solid fa-paw" />
                      )}
                    </div>
                    <div className="pokedex-table-cell pokedex-table-types" role="cell">
                      {pokemon.types?.length
                        ? pokemon.types.map((t) => <TypePill key={t} type={t} />)
                        : "—"}
                    </div>
                    <div className="pokedex-table-cell pokedex-table-rarity" role="cell">{(() => { const arr = (pokemon.rarities || (pokemon.rarity ? [pokemon.rarity] : [])).filter(Boolean); return arr.length ? arr.map((r, i) => <div key={i}>{r}</div>) : "—"; })()}</div>
                    <div className="pokedex-table-cell pokedex-table-obtention" role="cell">{(() => { const arr = (pokemon.obtentions || (pokemon.obtention ? [pokemon.obtention] : [])).filter(Boolean); return arr.length ? arr.map((o, i) => <div key={i}>{o}</div>) : "—"; })()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedPokemon && (
        <div
          className="pokedex-modal-overlay"
          onClick={() => setSelectedPokemon(null)}
          onKeyDown={(e) => e.key === "Escape" && setSelectedPokemon(null)}
          role="button"
          tabIndex={0}
          aria-label="Fermer"
        >
          <div
            className="pokedex-modal card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pokedex-modal-title"
          >
            <button
              type="button"
              className="pokedex-modal-close"
              onClick={() => setSelectedPokemon(null)}
              aria-label="Fermer"
            >
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="pokedex-modal-content">
              <div className="pokedex-modal-sprite">
                {selectedPokemon.imageUrl ? (
                  <img src={selectedPokemon.imageUrl} alt={selectedPokemon.name} />
                ) : (
                  <i className="fa-solid fa-paw" />
                )}
              </div>
              <h2 id="pokedex-modal-title" className="pokedex-modal-name">
                {selectedPokemon.name}
              </h2>
              <p className="pokedex-modal-num"><i className="fa-solid fa-fingerprint" aria-hidden /> #{selectedPokemon.num}</p>
              <div className="pokedex-modal-types">
                {selectedPokemon.types?.length
                  ? selectedPokemon.types.map((t) => <TypePill key={t} type={t} />)
                  : "—"}
              </div>
              {(() => {
                const rarities = (selectedPokemon.rarities || (selectedPokemon.rarity ? [selectedPokemon.rarity] : [])).filter(Boolean);
                return rarities.length > 0 && (
                  <div className="pokedex-modal-row">
                    <span className="pokedex-modal-label"><i className="fa-solid fa-gem" aria-hidden /> Rareté</span>
                    <div className="pokedex-modal-values">{rarities.map((r, i) => <span key={i}>{r}</span>)}</div>
                  </div>
                );
              })()}
              {(() => {
                const obtentions = (selectedPokemon.obtentions || (selectedPokemon.obtention ? [selectedPokemon.obtention] : [])).filter(Boolean);
                return obtentions.length > 0 && (
                  <div className="pokedex-modal-row">
                    <span className="pokedex-modal-label"><i className="fa-solid fa-map-location-dot" aria-hidden /> Obtention</span>
                    <div className="pokedex-modal-values">{obtentions.map((o, i) => <span key={i}>{o}</span>)}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
