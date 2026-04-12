import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useEasterEggs } from "../App";
import content from "../config/index.js";
import pokedexBgImg from "../assets/pokedex-background.jpg";

const SECRET_HASH = "53f7981a8813ea030341e0e6fb3c146a2977a230cc0ef43070f5579228bf898c";

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function GighastonEasterEgg({ onClose }) {
  const [phase, setPhase] = useState("glitch");
  const [glitchNumbers, setGlitchNumbers] = useState("0x00000000");
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (phase !== "glitch") return;
    const interval = setInterval(() => {
      const hex = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, "0");
      setGlitchNumbers(`0x${hex}`);
    }, 50);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPhase("card");
    }, 2000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "card") return;
    if (countdown <= 0) { onClose(); return; }
    const interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [phase, countdown, onClose]);

  if (phase === "glitch") {
    return (
      <div className="gighaston-overlay gighaston-glitch">
        <div className="gighaston-glitch-content">
          <pre className="gighaston-console">
            <span className="gighaston-console-prompt">&gt;</span> console.log(<span className="gighaston-string">"Entrée Pokédex corrompue..."</span>);
          </pre>
          <div className="gighaston-hex">{glitchNumbers}</div>
          <div className="gighaston-scanlines" />
        </div>
      </div>
    );
  }

  return (
    <div className="gighaston-overlay gighaston-card-phase">
      <div className="gighaston-card">
        <div className="gighaston-card-glow" />
        <div className="gighaston-card-inner">
          <div className="gighaston-card-header">
            <span className="gighaston-card-number">
              <i className="fa-solid fa-radiation gighaston-icon-pulse" /> #???
            </span>
            <span className="gighaston-card-rarity">
              <i className="fa-solid fa-skull" /> Corrompu ⚠️
            </span>
          </div>
          
          <div className="gighaston-sprite-container">
            <div className="gighaston-sprite-glitch" />
            <img 
              src="https://i.imgur.com/4ypJ2kX.gif" 
              alt="???" 
              className="gighaston-sprite"
            />
          </div>

          <h2 className="gighaston-name">
            <span className="gighaston-name-glitch">G̸̢͝i̶̛̱g̷̨̈́h̸̰̾a̵̰͝s̶̱͠t̷̨̛o̶̰̊n̸̰̈́</span>
          </h2>

          <div className="gighaston-info-box">
            <div className="gighaston-warning-icon">
              <i className="fa-solid fa-radiation" />
            </div>
            <p className="gighaston-info-text">
              Une anomalie a été détectée dans cette entrée.<br />
              <span className="gighaston-info-warning">Le sujet semble réagir à la présence du lecteur.</span>
            </p>
          </div>

          <div className="gighaston-stats">
            <div className="gighaston-stat">
              <span className="gighaston-stat-label">Type</span>
              <span className="gighaston-stat-value gighaston-type-corrupted">???</span>
            </div>
            <div className="gighaston-stat">
              <span className="gighaston-stat-label">Statut</span>
              <span className="gighaston-stat-value gighaston-status-danger">INSTABLE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="gighaston-eject-warning">
        <div className="gighaston-eject-text">
          <i className="fa-solid fa-skull gighaston-eject-icon" />
          <span>Vous n'avez strictement rien à faire ici.</span>
        </div>
        <div className="gighaston-countdown">
          Éjection dans <span className="gighaston-countdown-number">{countdown}</span> seconde{countdown !== 1 ? "s" : ""}
        </div>
        <div className="gighaston-progress-bar">
          <div 
            className="gighaston-progress-fill" 
            style={{ width: `${((15 - countdown) / 15) * 100}%` }} 
          />
        </div>
        <button type="button" className="gighaston-flee-btn" onClick={onClose}>
          <i className="fa-solid fa-person-running gighaston-flee-icon" />
          FUIR
        </button>
      </div>
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const TYPE_COLORS = {
  plante: { bg: "rgba(126,200,80,.35)", border: "rgba(126,200,80,.6)", text: "#a6e88a" },
  feu: { bg: "rgba(240,128,48,.35)", border: "rgba(240,128,48,.6)", text: "#f5a962" },
  eau: { bg: "rgba(104,144,240,.35)", border: "rgba(104,144,240,.6)", text: "#7eb8f2" },
  glace: { bg: "rgba(126,206,206,.35)", border: "rgba(126,206,206,.6)", text: "#98d8d8" },
  malice: { bg: "rgba(112,88,152,.35)", border: "rgba(112,88,152,.6)", text: "#b8a8d8" },
  poison: { bg: "rgba(160,64,160,.35)", border: "rgba(160,64,160,.6)", text: "#c183c1" },
  vol: { bg: "rgba(168,144,240,.35)", border: "rgba(168,144,240,.6)", text: "#c6b7f5" },
  dragon: { bg: "rgba(112,56,248,.35)", border: "rgba(112,56,248,.6)", text: "#a78bfa" },
  sol: { bg: "rgba(224,192,104,.35)", border: "rgba(224,192,104,.6)", text: "#e8d68c" },
  combat: { bg: "rgba(192,48,40,.35)", border: "rgba(192,48,40,.6)", text: "#f07878" },
  spectre: { bg: "rgba(112,88,152,.35)", border: "rgba(112,88,152,.6)", text: "#a890f0" },
  psy: { bg: "rgba(248,88,136,.35)", border: "rgba(248,88,136,.6)", text: "#f8a8c8" },
  electr: { bg: "rgba(248,208,48,.35)", border: "rgba(248,208,48,.6)", text: "#f8d030" },
  fee: { bg: "rgba(238,153,172,.35)", border: "rgba(238,153,172,.6)", text: "#f0b0c0" },
  tenebres: { bg: "rgba(112,88,72,.35)", border: "rgba(112,88,72,.6)", text: "#a09080" },
  roche: { bg: "rgba(184,160,56,.35)", border: "rgba(184,160,56,.6)", text: "#d8c878" },
  acier: { bg: "rgba(168,168,192,.35)", border: "rgba(168,168,192,.6)", text: "#c0c0e0" },
  normal: { bg: "rgba(168,168,120,.25)", border: "rgba(168,168,120,.5)", text: "#c6c6a7" },
  insecte: { bg: "rgba(168,184,32,.35)", border: "rgba(168,184,32,.6)", text: "#c6d16e" },
  aspic: { bg: "rgba(160,128,96,.35)", border: "rgba(160,128,96,.6)", text: "#d4b896" },
};

/** Noms complets des types (sans abréviation) pour l’affichage */
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

const defaultTypeStyle = { bg: "rgba(255,255,255,.1)", border: "rgba(255,255,255,.25)", text: "var(--text)" };

function getTypeStyle(type) {
  const key = (type || "").toLowerCase().trim();
  const s = TYPE_COLORS[key] || defaultTypeStyle;
  return {
    background: s.bg,
    border: `1px solid ${s.border}`,
    color: s.text,
  };
}

/** Menu déroulant personnalisé avec options colorées par type */
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

  const displayLabel = value ? getTypeLabel(value) : "— Aucun —";
  const displayStyle = value ? getTypeStyle(value) : { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)", color: "var(--text)" };

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
          <span className="pokedex-type-dropdown-value">{displayLabel}</span>
          <i className={`fa-solid fa-chevron-down pokedex-type-dropdown-chevron ${open ? "open" : ""}`} aria-hidden />
        </button>
        {open && (
          <ul
            className="pokedex-type-dropdown-list"
            role="listbox"
            aria-label={ariaLabel}
          >
            <li
              role="option"
              aria-selected={!value}
              className="pokedex-type-dropdown-option pokedex-type-dropdown-option-none"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              — Aucun —
            </li>
            {options.map((t) => (
              <li
                key={t}
                role="option"
                aria-selected={value === t}
                className="pokedex-type-dropdown-option"
                style={getTypeStyle(t)}
                onClick={() => { onChange(t); setOpen(false); }}
              >
                {getTypeLabel(t)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </label>
  );
}

export default function PokedexPage() {
  const easterEggs = useEasterEggs();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [availabilityFilter, setAvailabilityFilter] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [entries, setEntries] = useState([]);
  const [pokedexBgSrc, setPokedexBgSrc] = useState(pokedexBgImg);
  const [customTypes, setCustomTypes] = useState([]);
  const [pokedexCount, setPokedexCount] = useState(null);
  const [extradexCount, setExtradexCount] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  const handleSearchChange = useCallback(async (value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim()) next.set("q", value);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
    const inputHash = await hashString(value);
    if (inputHash === SECRET_HASH && easterEggs.gighaston !== false) {
      setShowEasterEgg(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("q");
          return next;
        },
        { replace: true },
      );
    }
  }, [setSearchParams, easterEggs.gighaston]);

  const closeEasterEgg = useCallback(() => {
    setShowEasterEgg(false);
  }, []);

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
      fetch(`${API_BASE}/pokedex`).then((res) => res.json()),
      fetch(`${API_BASE}/extradex?t=${Date.now()}`).then((res) => res.json()),
    ]).then(([pokedexRes, extradexRes]) => {
      if (cancelled) return;
      if (pokedexRes.success && pokedexRes.pokedex) {
        const list = Array.isArray(pokedexRes.pokedex.entries) ? pokedexRes.pokedex.entries : [];
        setEntries(list);
        setPokedexCount(new Set(list.filter((p) => !p.name || !p.name.startsWith("Méga-")).map((p) => p.num)).size);
        setPokedexBgSrc(pokedexRes.pokedex.background && pokedexRes.pokedex.background.trim() ? pokedexRes.pokedex.background.trim() : pokedexBgImg);
        setCustomTypes(Array.isArray(pokedexRes.pokedex.customTypes) ? pokedexRes.pokedex.customTypes : []);
      } else {
        setLoadError(true);
      }
      if (extradexRes.success && extradexRes.extradex && Array.isArray(extradexRes.extradex.entries)) {
        setExtradexCount(new Set(extradexRes.extradex.entries.filter((p) => !p.name || !p.name.startsWith("Méga-")).map((p) => p.num)).size);
      }
      setIsReady(true);
    }).catch(() => {
      if (cancelled) return;
      setLoadError(true);
      setIsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const allTypes = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => {
      if (Array.isArray(e.types)) e.types.forEach((t) => set.add(String(t).trim()));
    });
    customTypes.forEach((t) => set.add(String(t).trim()));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [entries, customTypes]);

  const setType1 = (key) => {
    setSelectedTypes((prev) => {
      const next = key ? [key, prev[1]].filter(Boolean) : (prev[1] ? [prev[1]] : []);
      return next;
    });
  };
  const setType2 = (key) => {
    setSelectedTypes((prev) => {
      const next = key ? [prev[0], key].filter(Boolean) : (prev[0] ? [prev[0]] : []);
      return next;
    });
  };

  const sortByNum = (a, b) => (parseInt(String(a.num), 10) || 0) - (parseInt(String(b.num), 10) || 0);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const typeFilters = selectedTypes.map((x) => x.toLowerCase().trim()).filter(Boolean);
    const list = entries.filter((e) => {
      const matchSearch = !q || (e.name && e.name.toLowerCase().includes(q)) || (e.num && String(e.num).includes(q));
      if (!matchSearch) return false;
      if (availabilityFilter && (e.availability || "old") !== availabilityFilter) return false;
      if (typeFilters.length === 0) return true;
      const types = (Array.isArray(e.types) ? e.types : []).map((x) => String(x).toLowerCase().trim());
      const hasAll = typeFilters.every((tf) => types.includes(tf));
      return hasAll;
    });
    return [...list].sort(sortByNum);
  }, [entries, search, selectedTypes, availabilityFilter]);

  if (!isReady) {
    return (
      <main className="page page-with-sidebar pokedex-page">
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
      <main className="page page-with-sidebar pokedex-page">
        <Sidebar />
        <div className="pokedex-wrap">
          <div className="lore-page-unavailable">
            <p className="lore-page-unavailable-text">
              Le Pokédex est temporairement indisponible. Réessayez plus tard.
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
    <main className="page page-with-sidebar pokedex-page">
      {showEasterEgg && <GighastonEasterEgg onClose={closeEasterEgg} />}
      <div className="pokedex-page-bg" aria-hidden>
        <img src={pokedexBgSrc} alt="" />
      </div>
      <div className="pokedex-page-overlay" aria-hidden />
      <Sidebar />

      <div className="pokedex-wrap">
        <header className="pokedex-hero">
          <div className="container pokedex-hero-content">
            <Link to="/" className="pokedex-back">
              <i className="fa-solid fa-arrow-left" /> Retour
            </Link>
            <div className="dex-hero-tabs">
              <div className="dex-panel dex-panel--pokedex dex-panel--active">
                <div className="dex-panel-icon">
                  <i className="fa-solid fa-book-open" aria-hidden />
                </div>
                <div className="dex-panel-text">
                  <h1 className="dex-panel-title">Pokédex</h1>
                  <p className="dex-panel-subtitle">
                    Pokémon New World — {pokedexCount !== null ? pokedexCount : "…"} Pokémon
                  </p>
                </div>
              </div>
              <Link to="/extradex" className="dex-panel dex-panel--extradex dex-panel--dimmed">
                <div className="dex-panel-icon">
                  <i className="fa-solid fa-star" aria-hidden />
                </div>
                <div className="dex-panel-text">
                  <h1 className="dex-panel-title">Extradex</h1>
                  <p className="dex-panel-subtitle">
                    Pokémon New World — {extradexCount !== null ? extradexCount : "…"} Pokémon
                  </p>
                </div>
              </Link>
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
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Recherche"
              />
            </div>
            <div className="pokedex-view-toggle" role="group" aria-label="Mode d’affichage">
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
                title="Vue tableau (style Fandom)"
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
          <div className="pokedex-legend">
            <button
              type="button"
              className={`pokedex-legend-btn pokedex-legend-btn--new${availabilityFilter === "new" ? " pokedex-legend-btn--active" : ""}`}
              onClick={() => setAvailabilityFilter((f) => f === "new" ? null : "new")}
            >
              <span className="pokedex-legend-dot pokedex-legend-dot--new" />
              MàJ actuelle
            </button>
            <button
              type="button"
              className={`pokedex-legend-btn pokedex-legend-btn--unavailable${availabilityFilter === "unavailable" ? " pokedex-legend-btn--active" : ""}`}
              onClick={() => setAvailabilityFilter((f) => f === "unavailable" ? null : "unavailable")}
            >
              <span className="pokedex-legend-dot pokedex-legend-dot--unavailable" />
              Pas encore disponible
            </button>
          </div>
          <p className="pokedex-count">
            <i className="fa-solid fa-list-check" aria-hidden /> {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </p>
          {viewMode === "grid" && (
            <div className="pokedex-grid">
              {filtered.map((pokemon, i) => (
                <button
                  key={`grid-${i}-${pokemon.num}-${pokemon.name}`}
                  type="button"
                  className={`pokedex-card${pokemon.availability === "new" ? " pokedex-card--available-new" : ""}${pokemon.availability === "unavailable" ? " pokedex-card--unavailable" : ""}`}
                  onClick={() => setSelectedPokemon(pokemon)}
                >
                  <div className="pokedex-card-sprite">
                    {pokemon.imageUrl ? (
                      <img
                        src={pokemon.imageUrl}
                        alt={pokemon.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <i className="fa-solid fa-paw" />
                    )}
                  </div>
                  <span className="pokedex-card-num">#{pokemon.num}</span>
                  <span className="pokedex-card-name">{pokemon.name}</span>
                  <div className="pokedex-card-types">
                    {pokemon.types?.length
                      ? pokemon.types.map((t) => (
                          <span
                            key={t}
                            className="pokedex-type-pill"
                            style={getTypeStyle(t)}
                          >
                            {t}
                          </span>
                        ))
                      : null}
                  </div>
                </button>
              ))}
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
                    className={`pokedex-table-row${pokemon.availability === "new" ? " pokedex-table-row--available-new" : ""}${pokemon.availability === "unavailable" ? " pokedex-table-row--unavailable" : ""}`}
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
                        ? pokemon.types.map((t) => (
                            <span key={t} className="pokedex-type-pill" style={getTypeStyle(t)}>{t}</span>
                          ))
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
                  ? selectedPokemon.types.map((t) => (
                      <span
                        key={t}
                        className="pokedex-type-pill"
                        style={getTypeStyle(t)}
                      >
                        {t}
                      </span>
                    ))
                  : "—"}
              </div>
              {selectedPokemon.availability && selectedPokemon.availability !== "old" && (
                <div className="pokedex-modal-row">
                  <span className="pokedex-modal-label"><i className="fa-solid fa-circle-info" aria-hidden /> Disponibilité</span>
                  <span className={`pokedex-availability-badge pokedex-availability-badge--${selectedPokemon.availability}`}>
                    {selectedPokemon.availability === "new" ? "MàJ actuelle" : "Pas encore disponible"}
                  </span>
                </div>
              )}
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
