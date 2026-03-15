import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import evsConfigFallback from "../config/evsLocation.js";
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

/** Construit une map nom normalisé -> { name, imageUrl } depuis le pokedex */
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

/** Variantes de noms (EVs vs Pokédex : "Staross Bélamie" vs "Staross de Bélamie") */
function nameVariants(normalized) {
  const out = [normalized];
  const add = (s) => { if (s && !out.includes(s)) out.push(s); };
  add(normalized.replace(/\s+belamie\s*$/, " de belamie"));
  add(normalized.replace(/\s+de belamie\s*$/, " belamie"));
  add(normalized.replace(/\s+galar\s*$/, " de galar"));
  add(normalized.replace(/\s+de galar\s*$/, " galar"));
  add(normalized.replace(/\s+hisui\s*$/, " de hisui"));
  add(normalized.replace(/\s+de hisui\s*$/, " hisui"));
  add(normalized.replace(/\s+male\s*$/, " male"));
  add(normalized.replace(/\s+femelle\s*$/, " female"));
  return out;
}

/** Trouve le sprite pour un nom affiché (avec variante type "Bélamie", "Galar") */
function findSprite(lookup, displayName) {
  if (!displayName) return null;
  const normalized = normalizeName(displayName);
  const withoutSuffix = normalized.replace(/\s*\(\d+pts?\)\s*$/, "").trim();
  const toTry = nameVariants(withoutSuffix);
  for (const key of toTry) {
    const entry = lookup.get(key);
    if (entry?.imageUrl) return entry.imageUrl;
  }
  const firstWord = withoutSuffix.split(/\s+/)[0] || "";
  if (firstWord) {
    const entry = lookup.get(firstWord);
    if (entry?.imageUrl) return entry.imageUrl;
  }
  for (const [key, value] of lookup) {
    if (!value?.imageUrl) continue;
    if (withoutSuffix.startsWith(key) || key.startsWith(withoutSuffix)) return value.imageUrl;
  }
  return null;
}

/** Normalise une entrée EV : pokemon peut être string[] + points[] (legacy) ou { name, imageUrl?, points }[] */
function normalizeEvEntry(ev) {
  const pokemon = [];
  const raw = ev.pokemon;
  const pointsArr = ev.points;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "object" && first !== null && "name" in first) {
      raw.forEach((p) => {
        pokemon.push({
          name: (p.name || "").trim(),
          imageUrl: (p.imageUrl || "").trim() || undefined,
          points: typeof p.points === "number" ? p.points : 0,
        });
      });
    } else {
      raw.forEach((name, i) => {
        pokemon.push({
          name: typeof name === "string" ? name.trim() : "",
          imageUrl: undefined,
          points: Array.isArray(pointsArr) && typeof pointsArr[i] === "number" ? pointsArr[i] : 0,
        });
      });
    }
  }
  return { id: ev.id, label: ev.label, icon: ev.icon || "fa-circle", pokemon };
}

export default function EVsLocationPage() {
  const [evsEntries, setEvsEntries] = useState([]);
  const [pokedexEntries, setPokedexEntries] = useState([]);
  const [pageBackground, setPageBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const list = Array.isArray(pokedexData?.entries) ? pokedexData.entries : [];
    Promise.all([
      fetch(`${API_BASE}/evs-location?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API_BASE}/pokedex`).then((r) => r.json()),
    ])
      .then(([evsData, pokedexRes]) => {
        if (cancelled) return;
        if (evsData?.success && Array.isArray(evsData?.evs?.entries) && evsData.evs.entries.length > 0) {
          setEvsEntries(evsData.evs.entries.map(normalizeEvEntry));
        } else {
          setEvsEntries((Array.isArray(evsConfigFallback) ? evsConfigFallback : []).map(normalizeEvEntry));
        }
        const bg = evsData?.evs?.background;
        setPageBackground(bg && String(bg).trim() ? String(bg).trim() : null);
        if (pokedexRes?.success && Array.isArray(pokedexRes?.pokedex?.entries)) {
          setPokedexEntries(pokedexRes.pokedex.entries);
        } else {
          setPokedexEntries(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvsEntries((Array.isArray(evsConfigFallback) ? evsConfigFallback : []).map(normalizeEvEntry));
          setPokedexEntries(list);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const lookup = useMemo(() => buildPokedexLookup(pokedexEntries), [pokedexEntries]);

  return (
    <main className="page page-with-nav evs-location-page">
      {pageBackground && (
        <>
          <div className="page-bg-layer" aria-hidden>
            <img src={pageBackground} alt="" />
          </div>
          <div className="page-overlay-layer" aria-hidden />
        </>
      )}
      <Sidebar />
      <div className="container evs-location-container">
        <header className="evs-location-header">
          <h1 className="evs-location-title">
            <i className="fa-solid fa-chart-line" aria-hidden />
            EVs par lieu
          </h1>
          <p className="evs-location-desc">
            Voici un tableau vous permettant de farm un EV en fonction de la zone. Table des EV basée sur les Pokémon du jeu Pokémon New World (run HopeGrave). Cliquez sur une stat pour afficher les Pokémon qui donnent cet EV.
          </p>
        </header>

        {loading ? (
          <div className="evs-location-loading">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            <span>Chargement…</span>
          </div>
        ) : (
          <div className="evs-location-grid">
            {evsEntries.map((ev) => {
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
                      {ev.pokemon.map((p, i) => {
                        const name = p.name;
                        const points = p.points ?? 0;
                        const spriteUrl = (p.imageUrl && p.imageUrl.trim()) || findSprite(lookup, name) || PLACEHOLDER_SPRITE;
                        return (
                          <div key={`${ev.id}-${name}-${i}`} className={`evs-location-pokemon-item ${points > 0 ? "evs-location-pokemon-item--has-pts" : ""}`}>
                            {points > 0 && (
                              <span className="evs-location-pokemon-tooltip" role="tooltip">{points} EV par KO</span>
                            )}
                            <div className="evs-location-pokemon-sprite-wrap">
                              <img
                                src={spriteUrl}
                                alt=""
                                className="evs-location-pokemon-sprite"
                                loading="lazy"
                              />
                              {points > 0 && (
                                <span className="evs-location-pokemon-pts">
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
