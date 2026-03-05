import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import pokedexData from "../config/pokedex.json";
import content from "../config/index.js";

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
  const [selectedType, setSelectedType] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  const entries = Array.isArray(pokedexData?.entries) ? pokedexData.entries : [];

  const allTypes = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => {
      if (Array.isArray(e.types)) e.types.forEach((t) => set.add(String(t).trim()));
    });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const typeFilter = selectedType ? selectedType.toLowerCase().trim() : "";
    return entries.filter((e) => {
      const matchSearch = !q || (e.name && e.name.toLowerCase().includes(q)) || (e.num && String(e.num).includes(q));
      if (!matchSearch) return false;
      if (!typeFilter) return true;
      const types = Array.isArray(e.types) ? e.types : [];
      const hasType = types.some((t) => String(t).toLowerCase().trim() === typeFilter);
      return hasType;
    });
  }, [entries, search, selectedType]);

  const backgrounds = content.backgrounds || {};
  const pageBg = backgrounds.home || backgrounds.pokedex || "url(/logo.png)";

  return (
    <main
      className="page page-with-sidebar pokedex-page"
      style={{
        "--page-bg": pageBg,
        "--bg-blur": "14px",
        "--bg-dim": "0.5",
      }}
    >
      <Sidebar />

      <div className="pokedex-wrap">
        <header className="pokedex-hero">
          <div className="pokedex-hero-bg" aria-hidden />
          <div className="container">
            <Link to="/" className="pokedex-back">
              <i className="fa-solid fa-arrow-left" /> Retour
            </Link>
            <div className="pokedex-hero-inner">
              <div className="pokedex-hero-icon">
                <i className="fa-solid fa-book-open" />
              </div>
              <div>
                <h1 className="pokedex-title">Pokédex</h1>
                <p className="pokedex-subtitle">
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
            <span className="pokedex-filter-label">Filtrer par type</span>
            <div className="pokedex-filters">
              <button
                type="button"
                className={`pokedex-filter-pill pokedex-filter-all ${!selectedType ? "active" : ""}`}
                onClick={() => setSelectedType("")}
              >
                Tous
              </button>
              <span className="pokedex-filter-sep" aria-hidden />
              {allTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`pokedex-filter-pill pokedex-filter-type ${selectedType === t ? "active" : ""}`}
                  style={getTypeStyle(t)}
                  onClick={() => setSelectedType(selectedType === t ? "" : t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="pokedex-content-wrap container">
          <p className="pokedex-count">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
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
              <table className="pokedex-table">
                <colgroup>
                  <col className="pokedex-col-num" />
                  <col className="pokedex-col-name" />
                  <col className="pokedex-col-sprite" />
                  <col className="pokedex-col-types" />
                  <col className="pokedex-col-rarity" />
                  <col className="pokedex-col-obtention" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">N°</th>
                    <th scope="col">Pokémon</th>
                    <th scope="col">Image</th>
                    <th scope="col">Type</th>
                    <th scope="col">Rareté</th>
                    <th scope="col">Obtention</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pokemon, i) => (
                    <tr
                      key={`table-${i}-${pokemon.num}-${pokemon.name}`}
                      onClick={() => setSelectedPokemon(pokemon)}
                      className="pokedex-table-row"
                    >
                      <td className="pokedex-table-num">#{pokemon.num}</td>
                      <td className="pokedex-table-name">{pokemon.name}</td>
                      <td className="pokedex-table-sprite">
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
                      </td>
                      <td className="pokedex-table-types">
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
                          : "—"}
                      </td>
                      <td className="pokedex-table-rarity">{pokemon.rarity ?? "—"}</td>
                      <td className="pokedex-table-obtention">{pokemon.obtention ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <p className="pokedex-modal-num">#{selectedPokemon.num}</p>
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
                  <span className="pokedex-modal-label">Rareté</span>
                  <span>{selectedPokemon.rarity}</span>
                </div>
              )}
              {selectedPokemon.obtention && (
                <div className="pokedex-modal-row">
                  <span className="pokedex-modal-label">Obtention</span>
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
