import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import pokedexData from "../config/pokedex.json";
import content from "../config/index.js";
// Images importées pour que Vite les inclue au build (URLs garanties)
import pokedexBgImg from "../assets/pokedex-background.jpg";
import pokedexBannerImg from "../assets/pokedex-banner.jpg";

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

export default function PokedexPage() {
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]); // max 2 types pour filtre double
  const [viewMode, setViewMode] = useState("grid");
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  const entries = Array.isArray(pokedexData?.entries) ? pokedexData.entries : [];

  const allTypes = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => {
      if (Array.isArray(e.types)) e.types.forEach((t) => set.add(String(t).trim()));
    });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const toggleType = (t) => {
    setSelectedTypes((prev) => {
      const has = prev.includes(t);
      if (has) return prev.filter((x) => x !== t);
      if (prev.length >= 2) return [prev[1], t];
      return [...prev, t];
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const typeFilters = selectedTypes.map((x) => x.toLowerCase().trim()).filter(Boolean);
    return entries.filter((e) => {
      const matchSearch = !q || (e.name && e.name.toLowerCase().includes(q)) || (e.num && String(e.num).includes(q));
      if (!matchSearch) return false;
      if (typeFilters.length === 0) return true;
      const types = (Array.isArray(e.types) ? e.types : []).map((x) => String(x).toLowerCase().trim());
      const hasAll = typeFilters.every((tf) => types.includes(tf));
      return hasAll;
    });
  }, [entries, search, selectedTypes]);

  // URLs des images : importées depuis src/assets pour que le build les inclue (plus fiable que public/)
  const pokedexBgSrc = pokedexBgImg;
  const pokedexBannerSrc = pokedexBannerImg;

  return (
    <main className="page page-with-sidebar pokedex-page">
      <div className="pokedex-page-bg" aria-hidden>
        <img src={pokedexBgSrc} alt="" />
      </div>
      <div className="pokedex-page-overlay" aria-hidden />
      <Sidebar />

      <div className="pokedex-wrap">
        <header className="pokedex-hero">
          <div className="pokedex-hero-bg" aria-hidden />
          <div className="container">
            <Link to="/" className="pokedex-back">
              <i className="fa-solid fa-arrow-left" /> Retour
            </Link>
            <div className="pokedex-hero-banner" aria-hidden>
              <img src={pokedexBannerSrc} alt="" />
            </div>
            <div className="pokedex-hero-inner">
              <div className="pokedex-hero-icon">
                <i className="fa-solid fa-book-open" />
              </div>
              <div>
                <h1 className="pokedex-title">Pokédex</h1>
                <p className="pokedex-subtitle">
                  <i className="fa-solid fa-wand-magic-sparkles pokedex-subtitle-icon" aria-hidden />
                  Pokémon New World — {entries.length} créatures
                </p>
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
          <div className="pokedex-filter-panel">
            <span className="pokedex-filter-label">
              <i className="fa-solid fa-filter" aria-hidden /> Filtrer par type (1 ou 2 types)
            </span>
            <div className="pokedex-filters">
              <button
                type="button"
                className={`pokedex-filter-pill pokedex-filter-all ${selectedTypes.length === 0 ? "active" : ""}`}
                onClick={() => setSelectedTypes([])}
              >
                <i className="fa-solid fa-layer-group" aria-hidden /> Tous
              </button>
              {selectedTypes.length > 0 && (
                <button type="button" className="pokedex-filter-pill pokedex-filter-clear" onClick={() => setSelectedTypes([])}>
                  <i className="fa-solid fa-eraser" aria-hidden /> Effacer
                </button>
              )}
              <span className="pokedex-filter-sep" aria-hidden />
              {allTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`pokedex-filter-pill pokedex-filter-type ${selectedTypes.includes(t) ? "active" : ""}`}
                  style={getTypeStyle(t)}
                  onClick={() => toggleType(t)}
                  title={selectedTypes.includes(t) ? "Désélectionner" : selectedTypes.length >= 2 ? "Remplacer un type" : "Ajouter ce type"}
                >
                  {t}
                </button>
              ))}
            </div>
            {selectedTypes.length > 0 && (
              <p className="pokedex-filter-hint">
                <i className="fa-solid fa-circle-info" aria-hidden /> Sélection : {selectedTypes.join(" + ")} — affiche les Pokémon ayant {selectedTypes.length === 1 ? "ce type" : "ces 2 types"}.
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
              {filtered.map((pokemon, i) => (
                <button
                  key={`grid-${i}-${pokemon.num}-${pokemon.name}`}
                  type="button"
                  className="pokedex-card"
                  onClick={() => setSelectedPokemon(pokemon)}
                >
                  <div className="pokedex-card-sprite">
                    {pokemon.imageUrl ? (
                      <img
                        src={pokemon.imageUrl}
                        alt=""
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
                    className="pokedex-table-row"
                    role="row"
                    onClick={() => setSelectedPokemon(pokemon)}
                  >
                    <div className="pokedex-table-cell pokedex-table-num" role="cell">#{pokemon.num}</div>
                    <div className="pokedex-table-cell pokedex-table-name" role="cell">{pokemon.name}</div>
                    <div className="pokedex-table-cell pokedex-table-sprite" role="cell">
                      {pokemon.imageUrl ? (
                        <img src={pokemon.imageUrl} alt="" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
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
                    <div className="pokedex-table-cell pokedex-table-rarity" role="cell">{pokemon.rarity ?? "—"}</div>
                    <div className="pokedex-table-cell pokedex-table-obtention" role="cell">{pokemon.obtention ?? "—"}</div>
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
                  <img src={selectedPokemon.imageUrl} alt="" />
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
              {selectedPokemon.rarity && (
                <div className="pokedex-modal-row">
                  <span className="pokedex-modal-label"><i className="fa-solid fa-gem" aria-hidden /> Rareté</span>
                  <span>{selectedPokemon.rarity}</span>
                </div>
              )}
              {selectedPokemon.obtention && (
                <div className="pokedex-modal-row">
                  <span className="pokedex-modal-label"><i className="fa-solid fa-map-location-dot" aria-hidden /> Obtention</span>
                  <span>{selectedPokemon.obtention}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
