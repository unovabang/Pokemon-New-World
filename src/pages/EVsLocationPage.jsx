import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import evsConfig from "../config/evsLocation.js";
import pokedexData from "../config/pokedex.json";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const PLACEHOLDER_SPRITE = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%23313538" width="96" height="96" rx="8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%237ecdf2" font-size="10" font-family="sans-serif">?</text></svg>'
);

/** Normalise un nom pour la recherche (minuscules, sans accents) */
function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Construit une map nom normalisé -> { name, imageUrl } depuis le pokedex + extradex si besoin */
function buildPokedexLookup(entries) {
  const map = new Map();
  if (!Array.isArray(entries)) return map;
  for (const e of entries) {
    const name = (e.name || "").trim();
    if (!name) continue;
    const key = normalizeName(name);
    if (!map.has(key)) {
      map.set(key, { name, imageUrl: (e.imageUrl || "").trim() || null });
    }
  }
  return map;
}

/** Trouve le sprite pour un nom affiché (avec variante type "Bélamie", "Galar") */
function findSprite(lookup, displayName) {
  if (!displayName) return null;
  const normalized = normalizeName(displayName);
  let entry = lookup.get(normalized);
  if (entry?.imageUrl) return entry.imageUrl;
  const withoutSuffix = normalized.replace(/\s*\(\d+pts?\)\s*$/, "").trim();
  entry = lookup.get(withoutSuffix);
  if (entry?.imageUrl) return entry.imageUrl;
  const firstWord = withoutSuffix.split(/\s+/)[0] || "";
  if (firstWord) {
    entry = lookup.get(firstWord);
    if (entry?.imageUrl) return entry.imageUrl;
  }
  for (const [key, value] of lookup) {
    if (!value?.imageUrl) continue;
    if (withoutSuffix.startsWith(key) || key.startsWith(withoutSuffix)) return value.imageUrl;
  }
  return null;
}

export default function EVsLocationPage() {
  const [pokedexEntries, setPokedexEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const list = Array.isArray(pokedexData?.entries) ? pokedexData.entries : [];
    fetch(`${API_BASE}/pokedex`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data?.pokedex?.entries)) {
          setPokedexEntries(data.pokedex.entries);
        } else {
          setPokedexEntries(list);
        }
      })
      .catch(() => {
        if (!cancelled) setPokedexEntries(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const lookup = useMemo(() => buildPokedexLookup(pokedexEntries), [pokedexEntries]);

  return (
    <main className="page page-with-nav evs-location-page">
      <Sidebar />
      <div className="container evs-location-container">
        <header className="evs-location-header">
          <h1 className="evs-location-title">
            <i className="fa-solid fa-chart-line" aria-hidden />
            EVs par lieu
          </h1>
          <p className="evs-location-desc">
            Table des EV basée sur les Pokémon du jeu Pokémon New World (run HopeGrave). Cliquez sur une stat pour afficher les Pokémon qui donnent cet EV.
          </p>
        </header>

        {loading ? (
          <div className="evs-location-loading">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            <span>Chargement…</span>
          </div>
        ) : (
          <div className="evs-location-grid">
            {evsConfig.map((ev) => {
              const isOpen = expandedId === ev.id;
              return (
                <article
                  key={ev.id}
                  className={`evs-location-card card ${isOpen ? "evs-location-card--open" : ""}`}
                >
                  <button
                    type="button"
                    className="evs-location-card-head"
                    onClick={() => setExpandedId(isOpen ? null : ev.id)}
                    aria-expanded={isOpen}
                    aria-controls={`evs-panel-${ev.id}`}
                    id={`evs-trigger-${ev.id}`}
                  >
                    <span className="evs-location-card-icon" aria-hidden>
                      <i className={`fa-solid ${ev.icon}`} />
                    </span>
                    <span className="evs-location-card-label">{ev.label}</span>
                    <span className="evs-location-card-count">{ev.pokemon.length} Pokémon</span>
                    <i className={`fa-solid fa-chevron-down evs-location-card-chevron ${isOpen ? "open" : ""}`} aria-hidden />
                  </button>
                  <div
                    id={`evs-panel-${ev.id}`}
                    role="region"
                    aria-labelledby={`evs-trigger-${ev.id}`}
                    className="evs-location-card-body"
                    hidden={!isOpen}
                  >
                    <div className="evs-location-pokemon-grid">
                      {ev.pokemon.map((name, i) => {
                        const points = (ev.points && ev.points[i]) || 0;
                        const spriteUrl = findSprite(lookup, name) || PLACEHOLDER_SPRITE;
                        return (
                          <div key={`${ev.id}-${name}-${i}`} className="evs-location-pokemon-item">
                            <div className="evs-location-pokemon-sprite-wrap">
                              <img
                                src={spriteUrl}
                                alt=""
                                className="evs-location-pokemon-sprite"
                                loading="lazy"
                              />
                              {points > 0 && (
                                <span className="evs-location-pokemon-pts" title={`${points} EV par KO`}>
                                  {points}
                                </span>
                              )}
                            </div>
                            <span className="evs-location-pokemon-name">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
